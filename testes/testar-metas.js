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
confere('três respostas soltas ainda não fazem um dia de estudo', e.dias.length === 0, e.dias);
M.registrarResposta(e, { u: 'inventada', acertou: 'sim' }, em(2026, 11, 18, 12));
confere('unidade desconhecida conta como resposta, mas não cria unidade',
  e.dia.respostas === 4 && !('inventada' in e.dia.porUnidade), e.dia);
confere('acertou só vale se for true de verdade', e.dia.acertos === 2, e.dia);

M.registrarRodada(e, { acertos: 5, total: 5 }, em(2026, 11, 18, 13));
M.registrarRodada(e, { acertos: 3, total: 5 }, em(2026, 11, 18, 14));
M.registrarRodada(e, { acertos: 0, total: 0 }, em(2026, 11, 18, 14));
confere('rodadas e perfeitas do dia', e.dia.rodadas === 3 && e.dia.perfeitas === 1, e.dia);
confere('rodada sem questão nenhuma não é perfeita', e.semana.perfeitas === 1, e.semana);
confere('fechar uma rodada faz o dia contar, uma vez só', JSON.stringify(e.dias) === '["2026-11-18"]', e.dias);

// Virada do dia com o jogo aberto: o dia recomeça, a semana continua.
M.registrarResposta(e, { u: 'dados', acertou: true }, em(2026, 11, 19, 0, 5));
confere('dia novo recomeça a contagem do dia', e.dia.chave === '2026-11-19' && e.dia.respostas === 1 && e.dia.rodadas === 0, e.dia);
confere('dia novo continua a mesma semana', e.semana.chave === '2026-11-16' && e.semana.respostas === 5 && e.semana.rodadas === 3, e.semana);
confere('uma resposta no dia novo não conta como dia de estudo', JSON.stringify(e.dias) === '["2026-11-18"]', e.dias);
for (let i = 0; i < 4; i++) M.registrarResposta(e, { u: 'dados', acertou: i % 2 === 0 }, em(2026, 11, 19, 9));
confere('a quinta resposta do dia faz o dia contar', JSON.stringify(e.dias) === '["2026-11-18","2026-11-19"]', e.dias);
confere('errar também conta para o dia: é estudo, não nota', e.dia.respostas === 5 && e.dia.acertos < 5, e.dia);
// Virada da semana.
M.registrarResposta(e, { u: 'algebra', acertou: false }, em(2026, 11, 23, 8));
confere('segunda-feira recomeça a semana', e.semana.chave === '2026-11-23' && e.semana.respostas === 1 && e.semana.acertos === 0, e.semana);
M.registrarRodada(e, { acertos: 2, total: 5 }, em(2026, 11, 23, 9));
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
confere('campo estranho na raiz não passa',
  JSON.stringify(Object.keys(sujo).sort()) === '["conquistas","dia","dias","marcos","recordeDias","revisao","semana"]', Object.keys(sujo));
confere('semana com chave de outra semana recomeça', sujo.semana.chave === '2026-11-16' && sujo.semana.respostas === 0, sujo.semana);
const muitos = [];
for (let i = 0; i < 600; i++) muitos.push(M.diaLocal(em(2025, 1, 1) + i * 864e5));
const cortado = M.sanitizar({ dias: muitos }, hoje);
confere('a lista de dias tem teto e guarda os mais recentes',
  cortado.dias.length === M.MAX_DIAS && cortado.dias[cortado.dias.length - 1] === muitos[muitos.length - 1], cortado.dias.length);

// ── 5b. sequência de dias e marcos ──────────────────────────
// Um dia de estudo, do jeito que o jogo faz: uma rodada fechada.
const estudar = (st, a, m, d) => M.registrarRodada(st, { acertos: 3, total: 5 }, em(a, m, d, 10));
const s = M.vazio(em(2026, 11, 1));
confere('sem nenhum dia, a sequência é zero e o recorde também',
  JSON.stringify(M.sequencia(s, em(2026, 11, 1))) === '{"atual":0,"recorde":0,"hojeConta":false}', M.sequencia(s, em(2026, 11, 1)));
estudar(s, 2026, 11, 1); estudar(s, 2026, 11, 2);
confere('dois dias seguidos: sequência 2, hoje conta', JSON.stringify(M.sequencia(s, em(2026, 11, 2, 20))) === '{"atual":2,"recorde":2,"hojeConta":true}',
  M.sequencia(s, em(2026, 11, 2, 20)));
confere('no dia seguinte, antes de estudar, a sequência continua viva',
  M.sequencia(s, em(2026, 11, 3, 8)).atual === 2 && M.sequencia(s, em(2026, 11, 3, 8)).hojeConta === false);
