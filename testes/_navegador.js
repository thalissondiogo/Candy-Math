/* ===================================================
   CANDY MATH — testes/_navegador.js
   O pedaço de DevTools que os testes de navegador compartilham: sobe um
   Edge/Chromium headless, conecta no protocolo e desliga direito.

   No Windows o Edge se relança por fora da árvore do processo gerado, então
   taskkill no pid do lançador não alcança o navegador: ele fica vivo segurando
   a porta e o teste seguinte morre num "DevTools não respondeu" sem explicação.
   Quem desliga é o próprio Browser.close; o taskkill só limpa o resto.
   =================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

const BINARIOS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];

function binario() {
  for (const b of BINARIOS) if (fs.existsSync(b)) return b;
  const env = process.env.PROGRAMFILES || 'C:/Program Files';
  const procura = fs.readdirSync(env).filter((d) => /google|microsoft/i.test(d));
  for (const d of procura) {
    const p = env + '/' + d + '/Application/msedge.exe';
    if (fs.existsSync(p)) return p;
  }
  throw new Error('nenhum Chromium/Edge encontrado; instale um ou ajuste BINARIOS');
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function criarNavegador(porta, rotulo) {
  const perfil = path.join(os.tmpdir(), 'candymath-' + rotulo + '-' + process.pid);
  let proc = null;

  function subir() {
    proc = spawn(binario(), [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      '--hide-scrollbars', '--allow-insecure-localhost',
      '--remote-debugging-port=' + porta,
      '--user-data-dir=' + perfil,
      'about:blank',
    ], { stdio: 'ignore' });
  }

  async function portaLivre() {
    try {
      await fetch('http://127.0.0.1:' + porta + '/json/version').then((r) => r.json());
    } catch (e) { return; }
    throw new Error('a porta ' + porta + ' já tem um navegador de teste aberto. '
      + 'Feche-o (taskkill /T /F /PID <pid>) antes de medir de novo.');
  }

  async function alvo() {
    for (let i = 0; i < 60; i++) {
      try {
        const lista = await fetch('http://127.0.0.1:' + porta + '/json/list').then((r) => r.json());
        const p = lista.find((t) => t.type === 'page' && /about:blank|index\.html/.test(t.url));
        if (p) return p;
      } catch (e) { /* o navegador ainda está subindo */ }
      await espera(250);
    }
    throw new Error('DevTools não respondeu na porta ' + porta);
  }

  function encerrar() {
    if (proc && proc.pid) {
      try {
        if (process.platform === 'win32') spawnSync('taskkill', ['/T', '/F', '/PID', String(proc.pid)], { stdio: 'ignore' });
        else proc.kill();
      } catch (e) { /* já tinha saído */ }
    }
    try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) { /* arquivo ainda preso */ }
  }

  async function desligar(c) {
    try { await Promise.race([c.chamar('Browser.close'), espera(2000)]); } catch (e) { /* fecha o socket antes de responder */ }
    try { c.fechar(); } catch (e) {}
    await espera(450); /* o perfil só sai do disco depois que o navegador solta os arquivos */
    encerrar();
  }

  return { subir, portaLivre, alvo, desligar, encerrar, perfil };
}

function conectar(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pendentes = new Map();
  const eventos = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
    if (msg.id && pendentes.has(msg.id)) {
      const { resolve, reject } = pendentes.get(msg.id);
      pendentes.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      eventos.push(msg);
    }
  });
  return new Promise((resolve) => {
    ws.addEventListener('open', () => resolve({
      chamar(method, params) {
        return new Promise((res, rej) => {
          const meu = ++id;
          pendentes.set(meu, { resolve: res, reject: rej });
          ws.send(JSON.stringify({ id: meu, method, params: params || {} }));
        });
      },
      eventos,
      fechar() { try { ws.close(); } catch (e) {} },
    }));
  });
}

async function avaliar(c, expression, esperarPromise) {
  const r = await c.chamar('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: !!esperarPromise,
  });
  if (r.exceptionDetails) throw new Error('avaliação falhou: ' + (r.exceptionDetails.exception || {}).description);
  return r.result.value;
}

/* O headless não tem janela: sem Emulation o innerWidth é 0 e toda transição
   fica parada no valor inicial, o que faz uma tela certa parecer invisível. */
async function abrir(c, largura, altura, endereco) {
  await c.chamar('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: 1, mobile: true });
  await c.chamar('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
  });
  await c.chamar('Page.navigate', { url: endereco + '?a=' + Date.now() });
  for (let i = 0; i < 120; i++) {
    const pronto = await avaliar(c, "(document.readyState==='complete'&&location.hostname==='127.0.0.1')||''");
    if (pronto) break;
    await espera(100);
  }
  const dominio = await avaliar(c, 'location.hostname');
  if (dominio !== '127.0.0.1') {
    throw new Error('a página não carregou em 12 s (host: ' + (dominio || 'about:blank')
      + ') — o servidor de arquivos da porta 8765 está de pé?');
  }
}

module.exports = { criarNavegador, conectar, avaliar, espera, abrir, binario };