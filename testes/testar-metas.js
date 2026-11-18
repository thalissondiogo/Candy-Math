#!/usr/bin/env node
/* ============================================================
   METAS — testes/testar-metas.js
   A contabilidade de metas.js sem navegador: datas no fuso do aparelho,
   virada de dia e de semana, contagem por unidade temática, e o storage
   tratado como entrada hostil. Também confere a promessa de privacidade:
   as metas não entram no pacote que sobe para a nuvem.

   O comportamento dentro do jogo (gravar, recarregar, trocar de estudante,
   apagar) é conferido em navegador real por testes/testar-jogo.js.
   Rodar: node testes/testar-metas.js
   ============================================================ */
'use strict';

// Fuso com hora diferente de UTC: é aqui que um toISOString esquecido aparece.
process.env.TZ = 'America/Sao_Paulo';

const fs = require('fs');
const path = require('path');
const { RAIZ } = require('./_raiz.js');

global.window = {};
const M = require(path.join(RAIZ, 'metas.js'));
const CM = require(path.join(RAIZ, 'conteudo.js'));

let checagens = 0;
const problemas = [];
function confere(rotulo, condicao, detalhe) {
  checagens++;
  if (!condicao) problemas.push(rotulo + (detalhe !== undefined ? ' — ' + JSON.stringify(detalhe) : ''));
}
const em = (a, m, d, h, min) => new Date(a, m - 1, d, h || 12, min || 0).getTime();
const copia = (o) => JSON.parse(JSON.stringify(o));

// ── 1. datas locais ─────────────────────────────────────────
confere('módulo exposto no window do navegador', global.window.CM_METAS === M);
// 01:30 UTC do dia 19 ainda é 22:30 do dia 18 em Brasília.
confere('o dia é o do relógio local, não o UTC', M.diaLocal(Date.UTC(2026, 10, 19, 1, 30)) === '2026-11-18',
  M.diaLocal(Date.UTC(2026, 10, 19, 1, 30)));
confere('meia-noite local já é o dia seguinte', M.diaLocal(em(2026, 11, 19, 0, 0)) === '2026-11-19');
confere('quarta-feira pertence à semana da segunda anterior', M.semanaLocal(em(2026, 11, 18)) === '2026-11-16');
confere('domingo fecha a semana que começou na segunda', M.semanaLocal(em(2026, 11, 22, 23, 59)) === '2026-11-16');
confere('segunda-feira abre semana nova', M.semanaLocal(em(2026, 11, 23, 0, 0)) === '2026-11-23');
confere('semana atravessa a virada do ano', M.semanaLocal(em(2027, 1, 1)) === '2026-12-28');
confere('data inexistente é recusada', !M.diaValido('2026-02-30') && !M.diaValido('2026-13-01'));
confere('29 de fevereiro de ano bissexto é aceito', M.diaValido('2028-02-29'));
confere('texto fora do formato é recusado', !M.diaValido('18/11/2026') && !M.diaValido(20261118) && !M.diaValido(''));
confere('diferença de dias atravessa mês e ano', M.diasEntre('2026-12-31', '2027-01-01') === 1
  && M.diasEntre('2026-02-28', '2026-03-01') === 1 && M.diasEntre('2026-11-18', '2026-11-18') === 0);
confere('relógio inválido cai na data de agora em vez de quebrar', M.diaValido(M.diaLocal(NaN)));

// ── 2. molde ────────────────────────────────────────────────
const v = M.vazio(em(2026, 11, 18));
confere('as unidades são as cinco do conteudo.js',
  JSON.stringify(M.UNIDADES.slice().sort()) === JSON.stringify(Object.keys(CM.UNIDADES).sort()),
  { metas: M.UNIDADES, conteudo: Object.keys(CM.UNIDADES) });
confere('molde começa sem nenhum dia', Array.isArray(v.dias) && v.dias.length === 0);
confere('molde abre o dia e a semana atuais', v.dia.chave === '2026-11-18' && v.semana.chave === '2026-11-16');
confere('molde zera todos os contadores', v.dia.respostas === 0 && v.semana.rodadas === 0
  && M.UNIDADES.every((u) => v.dia.porUnidade[u].feitas === 0 && v.dia.porUnidade[u].certas === 0));
