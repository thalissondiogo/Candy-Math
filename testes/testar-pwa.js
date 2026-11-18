#!/usr/bin/env node
/* ============================================================
   PWA — testes/testar-pwa.js
   O jogo abre e funciona sem internet depois da primeira visita.

   Sobe o próprio servidor de arquivos (porta 8766), abre o jogo num navegador
   real, espera o service worker assumir e DERRUBA o servidor: daí em diante
   a página só pode vir do cache. Recarrega, joga uma pergunta e confere o
   aviso de "sem internet". Também confere o manifesto, os ícones e que nada
   de /api/ entra no cache.

   Rodar: node testes/testar-pwa.js   (não precisa do servidor da 8765)
   ============================================================ */
'use strict';

const path = require('path');
const { spawn } = require('child_process');
const { RAIZ } = require('./_raiz.js');
const { criarNavegador, conectar, avaliar, espera, abrir } = require('./_navegador.js');

const PORTA_SERVIDOR = 8766;
const BASE = 'http://127.0.0.1:' + PORTA_SERVIDOR + '/index.html';
const nav = criarNavegador(9336, 'pwa');
let servidor = null;   // encerrado também quando o teste falha, senão o processo não termina
let checagens = 0;
const problemas = [];
function confere(rotulo, condicao, detalhe) {
  checagens++;
  if (!condicao) problemas.push(rotulo + (detalhe !== undefined ? ' — ' + JSON.stringify(detalhe) : ''));
}

function subirServidor() {
  const proc = spawn(process.execPath, [path.join(RAIZ, 'testes', 'servidor-estatico.js'), String(PORTA_SERVIDOR)], { stdio: 'ignore' });
  return proc;
}
async function servidorNoAr() {
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch('http://127.0.0.1:' + PORTA_SERVIDOR + '/index.html'); if (r.ok) return true; } catch (e) { /* subindo */ }
    await espera(150);
  }
  return false;
}

