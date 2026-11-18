#!/usr/bin/env node
/* ============================================================
   DESAFIO — testes/testar-desafio.js
   O desafio por código do duelo.js, sem navegador: o código vai e volta para
   todo ano e nível, código digitado errado é recusado com recado claro, o
   mesmo código sorteia as mesmas perguntas em qualquer aparelho, e o sorteio
   com semente devolve o Math.random de sempre ao terminar (mesmo com erro).

   O fluxo na tela (criar, jogar, resumo, nível intacto) é conferido em
   navegador real por testes/testar-jogo.js.
   Rodar: node testes/testar-desafio.js
   ============================================================ */
'use strict';

const path = require('path');
const { RAIZ } = require('./_raiz.js');

global.window = {};
require(path.join(RAIZ, 'conteudo.js'));
require(path.join(RAIZ, 'banco-itens.js'));
require(path.join(RAIZ, 'duelo.js'));
const D = global.window.CM_DUELO.desafio;

let checagens = 0;
const problemas = [];
function confere(rotulo, condicao, detalhe) {
  checagens++;
  if (!condicao) problemas.push(rotulo + (detalhe !== undefined ? ' — ' + JSON.stringify(detalhe) : ''));
}

// ── 1. o código vai e volta ──────────────────────────────────
const FORMA = /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{3}$/;
let idaEVolta = true;
let formato = true;
for (let ano = 1; ano <= 9; ano++) {
  for (let nivel = 1; nivel <= 4; nivel++) {
    [0, 1, 777, 524287, 1048575].forEach((semente) => {
      const cod = D.codigo({ ano, nivel, semente });
      if (!FORMA.test(cod)) formato = false;
      const lido = D.ler(cod);
      if (!lido.ok || lido.ano !== ano || lido.nivel !== nivel || lido.semente !== semente || lido.codigo !== cod) idaEVolta = false;
    });
  }
}
confere('todo ano (1–9), nível (1–4) e semente volta igual do código', idaEVolta);
confere('o código tem sempre 7 letras do alfabeto sem I, L, O, U, no formato XXXX-XXX', formato);
const exemplo = D.codigo({ ano: 5, nivel: 2, semente: 12345 });
confere('minúsculas, espaços e sem hífen também valem', D.ler(exemplo.toLowerCase().replace('-', ' ')).ok);
confere('O vira 0 e I/L viram 1 na leitura (letras que confundem)',
  D.ler(exemplo.replace(/0/g, 'O').replace(/1/g, 'I')).codigo === exemplo);

// ── 2. código errado é recusado com recado ──────────────────
const trocado = exemplo.slice(0, 2) + (exemplo[2] === 'A' ? 'B' : 'A') + exemplo.slice(3);
const recusas = [
  ['vazio', ''], ['curto', '1A2B-3C'], ['longo', '1A2B-3C4D'], ['letra que não existe', 'UUUU-UUU'],
  ['uma letra trocada', trocado], ['texto qualquer', '<script>'],
];
recusas.forEach(([nome, texto]) => {
  const r = D.ler(texto);
  confere('recusa código ' + nome + ' com uma frase para a criança', !r.ok && typeof r.erro === 'string' && r.erro.length > 15, r);
});
let falsosAceitos = 0;
for (let i = 0; i < 2000; i++) {
  const s = Array.from({ length: 7 }, () => '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[Math.floor(Math.random() * 32)]).join('');
  if (D.ler(s).ok) falsosAceitos++;
}
confere('códigos digitados ao acaso quase nunca passam (verificador)', falsosAceitos < 20, falsosAceitos);

// ── 3. mesmo código, mesmas perguntas ───────────────────────
const info = D.ler(D.codigo({ ano: 6, nivel: 3, semente: 4242 }));
const a = D.perguntas(info).map((q) => q.txt);
const b = D.perguntas(info).map((q) => q.txt);
confere('o mesmo código sorteia as mesmas cinco perguntas', a.length === 5 && JSON.stringify(a) === JSON.stringify(b), { a, b });
confere('as cinco perguntas do desafio são diferentes entre si', new Set(a).size === 5, a);
const outras = D.perguntas(D.ler(D.codigo({ ano: 6, nivel: 3, semente: 4243 }))).map((q) => q.txt);
confere('outra semente sorteia outra prova', JSON.stringify(outras) !== JSON.stringify(a));
const doAno = D.perguntas(D.ler(D.codigo({ ano: 2, nivel: 1, semente: 9 })));
confere('as perguntas são do ano e do nível do código', doAno.every((q) => q.ano === undefined || (q.ano === 2 && q.nv === 1)), doAno.map((q) => [q.ano, q.nv]));
confere('toda pergunta do desafio tem alternativas para responder', doAno.every((q) => Array.isArray(q.alt) && q.alt.length >= 2));

// ── 4. a semente não vaza para o resto do jogo ──────────────
const original = Math.random;
D.perguntas(info);
confere('depois do sorteio o Math.random volta a ser o de sempre', Math.random === original);
try { D.comSemente(1, () => { throw new Error('quebrou'); }); } catch (e) { /* esperado */ }
confere('mesmo se o sorteio quebrar, o Math.random volta', Math.random === original);
const s1 = D.comSemente(99, () => [Math.random(), Math.random()]);
const s2 = D.comSemente(99, () => [Math.random(), Math.random()]);
confere('a mesma semente dá a mesma sequência', JSON.stringify(s1) === JSON.stringify(s2) && s1[0] >= 0 && s1[0] < 1);

// ── 5. privacidade: o código só carrega ano, nível e semente ─
confere('o código não carrega nome, apelido nem nada do perfil',
  JSON.stringify(Object.keys(D.ler(exemplo)).sort()) === JSON.stringify(['ano', 'codigo', 'nivel', 'ok', 'semente']));

console.log('desafio — código, leitura, sorteio com semente e privacidade');
if (problemas.length) console.log('\n' + problemas.join('\n'));
else console.log('ida e volta, recusas, mesmas perguntas e Math.random intacto: tudo conferido.');
console.log('checagens: ' + checagens + ' · problemas: ' + problemas.length);
process.exitCode = problemas.length ? 1 : 0;
