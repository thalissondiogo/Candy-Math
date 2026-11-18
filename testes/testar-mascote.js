#!/usr/bin/env node
/* Conferência do mascote e do guarda-roupa.

   O defeito que este arquivo existe para não deixar voltar: a loja vendia
   79 peças e o boneco era um ícone de pata com outros ícones soltos por
   cima. Comprar não vestia nada. Aqui a promessa é conferida peça por
   peça — catálogo, desenho, vitrine e ordem de carregamento.

     node testes/testar-mascote.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { RAIZ } = require('./_raiz.js');

global.window = {};
require(path.join(RAIZ, 'guarda-roupa.js'));
require(path.join(RAIZ, 'mascote.js'));
const GR = global.window.CM_GUARDAROPA;
const M = global.window.CM_MASCOTE;

let checagens = 0;
const problemas = [];
const ok = (cond, msg) => { checagens++; if (!cond) problemas.push(msg); };

// ── 1. os dois módulos conversam ─────────────────────────
ok(!!GR, 'guarda-roupa.js não exportou CM_GUARDAROPA');
ok(!!M, 'mascote.js não exportou CM_MASCOTE');
ok(GR.slots.join() === M.slots.join(),
  'os slots do catálogo e os do desenho são diferentes: ' + GR.slots.join() + ' ≠ ' + M.slots.join());
ok(Object.keys(GR.equipVazio()).sort().join() === GR.slots.slice().sort().join(),
  'equipVazio() não cobre exatamente os slots do catálogo');
GR.slots.forEach((s) => ok(!!GR.rotuloSlot[s], 'o slot ' + s + ' não tem rótulo em português'));

// ── 2. toda peça do catálogo existe no desenho ───────────
// Uma peça vendida sem desenho é dinheiro gasto em nada: era exatamente
// o que acontecia antes.
GR.itens.forEach((item) => {
  ok(M.temPeca(item.slot, item.id),
    item.id + ' está à venda no slot ' + item.slot + ' mas mascote.js não sabe desenhá-la');
  const sv = M.svg(Object.assign(GR.equipVazio(), { [item.slot]: item.id }), { corte: 'inteiro' });
  ok(/^<svg[\s>]/.test(sv) && sv.length > 500, item.id + ': o mascote vestido saiu vazio');
  const pc = M.peca(item.slot, item.id);
  ok(/^<svg[\s>]/.test(pc) && pc.length > 80, item.id + ': a vitrine não tem desenho da peça');
  ok(pc.length < sv.length, item.id + ': a vitrine está mais pesada que o boneco inteiro');
});

// ── 3. o desenho é seguro para entrar na página ──────────
// O SVG vai para innerHTML em quatro lugares diferentes. Nada nele pode
// carregar código, apontar para fora nem brigar com outro SVG da página.
{
  const amostras = [M.svg(GR.equipVazio(), { corte: 'inteiro' }),
    M.svg(GR.equipVazio(), { corte: 'busto' }),
    M.svg(GR.equipVazio(), { corte: 'rosto' })];
  GR.itens.forEach((i) => {
    amostras.push(M.peca(i.slot, i.id));
    amostras.push(M.svg(Object.assign(GR.equipVazio(), { [i.slot]: i.id }), { corte: 'rosto' }));
  });
  const juntas = amostras.join('\n');
  ok(!/\sid\s*=/.test(juntas), 'o desenho usa id=: dois mascotes na mesma página colidem');
  ok(!/<script/i.test(juntas), 'o desenho contém <script>');
  ok(!/\son[a-z]+\s*=/i.test(juntas), 'o desenho contém manipulador inline (on...=)');
  ok(!/url\(/.test(juntas), 'o desenho referencia recurso externo por url()');
  ok(!/href\s*=/.test(juntas), 'o desenho referencia recurso externo por href');
  ok(!/undefined|NaN/.test(juntas), 'o desenho tem undefined ou NaN em coordenada');
  amostras.forEach((s, i) => {
    ok((s.match(/</g) || []).length === (s.match(/>/g) || []).length,
      'amostra ' + i + ': tag aberta sem fechar');
  });
}

// ── 4. peças que disputam o mesmo lugar do corpo ─────────
GR.exclusivos.forEach((par) => {
  par.forEach((slot) => ok(GR.slots.indexOf(slot) >= 0, 'exclusividade cita slot inexistente: ' + slot));
  ok(GR.conflitaCom(par[0]).indexOf(par[1]) >= 0, 'conflitaCom não é simétrico para ' + par.join('/'));
  ok(GR.conflitaCom(par[1]).indexOf(par[0]) >= 0, 'conflitaCom não é simétrico para ' + par.join('/'));
  const a = GR.itens.filter((i) => i.slot === par[0]);
  const b = GR.itens.filter((i) => i.slot === par[1]);
  ok(a.length > 0 && b.length > 0, 'exclusividade declarada entre slots sem peças: ' + par.join('/'));
});
// Máscara no slot de chapéu era o bug original: as duas peças caíam no
// mesmo lugar da cabeça e uma escondia a outra.
GR.itens.filter((i) => /mascara|rosto/.test(i.id)).forEach((i) => {
  ok(i.slot === 'mask', i.id + ' veste o rosto mas está guardada no slot ' + i.slot);
});

// ── 5. brindes e categorias apontam para peças reais ─────
GR.itens.forEach((item) => {
  (item.brinde || []).forEach((id) => {
    ok(!!GR.porId(id), item.id + ' promete de brinde ' + id + ', que não existe no catálogo');
  });
  ok(GR.naAba(item.cat).some((i) => i.id === item.id) || item.tipo === 'conjunto',
    item.id + ' não aparece em nenhuma aba da loja (cat=' + item.cat + ')');
});
GR.abas.forEach((aba) => {
  if (aba.cat === 'all' || aba.cat === 'mine') return;
  ok(GR.naAba(aba.cat).length > 0, 'a aba ' + aba.rotulo + ' está vazia');
});

// ── 6. figurinos combinados ──────────────────────────────
// Peça sozinha passing não prova que o conjunto assenta. Aqui vão
// combinações que atravessam todos os slots de uma vez.
{
  const porSlot = {};
  GR.slots.forEach((s) => { porSlot[s] = GR.itens.filter((i) => i.slot === s); });
  let combinados = 0;
  for (let volta = 0; volta < 12; volta++) {
    const e = GR.equipVazio();
    GR.slots.forEach((s) => {
      const lista = porSlot[s];
      if (lista.length) e[s] = lista[(volta * 3 + s.length) % lista.length].id;
    });
    GR.exclusivos.forEach((par) => { e[par[0]] = null; });
    ['inteiro', 'busto', 'rosto'].forEach((corte) => {
      const sv = M.svg(e, { corte: corte });
      ok(/^<svg[\s>]/.test(sv), 'figurino combinado ' + volta + ' (' + corte + ') saiu vazio');
      combinados++;
    });
  }
  ok(combinados === 36, 'esperava 36 conferências de figurino combinado, fiz ' + combinados);
}

// ── 7. a página carrega o desenho antes de quem o usa ────
{
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const ordem = (html.match(/<script src="([^"]+)"/g) || []).map((s) => /"([^"]+)"/.exec(s)[1]);
  ok(ordem.indexOf('mascote.js') >= 0, 'index.html não carrega mascote.js');
  ok(ordem.indexOf('mascote.js') < ordem.indexOf('script.js'),
    'mascote.js precisa vir antes de script.js, senão o boneco nasce sem desenho');
  ok(ordem.indexOf('guarda-roupa.js') < ordem.indexOf('mascote.js'),
    'guarda-roupa.js precisa vir antes de mascote.js');
  ['splashMascote', 'oncaDisplay', 'wdMascote', 'wdSlots', 'wdProva'].forEach((id) => {
    ok(html.indexOf('id="' + id + '"') >= 0, 'index.html não tem o elemento #' + id + ' que o pintor procura');
  });
  ok(!/id="oHat"|id="wdHat"|class="o-layer"|class="wd-layer"/.test(html),
    'sobraram as camadas de ícone antigas no index.html: o boneco antigo não pode coexistir com o novo');
  ok(!/fa-paw/.test(html), 'ainda há pata genérica no lugar do mascote em index.html');

  const script = fs.readFileSync(path.join(RAIZ, 'script.js'), 'utf8');
  ok(!/function aplicarEquipamento/.test(script),
    'aplicarEquipamento (a função que colava ícone no lugar de roupa) ainda existe em script.js');
  ok(/data-acao="limparEquip"/.test(html) && /limparEquip:/.test(script),
    'o botão Tirar tudo não está ligado à ação limparEquip');
}

console.log('mascote — ' + GR.itens.length + ' peças, ' + checagens + ' conferências');
if (problemas.length) {
  problemas.forEach((p) => console.log('  ✗ ' + p));
  console.log('\n=== resultado ===\nproblemas: ' + problemas.length);
  process.exit(1);
}
console.log('todas verdes: catálogo, desenho, vitrine, exclusividade e página.');