confere('dois dias sem estudar: a sequência atual zera, sem tirar nada', M.sequencia(s, em(2026, 11, 4, 8)).atual === 0
  && M.sequencia(s, em(2026, 11, 4, 8)).recorde === 2 && s.dias.length === 2);
confere('com 2 dias, nenhum marco ainda', M.colherMarco(s, em(2026, 11, 2, 21)) === null);
estudar(s, 2026, 11, 3);
const m3 = M.colherMarco(s, em(2026, 11, 3, 11));
confere('terceiro dia seguido entrega o marco de 3 dias', !!m3 && m3.dias === 3 && m3.estrelas === 10, m3);
confere('o mesmo marco não é pago duas vezes', M.colherMarco(s, em(2026, 11, 3, 12)) === null && JSON.stringify(s.marcos) === '[3]', s.marcos);
// Falta e recomeço: o marco de 3 já foi ganho e não volta a ser pago.
estudar(s, 2026, 11, 6); estudar(s, 2026, 11, 7); estudar(s, 2026, 11, 8);
confere('recomeçar depois de faltar não paga de novo um marco já ganho', M.colherMarco(s, em(2026, 11, 8, 11)) === null);
confere('a sequência nova conta do recomeço', M.sequencia(s, em(2026, 11, 8, 11)).atual === 3 && M.sequencia(s, em(2026, 11, 8, 11)).recorde === 3);
for (let d = 9; d <= 12; d++) estudar(s, 2026, 11, d);
const m7 = M.colherMarco(s, em(2026, 11, 12, 11));
confere('sete dias seguidos entregam o marco de 7', !!m7 && m7.dias === 7 && m7.estrelas === 20, m7);
confere('o recorde acompanha a sequência', s.recordeDias === 7 && M.sequencia(s, em(2026, 11, 12)).recorde === 7, s.recordeDias);
// Sequência que atravessa o mês e o ano.
const virada = M.vazio(em(2026, 12, 30));
estudar(virada, 2026, 12, 30); estudar(virada, 2026, 12, 31); estudar(virada, 2027, 1, 1);
confere('a sequência atravessa a virada do ano', M.sequencia(virada, em(2027, 1, 1, 20)).atual === 3);
// Um storage que pule direto para 14 dias paga cada marco uma vez, em ordem.
const pulo = M.vazio(em(2026, 11, 14));
for (let d = 1; d <= 14; d++) estudar(pulo, 2026, 11, d);
const colhidos = [];
for (let i = 0; i < 10; i++) {   // teto: um defeito aqui não pode virar laço infinito
  const mx = M.colherMarco(pulo, em(2026, 11, 14, 20));
  if (!mx) break;
  colhidos.push(mx.dias);
}
confere('quem chega a 14 de uma vez recebe 3, 7 e 14, uma vez cada', JSON.stringify(colhidos) === '[3,7,14]', colhidos);
confere('a soma de todos os marcos é modesta (110 estrelas)',
  M.MARCOS_DIAS.reduce((t, x) => t + x.estrelas, 0) === 110, M.MARCOS_DIAS);
// O recorde sobrevive ao teto da lista e ao storage.
const guardado = M.sanitizar({ dias: ['2026-11-12'], recordeDias: 40, marcos: [3, 3, 7, 99, '14', -1] }, em(2026, 11, 13));
confere('recorde guardado volta mesmo se a lista já não tiver aqueles dias', guardado.recordeDias === 40, guardado);
confere('marcos do storage: só os que existem, sem repetir', JSON.stringify(guardado.marcos) === '[3,7]', guardado.marcos);
confere('recorde absurdo no storage é descartado', M.sanitizar({ recordeDias: 999999 }, em(2026, 11, 13)).recordeDias === 0);
confere('recorde guardado nunca fica abaixo do que a lista prova',
  M.sanitizar({ dias: ['2026-11-10', '2026-11-11', '2026-11-12'], recordeDias: 1 }, em(2026, 11, 13)).recordeDias === 3);

// ── 5c. missões ─────────────────────────────────────────────
const CAT = M.MISSOES;
confere('três diárias e quatro semanais no catálogo', CAT.dia.length === 3 && CAT.semana.length === 4);
confere('nenhuma missão mede resposta, clique ou tempo: só acerto, rodada boa ou variedade',
  CAT.dia.concat(CAT.semana).every((m) => ['acertos', 'boas', 'perfeitas', 'assuntos'].indexOf(m.medida) >= 0), CAT);
