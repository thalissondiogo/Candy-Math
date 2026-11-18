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
       conquistas: { ganhas: {id: quando}, reforcos: n, degrau: 1..4, insignia: 1..4 }
                                      (insignia = último estágio da bandana já anunciado)
       dia:    PERIODO do dia de hoje
       semana: PERIODO da semana atual (chave = data da segunda-feira)
     }
     PERIODO = { chave, respostas, acertos, rodadas, boas, perfeitas, pagas,
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

// ── missões ──────────────────────────────────────────────
// Só entra aqui o que a criança controla e o que mede aprendizagem: acerto,
// rodada bem resolvida, variedade de assuntos. Errar não avança nada, e
// nenhuma missão pede uma unidade temática específica — o sorteio das
// questões não deixa escolher a unidade, e uma meta dessas viraria repetição
// à espera da sorte (no 1º ano, geometria é ~7% das questões).
// "Rodada boa" = acertou a maioria (3 de 5, 2 de 3).
// Prêmios: 15 por diária, 40 por semanal, cada uma paga uma vez. No máximo
// 290 estrelas numa semana jogada todos os dias; uma rodada perfeita do quiz
// já dá 75 sozinha.
const MISSOES = {
  dia: [
    { id: 'd_acertos', medida: 'acertos', alvo: 8, estrelas: 15, texto: 'Acerte 8 questões' },
    { id: 'd_boas', medida: 'boas', alvo: 2, estrelas: 15, texto: 'Feche 2 rodadas acertando a maioria' },
    { id: 'd_assuntos', medida: 'assuntos', alvo: 2, estrelas: 15, texto: 'Acerte questões de 2 assuntos diferentes' },
  ],
  semana: [
    { id: 's_acertos', medida: 'acertos', alvo: 40, estrelas: 40, texto: 'Acerte 40 questões nesta semana' },
    { id: 's_perfeitas', medida: 'perfeitas', alvo: 2, estrelas: 40, texto: 'Feche 2 rodadas sem errar nenhuma' },
    { id: 's_boas', medida: 'boas', alvo: 5, estrelas: 40, texto: 'Feche 5 rodadas acertando a maioria' },
    // Três é o mínimo de unidades que qualquer ano e nível oferece.
    { id: 's_assuntos', medida: 'assuntos', alvo: 3, estrelas: 40, texto: 'Acerte questões de 3 assuntos diferentes' },
  ],
};
const POR_ESCOPO = 2;

// ── conquistas ───────────────────────────────────────────
// Medalhas de uma vez só, sobre sinais que as missões e os marcos de dias NÃO
// medem: domínio por conteúdo, o degrau que o jogo sobe, acertar a questão de
// reforço que vem depois de um erro e a Prova de Aprendizagem. Total de
// acertos, rodada perfeita e dias seguidos ficam de fora de propósito: já são
// missão ou marco, e premiar duas vezes a mesma coisa é inflação.
// "Dominar" um conteúdo = 8 respostas ou mais e 80% de acerto ou mais (o
// mesmo limite do "Você já domina" dos Recordes, com amostra maior). Errar não
// tira medalha nenhuma: a taxa volta a subir com acertos.
// As da prova não dão estrela: avaliacao.js já decidiu que prova não paga,
// para ninguém fazer prova pelo prêmio.
const DOMINIO_FEITAS = 8;
const DOMINIO_TAXA = 0.8;
const PROVA_BOA = 0.75;
const CONQUISTAS = [
  { id: 'dom_1', icone: 'fa-seedling', estrelas: 20, nome: 'Primeiro domínio', medida: 'dominios', alvo: 1,
    descricao: 'Domine um conteúdo: 8 respostas ou mais, com 80% de acerto.' },
  { id: 'dom_5', icone: 'fa-book-open', estrelas: 40, nome: 'Cinco domínios', medida: 'dominios', alvo: 5,
    descricao: 'Domine 5 conteúdos diferentes.' },
  { id: 'dom_10', icone: 'fa-medal', estrelas: 60, nome: 'Dez domínios', medida: 'dominios', alvo: 10,
    descricao: 'Domine 10 conteúdos diferentes. Subir de nível traz conteúdo novo.' },
  { id: 'dom_unid', icone: 'fa-shapes', estrelas: 50, nome: 'Domínio em 3 unidades', medida: 'unidades', alvo: 3,
    descricao: 'Tenha conteúdos dominados em 3 unidades da matemática (números, álgebra, geometria, medidas ou dados).' },
  { id: 'degrau_3', icone: 'fa-stairs', estrelas: 30, nome: 'Chegou ao Desafio', medida: 'degrau', alvo: 3,
    descricao: 'Suba até o nível Desafio fechando rodadas inteiras. Escolher o nível no seletor não conta.' },
  { id: 'degrau_4', icone: 'fa-mountain', estrelas: 50, nome: 'Chegou ao Domínio', medida: 'degrau', alvo: 4,
    descricao: 'Suba até o nível Domínio fechando rodadas inteiras.' },
  { id: 'reforco_1', icone: 'fa-lightbulb', estrelas: 15, nome: 'Aprendeu com o erro', medida: 'reforcos', alvo: 1,
    descricao: 'No Quiz, depois de errar, acerte a questão parecida que aparece em seguida.' },
  { id: 'reforco_10', icone: 'fa-dumbbell', estrelas: 40, nome: 'Não desiste', medida: 'reforcos', alvo: 10,
    descricao: 'Acerte 10 dessas questões parecidas que vêm depois de um erro.' },
  { id: 'prova_1', icone: 'fa-file-pen', estrelas: 0, nome: 'Primeira prova', medida: 'provas', alvo: 1,
    descricao: 'Faça uma Prova de Aprendizagem até o fim. Prova não vale estrela: vale saber o que ficou.' },
  { id: 'prova_boa', icone: 'fa-award', estrelas: 0, nome: 'Prova bem feita', medida: 'provaBoa', alvo: 1,
    descricao: 'Acerte 75% ou mais de uma Prova de Aprendizagem.' },
];
const IDS_CONQUISTAS = CONQUISTAS.map((c) => c.id);

// ── insígnia da bandana (evolução do mascote) ────────────
// Vem só do número de medalhas, que nunca diminui: ficar sem jogar, errar ou
// gastar estrelas na loja não tira estágio. Não paga nada — as medalhas já
// pagam. Só "Apagar dados" volta ao lenço azul, como volta todo o resto.
const INSIGNIAS = [
  // descricao: o que o leitor de tela ouve depois de "Juba Candy".
  { estagio: 1, medalhas: 0, nome: 'Lenço azul', descricao: '' },
  { estagio: 2, medalhas: 2, nome: 'Broche de estrela', descricao: 'com broche de estrela na bandana' },
  { estagio: 3, medalhas: 5, nome: 'Bordado dourado', descricao: 'com bandana bordada de dourado e broche de estrela' },
  { estagio: 4, medalhas: 8, nome: 'Medalha da confeitaria', descricao: 'com bandana bordada de dourado e a medalha da confeitaria' },
];
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
  return { chave: chave, respostas: 0, acertos: 0, rodadas: 0, boas: 0, perfeitas: 0, pagas: [], porUnidade: porUnidade };
}

