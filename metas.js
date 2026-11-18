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
       uma questão, na data LOCAL do aparelho;
     · a semana começa na segunda-feira, também na data local.

   Formato guardado (G.metas):
     {
       dias:   ['AAAA-MM-DD', ...]    dias com atividade, em ordem, sem repetir
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
  return { dias: [], dia: periodoVazio(diaLocal(agora)), semana: periodoVazio(semanaLocal(agora)) };
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
  return {
    dias: diasSanit(d.dias, hoje),
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
  const hoje = estado.dia.chave;
  if (estado.dias[estado.dias.length - 1] !== hoje && estado.dias.indexOf(hoje) < 0) {
    estado.dias.push(hoje);
    estado.dias.sort();
    if (estado.dias.length > MAX_DIAS) estado.dias = estado.dias.slice(-MAX_DIAS);
  }
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
  return estado;
}

const CM_METAS = {
  UNIDADES: UNIDADES.slice(),
  MAX_DIAS: MAX_DIAS,
  diaLocal: diaLocal,
  semanaLocal: semanaLocal,
  diaValido: diaValido,
  diasEntre: diasEntre,
  vazio: vazio,
  sanitizar: sanitizar,
  virar: virar,
  registrarResposta: registrarResposta,
  registrarRodada: registrarRodada,
};

if (typeof module !== 'undefined' && module.exports) module.exports = CM_METAS;
root.CM_METAS = CM_METAS;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