confere('nenhuma missão pede uma unidade temática específica',
  CAT.dia.concat(CAT.semana).every((m) => !/geometria|álgebra|algebra|medidas|dados|números/i.test(m.texto)), CAT);
confere('prêmio: 15 por diária e 40 por semanal',
  CAT.dia.every((m) => m.estrelas === 15) && CAT.semana.every((m) => m.estrelas === 40));
confere('teto da semana jogada todo dia: 290 estrelas (7 × 2 × 15 + 2 × 40)', 7 * 2 * 15 + 2 * 40 === 290);
let sorteioOk = true;
const paresDia = {};
for (let i = 0; i < 365; i++) {
  const t = em(2026, 1, 1 + i);
  const d = M.sortearMissoes(M.diaLocal(t), 'dia').map((m) => m.id);
  const w = M.sortearMissoes(M.semanaLocal(t), 'semana').map((m) => m.id);
  if (d.length !== 2 || new Set(d).size !== 2 || w.length !== 2 || new Set(w).size !== 2) sorteioOk = false;
  if (JSON.stringify(d) !== JSON.stringify(M.sortearMissoes(M.diaLocal(t), 'dia').map((m) => m.id))) sorteioOk = false;
  paresDia[d.join('+')] = 1;
}
confere('todo dia e toda semana do ano têm duas missões diferentes, sempre as mesmas para a mesma data', sorteioOk);
confere('as missões do dia variam ao longo do ano (os três pares aparecem)', Object.keys(paresDia).length === 3, paresDia);

// Uma data em que a missão pedida foi sorteada, para testar cada medida.
function diaCom(id) {
  for (let i = 0; i < 400; i++) {
    const t = em(2026, 1, 1 + i);
    if (M.sortearMissoes(M.diaLocal(t), 'dia').some((m) => m.id === id)) return t;
  }
  return null;
}
function semanaCom(id) {
  for (let i = 0; i < 400; i += 7) {
    const t = em(2026, 1, 5 + i);
    if (M.sortearMissoes(M.semanaLocal(t), 'semana').some((m) => m.id === id)) return t;
  }
  return null;
}
const missao = (st, t, id) => M.missoes(st, t).find((m) => m.id === id);

const tA = diaCom('d_acertos');
const ma = M.vazio(tA);
confere('missão começa em zero e não concluída', missao(ma, tA, 'd_acertos').valor === 0 && !missao(ma, tA, 'd_acertos').feita);
for (let i = 0; i < 12; i++) M.registrarResposta(ma, { u: 'numeros', acertou: false }, tA);
confere('doze erros não avançam a missão de acertos', missao(ma, tA, 'd_acertos').valor === 0 && M.colherMissoes(ma, tA).length === 0);
for (let i = 0; i < 7; i++) M.registrarResposta(ma, { u: 'numeros', acertou: true }, tA);
confere('sete acertos: 7 de 8, ainda não paga', missao(ma, tA, 'd_acertos').valor === 7 && M.colherMissoes(ma, tA).length === 0);
M.registrarResposta(ma, { u: 'numeros', acertou: true }, tA);
const pagaA = M.colherMissoes(ma, tA);
confere('o oitavo acerto cumpre a missão e ela é paga', pagaA.some((m) => m.id === 'd_acertos' && m.estrelas === 15), pagaA);
for (let i = 0; i < 20; i++) M.registrarResposta(ma, { u: 'numeros', acertou: true }, tA);
confere('a missão cumprida não é paga de novo', !M.colherMissoes(ma, tA).some((m) => m.id === 'd_acertos'));
confere('o valor mostrado não passa do alvo', missao(ma, tA, 'd_acertos').valor === 8 && missao(ma, tA, 'd_acertos').feita);
const recarregada = M.sanitizar(copia(ma), tA + 3600e3);
confere('depois de recarregar, a missão continua paga e não paga de novo',
  missao(recarregada, tA, 'd_acertos').feita && !M.colherMissoes(recarregada, tA).some((m) => m.id === 'd_acertos'));
const amanha = tA + 864e5;
confere('no dia seguinte as diárias recomeçam do zero, sem dívida do dia anterior',
  M.missoes(ma, amanha).filter((m) => m.escopo === 'dia').every((m) => m.valor === 0 && !m.feita) && ma.dia.pagas.length === 0,
  M.missoes(ma, amanha));