function conquistasVazias() { return { ganhas: {}, reforcos: 0, degrau: 1, insignia: 1 }; }

function vazio(agora) {
  return { dias: [], recordeDias: 0, marcos: [], conquistas: conquistasVazias(),
    dia: periodoVazio(diaLocal(agora)), semana: periodoVazio(semanaLocal(agora)) };
}

// Medalha só volta do storage se existir no catálogo e trouxer uma data
// possível: nem antes do jogo existir, nem depois de amanhã.
function conquistasSanit(c, agora) {
  const out = conquistasVazias();
  if (!c || typeof c !== 'object' || Array.isArray(c)) return out;
  const limite = emData(agora).getTime() + 864e5;
  const ganhas = c.ganhas && typeof c.ganhas === 'object' && !Array.isArray(c.ganhas) ? c.ganhas : {};
  IDS_CONQUISTAS.forEach((id) => {
    const q = ganhas[id];
    if (Number.isFinite(q) && q >= Date.UTC(2024, 0, 1) && q <= limite) out.ganhas[id] = Math.round(q);
  });
  out.reforcos = contador(c.reforcos);
  out.degrau = Number.isInteger(c.degrau) && c.degrau >= 1 && c.degrau <= 4 ? c.degrau : 1;
  // O anunciado nunca passa do estágio que as medalhas guardadas sustentam:
  // um número inflado no storage não pode calar o aviso de um estágio novo.
  const sustentado = estagioPorMedalhas(Object.keys(out.ganhas).length);
  out.insignia = Number.isInteger(c.insignia) && c.insignia >= 1 && c.insignia <= sustentado ? c.insignia : 1;
  return out;
}

