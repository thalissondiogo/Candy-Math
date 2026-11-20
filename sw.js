/* ===================================================
   CANDY MATH — sw.js (service worker)
   Faz o jogo abrir sem internet depois da primeira visita.

   Estratégia: REDE PRIMEIRO, CACHE COMO RESERVA. Com internet o jogo vem
   sempre da hospedagem (os .js já são servidos com must-revalidate), e cada
   resposta boa também é guardada; sem internet, abre a última guardada.
   "Cache primeiro" seria mais rápido, mas poderia misturar versões numa
   mesma abertura (página nova com script velho).

   O que NUNCA entra no cache: /api/ (voz), qualquer coisa que não seja GET
   e qualquer outra origem (fontes, ícones, Supabase). O progresso da criança
   mora no localStorage do navegador e não passa por aqui.

   Outras origens não são interceptadas DE PROPÓSITO: dentro do service worker
   todo fetch obedece ao connect-src da CSP (vercel.json), que não inclui os
   CDNs de fontes e ícones. Interceptar quebrava as fontes do jogo online.
   Os ícones (fontawesome/) moram no próprio site e entram no cache: sem
   internet eles continuam desenhando. Só as fontes de texto vêm de fora; sem
   internet caem nas do sistema.

   Atualização: VERSAO muda quando a lista de arquivos muda. A versão nova
   assume na hora e apaga os caches antigos — seguro porque, online, todo
   arquivo vem da rede de qualquer jeito.
   =================================================== */
'use strict';

const VERSAO = 'candymath-v4';

// A página fica sob './' (a hospedagem usa URLs limpas: /index.html vira /).
const ESTATICOS = [
  './', 'style.css', 'script.js', 'conteudo.js', 'banco-itens.js', 'guarda-roupa.js', 'mascote.js',
  'metas.js', 'pedagogia.js', 'contas.js', 'privacidade.js', 'como-jogar.js', 'avaliacao.js', 'duelo.js', 'config.js',
  'narracao.js', 'nuvem.js', 'fontawesome/css/fontawesome.min.css', 'fontawesome/css/solid.min.css',
  'fontawesome/webfonts/fa-solid-900.woff2', 'favicon.png', 'favicon.svg', 'manifest.json', 'icon-192.png', 'icon-512.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ESTATICOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

function guardavel(resposta) {
  return resposta && (resposta.ok || resposta.type === 'opaque') && !resposta.redirected;
}

async function redePrimeiro(pedido, chave) {
  const cache = await caches.open(VERSAO);
  try {
    const resposta = await fetch(pedido);
    if (guardavel(resposta)) cache.put(chave || pedido, resposta.clone());
    return resposta;
  } catch (e) {
    const guardada = await cache.match(chave || pedido, { ignoreSearch: true });
    if (guardada) return guardada;
    throw e;
  }
}

self.addEventListener('fetch', (ev) => {
  const pedido = ev.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  // Outra origem: o navegador busca sozinho, como se não houvesse service worker.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/api/') === 0) return;
  // Navegação: a página do jogo (qualquer endereço da raiz) cai na mesma chave.
  const raiz = pedido.mode === 'navigate' && (url.pathname === '/' || /\/index(\.html)?$/.test(url.pathname));
  ev.respondWith(redePrimeiro(pedido, raiz ? new URL('./', self.location).href : null));
});