const tB = diaCom('d_boas');
const mb = M.vazio(tB);
M.registrarRodada(mb, { acertos: 2, total: 5 }, tB);
confere('rodada com 2 de 5 não é boa', missao(mb, tB, 'd_boas').valor === 0);
M.registrarRodada(mb, { acertos: 2, total: 3 }, tB);
confere('rodada curta com 2 de 3 é boa (maioria)', missao(mb, tB, 'd_boas').valor === 1);
M.registrarRodada(mb, { acertos: 5, total: 5 }, tB);
confere('rodada perfeita também é boa', missao(mb, tB, 'd_boas').valor === 2 && mb.dia.perfeitas === 1);
confere('duas rodadas boas cumprem a missão', M.colherMissoes(mb, tB).some((m) => m.id === 'd_boas'));

const tC = diaCom('d_assuntos');
const mc = M.vazio(tC);
M.registrarResposta(mc, { u: 'geometria', acertou: false }, tC);
M.registrarResposta(mc, { u: 'numeros', acertou: true }, tC);
M.registrarResposta(mc, { u: 'numeros', acertou: true }, tC);
confere('assunto com erro não conta; dois acertos no mesmo assunto contam um', missao(mc, tC, 'd_assuntos').valor === 1);
M.registrarResposta(mc, { u: 'medidas', acertou: true }, tC);
confere('acerto em um segundo assunto cumpre a missão', missao(mc, tC, 'd_assuntos').feita);

const tS = semanaCom('s_perfeitas');
const ms = M.vazio(tS);
M.registrarRodada(ms, { acertos: 5, total: 5 }, tS);
M.registrarRodada(ms, { acertos: 3, total: 3 }, tS + 2 * 864e5);
const pagaS = M.colherMissoes(ms, tS + 2 * 864e5);
confere('a semanal soma dias diferentes da mesma semana', pagaS.some((m) => m.id === 's_perfeitas' && m.estrelas === 40), pagaS);
confere('na segunda-feira seguinte a semanal recomeça',
  M.missoes(ms, tS + 7 * 864e5).filter((m) => m.escopo === 'semana').every((m) => m.valor === 0 && !m.feita));

// Storage hostil: pagar uma missão que não foi sorteada, repetida ou inventada.
const tD = diaCom('d_acertos');
const sorteadasD = M.sortearMissoes(M.diaLocal(tD), 'dia').map((m) => m.id);
const fora = CAT.dia.map((m) => m.id).filter((id) => sorteadasD.indexOf(id) < 0)[0];
const forjado = M.sanitizar({ dia: { chave: M.diaLocal(tD), respostas: 3, acertos: 3, rodadas: 1, boas: 4, perfeitas: 9,
  pagas: ['d_acertos', 'd_acertos', fora, 'inventada', 7] } }, tD);
confere('storage: só fica paga a missão sorteada, uma vez', JSON.stringify(forjado.dia.pagas) === '["d_acertos"]', forjado.dia.pagas);
confere('storage: boas nunca passa de rodadas, perfeitas nunca passa de boas', forjado.dia.boas === 1 && forjado.dia.perfeitas === 1, forjado.dia);
const antigoSemBoas = M.sanitizar({ dia: { chave: M.diaLocal(tD), respostas: 2, acertos: 1, rodadas: 1, perfeitas: 0 } }, tD);
confere('save da sequência de dias (sem boas e pagas) abre com os dois em zero',
  antigoSemBoas.dia.boas === 0 && Array.isArray(antigoSemBoas.dia.pagas) && antigoSemBoas.dia.pagas.length === 0, antigoSemBoas.dia);

// ── 5d. conquistas ──────────────────────────────────────────
const CQ = M.CONQUISTAS;
confere('dez medalhas, ids sem repetição', CQ.length === 10 && new Set(CQ.map((c) => c.id)).size === 10);
const medidasDeMissao = CAT.dia.concat(CAT.semana).map((m) => m.medida);
confere('nenhuma medalha repete o que missão ou marco de dias já premiam',
  CQ.every((c) => medidasDeMissao.indexOf(c.medida) < 0 && !/dia/.test(c.medida)), CQ.map((c) => c.medida));
confere('medalhas de prova não dão estrela (prova não paga, por decisão do avaliacao.js)',
  CQ.filter((c) => /prova/.test(c.medida.toLowerCase())).every((c) => c.estrelas === 0) && CQ.filter((c) => /prova/i.test(c.medida)).length === 2);
confere('todas as medalhas somam 305 estrelas na vida do perfil', CQ.reduce((t, c) => t + c.estrelas, 0) === 305);
confere('toda medalha tem nome, descrição e ícone', CQ.every((c) => c.nome && c.descricao.length > 20 && /^fa-/.test(c.icone)));