// O que vem do storage é entrada não confiável: cada número volta pelo molde,
// unidade desconhecida é descartada e acerto nunca passa de tentativa.
function periodoSanit(p, chaveAtual, escopo) {
  if (!p || typeof p !== 'object' || p.chave !== chaveAtual) return periodoVazio(chaveAtual);
  const out = periodoVazio(chaveAtual);
  out.respostas = contador(p.respostas);
  out.acertos = Math.min(contador(p.acertos), out.respostas);
  out.rodadas = contador(p.rodadas);
  out.boas = Math.min(contador(p.boas), out.rodadas);
  out.perfeitas = Math.min(contador(p.perfeitas), out.boas);
  // Só pode estar paga uma missão que é deste período, e uma vez.
  const sorteadas = sortearMissoes(chaveAtual, escopo).map((m) => m.id);
  out.pagas = Array.isArray(p.pagas)
    ? p.pagas.filter((id, i) => sorteadas.indexOf(id) >= 0 && p.pagas.indexOf(id) === i) : [];
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
    conquistas: conquistasSanit(d.conquistas, agora),
    dia: periodoSanit(d.dia, hoje, 'dia'),
    semana: periodoSanit(d.semana, semanaLocal(agora), 'semana'),
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
  if (!estado.conquistas || typeof estado.conquistas !== 'object') estado.conquistas = conquistasVazias();
  [estado.dia, estado.semana].forEach((p) => {
    if (!Array.isArray(p.pagas)) p.pagas = [];
    if (!Number.isInteger(p.boas)) p.boas = 0;
  });
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
  const valida = Number.isInteger(rodada.total) && rodada.total > 0 && Number.isInteger(rodada.acertos);
  const perfeita = valida && rodada.acertos === rodada.total;
  const boa = valida && rodada.acertos * 2 > rodada.total;
  [estado.dia, estado.semana].forEach((p) => {
    p.rodadas = Math.min(p.rodadas + 1, TETO);
    if (boa) p.boas = Math.min((p.boas || 0) + 1, TETO);
    if (perfeita) p.perfeitas = Math.min(p.perfeitas + 1, TETO);
  });
  marcarDia(estado);
  return estado;
}

// Duas missões por período, escolhidas pela própria chave (data do dia ou da
// segunda-feira): a mesma ao recarregar, sem nada gravado que possa ser trocado
// no storage, e variando de um dia para o outro.
function sortearMissoes(chave, escopo) {
  const lista = MISSOES[escopo] || [];
  let h = 0;
  const base = String(chave) + '|' + escopo;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  const restantes = lista.slice();
  const escolhidas = [];
  while (escolhidas.length < POR_ESCOPO && restantes.length) {
    escolhidas.push(restantes.splice(h % restantes.length, 1)[0]);
    h = Math.floor(h / 7) + 13;
  }
  // Ordem fixa do catálogo, para a tela não embaralhar entre um dia e outro.
  return escolhidas.sort((a, b) => lista.indexOf(a) - lista.indexOf(b));
}

function medir(periodo, medida) {
  if (medida === 'assuntos') return UNIDADES.filter((u) => periodo.porUnidade[u] && periodo.porUnidade[u].certas > 0).length;
  return contador(periodo[medida]);
}