confere('dois moldes não compartilham objeto', M.vazio().dia.porUnidade !== M.vazio().dia.porUnidade);

// ── 3. respostas e rodadas ──────────────────────────────────
const e = M.vazio(em(2026, 11, 18, 9));
M.registrarResposta(e, { u: 'numeros', acertou: true }, em(2026, 11, 18, 9));
M.registrarResposta(e, { u: 'numeros', acertou: false }, em(2026, 11, 18, 10));
M.registrarResposta(e, { u: 'geometria', acertou: true }, em(2026, 11, 18, 11));
confere('respostas e acertos do dia', e.dia.respostas === 3 && e.dia.acertos === 2, e.dia);
confere('a semana soma o mesmo que o dia', e.semana.respostas === 3 && e.semana.acertos === 2, e.semana);
confere('cada unidade guarda o próprio placar',
  e.dia.porUnidade.numeros.feitas === 2 && e.dia.porUnidade.numeros.certas === 1
  && e.dia.porUnidade.geometria.feitas === 1 && e.dia.porUnidade.geometria.certas === 1, e.dia.porUnidade);
confere('três respostas no mesmo dia marcam um dia só', JSON.stringify(e.dias) === '["2026-11-18"]', e.dias);
M.registrarResposta(e, { u: 'inventada', acertou: 'sim' }, em(2026, 11, 18, 12));
confere('unidade desconhecida conta como resposta, mas não cria unidade',
  e.dia.respostas === 4 && !('inventada' in e.dia.porUnidade), e.dia);
confere('acertou só vale se for true de verdade', e.dia.acertos === 2, e.dia);

M.registrarRodada(e, { acertos: 5, total: 5 }, em(2026, 11, 18, 13));
M.registrarRodada(e, { acertos: 3, total: 5 }, em(2026, 11, 18, 14));
M.registrarRodada(e, { acertos: 0, total: 0 }, em(2026, 11, 18, 14));
confere('rodadas e perfeitas do dia', e.dia.rodadas === 3 && e.dia.perfeitas === 1, e.dia);
confere('rodada sem questão nenhuma não é perfeita', e.semana.perfeitas === 1, e.semana);
confere('rodada sozinha não marca dia de atividade', e.dias.length === 1);

// Virada do dia com o jogo aberto: o dia recomeça, a semana continua.
M.registrarResposta(e, { u: 'dados', acertou: true }, em(2026, 11, 19, 0, 5));
confere('dia novo recomeça a contagem do dia', e.dia.chave === '2026-11-19' && e.dia.respostas === 1 && e.dia.rodadas === 0, e.dia);
confere('dia novo continua a mesma semana', e.semana.chave === '2026-11-16' && e.semana.respostas === 5 && e.semana.rodadas === 3, e.semana);
confere('dia novo entra na lista de dias', JSON.stringify(e.dias) === '["2026-11-18","2026-11-19"]', e.dias);
// Virada da semana.
M.registrarResposta(e, { u: 'algebra', acertou: false }, em(2026, 11, 23, 8));
confere('segunda-feira recomeça a semana', e.semana.chave === '2026-11-23' && e.semana.respostas === 1 && e.semana.acertos === 0, e.semana);
confere('a lista de dias guarda os dias pulados como ausência, sem inventar',
  JSON.stringify(e.dias) === '["2026-11-18","2026-11-19","2026-11-23"]', e.dias);

// ── 4. persistência: ida e volta pelo JSON ──────────────────
const volta = M.sanitizar(copia(e), em(2026, 11, 23, 9));
confere('o que foi gravado volta igual no mesmo dia', JSON.stringify(volta) === JSON.stringify(e), { volta, e });
const outroDia = M.sanitizar(copia(e), em(2026, 11, 24, 9));
confere('lido em outro dia, o dia recomeça e a semana fica',
  outroDia.dia.chave === '2026-11-24' && outroDia.dia.respostas === 0 && outroDia.semana.respostas === 1, outroDia);
confere('lido em outro dia, a lista de dias fica', outroDia.dias.length === 3);