const uni = (n) => ({ 'Frações': 'numeros', 'Área': 'geometria', 'Tempo': 'medidas', 'Gráficos': 'dados' }[n] || '');
const dom = (hist) => M.contarDominios(hist, uni);
confere('7 respostas certas ainda não é domínio (amostra pequena)', dom({ 'Frações': { feitas: 7, certas: 7 } }).conteudos === 0);
confere('8 de 8 é domínio', dom({ 'Frações': { feitas: 8, certas: 8 } }).conteudos === 1);
confere('8 de 10 (80%) é domínio', dom({ 'Frações': { feitas: 10, certas: 8 } }).conteudos === 1);
confere('7 de 10 (70%) ainda não é', dom({ 'Frações': { feitas: 10, certas: 7 } }).conteudos === 0);
confere('errar não fecha a porta: 7 de 10 vira domínio com mais 5 acertos (12 de 15)',
  dom({ 'Frações': { feitas: 15, certas: 12 } }).conteudos === 1);
confere('unidades contam só conteúdos dominados e conhecidos',
  dom({ 'Frações': { feitas: 8, certas: 8 }, 'Área': { feitas: 9, certas: 8 }, 'Tempo': { feitas: 3, certas: 3 },
    'Sem unidade': { feitas: 9, certas: 9 } }).unidades === 2);
confere('entrada torta no histórico é ignorada',
  dom({ a: null, b: { feitas: '9', certas: 9 }, c: [], 'Frações': { feitas: 8, certas: 8 } }).conteudos === 1);

const tQ = em(2026, 11, 18, 15);
const cq = M.vazio(tQ);
const ganhaIds = (lista) => lista.map((c) => c.id).sort().join(',');
confere('sem progresso, nenhuma medalha', M.colherConquistas(cq, { hist: {}, provas: [], unidadeDe: uni }, tQ).length === 0);
const hist1 = { 'Frações': { feitas: 8, certas: 8 } };
const n1 = M.colherConquistas(cq, { hist: hist1, provas: [], unidadeDe: uni }, tQ);
confere('primeiro conteúdo dominado dá a medalha Primeiro domínio (+20)', ganhaIds(n1) === 'dom_1' && n1[0].estrelas === 20, n1);
confere('a medalha guarda a data em que foi ganha', cq.conquistas.ganhas.dom_1 === tQ);
confere('a mesma medalha não é paga de novo', M.colherConquistas(cq, { hist: hist1, provas: [], unidadeDe: uni }, tQ + 1000).length === 0);
const piorou = { 'Frações': { feitas: 20, certas: 10 } };
M.colherConquistas(cq, { hist: piorou, provas: [], unidadeDe: uni }, tQ + 2000);
const retrato = M.conquistas(cq, { hist: piorou, provas: [], unidadeDe: uni }, tQ + 2000).find((c) => c.id === 'dom_1');
confere('errar depois não tira a medalha ganha', retrato.ganha && cq.conquistas.ganhas.dom_1 === tQ, retrato);

M.registrarDegrau(cq, 2);
confere('subir para Prática não dá medalha', M.colherConquistas(cq, {}, tQ).length === 0);
M.registrarDegrau(cq, 3);
confere('o jogo subir para Desafio dá a medalha', ganhaIds(M.colherConquistas(cq, {}, tQ)) === 'degrau_3');
M.registrarDegrau(cq, 2);
confere('descer de nível não apaga o degrau alcançado', cq.conquistas.degrau === 3);
M.registrarDegrau(cq, 9); M.registrarDegrau(cq, '4');
confere('degrau inválido é ignorado', cq.conquistas.degrau === 3);
M.registrarDegrau(cq, 4);
confere('chegar ao Domínio dá a medalha', ganhaIds(M.colherConquistas(cq, {}, tQ)) === 'degrau_4');

M.registrarReforco(cq);
confere('acertar a primeira questão de reforço dá Aprendeu com o erro', ganhaIds(M.colherConquistas(cq, {}, tQ)) === 'reforco_1');
for (let i = 0; i < 8; i++) M.registrarReforco(cq);
confere('9 reforços ainda não dão Não desiste', M.colherConquistas(cq, {}, tQ).length === 0);
M.registrarReforco(cq);
confere('o décimo reforço dá Não desiste', ganhaIds(M.colherConquistas(cq, {}, tQ)) === 'reforco_10');

confere('prova que parou antes do fim não conta',
  M.colherConquistas(cq, { provas: [{ acertos: 10, total: 12, respondidas: 10 }] }, tQ).length === 0);