// O retrato das missões de agora, para a tela: texto, quanto falta, se já foi.
function missoes(estado, agora) {
  if (!estado) return [];
  virar(estado, agora);
  const saida = [];
  ['dia', 'semana'].forEach((escopo) => {
    const p = estado[escopo];
    sortearMissoes(p.chave, escopo).forEach((m) => {
      const valor = Math.min(medir(p, m.medida), m.alvo);
      saida.push({ id: m.id, escopo: escopo, texto: m.texto, alvo: m.alvo, valor: valor,
        estrelas: m.estrelas, feita: p.pagas.indexOf(m.id) >= 0 || valor >= m.alvo });
    });
  });
  return saida;
}

// As missões que acabaram de ser cumpridas e ainda não foram pagas. Quem chama
// paga as estrelas; aqui fica anotado na hora, para nunca pagar duas vezes.
function colherMissoes(estado, agora) {
  if (!estado) return [];
  virar(estado, agora);
  const novas = [];
  ['dia', 'semana'].forEach((escopo) => {
    const p = estado[escopo];
    sortearMissoes(p.chave, escopo).forEach((m) => {
      if (p.pagas.indexOf(m.id) >= 0 || medir(p, m.medida) < m.alvo) return;
      p.pagas.push(m.id);
      novas.push({ id: m.id, escopo: escopo, texto: m.texto, estrelas: m.estrelas });
    });
  });
  return novas;
}

// Conteúdos dominados no histórico, e em quantas unidades temáticas. O histórico
// guarda o nome do conteúdo; quem sabe a unidade de cada nome é o script.js
// (unidadeDe), que monta essa tabela a partir do banco e dos geradores.
function contarDominios(hist, unidadeDe) {
  const nomes = Object.keys(hist && typeof hist === 'object' ? hist : {}).filter((n) => {
    const h = hist[n];
    return h && Number.isInteger(h.feitas) && Number.isInteger(h.certas)
      && h.feitas >= DOMINIO_FEITAS && h.certas / h.feitas >= DOMINIO_TAXA;
  });
  const unidades = {};
  nomes.forEach((n) => {
    const u = typeof unidadeDe === 'function' ? unidadeDe(n) : '';
    if (UNIDADES.indexOf(u) >= 0) unidades[u] = true;
  });
  return { conteudos: nomes.length, unidades: Object.keys(unidades).length };
}

// A questão de reforço do Quiz (a parecida, depois de errar) foi acertada.
function registrarReforco(estado) {
  if (!estado) return estado;
  virar(estado, Date.now());
  estado.conquistas.reforcos = Math.min(estado.conquistas.reforcos + 1, TETO);
  return estado;
}

// O jogo subiu o nível por fechar a rodada inteira. Só quem chama isso é o fim
// de rodada: escolher o nível no seletor não passa por aqui.
function registrarDegrau(estado, nivel) {
  if (!estado || !Number.isInteger(nivel) || nivel < 1 || nivel > 4) return estado;
  virar(estado, Date.now());
  if (nivel > estado.conquistas.degrau) estado.conquistas.degrau = nivel;
  return estado;
}

function medirConquista(c, estado, dados) {
  const d = dados || {};
  const dom = contarDominios(d.hist, d.unidadeDe);
  // Prova conta se foi até o fim: avaliacao.js grava respondidas < total quando
  // ela acaba antes da última questão.
  const provas = Array.isArray(d.provas) ? d.provas.filter((p) => p && Number.isInteger(p.total) && p.total > 0
    && Number.isInteger(p.acertos) && p.acertos >= 0 && p.acertos <= p.total
    && (p.respondidas === undefined || p.respondidas === p.total)) : [];
  switch (c.medida) {
    case 'dominios': return dom.conteudos;
    case 'unidades': return dom.unidades;
    case 'degrau': return estado.conquistas.degrau;
    case 'reforcos': return estado.conquistas.reforcos;
    case 'provas': return provas.length;
    case 'provaBoa': return provas.some((p) => p.acertos / p.total >= PROVA_BOA) ? 1 : 0;
    default: return 0;
  }
}