// ── 5. storage hostil ───────────────────────────────────────
const hoje = em(2026, 11, 18, 15);
[null, undefined, 42, 'texto', [], true, { dias: 'x', dia: [], semana: 7 }].forEach((lixo) => {
  const s = M.sanitizar(lixo, hoje);
  confere('lixo vira molde vazio: ' + JSON.stringify(lixo),
    JSON.stringify(s) === JSON.stringify(M.vazio(hoje)), s);
});
const sujo = M.sanitizar({
  dias: ['2026-11-17', '2026-11-17', '2026-02-30', '2026-11-19', '<b>', 20261116, '2026-11-10', '2099-01-01'],
  dia: { chave: '2026-11-18', respostas: '9', acertos: 50, rodadas: -3, perfeitas: 2.5,
    porUnidade: { numeros: { feitas: 3, certas: 7 }, geometria: { feitas: 1e9, certas: 1 },
      __proto__: { feitas: 1, certas: 1 }, inventada: { feitas: 2, certas: 2 } }, extra: '<script>' },
  semana: { chave: '2026-11-09', respostas: 99 },
  outra: 'coisa',
}, hoje);
confere('dias repetidos, inválidos e futuros saem; o resto fica em ordem',
  JSON.stringify(sujo.dias) === '["2026-11-10","2026-11-17"]', sujo.dias);
confere('número em texto não entra como contador', sujo.dia.respostas === 0, sujo.dia);
confere('acerto nunca passa de resposta', sujo.dia.acertos <= sujo.dia.respostas, sujo.dia);
confere('negativo e fracionário viram zero', sujo.dia.rodadas === 0 && sujo.dia.perfeitas === 0, sujo.dia);
confere('certas nunca passam de feitas na unidade', sujo.dia.porUnidade.numeros.feitas === 3 && sujo.dia.porUnidade.numeros.certas === 3);
confere('contador fora do teto vira zero', sujo.dia.porUnidade.geometria.feitas === 0 && sujo.dia.porUnidade.geometria.certas === 0);
confere('só as cinco unidades sobrevivem',
  JSON.stringify(Object.keys(sujo.dia.porUnidade).sort()) === JSON.stringify(M.UNIDADES.slice().sort()), Object.keys(sujo.dia.porUnidade));
confere('campo estranho no período não passa', !('extra' in sujo.dia));
confere('campo estranho na raiz não passa', JSON.stringify(Object.keys(sujo).sort()) === '["dia","dias","semana"]');
confere('semana com chave de outra semana recomeça', sujo.semana.chave === '2026-11-16' && sujo.semana.respostas === 0, sujo.semana);
const muitos = [];
for (let i = 0; i < 600; i++) muitos.push(M.diaLocal(em(2025, 1, 1) + i * 864e5));
const cortado = M.sanitizar({ dias: muitos }, hoje);
confere('a lista de dias tem teto e guarda os mais recentes',
  cortado.dias.length === M.MAX_DIAS && cortado.dias[cortado.dias.length - 1] === muitos[muitos.length - 1], cortado.dias.length);

// ── 6. privacidade: nada disto sobe para a nuvem ────────────
const nuvem = fs.readFileSync(path.join(RAIZ, 'nuvem.js'), 'utf8');
const pacote = (nuvem.match(/function pacoteDoProgresso\(\)\s*\{[\s\S]*?\n\}/) || [''])[0];
confere('o pacote da nuvem foi encontrado para conferir', pacote.length > 100);
confere('as metas não entram no pacote que sobe para a nuvem', !/metas/.test(pacote));
confere('metas.js não abre conexão nenhuma',
  !/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage/.test(fs.readFileSync(path.join(RAIZ, 'metas.js'), 'utf8')));

console.log('metas — contagem por dia e semana, datas locais e storage hostil');
if (problemas.length) console.log('\n' + problemas.join('\n'));
else console.log('datas, viradas, contagem, sanitização e privacidade: tudo conferido.');
console.log('checagens: ' + checagens + ' · problemas: ' + problemas.length);
process.exitCode = problemas.length ? 1 : 0;
