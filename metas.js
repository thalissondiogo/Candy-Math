/* =========================================================
   CANDY MATH — metas.js
   A contabilidade que sustenta as missões, a sequência de dias e as
   conquistas. Este arquivo só conta; quem desenha é o script.js.

   Por que um arquivo à parte, e não mais campos em G.hist:
     · G.hist é o histórico pedagógico por conteúdo. O boletim, o roteiro
       de Recordes e a nuvem leem o formato { feitas, certas } dele, e esse
       formato não muda por causa de motivação.
     · Tudo aqui fica SÓ no aparelho. nuvem.js sobe uma lista fechada de
       campos e esta não está nela — de propósito.
     · Não usa DOM: o mesmo arquivo roda no jogo e no teste em Node.

   O que é contado, e o que não é:
     · uma resposta é um desfecho de questão (o registrarResultado do
       script.js já garante um por questão). Tempo de tela, cliques e
       aberturas do jogo não contam para nada;
     · um dia de atividade é um dia em que a criança respondeu pelo menos
       MIN_RESPOSTAS_DIA questões ou fechou uma rodada, na data LOCAL do
       aparelho. Uma resposta solta não basta: "entrar só para não perder a
       sequência" é exatamente o hábito que não queremos premiar;
     · a sequência de dias é separada da sequência de acertos (G.streak).
       Faltar não tira nada: a sequência só deixa de ser contada, e os
       marcos já ganhos continuam ganhos;
     · a semana começa na segunda-feira, também na data local.

   Formato guardado (G.metas):
     {
       dias:   ['AAAA-MM-DD', ...]    dias com atividade, em ordem, sem repetir
       recordeDias: n                 maior sequência já feita (sobrevive ao teto da lista)
       marcos: [3, 7, ...]            marcos de dias seguidos já premiados (uma vez cada)
       dia:    PERIODO do dia de hoje
       semana: PERIODO da semana atual (chave = data da segunda-feira)
     }
     PERIODO = { chave, respostas, acertos, rodadas, perfeitas,
                 porUnidade: { numeros: { feitas, certas }, ... } }
   ========================================================= */