// O retrato da coleção, para a tela.
function conquistas(estado, dados, agora) {
  if (!estado) return [];
  virar(estado, agora);
  return CONQUISTAS.map((c) => {
    const quando = estado.conquistas.ganhas[c.id] || 0;
    // degrau começa em 1: o progresso mostrado é o que falta subir.
    const valor = Math.min(medirConquista(c, estado, dados), c.alvo);
    return { id: c.id, nome: c.nome, descricao: c.descricao, icone: c.icone, estrelas: c.estrelas,
      alvo: c.alvo, valor: valor, ganha: !!quando, quando: quando };
  });
}

// As medalhas que acabaram de ser alcançadas. Quem chama paga as estrelas;
// aqui fica anotado na hora, com a data, para nunca pagar duas vezes.
function colherConquistas(estado, dados, agora) {
  if (!estado) return [];
  virar(estado, agora);
  const quando = emData(agora).getTime();
  const novas = [];
  CONQUISTAS.forEach((c) => {
    if (estado.conquistas.ganhas[c.id] || medirConquista(c, estado, dados) < c.alvo) return;
    estado.conquistas.ganhas[c.id] = quando;
    novas.push({ id: c.id, nome: c.nome, estrelas: c.estrelas });
  });
  // Ordem do catálogo, a mesma que sanitizar() devolve: o que está na memória
  // e o que volta do storage têm a mesma forma.
  if (novas.length) {
    const ordem = {};
    IDS_CONQUISTAS.forEach((id) => { if (estado.conquistas.ganhas[id]) ordem[id] = estado.conquistas.ganhas[id]; });
    estado.conquistas.ganhas = ordem;
  }
  return novas;
}

function estagioPorMedalhas(n) {
  let estagio = 1;
  INSIGNIAS.forEach((i) => { if (n >= i.medalhas) estagio = i.estagio; });
  return estagio;
}

// O retrato da insígnia, para o desenho e para o modal de Medalhas.
function insignia(estado) {
  const ganhas = estado && estado.conquistas && estado.conquistas.ganhas && typeof estado.conquistas.ganhas === 'object'
    ? Object.keys(estado.conquistas.ganhas).filter((id) => IDS_CONQUISTAS.indexOf(id) >= 0).length : 0;
  const estagio = estagioPorMedalhas(ganhas);
  const atual = INSIGNIAS[estagio - 1];
  const prox = INSIGNIAS[estagio] || null;
  return { estagio: estagio, nome: atual.nome, descricao: atual.descricao, medalhas: ganhas,
    proximo: prox ? { estagio: prox.estagio, nome: prox.nome, medalhas: prox.medalhas } : null };
}

// O estágio novo, uma vez por perfil: devolve a insígnia só se ela ainda não
// foi anunciada, e anota na hora.
function colherInsignia(estado) {
  if (!estado) return null;
  virar(estado, Date.now());
  const i = insignia(estado);
  const anunciada = Number.isInteger(estado.conquistas.insignia) ? estado.conquistas.insignia : 1;
  if (i.estagio <= anunciada) return null;
  estado.conquistas.insignia = i.estagio;
  return { estagio: i.estagio, nome: i.nome };
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
  MISSOES: JSON.parse(JSON.stringify(MISSOES)),
  sortearMissoes: sortearMissoes,
  missoes: missoes,
  colherMissoes: colherMissoes,
  CONQUISTAS: JSON.parse(JSON.stringify(CONQUISTAS)),
  DOMINIO_FEITAS: DOMINIO_FEITAS,
  DOMINIO_TAXA: DOMINIO_TAXA,
  contarDominios: contarDominios,
  registrarReforco: registrarReforco,
  registrarDegrau: registrarDegrau,
  conquistas: conquistas,
  colherConquistas: colherConquistas,
  INSIGNIAS: JSON.parse(JSON.stringify(INSIGNIAS)),
  insignia: insignia,
  colherInsignia: colherInsignia,
};

if (typeof module !== 'undefined' && module.exports) module.exports = CM_METAS;
root.CM_METAS = CM_METAS;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