async function main() {
  servidor = subirServidor();
  confere('o servidor de teste subiu na porta ' + PORTA_SERVIDOR, await servidorNoAr());
  await nav.portaLivre();
  nav.subir();
  const alvo = await nav.alvo();
  const c = await conectar(alvo.webSocketDebuggerUrl);
  await c.chamar('Page.enable');
  await c.chamar('Runtime.enable');
  await c.chamar('Network.enable');

  // ── 1. primeira visita: manifesto, ícones e service worker ──
  await abrir(c, 390, 844, BASE);
  await avaliar(c, 'localStorage.clear(); true');
  // Sem service worker, .ready nunca resolve: o teste falha em 8 s em vez de travar.
  const pronto = await avaliar(c, "Promise.race([navigator.serviceWorker.ready.then(function(r){ return !!r.active; }), new Promise(function(ok){ setTimeout(function(){ ok(false); }, 8000); })])", true);
  if (!pronto) throw new Error('o service worker não ficou ativo em 8 s (ele está sendo registrado?)');
  confere('o service worker é registrado e fica ativo', pronto === true);
  const manifesto = await avaliar(c, `(async function(){
    var link=document.querySelector('link[rel=manifest]'); var m=await (await fetch(link.href)).json();
    var icones=await Promise.all(m.icons.map(async function(i){ var r=await fetch(i.src); return { src:i.src, ok:r.ok, tipo:r.headers.get('content-type') }; }));
    return { nome:m.name, display:m.display, inicio:m.start_url, lang:m.lang, icones:icones,
      tema:(document.querySelector('meta[name=theme-color]')||{}).content };
  })()`, true);
  confere('o manifesto descreve o app em português, em tela cheia',
    manifesto.nome === 'Candy Math' && manifesto.display === 'standalone' && manifesto.inicio === './' && manifesto.lang === 'pt-BR', manifesto);
  confere('os ícones do manifesto existem (192, 512 e SVG)',
    manifesto.icones.length === 3 && manifesto.icones.every((i) => i.ok), manifesto.icones);
  confere('a página declara a cor do tema', manifesto.tema === '#9B5DE5', manifesto.tema);

  // ── 2. o que foi guardado, e o que não foi ──
  await abrir(c, 390, 844, BASE);   // segunda abertura: o service worker já controla a página
  await espera(500);
  const cache = await avaliar(c, `(async function(){
    var nomes=await caches.keys(), chaves=[];
    for (var i=0;i<nomes.length;i++){ var c=await caches.open(nomes[i]); (await c.keys()).forEach(function(r){ chaves.push(new URL(r.url).pathname); }); }
    return { nomes:nomes, chaves:chaves, controla:!!navigator.serviceWorker.controller };
  })()`, true);
  confere('na segunda abertura o service worker controla a página', cache.controla, cache);
  confere('o cache do jogo tem a página e os scripts essenciais',
    ['/', '/script.js', '/metas.js', '/style.css', '/conteudo.js', '/banco-itens.js', '/mascote.js'].every((p) => cache.chaves.indexOf(p) >= 0), cache.chaves);
  confere('nada de /api/ entra no cache', cache.chaves.every((p) => p.indexOf('/api/') !== 0), cache.chaves);
  confere('os caches têm os nomes desta versão', cache.nomes.indexOf('candymath-v2') >= 0 && cache.nomes.every((n) => /^candymath-/.test(n)), cache.nomes);
  confere('nenhuma outra origem entra no cache (fontes, ícones, Supabase)', cache.chaves.length > 0 && !(await avaliar(c, `(async function(){
    var fora=0, nomes=await caches.keys(); for (var i=0;i<nomes.length;i++){ (await (await caches.open(nomes[i])).keys()).forEach(function(r){ if (new URL(r.url).origin !== location.origin) fora++; }); }
    return fora; })()`, true)));

  // ── 3. sem servidor: a página vem do cache e o jogo funciona ──
  servidor.kill();
  await espera(400);
  confere('o servidor foi derrubado', !(await servidorNoAr().then((x) => x).catch(() => false)) || false);
  await c.chamar('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await abrir(c, 390, 844, BASE);
  await espera(700);
  const off = await avaliar(c, `({ jogo:typeof G!=='undefined', online:navigator.onLine,
    aviso:!document.getElementById('avisoOffline').hidden, texto:document.getElementById('avisoOffline').textContent.trim() })`);
  confere('sem servidor e sem internet, o jogo abre do cache', off.jogo, off);
  confere('o aviso de sem internet aparece e diz o que continua', off.aviso && /os jogos funcionam normalmente/.test(off.texto), off);
  await avaliar(c, "document.getElementById('btnPlay').click(); G.comoJogarVisto.quiz=true; startMode('quiz'); true");
  await espera(800);
  const quiz = await avaliar(c, "({ tela:document.querySelector('.screen.active').id, pergunta:(document.getElementById('quizText')||{}).textContent, alternativas:document.querySelectorAll('#quizAnswers .ans-btn').length })");
  confere('offline, o quiz abre com pergunta e alternativas', quiz.tela === 'screenQuiz' && quiz.pergunta.length > 10 && quiz.alternativas >= 2, quiz);
  await c.chamar('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await espera(400);
  confere('com a internet de volta, o aviso some', await avaliar(c, "document.getElementById('avisoOffline').hidden"));

  // ── 4. nenhum erro de execução ──
  const gritos = c.eventos.filter((e) => e.method === 'Runtime.exceptionThrown');
  confere('nenhum erro de execução no caminho', gritos.length === 0,
    gritos.slice(0, 3).map((e) => ((e.params.exceptionDetails || {}).exception || {}).description));

  await nav.desligar(c);
  console.log('pwa — manifesto, service worker e funcionamento sem internet');
  if (problemas.length) console.log('\n' + problemas.join('\n'));
  else console.log('instalação, cache, abertura sem servidor, quiz offline e aviso: tudo conferido.');
  console.log('checagens: ' + checagens + ' · problemas: ' + problemas.length);
  process.exitCode = problemas.length ? 1 : 0;
}

main().catch((e) => {
  console.log('pwa — o teste não terminou: ' + e.message);
  if (problemas.length) console.log('já apurado:\n' + problemas.join('\n'));
  if (servidor) servidor.kill();
  nav.encerrar();
  process.exitCode = 1;
});