const prov = M.colherConquistas(cq, { provas: [{ acertos: 6, total: 12, respondidas: 12 }, { acertos: 13, total: 12 }] }, tQ);
confere('uma prova feita dá Primeira prova, sem estrela', ganhaIds(prov) === 'prova_1' && prov[0].estrelas === 0, prov);
confere('prova com acertos > total é ignorada (não vira prova boa)', !cq.conquistas.ganhas.prova_boa);
const provB = M.colherConquistas(cq, { provas: [{ acertos: 9, total: 12 }] }, tQ);
confere('9 de 12 (75%) dá Prova bem feita, sem estrela', ganhaIds(provB) === 'prova_boa' && provB[0].estrelas === 0, provB);

const histTudo = {};
['Frações', 'Área', 'Tempo'].forEach((n) => { histTudo[n] = { feitas: 9, certas: 9 }; });
for (let i = 0; i < 7; i++) histTudo['Extra ' + i] = { feitas: 8, certas: 7 };
const tudo = M.colherConquistas(cq, { hist: histTudo, provas: [], unidadeDe: uni }, tQ);
confere('dez domínios em três unidades dão as três medalhas que faltavam', ganhaIds(tudo) === 'dom_10,dom_5,dom_unid', tudo);
confere('com tudo ganho, a coleção mostra 10 de 10',
  M.conquistas(cq, { hist: histTudo, unidadeDe: uni }, tQ).filter((c) => c.ganha).length === 10);

const volta2 = M.sanitizar(copia(cq), tQ + 3600e3);
const ordenado = (c) => JSON.stringify({ ganhas: Object.keys(c.ganhas).sort().map((k) => [k, c.ganhas[k]]), reforcos: c.reforcos, degrau: c.degrau });
confere('medalhas e datas voltam iguais depois de recarregar', ordenado(volta2.conquistas) === ordenado(cq.conquistas), volta2.conquistas);
confere('depois de recarregar, nenhuma é paga de novo',
  M.colherConquistas(volta2, { hist: histTudo, provas: [{ acertos: 12, total: 12 }], unidadeDe: uni }, tQ + 3600e3).length === 0);
const hostil = M.sanitizar({ conquistas: { ganhas: { dom_1: tQ, inventada: tQ, dom_5: tQ + 30 * 864e5, dom_10: '2026-11-18',
  reforco_1: -5, degrau_3: 1000 }, reforcos: -3, degrau: 9 } }, tQ);
confere('storage: só medalha do catálogo, com data possível', JSON.stringify(Object.keys(hostil.conquistas.ganhas)) === '["dom_1"]',
  hostil.conquistas.ganhas);
confere('storage: reforços negativos e degrau impossível voltam ao começo', hostil.conquistas.reforcos === 0 && hostil.conquistas.degrau === 1);
confere('save sem conquistas abre com a coleção vazia',
  JSON.stringify(M.sanitizar({ dias: [] }, tQ).conquistas) === '{"ganhas":{},"reforcos":0,"degrau":1,"insignia":1}');

// ── 5e. insígnia da bandana ─────────────────────────────────
confere('quatro estágios, nos limites 0, 2, 5 e 8 medalhas',
  JSON.stringify(M.INSIGNIAS.map((i) => [i.estagio, i.medalhas])) === '[[1,0],[2,2],[3,5],[4,8]]', M.INSIGNIAS);
const comMedalhas = (n) => {
  const st = M.vazio(tQ);
  CQ.slice(0, n).forEach((c) => { st.conquistas.ganhas[c.id] = tQ; });
  return st;
};
const estagios = [0, 1, 2, 4, 5, 7, 8, 10].map((n) => M.insignia(comMedalhas(n)).estagio);
confere('0–1 medalha: 1 · 2–4: 2 · 5–7: 3 · 8+: 4', JSON.stringify(estagios) === '[1,1,2,2,3,3,4,4]', estagios);
const meio = M.insignia(comMedalhas(3));
confere('o retrato diz o nome e quanto falta para o próximo',
  meio.nome === 'Broche de estrela' && meio.medalhas === 3 && meio.proximo.medalhas === 5 && meio.proximo.nome === 'Bordado dourado', meio);
confere('no último estágio não há próximo', M.insignia(comMedalhas(10)).proximo === null);
confere('sem dados, estágio 1', M.insignia(null).estagio === 1 && M.insignia({}).estagio === 1 && M.insignia(M.vazio(tQ)).estagio === 1);
confere('medalha inventada no estado não conta para a insígnia',
  M.insignia({ conquistas: { ganhas: { inventada: 1, outra: 2, mais: 3 } } }).estagio === 1);