(function (root) {
'use strict';

// As cinco unidades temáticas da BNCC, com as chaves do conteudo.js. O teste
// confere que as duas listas continuam iguais.
const UNIDADES = ['numeros', 'algebra', 'geometria', 'medidas', 'dados'];

// Pouco mais de um ano de dias guardados: o bastante para recorde e sequência,
// e um teto para o storage nunca crescer sem fim.
const MAX_DIAS = 400;
// Um dia conta com uma rodada fechada ou com este tanto de questões respondidas
// (o tamanho de uma rodada). Errar também conta: aqui se mede estudo, não nota.
const MIN_RESPOSTAS_DIA = 5;
// Marcos de dias seguidos e o prêmio de cada um, pago UMA vez na vida do perfil.
// Somados dão 110 estrelas, perto de uma rodada e meia perfeita do quiz: a
// constância é reconhecida sem virar a fonte principal de estrelas.
const MARCOS_DIAS = [
  { dias: 3, estrelas: 10 },
  { dias: 7, estrelas: 20 },
  { dias: 14, estrelas: 30 },
  { dias: 30, estrelas: 50 },
];
const VALORES_MARCOS = MARCOS_DIAS.map((m) => m.dias);
const TETO = 999999;
const FORMA_DIA = /^\d{4}-\d{2}-\d{2}$/;

// ── datas locais ─────────────────────────────────────────
function doisDigitos(n) { return (n < 10 ? '0' : '') + n; }

function chaveDe(data) {
  return data.getFullYear() + '-' + doisDigitos(data.getMonth() + 1) + '-' + doisDigitos(data.getDate());
}

function emData(agora) {
  const d = new Date(Number.isFinite(agora) ? agora : Date.now());
  return isNaN(d.getTime()) ? new Date() : d;
}

// 'AAAA-MM-DD' no fuso do aparelho. toISOString seria UTC, e às 22h de Brasília
// o "dia" da criança já viraria o seguinte.
function diaLocal(agora) { return chaveDe(emData(agora)); }

// A semana é identificada pela data da sua segunda-feira.
function semanaLocal(agora) {
  const d = emData(agora);
  const recuo = (d.getDay() + 6) % 7;           // segunda = 0 … domingo = 6
  return chaveDe(new Date(d.getFullYear(), d.getMonth(), d.getDate() - recuo));
}

// Uma chave só vale se for uma data de verdade (2026-02-30 não é).
function diaValido(s) {
  if (typeof s !== 'string' || !FORMA_DIA.test(s)) return false;
  const [a, m, d] = s.split('-').map(Number);
  const data = new Date(a, m - 1, d);
  return data.getFullYear() === a && data.getMonth() === m - 1 && data.getDate() === d;
}

// Diferença em dias de calendário entre duas chaves (b − a). Meio-dia evita a
// hora a mais ou a menos de um horário de verão.
function diasEntre(a, b) {
  const [a1, a2, a3] = a.split('-').map(Number);
  const [b1, b2, b3] = b.split('-').map(Number);
  return Math.round((new Date(b1, b2 - 1, b3, 12) - new Date(a1, a2 - 1, a3, 12)) / 864e5);
}

// ── molde e sanitização ──────────────────────────────────
function contador(n) { return Number.isInteger(n) && n >= 0 && n <= TETO ? n : 0; }

function periodoVazio(chave) {
  const porUnidade = {};
  UNIDADES.forEach((u) => { porUnidade[u] = { feitas: 0, certas: 0 }; });
  return { chave: chave, respostas: 0, acertos: 0, rodadas: 0, perfeitas: 0, porUnidade: porUnidade };
}

function vazio(agora) {
  return { dias: [], recordeDias: 0, marcos: [],
    dia: periodoVazio(diaLocal(agora)), semana: periodoVazio(semanaLocal(agora)) };
}

// O que vem do storage é entrada não confiável: cada número volta pelo molde,
// unidade desconhecida é descartada e acerto nunca passa de tentativa.
function periodoSanit(p, chaveAtual) {
  if (!p || typeof p !== 'object' || p.chave !== chaveAtual) return periodoVazio(chaveAtual);
  const out = periodoVazio(chaveAtual);
  out.respostas = contador(p.respostas);
  out.acertos = Math.min(contador(p.acertos), out.respostas);
  out.rodadas = contador(p.rodadas);
  out.perfeitas = Math.min(contador(p.perfeitas), out.rodadas);
  const pu = p.porUnidade && typeof p.porUnidade === 'object' ? p.porUnidade : {};
  UNIDADES.forEach((u) => {
    const h = pu[u];
    if (!h || typeof h !== 'object') return;
    const feitas = contador(h.feitas);
    out.porUnidade[u] = { feitas: feitas, certas: Math.min(contador(h.certas), feitas) };
  });
  return out;
}

// Dias válidos, sem repetição, em ordem, e nenhum depois de hoje: um relógio
// adiantado e depois corrigido não pode deixar um "amanhã" travado na lista.
function diasSanit(lista, hoje) {
  if (!Array.isArray(lista)) return [];
  const vistos = {};
  return lista
    .filter((s) => diaValido(s) && s <= hoje && !vistos[s] && (vistos[s] = true))
    .sort()
    .slice(-MAX_DIAS);
}

// Período de outro dia (ou de outra semana) não é corrigido: é recomeçado.
function sanitizar(bruto, agora) {
  const d = bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? bruto : {};
  const hoje = diaLocal(agora);
  const dias = diasSanit(d.dias, hoje);
  const vistos = {};
  return {
    dias: dias,
    // O recorde guardado nunca fica abaixo do que a própria lista prova.
    // Teto de dez anos: um número maior que isso não veio do jogo.
    recordeDias: Math.max(contador(d.recordeDias) <= 3660 ? contador(d.recordeDias) : 0, maiorSequencia(dias)),
    marcos: Array.isArray(d.marcos)
      ? d.marcos.filter((n) => VALORES_MARCOS.indexOf(n) >= 0 && !vistos[n] && (vistos[n] = true)).sort((a, b) => a - b)
      : [],
    dia: periodoSanit(d.dia, hoje),
    semana: periodoSanit(d.semana, semanaLocal(agora)),
  };
}

// Vira o dia e a semana quando a data muda com o jogo aberto.
function virar(estado, agora) {
  const hoje = diaLocal(agora);
  const semana = semanaLocal(agora);
  if (!estado.dia || estado.dia.chave !== hoje) estado.dia = periodoVazio(hoje);
  if (!estado.semana || estado.semana.chave !== semana) estado.semana = periodoVazio(semana);
  if (!Array.isArray(estado.dias)) estado.dias = [];
  if (!Number.isInteger(estado.recordeDias)) estado.recordeDias = 0;
  if (!Array.isArray(estado.marcos)) estado.marcos = [];
}

// ── sequência de dias ────────────────────────────────────
// Maior trecho de dias consecutivos dentro de uma lista ordenada.
function maiorSequencia(dias) {
  let maior = 0;
  let atual = 0;
  for (let i = 0; i < dias.length; i++) {
    atual = i > 0 && diasEntre(dias[i - 1], dias[i]) === 1 ? atual + 1 : 1;
    if (atual > maior) maior = atual;
  }
  return maior;
}

// Quantos dias seguidos terminam hoje — ou ontem, se hoje ainda não contou.
// "Ainda não estudou hoje" não é falta: o dia não acabou.
function sequenciaAtual(estado, agora) {
  const dias = (estado && estado.dias) || [];
  if (!dias.length) return 0;
  const hoje = diaLocal(agora);
  const ultimo = dias[dias.length - 1];
  if (diasEntre(ultimo, hoje) > 1) return 0;
  let n = 1;
  for (let i = dias.length - 1; i > 0 && diasEntre(dias[i - 1], dias[i]) === 1; i--) n++;
  return n;
}

function sequencia(estado, agora) {
  const hoje = diaLocal(agora);
  const dias = (estado && estado.dias) || [];
  return {
    atual: sequenciaAtual(estado, agora),
    recorde: Math.max((estado && estado.recordeDias) || 0, maiorSequencia(dias)),
    hojeConta: dias[dias.length - 1] === hoje,
  };
}

// Marca o dia de hoje, uma vez, quando ele passa a contar.
function marcarDia(estado) {
  const hoje = estado.dia.chave;
  const conta = estado.dia.respostas >= MIN_RESPOSTAS_DIA || estado.dia.rodadas >= 1;
  if (!conta || estado.dias.indexOf(hoje) >= 0) return;
  estado.dias.push(hoje);
  estado.dias.sort();
  if (estado.dias.length > MAX_DIAS) estado.dias = estado.dias.slice(-MAX_DIAS);
  const atual = sequenciaAtual(estado, diaParaMs(hoje));
  if (atual > estado.recordeDias) estado.recordeDias = atual;
}

function diaParaMs(chave) {
  const [a, m, d] = chave.split('-').map(Number);
  return new Date(a, m - 1, d, 12).getTime();
}

// O primeiro marco alcançado e ainda não premiado. Quem chama paga as estrelas;
// aqui só fica anotado que este marco já foi entregue, para nunca pagar duas vezes.
function colherMarco(estado, agora) {
  if (!estado) return null;
  virar(estado, agora);
  const atual = sequenciaAtual(estado, agora);
  const marco = MARCOS_DIAS.find((m) => atual >= m.dias && estado.marcos.indexOf(m.dias) < 0);
  if (!marco) return null;
  estado.marcos.push(marco.dias);
  estado.marcos.sort((a, b) => a - b);
  return { dias: marco.dias, estrelas: marco.estrelas };
}

// ── eventos ──────────────────────────────────────────────
function somar(periodo, unidade, acertou) {
  periodo.respostas = Math.min(periodo.respostas + 1, TETO);
  if (acertou) periodo.acertos = Math.min(periodo.acertos + 1, TETO);
  const h = periodo.porUnidade[unidade];
  if (h) {
    h.feitas = Math.min(h.feitas + 1, TETO);
    if (acertou) h.certas = Math.min(h.certas + 1, TETO);
  }
}

// Uma questão respondida. É isto que marca o dia como dia de atividade.
function registrarResposta(estado, resposta, agora) {
  if (!estado || !resposta) return estado;
  virar(estado, agora);
  const unidade = UNIDADES.indexOf(resposta.u) >= 0 ? resposta.u : null;
  const acertou = resposta.acertou === true;
  somar(estado.dia, unidade, acertou);
  somar(estado.semana, unidade, acertou);
  marcarDia(estado);
  return estado;
}

// Uma rodada terminada (o resumo abriu). Perfeita = todas as questões certas.
function registrarRodada(estado, rodada, agora) {
  if (!estado || !rodada) return estado;
  virar(estado, agora);
  const perfeita = Number.isInteger(rodada.total) && rodada.total > 0 && rodada.acertos === rodada.total;
  [estado.dia, estado.semana].forEach((p) => {
    p.rodadas = Math.min(p.rodadas + 1, TETO);
    if (perfeita) p.perfeitas = Math.min(p.perfeitas + 1, TETO);
  });
  marcarDia(estado);
  return estado;
}

const CM_METAS = {
  UNIDADES: UNIDADES.slice(),
  MAX_DIAS: MAX_DIAS,
  MIN_RESPOSTAS_DIA: MIN_RESPOSTAS_DIA,
  MARCOS_DIAS: MARCOS_DIAS.map((m) => ({ dias: m.dias, estrelas: m.estrelas })),
  diaLocal: diaLocal,
  semanaLocal: semanaLocal,
  diaValido: diaValido,
  diasEntre: diasEntre,
  vazio: vazio,
  sanitizar: sanitizar,
  virar: virar,
  registrarResposta: registrarResposta,
  registrarRodada: registrarRodada,
  sequencia: sequencia,
  colherMarco: colherMarco,
};

if (typeof module !== 'undefined' && module.exports) module.exports = CM_METAS;
root.CM_METAS = CM_METAS;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