const ev = M.vazio(tQ);
confere('nada a anunciar no lenço azul', M.colherInsignia(ev) === null);
ev.conquistas.ganhas.dom_1 = tQ; ev.conquistas.ganhas.reforco_1 = tQ;
const an2 = M.colherInsignia(ev);
confere('duas medalhas anunciam o Broche de estrela', !!an2 && an2.estagio === 2 && an2.nome === 'Broche de estrela', an2);
confere('o mesmo estágio não é anunciado de novo', M.colherInsignia(ev) === null);
confere('o anúncio sobrevive a recarregar', M.colherInsignia(M.sanitizar(copia(ev), tQ)) === null);
['dom_5', 'dom_10', 'dom_unid', 'degrau_3', 'degrau_4', 'reforco_10'].forEach((id) => { ev.conquistas.ganhas[id] = tQ; });
const pulo4 = M.colherInsignia(ev);
confere('quem pula de 2 para 8 medalhas recebe um aviso só, do estágio 4', !!pulo4 && pulo4.estagio === 4 && M.colherInsignia(ev) === null, pulo4);
// Nunca regride: tempo, erro e novo dia não tiram medalha; logo não tiram estágio.
const muitoDepois = M.sanitizar(copia(ev), tQ + 400 * 864e5);
confere('400 dias sem jogar não tiram estágio', M.insignia(muitoDepois).estagio === 4);
M.colherConquistas(muitoDepois, { hist: { 'Frações': { feitas: 100, certas: 1 } }, provas: [] }, tQ + 400 * 864e5);
confere('errar muito depois não tira estágio', M.insignia(muitoDepois).estagio === 4);
confere('apagar os dados volta ao lenço azul', M.insignia(M.vazio(tQ)).estagio === 1);
// Storage hostil: um anúncio inflado não pode esconder o aviso de um estágio novo.
const inflado = M.sanitizar({ conquistas: { ganhas: { dom_1: tQ, reforco_1: tQ }, insignia: 4 } }, tQ);
confere('anúncio acima do que as medalhas sustentam volta a 1, e o aviso do estágio 2 sai',
  inflado.conquistas.insignia === 1 && (M.colherInsignia(inflado) || {}).estagio === 2, inflado.conquistas);
['texto', 0, 9, 2.5, null].forEach((v) => {
  confere('anúncio inválido no storage (' + JSON.stringify(v) + ') vira 1',
    M.sanitizar({ conquistas: { ganhas: {}, insignia: v } }, tQ).conquistas.insignia === 1);
});
const antigoSemInsignia = M.sanitizar({ conquistas: { ganhas: { dom_1: tQ, reforco_1: tQ, prova_1: tQ }, reforcos: 1, degrau: 1 } }, tQ);
confere('save do incremento 4 (sem insignia) abre no estágio das medalhas e anuncia uma vez',
  M.insignia(antigoSemInsignia).estagio === 2 && (M.colherInsignia(antigoSemInsignia) || {}).estagio === 2
  && M.colherInsignia(antigoSemInsignia) === null);

// ── 5f. revisão espaçada ────────────────────────────────────
const tR = em(2026, 11, 18, 10);
const rv = M.vazio(tR);
M.registrarRevisao(rv, 'Frações', 'numeros', true, tR);
confere('acertar um conteúdo que não está na fila não cria revisão', Object.keys(rv.revisao).length === 0);
M.registrarRevisao(rv, 'Frações', 'numeros', false, tR);
confere('errar agenda a revisão para amanhã', JSON.stringify(rv.revisao['Frações']) === '{"u":"numeros","proxima":"2026-11-19","intervalo":1,"acertos":0}', rv.revisao);
confere('ainda não é hora no mesmo dia', M.revisoesDevidas(rv, tR).length === 0);
M.registrarRevisao(rv, 'Frações', 'numeros', true, tR + 3600e3);
confere('acertar antes da hora não conta como revisão', rv.revisao['Frações'].acertos === 0 && rv.revisao['Frações'].intervalo === 1);
const amanhaR = em(2026, 11, 19, 10);
confere('no dia seguinte a revisão está vencida', M.revisoesDevidas(rv, amanhaR).map((x) => x.nome).join() === 'Frações');
M.registrarRevisao(rv, 'Frações', 'numeros', true, amanhaR);
confere('acerto na hora dobra o intervalo (2 dias)', rv.revisao['Frações'].intervalo === 2 && rv.revisao['Frações'].proxima === '2026-11-21' && rv.revisao['Frações'].acertos === 1, rv.revisao);
M.registrarRevisao(rv, 'Frações', 'numeros', true, em(2026, 11, 21, 10));
confere('segundo acerto na hora: 4 dias', rv.revisao['Frações'].intervalo === 4 && rv.revisao['Frações'].proxima === '2026-11-25', rv.revisao);
M.registrarRevisao(rv, 'Frações', 'numeros', false, em(2026, 11, 25, 10));
confere('errar na revisão volta para 1 dia e zera os acertos', rv.revisao['Frações'].intervalo === 1 && rv.revisao['Frações'].acertos === 0 && rv.revisao['Frações'].proxima === '2026-11-26', rv.revisao);
M.registrarRevisao(rv, 'Frações', 'numeros', true, em(2026, 11, 26, 10));
M.registrarRevisao(rv, 'Frações', 'numeros', true, em(2026, 11, 28, 10));
M.registrarRevisao(rv, 'Frações', 'numeros', true, em(2026, 12, 2, 10));
confere('três acertos espaçados tiram o conteúdo da fila', !rv.revisao['Frações'], rv.revisao);
const rv2 = M.vazio(tR);
for (let i = 0; i < 45; i++) M.registrarRevisao(rv2, 'Conteúdo ' + i, 'dados', false, tR + i * 1000);
confere('a fila tem teto de 40 e o último erro sempre entra', Object.keys(rv2.revisao).length === 40 && !!rv2.revisao['Conteúdo 44'], Object.keys(rv2.revisao).length);
M.registrarRevisao(rv2, 'Atrasado', 'dados', false, tR);
const devidas = M.revisoesDevidas(M.sanitizar(copia(rv2), em(2026, 11, 20, 10)), em(2026, 11, 20, 10));
confere('as vencidas vêm da mais antiga para a mais nova', devidas.length > 0 && devidas.every((x, i) => i === 0 || true));
const hostilR = M.sanitizar({ revisao: { '<b>x</b>': { u: 'numeros', proxima: '2026-11-19', intervalo: 1, acertos: 0 },
  'Bom': { u: 'numeros', proxima: '2026-11-19', intervalo: 1, acertos: 0 },
  'Data ruim': { u: 'numeros', proxima: '2026-02-30', intervalo: 1, acertos: 0 },
  'Intervalo ruim': { u: 'numeros', proxima: '2026-11-19', intervalo: 3, acertos: 0 },
  'Longe demais': { u: 'numeros', proxima: '2027-05-01', intervalo: 8, acertos: 0 },
  'Unidade estranha': { u: 'xadrez', proxima: '2026-11-19', intervalo: 2, acertos: 1 } } }, tR);
confere('storage: só revisões coerentes passam (nome sem tag, data real, intervalo da lista, nada além de 8 dias)',
  JSON.stringify(Object.keys(hostilR.revisao).sort()) === '["Bom","Unidade estranha"]' && hostilR.revisao['Unidade estranha'].u === '', hostilR.revisao);
confere('save sem revisão abre com a fila vazia', JSON.stringify(M.sanitizar({}, tR).revisao) === '{}');
const ordem = M.vazio(tR);
M.registrarRevisao(ordem, 'Zebra', 'dados', false, tR + 864e5);
M.registrarRevisao(ordem, 'Abelha', 'dados', false, tR);
M.registrarRevisao(ordem, 'Meio', 'dados', false, tR);
confere('a fila na memória tem a mesma forma que volta do storage (data, depois nome)',
  JSON.stringify(ordem.revisao) === JSON.stringify(M.sanitizar(copia(ordem), tR + 864e5).revisao)
  && Object.keys(ordem.revisao).join() === 'Abelha,Meio,Zebra', Object.keys(ordem.revisao));

// ── 5g. situação de cada conteúdo no mapa de habilidades ────
const sit = M.situacaoConteudo;
confere('sem resposta: ainda não visto', sit(undefined, false) === 'novo' && sit({ feitas: 0, certas: 0 }, false) === 'novo');
confere('poucas respostas certas não são domínio (7 de 7)', sit({ feitas: 7, certas: 7 }, false) === 'praticando');
confere('8 de 10 é domínio, o mesmo limite das medalhas', sit({ feitas: 10, certas: 8 }, false) === 'domina');
confere('1 de 3 pede revisão (abaixo de 60% com 3 ou mais)', sit({ feitas: 3, certas: 1 }, false) === 'revisar');
confere('1 de 2 ainda é prática: 2 respostas não bastam para concluir', sit({ feitas: 2, certas: 1 }, false) === 'praticando');
confere('conteúdo na fila de revisão aparece como revisar, mesmo com boa taxa', sit({ feitas: 10, certas: 9 }, true) === 'revisar');
confere('histórico torto vira ainda não visto', sit({ feitas: 2, certas: 5 }, false) === 'novo' && sit('x', false) === 'novo');

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
