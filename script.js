/* ===================================================
   CANDY MATH — script.js
   Todos os jogos + loja + save/load
   =================================================== */

// ──────────────────────────────────────────────────
// 1. ESTADO GLOBAL
// ──────────────────────────────────────────────────
const G = {
  stars: 0,
  ano: 5,                 // ano do ensino fundamental escolhido no hub
  nivel: 1,               // 1 Base · 2 Prática · 3 Desafio · 4 Domínio
  totalCorrect: 0,
  streak: 0,
  bestStreak: 0,
  soundOn: true,
  roundCorrect: 0,        // acertos na rodada atual
  roundTotal: 0,          // perguntas respondidas na rodada atual
  roundStars: 0,          // estrelas ganhas na rodada atual (para o resumo)
  trabalhados: [],        // objetos de conhecimento vistos na rodada
  aprendidas: [],         // objetos já praticados (histórico, vai para Recordes)
  hist: {},               // desempenho por objeto de conhecimento: { feitas, certas }
  currentMode: null,
  currentQ: null,
  quizIndex: 0,
  catchIndex: 0,
  puzIndex: 0,
  memIndex: 0,
  roulIndex: 0,
  equip: { hat:null, wig:null, mask:null, glasses:null, outfit:null, shoes:null, accessory:null },
  owned: [],
  duelos: { jogados: 0, ganhos: 0, achados: 0, melhorTempo: 0, recorde: [] },
  provas: [],
  comoJogarVisto: {},
  // Desde quando este aparelho observa a criança. O boletim mostra o período,
  // porque 30 respostas de hoje não significam o mesmo que 30 de três meses.
  desde: Date.now(),
  // Só existem se a conexão for ligada em Responsáveis › Conexão. Sem conta,
  // ficam vazios e nada sobe para lugar nenhum.
  codigoVinculo: '',
  apelidoCrianca: '',
  // Contagem por dia e por semana para missões, dias de atividade e
  // conquistas (metas.js). Fica separada de hist e só no aparelho.
  metas: window.CM_METAS.vazio(),
  // Preferências deste estudante (Ajustes): ritmo, leitura, cores, narração e
  // dificuldade por jogo. Ficam no save do perfil, nunca no aparelho todo.
  prefs: null,
};

// Molde e saneamento das preferências. O storage é entrada não confiável:
// só sim/não de verdade liga uma opção, e só os valores da lista passam.
const VELOCIDADES_VOZ = [0.75, 1, 1.25];
function prefsVazias() {
  return { calmo: false, contraste: false, daltonismo: false, dislexia: false, vozVelocidade: 1, nivelPorJogo: {} };
}
function prefsSanit(p) {
  const out = prefsVazias();
  if (!p || typeof p !== 'object' || Array.isArray(p)) return out;
  ['calmo', 'contraste', 'daltonismo', 'dislexia'].forEach((k) => { out[k] = p[k] === true; });
  if (VELOCIDADES_VOZ.indexOf(p.vozVelocidade) >= 0) out.vozVelocidade = p.vozVelocidade;
  const n = p.nivelPorJogo && typeof p.nivelPorJogo === 'object' && !Array.isArray(p.nivelPorJogo) ? p.nivelPorJogo : {};
  Object.keys(n).forEach((modo) => {
    if (Object.prototype.hasOwnProperty.call(TELA_DO_JOGO, modo) && modo !== 'duelo' && modo !== 'prova'
        && Number.isInteger(n[modo]) && n[modo] >= 1 && n[modo] <= 4) out.nivelPorJogo[modo] = n[modo];
  });
  return out;
}
G.prefs = prefsVazias();
// Modo calmo: o movimento desacelera; a matemática, a pontuação e a validação
// das respostas são as mesmas. O duelo tem relógio próprio e não muda.
function calmo() { return !!(G.prefs && G.prefs.calmo); }

// ──────────────────────────────────────────────────
// 2. CONTEÚDO CURRICULAR
//    As perguntas vêm do motor (conteudo.js) e do banco autoral
//    (banco-itens.js), sempre no ano e no nível escolhidos no hub.
// ──────────────────────────────────────────────────
const C = window.CM;
const QTD_POR_RODADA = 5;
// Jogos de esforço longo (grade completa, mesa de cartas) têm rodada curta.
const RODADA_CURTA = { puzzle: 3, memory: 3 };
const PONTOS = {
  quiz: 10, truefalse: 10, operator: 10, balloon: 15, fishing: 15, velha: 15,
  sequence: 15, sort: 20, catch: 20, whack: 20, balance: 20,
  memory: 20, puzzle: 30,
};
const ICON_POR_UNIDADE = {
  numeros: 'fa-candy-cane',
  algebra: 'fa-scale-balanced',
  geometria: 'fa-shapes',
  medidas: 'fa-ruler-combined',
  dados: 'fa-chart-column',
};

// O "monte" é o baralho da rodada: nada se repete dentro dele.
let monte = { ano: 0, nv: 0, usadas: [] };
// Últimas perguntas mostradas em qualquer jogo. Evita que a criança veja
// o mesmo enunciado duas vezes seguidas ao trocar de atividade.
const RECENTES_MAX = 12;
let recentes = [];

function resetarMonte() {
  monte = { ano: G.ano, nv: G.nivel, usadas: [] };
}

function marcarRecente(ref) {
  if (!ref) return;
  recentes.push(ref);
  if (recentes.length > RECENTES_MAX) recentes.shift();
}

function proximaPergunta() {
  if (monte.ano !== G.ano || monte.nv !== G.nivel) resetarMonte();
  const item = C.sortear({ ano: G.ano, nv: G.nivel, usadas: monte.usadas.concat(recentes) });
  if (item.ref) { monte.usadas.push(item.ref); marcarRecente(item.ref); }
  registrarTrabalho(item);
  return item;
}

// Depois de um erro, procuramos OUTRA questão do MESMO objeto de conhecimento,
// com outros números: o gerador da pergunta ou um gêmeo dele. Se o banco não
// tiver nenhum equivalente, devolvemos null — não inventamos consolidação falsa.
function reforcoDe(q) {
  if (!q || !q.o) return null;
  const chaves = C.chavesDo(G.ano, G.nivel);
  const minhaChave = typeof q.ref === 'string' && q.ref.indexOf('ger:') === 0 ? q.ref.slice(4) : null;

  let item = null;
  if (minhaChave && C.GER[minhaChave]) {
    item = C.gerarChave(minhaChave, G.ano, G.nivel);
  } else {
    // Um gerador que trabalhe o mesmo objeto de conhecimento, ou um item do
    // banco com o mesmo nome de conteúdo. Sem isso, não oferecemos reforço.
    const gêmea = chaves.find((k) => C.GER[k] && C.gerarChave(k, G.ano, G.nivel).o === q.o);
    if (gêmea) {
      item = C.gerarChave(gêmea, G.ano, G.nivel);
    } else {
      const sobras = (window.BANCO_ITENS || []).filter((i) =>
        i.ano === G.ano && i.nv === G.nivel && i.o === q.o && i.ref !== q.ref &&
        !(i.id && (monte.usadas.concat(recentes).indexOf(i.id) >= 0)));
      if (sobras.length) item = Object.assign({}, C.d1(sobras));
    }
  }
  if (!item || !item.alt || item.alt.length < 2) return null;

  item = Object.assign({}, item);
  item.ref = item.ref || item.id;
  item.unidade = C.UNIDADES[item.u] || item.u;
  // Marca a questão como reforço: acertá-la é aprender com o erro de antes.
  item.reforco = true;
  monte.usadas.push(item.ref);
  marcarRecente(item.ref);
  registrarTrabalho(item);
  return item;
}

// Uma questão nova de um conteúdo pelo nome, no ano e nível de agora: um
// gerador que trabalhe esse conteúdo ou um item do banco com o mesmo nome.
// Sem equivalente neste ano e nível, devolve null — não inventamos questão.
function questaoDoConteudo(o) {
  const chaves = C.chavesDo(G.ano, G.nivel);
  let item = null;
  const ger = chaves.find((k) => C.GER[k] && C.gerarChave(k, G.ano, G.nivel).o === o);
  if (ger) item = C.gerarChave(ger, G.ano, G.nivel);
  else {
    const banco = (window.BANCO_ITENS || []).filter((i) => i.ano === G.ano && i.nv === G.nivel && i.o === o &&
      monte.usadas.concat(recentes).indexOf(i.id) < 0);
    if (banco.length) item = Object.assign({}, C.d1(banco));
  }
  if (!item || !item.alt || item.alt.length < 2) return null;
  item = Object.assign({}, item);
  item.ref = item.ref || item.id;
  item.unidade = C.UNIDADES[item.u] || item.u;
  monte.usadas.push(item.ref);
  marcarRecente(item.ref);
  return item;
}

// Até duas revisões vencidas abrem a rodada do quiz, marcadas como revisão.
// Só entram as que este ano e nível sabem perguntar.
const REVISOES_POR_RODADA = 2;
function revisoesDaRodada() {
  const fila = [];
  CM_METAS.revisoesDevidas(G.metas, Date.now()).some((r) => {
    const q = questaoDoConteudo(r.nome);
    if (q) { q.revisao = true; fila.push(q); }
    return fila.length >= REVISOES_POR_RODADA;
  });
  return fila;
}

function proximaAfirmacao() {
  if (monte.ano !== G.ano || monte.nv !== G.nivel) resetarMonte();
  const a = C.afirmacao(G.ano, G.nivel, monte.usadas.concat(recentes));
  if (a.id) { monte.usadas.push(a.id); marcarRecente(a.id); }
  registrarTrabalho(a);
  return a;
}

// Guarda os objetos de conhecimento praticados: G.trabalhados é da rodada
// (aparece no resumo) e G.aprendidas é o histórico, mostrado nos Recordes.
let itemAtual = null;   // conteúdo em jogo neste momento

function registrarTrabalho(item) {
  if (!item || !item.o) return;
  itemAtual = item;
  if (G.trabalhados.indexOf(item.o) < 0) G.trabalhados.push(item.o);
  if (G.aprendidas.indexOf(item.o) < 0) { G.aprendidas.push(item.o); saveState(); }
}

// Anota acerto e erro por conteúdo. O resumo de Recordes usa esses números
// para sugerir o que revisar — é estimativa a partir do que foi jogado aqui.
//
// Uma questão, um registro. Nos jogos em que a resposta certa continua na tela
// até ser pega (chuva, balões, pescaria, ordenar, toupeira), cada tentativa
// errada somava mais uma "feita": uma questão resolvida na quarta tentativa
// virava 1 acerto em 4 no boletim. A régua agora é a do duelo: o primeiro
// desfecho da questão é o que fica, e só é acerto se veio limpo.
let registradoPara = null;
function registrarResultado(acertou) {
  const nome = itemAtual && itemAtual.o;
  if (!nome || itemAtual === registradoPara) return;
  registradoPara = itemAtual;
  const h = G.hist[nome] || (G.hist[nome] = { feitas: 0, certas: 0 });
  h.feitas++;
  if (acertou) { h.certas++; }
  CM_METAS.registrarResposta(G.metas, { u: itemAtual.u, acertou: acertou }, Date.now());
  // Revisão espaçada: erro agenda o conteúdo; acerto na hora afasta a próxima.
  CM_METAS.registrarRevisao(G.metas, nome, itemAtual.u, acertou, Date.now());
  premiarMetas();
}

// Marcos de dias seguidos (3, 7, 14, 30) e missões cumpridas: o prêmio entra
// no saldo e a notícia sai num aviso só — dois avisos juntos fariam o leitor de
// tela ler apenas o último. metas.js anota cada pagamento na hora, então nada é
// pago duas vezes. O laço dos marcos tem teto: no máximo um giro por marco que
// existe, para que um defeito na anotação nunca trave a tela.
function premiarMetas() {
  const agora = Date.now();
  const recados = [];
  for (let i = 0; i < CM_METAS.MARCOS_DIAS.length; i++) {
    const marco = CM_METAS.colherMarco(G.metas, agora);
    if (!marco) break;
    G.stars += marco.estrelas;
    recados.push(marco.dias + ' dias seguidos estudando! Ganhou ' + marco.estrelas + ' estrelas.');
  }
  CM_METAS.colherMissoes(G.metas, agora).forEach((m) => {
    G.stars += m.estrelas;
    recados.push('Missão cumprida: ' + m.texto + '. Ganhou ' + m.estrelas + ' estrelas.');
  });
  CM_METAS.colherConquistas(G.metas, dadosDasConquistas(), agora).forEach((c) => {
    G.stars += c.estrelas;
    recados.push('Nova medalha: ' + c.nome + '!' + (c.estrelas ? ' Ganhou ' + c.estrelas + ' estrelas.' : ''));
  });
  // Estágio novo da bandana: avisado uma vez por perfil, sem prêmio (as
  // medalhas já pagaram) e sem efeito na tela além do próprio desenho.
  const insignia = CM_METAS.colherInsignia(G.metas);
  if (insignia) {
    recados.push('A bandana da Juba mudou: ' + insignia.nome + '.');
    pintarMascotes();
  }
  if (recados.length) showToast(recados.join(' '));
  return recados.length;
}
// avaliacao.js (fim da prova) e duelo.js chamam por window.
window.premiarMetas = premiarMetas;

// ── Ajustes deste estudante ──────────────────────────
// As opções valem para o perfil e voltam com ele. A tela só liga e desliga;
// quem aplica é aplicarPreferencias, chamada também ao carregar e ao trocar.
function aplicarPreferencias() {
  const p = G.prefs || prefsVazias();
  const corpo = document.body;
  if (corpo) {
    corpo.classList.toggle('pref-calmo', p.calmo);
  }
  if (window.CM_NARRACAO && CM_NARRACAO.definirVelocidade) CM_NARRACAO.definirVelocidade(p.vozVelocidade);
  pintarAjustes();
}
// Um seletor por jogo, montado do catálogo de jogos (TELA_DO_JOGO) com o nome
// do como-jogar: jogo novo aparece sozinho. Duelo e prova ficam de fora.
function montarNiveisPorJogo() {
  const caixa = $('ajNiveis');
  if (!caixa || caixa.childElementCount) return;
  Object.keys(TELA_DO_JOGO).filter((m) => m !== 'duelo' && m !== 'prova').forEach((modo) => {
    const nome = (window.CM_TUTORIAL && CM_TUTORIAL.textos[modo] && CM_TUTORIAL.textos[modo].nome) || modo;
    const rotulo = document.createElement('label');
    rotulo.className = 'aj-nivel';
    const span = document.createElement('span');
    span.textContent = nome;
    const sel = document.createElement('select');
    sel.setAttribute('data-nivel-jogo', modo);
    [['0', 'Automática'], ['1', C.NIVEIS[0]], ['2', C.NIVEIS[1]], ['3', C.NIVEIS[2]], ['4', C.NIVEIS[3]]].forEach(([v, t]) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = t;
      sel.appendChild(o);
    });
    rotulo.appendChild(span);
    rotulo.appendChild(sel);
    caixa.appendChild(rotulo);
  });
}
function pintarAjustes() {
  const caixa = $('modalAjustes');
  if (!caixa) return;
  montarNiveisPorJogo();
  caixa.querySelectorAll('input[data-pref]').forEach((inp) => {
    const k = inp.getAttribute('data-pref');
    if (inp.type === 'checkbox') inp.checked = !!G.prefs[k];
    else if (inp.type === 'radio') inp.checked = String(G.prefs[k]) === inp.value;
  });
  caixa.querySelectorAll('select[data-nivel-jogo]').forEach((sel) => {
    const modo = sel.getAttribute('data-nivel-jogo');
    sel.value = String(G.prefs.nivelPorJogo[modo] || 0);
  });
}
function mudarAjuste(el) {
  if (el.hasAttribute('data-nivel-jogo')) {
    const modo = el.getAttribute('data-nivel-jogo');
    const n = Number(el.value);
    if (n >= 1 && n <= 4) G.prefs.nivelPorJogo[modo] = n; else delete G.prefs.nivelPorJogo[modo];
  } else {
    const k = el.getAttribute('data-pref');
    if (!k || !Object.prototype.hasOwnProperty.call(prefsVazias(), k)) return;
    G.prefs[k] = el.type === 'checkbox' ? el.checked : Number(el.value);
  }
  G.prefs = prefsSanit(G.prefs);
  aplicarPreferencias();
  saveState();
}
document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el && el.closest && el.closest('#modalAjustes') && (el.hasAttribute('data-pref') || el.hasAttribute('data-nivel-jogo'))) mudarAjuste(el);
});

// ── Mapa de habilidades (BNCC) ────────────────────────
// Os conteúdos do ano escolhido, com unidade temática, código BNCC e o nível
// em que aparecem primeiro, tirados do banco e dos geradores — os mesmos que
// fazem as perguntas. Montado uma vez por ano.
const _conteudosDoAno = {};
function conteudosDoAno(ano) {
  if (_conteudosDoAno[ano]) return _conteudosDoAno[ano];
  const mapa = {};
  const anotar = (o, u, bncc, nv) => {
    if (!o || mapa[o]) return;
    mapa[o] = { o: o, u: u, cod: (bncc || [])[0] || '', nv: nv };
  };
  for (let nv = 1; nv <= 4; nv++) {
    (window.BANCO_ITENS || []).forEach((i) => { if (i.ano === ano && i.nv === nv) anotar(i.o, i.u, i.bncc, nv); });
    C.chavesDo(ano, nv).forEach((k) => { const it = C.GER[k] && C.gerarChave(k, ano, nv); if (it) anotar(it.o, it.u, it.bncc, nv); });
  }
  _conteudosDoAno[ano] = Object.keys(mapa).map((k) => mapa[k]);
  return _conteudosDoAno[ano];
}
const ROTULO_SITUACAO = {
  domina: { texto: 'Domina', icone: 'fa-circle-check' },
  praticando: { texto: 'Praticando', icone: 'fa-seedling' },
  revisar: { texto: 'Vale revisar', icone: 'fa-rotate-right' },
  novo: { texto: 'Ainda não visto', icone: 'fa-circle' },
};
function montarMapa() {
  const lista = $('mapaLista');
  if (!lista) return;
  lista.textContent = '';
  const revisao = (G.metas && G.metas.revisao) || {};
  const itens = conteudosDoAno(G.ano).map((c) => Object.assign({}, c, {
    h: G.hist[c.o] || null, sit: CM_METAS.situacaoConteudo(G.hist[c.o], !!revisao[c.o]) }));
  const contagem = { domina: 0, praticando: 0, revisar: 0, novo: 0 };
  itens.forEach((i) => { contagem[i.sit]++; });
  $('mapaResumo').textContent = G.ano + 'º ano · ' + itens.length + ' conteúdos: ' + contagem.domina + ' domina, ' +
    contagem.praticando + ' praticando, ' + contagem.revisar + ' para revisar e ' + contagem.novo + ' ainda não vistos.';
  // Próximos passos: o que pede revisão, depois o que está pela metade (pior
  // taxa primeiro), depois o que ainda não apareceu, do nível mais baixo.
  const taxa = (i) => (i.h ? i.h.certas / i.h.feitas : 0);
  const proximos = itens.filter((i) => i.sit === 'revisar')
    .concat(itens.filter((i) => i.sit === 'praticando').sort((a, b) => taxa(a) - taxa(b)))
    .concat(itens.filter((i) => i.sit === 'novo').sort((a, b) => a.nv - b.nv))
    .slice(0, 3);
  const caixa = $('mapaProximos');
  caixa.textContent = '';
  proximos.forEach((i) => {
    const li = document.createElement('li');
    li.textContent = i.o + ' (' + ROTULO_SITUACAO[i.sit].texto.toLowerCase() + (i.sit === 'novo' ? ', nível ' + C.NIVEIS[i.nv - 1] : '') + ')';
    caixa.appendChild(li);
  });
  $('mapaProximosCaixa').hidden = !proximos.length;
  CM_METAS.UNIDADES.forEach((u) => {
    const daUnidade = itens.filter((i) => i.u === u);
    if (!daUnidade.length) return;
    const secao = document.createElement('section');
    secao.className = 'mapa-unidade';
    const h3 = document.createElement('h3');
    h3.textContent = C.UNIDADES[u] || u;
    secao.appendChild(h3);
    const ul = document.createElement('ul');
    ul.className = 'mapa-itens';
    daUnidade.forEach((i) => {
      const li = document.createElement('li');
      li.className = 'mapa-item mapa-' + i.sit;
      const sit = document.createElement('span');
      sit.className = 'mapa-sit';
      const ic = document.createElement('i');
      ic.className = 'fa-solid ' + ROTULO_SITUACAO[i.sit].icone;
      ic.setAttribute('aria-hidden', 'true');
      sit.appendChild(ic);
      sit.appendChild(document.createTextNode(' ' + ROTULO_SITUACAO[i.sit].texto));
      const nome = document.createElement('span');
      nome.className = 'mapa-nome';
      nome.textContent = i.o;
      const det = document.createElement('span');
      det.className = 'mapa-det';
      det.textContent = (i.cod ? i.cod + ' · ' : '') + (i.h ? i.h.certas + ' de ' + i.h.feitas + ' acertos' : 'nível ' + C.NIVEIS[i.nv - 1]);
      li.appendChild(nome);
      li.appendChild(sit);
      li.appendChild(det);
      ul.appendChild(li);
    });
    secao.appendChild(ul);
    lista.appendChild(secao);
  });
}

// O que as medalhas leem do estado: o histórico por conteúdo (com a unidade de
// cada nome, tirada da mesma tabela do boletim) e as provas feitas.
function dadosDasConquistas() {
  const meta = metaConteudo();
  return { hist: G.hist, provas: G.provas, unidadeDe: (nome) => (meta[nome] || {}).u || '' };
}

// A coleção de medalhas. Montada por DOM e textContent, como o cartão de missões.
function pintarConquistas() {
  const grade = $('conqGrade');
  if (!grade) return;
  grade.textContent = '';
  const lista = CM_METAS.conquistas(G.metas, dadosDasConquistas(), Date.now());
  lista.forEach((c) => {
    const li = document.createElement('li');
    li.className = 'conq-card' + (c.ganha ? ' conq-ganha' : ' conq-bloqueada');
    const icone = document.createElement('span');
    icone.className = 'conq-icone';
    const i = document.createElement('i');
    i.className = 'fa-solid ' + (c.ganha ? c.icone : 'fa-lock');
    i.setAttribute('aria-hidden', 'true');
    icone.appendChild(i);
    const nome = document.createElement('h3');
    nome.className = 'conq-nome';
    nome.textContent = c.nome;
    const desc = document.createElement('p');
    desc.className = 'conq-desc';
    desc.textContent = c.descricao;
    // Situação escrita por extenso: cadeado e cor nunca são a única pista.
    const situacao = document.createElement('p');
    situacao.className = 'conq-situacao';
    if (c.ganha) {
      situacao.textContent = 'Conquistada em ' + new Date(c.quando).toLocaleDateString('pt-BR');
    } else {
      situacao.textContent = 'Ainda não · ' + (c.id.indexOf('degrau') === 0
        ? 'nível ' + C.NIVEIS[c.valor - 1]
        : c.valor + ' de ' + c.alvo);
    }
    const premio = document.createElement('p');
    premio.className = 'conq-premio';
    premio.textContent = c.estrelas ? '+' + c.estrelas + ' estrelas' : 'Só medalha';
    li.appendChild(icone);
    li.appendChild(nome);
    li.appendChild(desc);
    li.appendChild(situacao);
    li.appendChild(premio);
    grade.appendChild(li);
  });
  const ganhas = lista.filter((c) => c.ganha).length;
  $('conqResumo').textContent = ganhas + ' de ' + lista.length + ' medalhas';
  const ins = insigniaAtual();
  $('conqInsignia').textContent = 'Bandana da Juba: ' + ins.nome + '. ' + (ins.proximo
    ? 'A próxima (' + ins.proximo.nome.toLowerCase() + ') vem com ' + ins.proximo.medalhas + ' medalhas.'
    : 'É a última: a Juba já usa a medalha da confeitaria.');
  return { ganhas: ganhas, total: lista.length };
}

// O cartão de missões do hub. Montado por DOM e textContent: o texto vem do
// catálogo de metas.js, mas nenhum texto vira HTML por princípio.
function pintarMissoes() {
  const listas = { dia: $('missoesDia'), semana: $('missoesSemana') };
  if (!listas.dia || !listas.semana) return;
  listas.dia.textContent = '';
  listas.semana.textContent = '';
  CM_METAS.missoes(G.metas, Date.now()).forEach((m) => {
    const li = document.createElement('li');
    li.className = 'hm-item' + (m.feita ? ' hm-feita' : '');
    const texto = document.createElement('span');
    texto.className = 'hm-texto';
    texto.textContent = m.texto;
    const premio = document.createElement('span');
    premio.className = 'hm-premio';
    premio.textContent = '+' + m.estrelas + ' ';
    const estrela = document.createElement('i');
    estrela.className = 'fa-solid fa-star';
    estrela.setAttribute('aria-hidden', 'true');
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = 'estrelas';
    premio.appendChild(estrela);
    premio.appendChild(sr);
    const barra = document.createElement('div');
    barra.className = 'hm-barra';
    barra.setAttribute('role', 'progressbar');
    barra.setAttribute('aria-valuemin', '0');
    barra.setAttribute('aria-valuemax', String(m.alvo));
    barra.setAttribute('aria-valuenow', String(m.valor));
    barra.setAttribute('aria-label', m.texto);
    barra.setAttribute('aria-valuetext', m.feita ? 'Concluída' : m.valor + ' de ' + m.alvo);
    const enchido = document.createElement('span');
    enchido.style.width = Math.round((m.valor / m.alvo) * 100) + '%';
    barra.appendChild(enchido);
    // Concluída se diz com ícone e palavra, não só com a cor da barra.
    const conta = document.createElement('span');
    conta.className = 'hm-conta';
    if (m.feita) {
      const ok = document.createElement('i');
      ok.className = 'fa-solid fa-circle-check';
      ok.setAttribute('aria-hidden', 'true');
      conta.appendChild(ok);
      conta.appendChild(document.createTextNode(' Concluída'));
    } else {
      conta.textContent = m.valor + ' de ' + m.alvo;
    }
    li.appendChild(texto);
    li.appendChild(premio);
    li.appendChild(barra);
    li.appendChild(conta);
    listas[m.escopo].appendChild(li);
  });
}

// "3 dias", "1 dia". Sem sequência ativa a ficha some: zero dias não é recado
// para ninguém, muito menos para quem voltou depois de um tempo.
function pintarDias() {
  const seq = CM_METAS.sequencia(G.metas, Date.now());
  const ficha = $('hubDias');
  if (ficha) {
    ficha.hidden = seq.atual < 1;
    $('hubDiasVal').textContent = seq.atual + (seq.atual === 1 ? ' dia' : ' dias');
  }
  return seq;
}

// As alternativas chegam com a correta em alt[0]; aqui elas são
// sorteadas de verdade (Fisher-Yates) e devolvemos o novo índice.
function embaralharOpcoes(alt) {
  const ordem = C.embaralhar(alt);
  return { ordem, certa: ordem.indexOf(alt[0]) };
}

function textoNivel() {
  return C.NIVEIS[G.nivel - 1];
}

// O nome do nível sozinho não diz nada para uma criança (nem para quem
// acompanha). Cada nível mantém o mesmo conteúdo do ano e muda o tamanho
// dos números e o número de etapas da resolução.
const DESCRICAO_NIVEL = [
  'Números menores e uma etapa por vez. É o começo tranquilo do conteúdo do ano.',
  'Os números do seu ano, ainda com tempo para pensar. Aqui a conta fica mais completa.',
  'Problemas com mais etapas, medidas para converter e números que exigem atenção.',
  'O mesmo conteúdo, misturado e com conta mais longa. Aqui você resolve sozinho.',
];

function totalDaRodada(modo) {
  // Na Velha Doce a partida acaba quando alguém fecha a linha: a rodada tem
  // tantas perguntas quantas a criança respondeu.
  if (modo === 'velha') return Math.max(G.roundTotal, 1);
  return RODADA_CURTA[modo] || QTD_POR_RODADA;
}

// Lê "1.234,5" ou "-3,5" como número, do jeito que se escreve no Brasil.
function paraNumero(texto) {
  const limpo = String(texto).replace(/[^\d,.-]/g, '');
  if (!limpo) return NaN;
  if (limpo.indexOf(',') >= 0) return parseFloat(limpo.replace(/\./g, '').replace(',', '.'));
  return parseFloat(/^-?\d{1,3}(\.\d{3})+$/.test(limpo) ? limpo.replace(/\./g, '') : limpo);
}
// Etiqueta da pergunta. O código da habilidade fica fora de propósito aqui:
// é informação para quem acompanha, não para quem está resolvendo. Ele aparece
// no painel dos responsáveis.
function selo(item) {
  return G.ano + 'º ano · ' + item.unidade;
}
function iconeDaUnidade(item) {
  return ICON_POR_UNIDADE[item.u] || 'fa-candy-cane';
}

// Pista pedagógica: o banco não traz uma dica escrita para cada questão,
// então orientamos pelo modo de ler o enunciado conforme a unidade BNCC.
// Nenhuma delas entrega a resposta — só aponta o caminho.
const PISTA_POR_UNIDADE = {
  numeros: 'Releia o enunciado e anote os números que ele dá. Compare as alternativas pelo valor de cada algarismo na posição em que ele está.',
  algebra: 'Pense na operação inversa para achar o valor que falta. Teste cada alternativa na sentença e veja se os dois lados ficam iguais.',
  geometria: 'Imagine (ou desenhe no ar) a figura e confira quantos lados, cantos e medidas ela tem antes de escolher.',
  medidas: 'Olhe a unidade de cada alternativa. Deixe tudo na mesma unidade antes de comparar — 100 cm não é 100 m.',
  dados: 'Leia a tabela, o gráfico ou a situação inteira. Conte e compare as quantidades em vez de confiar só na aparência.',
};

// ──────────────────────────────────────────────────
// 3. ITENS DA LOJA (Guarda-Roupa da Juba Candy)
//    O catálogo inteiro mora em guarda-roupa.js e o desenho de cada peça
//    em mascote.js. Aqui só ligamos os dois ao estado: sete slots e os
//    conjuntos, que vestem a roupa e trazem peças de brinde.
// ──────────────────────────────────────────────────
const GR = window.CM_GUARDAROPA;
const MASCOTE = window.CM_MASCOTE;
const SHOP_ITEMS = GR.itens;
const SLOTS_EQUIP = GR.slots;

// Um save antigo pode trazer id que saiu do catálogo ou id inventado.
// Nada entra no estado sem existir na loja, senão o boneco mostra um
// fantasma e a lista de equipados fica com buraco.
function equipSanit(e) {
  const limpo = GR.equipVazio();
  if (!e || typeof e !== 'object') return limpo;
  SLOTS_EQUIP.forEach((slot) => {
    const id = e[slot];
    if (typeof id === 'string' && GR.porId(id) && GR.porId(id).slot === slot) limpo[slot] = id;
  });
  // Antes da versão com slot de máscara, as duas máscaras de rosto eram
  // guardadas como chapéu. Quem já tinha uma vestida não pode perder a peça.
  SLOTS_EQUIP.forEach((slot) => {
    const id = e[slot];
    const item = typeof id === 'string' ? GR.porId(id) : null;
    if (item && item.slot !== slot && !limpo[item.slot]) limpo[item.slot] = id;
  });
  // Duas peças no mesmo pedaço do rosto: fica a máscara, porque num save antigo
  // ela é a peça que a criança tinha de fato vestida. Os óculos é que sobravam.
  GR.exclusivos.forEach((par) => {
    if (limpo[par[0]] && limpo[par[1]]) limpo[par[1]] = null;
  });
  return limpo;
}
function ownedSanit(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.filter((id) => typeof id === 'string' && !!GR.porId(id));
}

// ──────────────────────────────────────────────────
// 5. MENSAGENS DA ONÇA
// ──────────────────────────────────────────────────
const MSGS = {
  correct:["Isso! Era exatamente isso.","Mandou bem!","Acertou na mosca!","Boa! Você já pegou o jeito.","Perfeito!","Certo de primeira, hein!"],
  wrong:  ["Não foi dessa vez. Tenta de novo!","Quase! Lê a pergunta com calma.","Errou, mas já sabe onde prestar atenção.","Na próxima você pega essa!"],
  streak: ["Sequência de ouro!","Ninguém te segura hoje!","Você está voando!"],
  idle:   ["Bora resolver mais uma?","Qual jogo vem agora?","Adoro um problema difícil!","Cada acerto é uma estrela!","Estou torcendo por você!"],
};

// ──────────────────────────────────────────────────
// 6. DOM helpers
// ──────────────────────────────────────────────────
const $ = id => document.getElementById(id);
let idleTimer = null;

// 12.480 se lê mais rápido que 12480 num placar; é só formatação, o valor
// continua o número em G.stars.
const numBR = n => Number(n).toLocaleString('pt-BR');

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const tela = $(id);
  tela.classList.add('active');
  // Toda tela nova começa com a barra de topo no lugar; medir aqui também pega
  // a altura certa depois que o texto do placar mudou.
  soltarBarras(tela);
  if (id === 'screenHub') armarRevelacaoDoHub();
  // Leitor de tela e teclado aterrissam na tela que acabou de abrir.
  if (!tela.hasAttribute('tabindex')) tela.tabIndex = -1;
  tela.focus({ preventScroll: true });
}

// ──────────────────────────────────────────────────
// 6.1 ACESSIBILIDADE
// ──────────────────────────────────────────────────
const MOVIMENTO_REDUTO = window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

// Feedback e avisos entram na fila de leitura do leitor de tela; os cards
// clicáveis do hub viram botões acionáveis pelo teclado.
function marcarDecoracao() {
  document.querySelectorAll('.quiz-feedback, .game-feedback')
    .forEach((el) => el.setAttribute('aria-live', 'polite'));
  document.querySelectorAll('.q-progress-dots')
    .forEach((el) => el.setAttribute('aria-hidden', 'true'));
  esconderIcones(document);
  document.querySelectorAll('.gtb-info')
    .forEach((el) => el.insertAdjacentHTML('afterbegin', '<span class="sr-only">Progresso e estrelas: </span>'));
  document.querySelectorAll('.mode-card').forEach((card) => {
    const nome = card.querySelector('.mc-name');
    if (nome) card.setAttribute('aria-label', 'Abrir jogo ' + nome.textContent.trim());
  });
  tornarAcionaveis(document);
  observarNovosNos();
}

// ── ícone é enfeite ──────────────────────────────────────
// O desenho da Font Awesome chega por CSS (::before), mas nem todo leitor de
// tela ignora: em muitos ele fala um caractere sem sentido antes do nome do
// botão. Escondemos o ícone só quando sobra texto ao redor — se o ícone é o
// único nome do controle, escondê-lo deixaria o controle mudo.
const ICONE_DECORATIVO = 'i.fa-solid,i.fa-regular,i.fa-brands,.qf-onca,.puzzle-onca,.duelo-passagem-onca,.lu-onca';
const DONO_DO_ICONE = 'button,a[href],[role="button"],[data-acao],.game-feedback,.quiz-feedback';
function esconderUmicone(el) {
  if (el.getAttribute('aria-hidden') || el.hasAttribute('aria-label') || el.hasAttribute('title')) return;
  const dono = el.closest(DONO_DO_ICONE);
  const aoRedor = dono || el.parentElement;
  if (!aoRedor || !aoRedor.textContent.trim()) return;
  el.setAttribute('aria-hidden', 'true');
}
function esconderIcones(raiz) {
  if (!raiz) return;
  if (raiz.matches && raiz.matches(ICONE_DECORATIVO)) esconderUmicone(raiz);
  if (raiz.querySelectorAll) raiz.querySelectorAll(ICONE_DECORATIVO).forEach(esconderUmicone);
}

// Boletim, loja e tabuleiros são montados depois do boot: sem olhar o que
// entra, o conserto valeria apenas para o HTML fixo do index.
function observarNovosNos() {
  if (!window.MutationObserver) return;
  new MutationObserver((mutacoes) => {
    for (const m of mutacoes) {
      for (const no of m.addedNodes) {
        if (!no || no.nodeType !== 1) continue;
        esconderIcones(no);
        // O ícone já estava lá e o texto é que chegou depois: no boot a bolha
        // da prova nasce vazia, então o mascote ao lado dela não tinha texto
        // ao redor e ficou sendo lido como ruído. Reolhar só o dono do nó novo
        // (não a página inteira) resolve sem varrer o documento a cada mutação.
        const dono = no.parentElement && no.parentElement.closest
          ? no.parentElement.closest(DONO_DO_ICONE) : null;
        if (dono) esconderIcones(dono);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

// Cards clicáveis viram botões de verdade para o teclado.
function tornarAcionaveis(root) {
  (root || document).querySelectorAll('[data-acao]').forEach((el) => {
    if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
    el.setAttribute('role', 'button');
    if (el.tabIndex < 0) el.tabIndex = 0;
  });
}

document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter' && ev.key !== ' ') return;
  const el = document.activeElement;
  if (!el || el.tagName === 'BUTTON' || el.tagName === 'INPUT') return;
  if (!el.hasAttribute('data-acao')) return;
  ev.preventDefault();
  el.click();
});

// Esc fecha diálogo ou devolve a criança ao hub.
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Escape') return;
  if (document.querySelector('#modalOverlay.open')) { closeAllModals(); return; }
  const ativa = document.querySelector('.screen.active');
  if (ativa && ativa.id !== 'screenHub' && ativa.id !== 'screenSplash') goHub();
});

// ──────────────────────────────────────────────────
// 6.1.1 FOCO DOS DIÁLOGOS
// ──────────────────────────────────────────────────
// Diálogo sem foco é meia acessibilidade: o Tab continua varrendo os botões da
// tela que ficou atrás da cortina, e ao fechar a pessoa perde o lugar de onde
// veio. Entrada no contêiner (o leitor de tela anuncia o título), Tab preso
// dentro, e volta para quem abriu.
const ALVO_DE_FOCO = 'a[href],button:not([disabled]),input:not([disabled]),' +
  'select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function focosDentro(caixa) {
  return Array.prototype.filter.call(caixa.querySelectorAll(ALVO_DE_FOCO),
    (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
}

// O último diálogo visível é o que está na frente da pessoa.
function dialogoAberto() {
  const abertos = document.querySelectorAll('.modal[style*="display: block"], .modal[style*="display:block"]');
  return abertos.length ? abertos[abertos.length - 1] : null;
}

let focoAntesDoDialogo = null;
// Diálogo aberto POR CIMA de outro (Recordes → Medalhas, Boletim → Apagar):
// quem o abriu fica anotado por id, para o foco voltar a esse botão quando só
// ele fechar. Sem isto o foco caía no <body> e o teclado perdia o lugar.
const focoQueAbriu = {};

function entrarNoDialogo(caixa) {
  const caixaInterna = caixa.querySelector('.modal-box');
  const alvo = caixaInterna || focosDentro(caixa)[0];
  if (!alvo) return;
  if (caixaInterna && !alvo.hasAttribute('tabindex')) alvo.tabIndex = -1;
  alvo.focus({ preventScroll: true });
}

function devolverFocoDoDialogo() {
  const antes = focoAntesDoDialogo;
  focoAntesDoDialogo = null;
  if (antes && antes.isConnected && typeof antes.focus === 'function') antes.focus({ preventScroll: true });
}

document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Tab') return;
  const caixa = dialogoAberto();
  if (!caixa) return;
  const focos = focosDentro(caixa);
  if (!focos.length) return;
  const primeiro = focos[0], ultimo = focos[focos.length - 1];
  if (!caixa.contains(document.activeElement)) {
    ev.preventDefault(); primeiro.focus({ preventScroll: true });
  } else if (ev.shiftKey && document.activeElement === primeiro) {
    ev.preventDefault(); ultimo.focus({ preventScroll: true });
  } else if (!ev.shiftKey && document.activeElement === ultimo) {
    ev.preventDefault(); primeiro.focus({ preventScroll: true });
  }
});

// ──────────────────────────────────────────────────
// 6.2 ROLAGEM: barra que sobe ao descer, seções que entram na vista
// ──────────────────────────────────────────────────
// Perto do começo da lista a barra fica no lugar (escondê-la ali não economiza
// nada e só assusta); só depois de TOPO_PROTEGIDO ela sai do caminho.
const TOPO_PROTEGIDO = 56;
const GIRO_MINIMO   = 10;
const topoAnterior = new WeakMap();

function barraDaRaiz(raiz) {
  if (!raiz) return null;
  if (raiz.classList.contains('modal')) return raiz.querySelector('.modal-hdr');
  return raiz.querySelector(':scope > .game-top-bar, :scope > .hub-header');
}

// --barra-altura é o espaço que a barra ocupa na fila, e que precisa fechar
// quando ela some. Só é usado nas barras sem margin-top, e a única assim é o
// cabeçalho do hub — por isso offsetHeight sozinho chega. Cada janela tem uma
// altura diferente, então a régua roda em JS, não no CSS.
function medirBarra(barra) {
  barra.style.setProperty('--barra-altura', barra.offsetHeight + 'px');
}

function soltarBarras(raiz) {
  (raiz || document).querySelectorAll('.game-top-bar, .hub-header, .modal-hdr').forEach((b) => {
    b.classList.remove('barra-subindo', 'barra-recolhe-espaco', 'barra-voltando');
    medirBarra(b);
  });
}

// O evento scroll não sobe até o document, mas a fase de captura chega: uma
// escuta só cobre as telas, o corpo do hub e os diálogos, cada um com seu rolador.
document.addEventListener('scroll', (ev) => {
  verRestantesDoHub();
  const rolavel = ev.target === document ? document.scrollingElement : ev.target;
  if (!(rolavel instanceof Element)) return;
  const barra = barraDaRaiz(rolavel.closest('.modal') || rolavel.closest('.screen'));
  if (!barra) return;
  const topo = rolavel.scrollTop;
  const antes = topoAnterior.get(rolavel);
  topoAnterior.set(rolavel, topo);
  // Voltar ao começo da lista devolve a barra sempre, mesmo sem histórico de
  // direção (um clique na régua salta direto para lá). No primeiro rolamento de
  // um elemento ainda não dá para saber para que lado a pessoa foi, então ele só
  // é registrado acima e decide no próximo.
  const pertoDoTopo = topo < TOPO_PROTEGIDO;
  const virouParaBaixo = antes !== undefined && topo > antes + GIRO_MINIMO;
  const virouParaCima = antes !== undefined && topo < antes - GIRO_MINIMO;
  if (pertoDoTopo || virouParaCima) esconderBarra(barra, false, rolavel);
  else if (virouParaBaixo) esconderBarra(barra, true, rolavel);
}, { passive: true, capture: true });

function esconderBarra(barra, subir, rolavel) {
  if (!subir) {
    // Só repete o pop de entrada quem estava de fato recolhida: sem isso, qualquer
    // tremidinha de rolagem perto do topo ficaria reiniciando a animação.
    if (!barra.classList.contains('barra-subindo')) return;
    barra.classList.remove('barra-subindo', 'barra-recolhe-espaco');
    barra.classList.add('barra-voltando');
    return;
  }
  // Barra grudada dentro de quem rola: o conteúdo já passa por baixo dela,
  // então fechar o espaço daria um solavanco a cada ida e volta. Barra de fora
  // (cabeçalho do hub em janela alta, onde quem rola é o .hub-body) precisa
  // devolver a altura, senão sobra um buraco do tamanho do placar.
  barra.classList.remove('barra-voltando');
  barra.classList.toggle('barra-recolhe-espaco', !rolavel.contains(barra));
  barra.classList.add('barra-subindo');
}

// O pop de retorno se limpa sozinho no fim: sem tirar a classe, o próximo
// retorno não teria animação para repetir.
document.addEventListener('animationend', (ev) => {
  if (ev.animationName === 'barraEntrada' && ev.target instanceof Element) {
    ev.target.classList.remove('barra-voltando');
  }
});

let restantesNaFila = null;

function armarRevelacaoDoHub() {
  if (!restantesNaFila) {
    const alvos = document.querySelectorAll('.hub-title, .hub-cat-hdr, .mode-card');
    restantesNaFila = new Set(alvos);
    alvos.forEach((a) => a.classList.add('antes-de-revelar'));
  }
  verRestantesDoHub();
}

function verRestantesDoHub() {
  if (!restantesNaFila || !$('screenHub').classList.contains('active')) return;
  const corpo = document.querySelector('.hub-body').getBoundingClientRect();
  const dobra = Math.min(window.innerHeight, corpo.bottom) - Math.min(32, corpo.height * 0.08);
  let ordem = 0;
  restantesNaFila.forEach((a) => {
    // Revelar também o que passou acima evita lacunas ao saltar pela barra de rolagem.
    if (a.getBoundingClientRect().top >= dobra) return;
    a.style.setProperty('--atraso-revelacao', Math.min(ordem++, 3) * 60 + 'ms');
    a.classList.remove('antes-de-revelar');
    a.classList.add('revelada');
    restantesNaFila.delete(a);
  });
}

document.addEventListener('focusin', (ev) => {
  if (!restantesNaFila || !restantesNaFila.has(ev.target)) return;
  ev.target.classList.remove('antes-de-revelar');
  restantesNaFila.delete(ev.target);
});

document.addEventListener('transitionend', (ev) => {
  if (ev.propertyName === 'margin-top' && ev.target.classList.contains('hub-header')) {
    verRestantesDoHub();
  }
});

// Janela nova: barras mudam de altura e uma seção que estava abaixo da dobra
// pode ter subido sem que nenhum rolamento aconteça.
window.addEventListener('resize', () => { soltarBarras(); verRestantesDoHub(); });

// ──────────────────────────────────────────────────
// 7. INICIALIZAÇÃO
// ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // A conta decide de qual chave o save vem: precisa abrir antes do loadState.
  if (window.CM_CONTAS) CM_CONTAS.iniciar();
  // A autorização por finalidade abre antes dos módulos de rede: nuvem.js e
  // narracao.js perguntam a ela antes de mandar qualquer coisa, e a resposta
  // tem de estar pronta. O aviso de primeira vez informa; não tranca o jogo.
  if (window.CM_CONSENTIMENTO) {
    CM_CONSENTIMENTO.iniciar();
    if (CM_CONSENTIMENTO.avisoPendente()) CM_CONSENTIMENTO.pintarAviso('avisoDados');
    CM_CONSENTIMENTO.aoMudar(() => {
      if ($('modalPais').style.display === 'block') CM_CONSENTIMENTO.pintar('bolConsentimento');
    });
  }
  loadState();
  aplicarPreferencias();
  if (premiarMetas()) saveState();
  montarSeletorDeAno();
  montarSeletorDeNivel();
  marcarDecoracao();
  // Cada módulo novo arma a sua parte na tela, se estiver carregado.
  if (window.CM_TUTORIAL) CM_TUTORIAL.armarBotoesDeAjuda();
  if (window.CM_DUELO) CM_DUELO.armar();
  if (window.CM_AVALIACAO) CM_AVALIACAO.armar();
  if (window.CM_NUVEM) CM_NUVEM.iniciar();
  if (window.CM_NARRACAO) CM_NARRACAO.iniciar();
  $('btnPlay').addEventListener('click', () => {
    // Com conta criada e ninguém escolhido, a pergunta é "quem vai jogar?".
    // Sem conta, o caminho continua sendo direto para o hub.
    if (window.CM_CONTAS && CM_CONTAS.temConta() && !CM_CONTAS.ativo()) { irParaEntrada(); return; }
    entrarNoHub();
  });
  renderShop('all');
  armarProvaDePeca();
  pintarMascotes();
  setupParticleCanvas();
});

function entrarNoHub() {
  showScreen('screenHub');
  updateHubUI();
  startIdleMessages();
}

function irParaEntrada() {
  restaurarNivel();
  clearAllGameIntervals();
  closeAllModals();
  if (window.CM_CONTAS) CM_CONTAS.mostrar(CM_CONTAS.ativo() ? 'perfis' : undefined);
  showScreen('screenEntrada');
}

// Trocar de estudante é trocar de save: o estado inteiro volta ao molde e é
// relido da chave do perfil novo. Sem isto, as estrelas de um irmão ficariam
// na tela do outro até a primeira gravação — e aí se misturariam de verdade.
function trocarEstudante(perfil) {
  nivelGlobal = null; anoGlobal = null; desafioAtivo = null;
  clearAllGameIntervals();
  closeAllModals();
  Object.assign(G, {
    stars: 0, ano: perfil ? perfil.ano : 5, nivel: 1,
    totalCorrect: 0, streak: 0, bestStreak: 0,
    roundCorrect: 0, roundTotal: 0, roundStars: 0,
    trabalhados: [], aprendidas: [], hist: {},
    currentMode: null, currentQ: null,
    quizIndex: 0, catchIndex: 0, puzIndex: 0, memIndex: 0, roulIndex: 0,
    equip: GR.equipVazio(), owned: [],
    duelos: { jogados: 0, ganhos: 0, achados: 0, melhorTempo: 0, recorde: [] },
    provas: [], comoJogarVisto: {}, desde: Date.now(),
    codigoVinculo: '', apelidoCrianca: perfil ? perfil.apelido : '',
    metas: CM_METAS.vazio(),
    prefs: prefsVazias(),
  });
  recentes = [];
  resetarMonte();
  loadState();
  if (perfil) { G.ano = C.clampAno(perfil.ano); G.apelidoCrianca = perfil.apelido; }
  aplicarPreferencias();
  // Domínios e provas que já estavam no save viram medalha agora (uma vez).
  premiarMetas();
  renderShop(shopFilter);
  updateWardrobePreview();
  entrarNoHub();
  saveState();
  showToast(perfil ? 'Agora é a vez de ' + perfil.apelido + '.' : 'Jogando sem conta neste aparelho.');
}

// Ponte que o contas.js usa para mexer na tela sem conhecer o script.js.
window.CM_APP = {
  trocarEstudante: trocarEstudante,
  irParaEntrada: irParaEntrada,
  abrirCofre: function () { openModal('modalCofre'); },
  fecharCofre: function () { closeModal('modalCofre'); },
  baixarDados: function (dados) {
    const nome = 'candy-math-dados-' + new Date().toISOString().slice(0, 10) + '.json';
    const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    showToast('Arquivo ' + nome + ' baixado.');
  },
};

// ──────────────────────────────────────────────────
// 8. HUB: estrela, ano, nível e a onça
// ──────────────────────────────────────────────────
function updateHubUI() {
  $('hubStars').textContent = numBR(G.stars);
  $('hubAno').textContent   = G.ano + 'º';
  $('hubNivel').textContent = textoNivel();
  const desc = $('nivelDescricao');
  if (desc) desc.textContent = DESCRICAO_NIVEL[G.nivel - 1];
  pintarQuemJoga();
  pintarDias();
  pintarMissoes();
  marcarChips();
  pintarMascotes();
}

// A barra só aparece quando existe conta: sem conta ela seria um enfeite
// dizendo "sem conta" para quem nunca pediu conta.
// A barra fica sempre à vista: sem ela, a única porta para os perfis era um
// botão dentro do boletim, e nenhuma família achava. Quem joga sem conta vê o
// convite; quem tem perfil vê o nome e a troca.
function pintarQuemJoga() {
  const barra = $('hubEstudante');
  if (!barra) return;
  const contas = window.CM_CONTAS;
  const p = contas ? contas.ativo() : null;
  const comConta = !!(contas && contas.temConta());
  const acao = $('hubEstudanteAcao');
  $('hubEstudanteNome').textContent = p ? p.apelido + ' · ' + p.ano + 'º ano' : 'Jogando sem conta';
  $('hubEstudanteAcaoTexto').textContent = p ? 'Trocar' : comConta ? 'Escolher' : 'Criar perfis';
  $('hubEstudanteIcone').className = p ? 'fa-solid fa-right-left' : 'fa-solid fa-users-gear';
  if (p) acao.setAttribute('data-acao', 'trocarEstudante');
  else acao.setAttribute('data-acao', 'abrirPerfis');
  acao.setAttribute('aria-label', p ? 'Trocar de estudante. Agora joga ' + p.apelido
    : 'Perfis de estudante e conta de quem acompanha');
}

function montarChips(id, rotulos, aoClicar) {
  const row = $(id);
  row.innerHTML = '';
  rotulos.forEach((rotulo, i) => {
    const b = document.createElement('button');
    b.className = 'stab';
    b.textContent = rotulo;
    b.onclick = () => aoClicar(i + 1);
    row.appendChild(b);
  });
}

function montarSeletorDeAno() {
  montarChips('chipsAno', Array.from({ length: 9 }, (_, i) => (i + 1) + 'º'), escolherAno);
}
function montarSeletorDeNivel() {
  montarChips('chipsNivel', C.NIVEIS, escolherNivel);
}

function escolherAno(ano) {
  G.ano = C.clampAno(ano);
  recentes = [];
  resetarMonte();
  updateHubUI();
  saveState();
  oncaSpeak('Conteúdo do ' + G.ano + 'º ano, no ritmo do nível ' + textoNivel() + '.');
}

function escolherNivel(nv) {
  G.nivel = C.clampNv(nv);
  recentes = [];
  resetarMonte();
  updateHubUI();
  saveState();
  oncaSpeak('Nível ' + textoNivel() + ': ' + DESCRICAO_NIVEL[G.nivel - 1].split('.')[0] + '.');
}

function marcarChips() {
  document.querySelectorAll('#chipsAno .stab').forEach((b, i) => {
    const ativo = i + 1 === G.ano;
    b.classList.toggle('active', ativo);
    b.setAttribute('aria-pressed', ativo ? 'true' : 'false');
  });
  document.querySelectorAll('#chipsNivel .stab').forEach((b, i) => {
    const ativo = i + 1 === G.nivel;
    b.classList.toggle('active', ativo);
    b.setAttribute('aria-pressed', ativo ? 'true' : 'false');
    b.setAttribute('aria-label', C.NIVEIS[i] + ': ' + DESCRICAO_NIVEL[i]);
    b.title = DESCRICAO_NIVEL[i];
  });
}

// ──────────────────────────────────────────────────
// 8.1 O MASCOTE NA TELA
//    Uma função só para todo lugar onde a Juba aparece. Cada elemento
//    guarda a assinatura do figurino que já está desenhado: vestir uma
//    peça repinta o boneco, abrir um jogo com a mesma roupa não repinta.
// ──────────────────────────────────────────────────
// A insígnia da bandana vem das medalhas deste perfil (metas.js): estágio 1 é
// o lenço azul de sempre. Não é peça da loja e não ocupa slot.
function insigniaAtual() { return CM_METAS.insignia(G.metas); }

function pintarUmMascote(el, equip, corte, titulo, estagio) {
  if (!el || !MASCOTE) return;
  const est = estagio || 1;
  const chave = corte + '#' + MASCOTE.assinatura(equip) + '#' + est + '#' + (titulo || '');
  if (el.dataset.figurino === chave) return;
  el.dataset.figurino = chave;
  el.innerHTML = MASCOTE.svg(equip, { corte: corte, titulo: titulo, estagio: est });
}

// Quem não vê o boneco precisa ouvir o que ele está vestindo: sem isto, o
// guarda-roupa inteiro seria uma experiência só de olho.
function descreverFigurino(equip) {
  const pecas = SLOTS_EQUIP
    .map((s) => equip[s] && GR.porId(equip[s]))
    .filter(Boolean)
    .map((i) => i.name);
  const insignia = insigniaAtual().descricao;
  if (!insignia) {
    return pecas.length
      ? 'Juba Candy vestindo ' + pecas.join(', ')
      : 'Juba Candy, só de pelo e bandana azul';
  }
  return 'Juba Candy ' + insignia + (pecas.length ? ', vestindo ' + pecas.join(', ') : '');
}

function pintarMascotes() {
  const descricao = descreverFigurino(G.equip);
  const estagio = insigniaAtual().estagio;
  document.querySelectorAll('[data-mascote]').forEach((el) => {
    const corte = el.getAttribute('data-mascote');
    pintarUmMascote(el, G.equip, corte, corte === 'rosto' ? null : descricao, estagio);
  });
  pintarPalco();
}

// Peça em prova: passar o mouse (ou o teclado) por um card veste a peça no
// palco sem comprar e sem gravar. É assim que se escolhe roupa antes de
// gastar estrela — e sai do palco quando o foco vai embora.
let pecaEmProva = null;

function equipDeProva() {
  const item = pecaEmProva ? GR.porId(pecaEmProva) : null;
  if (!item) return G.equip;
  const e = Object.assign({}, G.equip);
  e[item.slot] = item.id;
  GR.conflitaCom(item.slot).forEach((s) => { e[s] = null; });
  return e;
}

function pintarPalco() {
  const palco = $('wdMascote');
  if (!palco) return;
  const equip = equipDeProva();
  pintarUmMascote(palco, equip, 'inteiro', descreverFigurino(equip), insigniaAtual().estagio);
  const aviso = $('wdProva');
  if (!aviso) return;
  const item = pecaEmProva ? GR.porId(pecaEmProva) : null;
  if (!item) { aviso.hidden = true; aviso.textContent = ''; return; }
  aviso.hidden = false;
  aviso.textContent = G.equip[item.slot] === item.id
    ? 'Já está vestindo: ' + item.name + '.'
    : 'Experimentando ' + item.name + '. Toque em “Vestir” para ficar com ela.';
}

function provarPeca(id) {
  if (pecaEmProva === id) return;
  pecaEmProva = id;
  pintarPalco();
}

function fimDaProva() {
  if (!pecaEmProva) return;
  pecaEmProva = null;
  pintarPalco();
}

function armarProvaDePeca() {
  const grade = $('shopGrid');
  if (!grade) return;
  const pecaDoEvento = (ev) => {
    const card = ev.target.closest ? ev.target.closest('[data-peca]') : null;
    return card ? card.getAttribute('data-peca') : null;
  };
  grade.addEventListener('pointerover', (ev) => { const id = pecaDoEvento(ev); if (id) provarPeca(id); });
  grade.addEventListener('focusin', (ev) => { const id = pecaDoEvento(ev); if (id) provarPeca(id); });
  grade.addEventListener('pointerleave', fimDaProva);
  grade.addEventListener('focusout', (ev) => {
    if (!ev.relatedTarget || !grade.contains(ev.relatedTarget)) fimDaProva();
  });
}
function startIdleMessages() {
  clearTimeout(idleTimer);
  function setMsg() {
    $('oncaSpeech').textContent = pick(MSGS.idle);
    idleTimer = setTimeout(setMsg, 6000);
  }
  idleTimer = setTimeout(setMsg, 3500);
}
function oncaSpeak(msg) {
  $('oncaSpeech').textContent = msg;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(startIdleMessages, 5000);
}

// ──────────────────────────────────────────────────
// 9. ENTRADA DOS JOGOS
// ──────────────────────────────────────────────────
let activeGameIntervals = [];
function safeSetInterval(fn, t) {
  const id = setInterval(fn, t);
  activeGameIntervals.push(id);
  return id;
}
function clearAllGameIntervals() {
  activeGameIntervals.forEach(clearInterval);
  activeGameIntervals = [];
}

const TELA_DO_JOGO = {
  quiz: 'screenQuiz',       catch: 'screenCatch',        puzzle: 'screenPuzzle',
  truefalse: 'screenTrueFalse', memory: 'screenMemory',  operator: 'screenOperator',
  balloon: 'screenBalloon', fishing: 'screenFishing',    sort: 'screenSort',
  whack: 'screenWhack',     sequence: 'screenSequence',  balance: 'screenBalance',
  roulette: 'screenRoulette', duelo: 'screenDuelo',      prova: 'screenProva',
  velha: 'screenVelha',
};
const INICIAR_JOGO = {
  quiz: iniciarQuiz,        catch: iniciarChuva,         puzzle: iniciarCruzadinha,
  truefalse: iniciarVerdadeFalso, memory: iniciarMemoria, operator: iniciarOperacao,
  balloon: iniciarBaloes,   fishing: iniciarPescaria,    sort: iniciarOrdenar,
  whack: iniciarToupeira,   sequence: iniciarSequencia,  balance: iniciarBalanca,
  roulette: iniciarRoleta,  duelo: iniciarDuelo,        prova: iniciarProva,
  velha: iniciarVelha,
};

function startMode(mode) {
  /* Antes da primeira partida de cada jogo, a explicação entra no caminho.
     Depois disso o botão "?" do cartão abre a mesma tela, e o jogo começa
     direto. */
  if (window.CM_TUTORIAL && CM_TUTORIAL.precisaMostrar(mode)) {
    CM_TUTORIAL.abrir(mode, {
      rotuloAcao: mode === 'duelo' ? 'Montar a partida'
                : mode === 'prova' ? 'Começar a prova'
                : 'Começar a jogar',
    });
    return;
  }
  clearAllGameIntervals();
  clearTimeout(idleTimer);
  G.currentMode = mode;
  aplicarNivelDoJogo(mode);
  INICIAR_JOGO[mode]();
  showScreen(TELA_DO_JOGO[mode]);
}

// Dificuldade escolhida para um jogo (Ajustes): vale só na rodada desse jogo.
// O nível adaptativo de verdade fica guardado em nivelGlobal e volta ao sair;
// com nível fixo a rodada não sobe nem desce o degrau, nem conta para medalha.
let nivelGlobal = null;
let anoGlobal = null;
// Desafio por código em andamento: { codigo, inicio }. Ano e nível vêm do código.
let desafioAtivo = null;
function aplicarNivelDoJogo(mode) {
  restaurarNivel();
  desafioAtivo = null;
  const fixo = G.prefs && G.prefs.nivelPorJogo[mode];
  if (!fixo) return;
  nivelGlobal = G.nivel;
  G.nivel = fixo;
}
function restaurarNivel() {
  if (anoGlobal !== null) { G.ano = anoGlobal; anoGlobal = null; }
  if (nivelGlobal === null) return;
  G.nivel = nivelGlobal;
  nivelGlobal = null;
}
function nivelEhFixo() { return nivelGlobal !== null; }

function goHub() {
  restaurarNivel();
  desafioAtivo = null;
  clearAllGameIntervals();
  // O duelo tem relógio próprio: se ele continuar pulsando depois de sair da
  // tela, o tempo do jogador segue correndo sem ninguém olhando.
  if (window.CM_DUELO && window.CM_DUELO.parar) window.CM_DUELO.parar();
  showScreen('screenHub');
  updateHubUI();
  startIdleMessages();
}

// ──────────────────────────────────────────────────
// 10. QUIZ DOCE
// ──────────────────────────────────────────────────
function iniciarRodada() {
  resetarMonte();
  G.roundCorrect = 0;
  G.roundTotal = 0;
  G.roundStars = 0;
  G.trabalhados = [];
}

// Todo jogo soma estrelas e mantém a sequência do mesmo jeito.
function ganhou(modo) {
  registrarResultado(true);
  const pts = PONTOS[modo] || 10;
  G.stars += pts;
  G.roundStars += pts;
  G.totalCorrect++;
  G.roundCorrect++;
  G.roundTotal++;
  G.streak++;
  if (G.streak > G.bestStreak) G.bestStreak = G.streak;
  playSound('correct');
  showConfetti();
  return pts;
}
function perdeu() {
  registrarResultado(false);
  G.roundTotal++;
  G.streak = 0;
  playSound('wrong');
}
function atualizarBarra(id) {
  const el = $(id);
  if (el) el.textContent = numBR(G.stars);
}

function iniciarQuiz() {
  G.quizIndex = 0;
  quizDots = [];
  filaQuiz = [];
  iniciarRodada();
  filaQuiz = revisoesDaRodada();
  carregarQuiz();
}

function carregarQuiz() {
  const daFila = filaQuiz.length > 0;
  const q = daFila ? filaQuiz.shift() : proximaPergunta();
  // Questão que veio da fila (revisão, reforço) é registrada ao aparecer: com
  // duas na fila, registrar na criação apontaria a resposta para a errada.
  if (daFila) registrarTrabalho(q);
  G.currentQ = q;
  quizTentativas = 0;

  $('quizProg').textContent     = `${G.quizIndex+1}/${QTD_POR_RODADA}`;
  $('quizStarsBar').textContent = numBR(G.stars);
  $('quizDiff').textContent     = G.ano + 'º ano · ' + textoNivel();
  $('quizEmoji').innerHTML      = `<i class="fa-solid ${iconeDaUnidade(q)}"></i>`;
  $('quizText').textContent     = q.txt;
  const tag = $('quizTag');
  if (tag) tag.textContent = (q.revisao ? 'Revisão · ' : '') + selo(q);
  $('quizFeedback').classList.remove('show');
  $('quizContinuar').hidden = true;
  $('quizOuvir').hidden = true;
  ultimaExplicacao = '';
  esconderVisual();

  const { ordem, certa } = embaralharOpcoes(q.alt);
  renderQuizAnswers(ordem, certa);
  updateQuizDots('current', G.quizIndex);

  // Reinicia a animação do cartão
  $('quizCard').style.animation = 'none';
  void $('quizCard').offsetWidth;
  $('quizCard').style.animation = 'slideUp 0.4s ease';
}

function renderQuizAnswers(opts, correctIdx) {
  const grid = $('quizAnswers');
  grid.innerHTML = '';
  opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'ans-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleQuizAnswer(i, correctIdx, btn));
    grid.appendChild(btn);
  });
}

function handleQuizAnswer(chosen, correct, btn) {
  const btns = document.querySelectorAll('.ans-btn');
  let revelou = false;

  if (chosen === correct) {
    btns.forEach(b => b.disabled = true);
    btn.classList.add('correct');
    if (G.currentQ && G.currentQ.reforco) CM_METAS.registrarReforco(G.metas);
    ganhou('quiz');
    const msg = G.streak >= 3 ? pick(MSGS.streak) : pick(MSGS.correct);
    showQuizFeedback(msg);
    updateQuizDots('done', G.quizIndex);
  } else {
    btn.disabled = true;
    btn.classList.add('wrong');
    quizTentativas++;

    // Primeira erro: a onça dá uma pista e a criança tenta de novo,
    // sem perder a estrela nem encerrar a questão.
    if (quizTentativas === 1) {
      showQuizFeedback(pistaDaPergunta(G.currentQ));
      return;
    }

    // Segunda erro: antes de mostrar a resposta, o desenho da situação.
    // Só aparece quando o item traz uma representação — nem todo enunciado
    // cabe num desenho de doces.
    const visual = G.currentQ && G.currentQ.visual;
    if (quizTentativas === 2 && visual) {
      mostrarVisual(visual);
      showQuizFeedback('Olhe o desenho: ' + legendaDoVisual(visual) + ' Com isso em mãos, escolha de novo.');
      return;
    }

    esconderVisual();
    btns.forEach(b => b.disabled = true);
    btns[correct].classList.add('reveal');
    perdeu();
    // No desafio por código as cinco perguntas são as mesmas para os dois
    // jogadores: reforço entraria no lugar de uma delas.
    const reforco = desafioAtivo ? null : reforcoDe(G.currentQ);
    if (reforco) filaQuiz.unshift(reforco);
    ultimaExplicacao = fimDeQuizMSG(G.currentQ, reforco);
    showQuizFeedback(ultimaExplicacao);
    // A explicação pode ser ouvida quantas vezes a criança quiser; nunca toca sozinha.
    $('quizOuvir').hidden = false;
    updateQuizDots('wrong', G.quizIndex);
    revelou = true;
  }

  atualizarBarra('quizStarsBar');
  saveState();

  // Na revelação a explicação espera a leitura: o botão Continuar avança a
  // rodada, em vez de um temporizador que apagava o porquê antes da leitura.
  if (revelou) {
    const botao = $('quizContinuar');
    botao.hidden = false;
    botao.onclick = () => { botao.hidden = true; botao.onclick = null; $('quizOuvir').hidden = true; pararFala(); avancarQuiz(); };
    return;
  }
  setTimeout(avancarQuiz, 1800);
}

// Narração da explicação do erro: o mesmo texto da tela (resposta certa, o
// porquê e o conteúdo), na velocidade escolhida em Ajustes.
let ultimaExplicacao = '';
function ouvirExplicacao() {
  if (!ultimaExplicacao) return;
  const voz = window.CM_NARRACAO;
  if (voz && voz.podeFalar()) { voz.falar(ultimaExplicacao); return; }
  showToast('A narração está desligada. Acenda em Voz.');
}

function avancarQuiz() {
  G.quizIndex++;
  if (G.quizIndex >= QTD_POR_RODADA) finishRound('quiz');
  else carregarQuiz();
}

function pistaDaPergunta(q) {
  return PISTA_POR_UNIDADE[q.u] || PISTA_POR_UNIDADE.numeros;
}

// O porquê vem do próprio item: exp na múltipla escolha, explicacao no V/F.
function explicacaoDe(q) { return (q && (q.exp || q.explicacao)) || ''; }

// Segunda erro: mostra a resposta, o porquê e o nome do conteúdo trabalhado.
// Quando existe uma questão parecida no banco, ela já entra como consolidação.
function fimDeQuizMSG(q, reforco) {
  const exp = explicacaoDe(q);
  const base = 'A resposta certa é ' + q.alt[0] + '. ' + (exp ? exp + ' ' : '') +
    'Nessa questão o conteúdo é ' + q.o.charAt(0).toLowerCase() + q.o.slice(1) + '.';
  return reforco ? base + ' Vou te dar uma parecida para você tentar de novo.' : base;
}

function showQuizFeedback(msg) {
  $('quizFeedbackMsg').textContent = msg;
  $('quizFeedback').classList.add('show');
}

// ── representação em doces ──────────────────────────────
// O item traz a estrutura numérica (visual) e a interface desenha. A regra é
// a mesma do resto do jogo: o desenho mostra como ler a situação, nunca o
// resultado. Cada tipo de visual tem um limite de elementos; fora dele o
// gerador já vem sem visual, porque desenho grande demais confunde.
function doce(pintado) {
  const d = document.createElement('span');
  d.className = 'cv-doce' + (pintado ? ' cv-pintado' : '');
  d.setAttribute('aria-hidden', 'true');
  return d;
}

function legendaDoVisual(v) {
  if (v.tipo === 'grupos') {
    return 'são ' + v.grupos + ' caixas com ' + v.cada + ' bombons em cada uma.';
  }
  if (v.tipo === 'repartir') {
    return v.total + ' balas repartidas igualmente por ' + v.partes + ' pratos, uma de cada vez.';
  }
  if (v.tipo === 'barra') {
    return 'a barra inteira é a quantidade toda, dividida em ' + v.denominador +
      ' partes iguais, e ' + v.numerador + ' delas estão pintadas. Cada parte vale ' +
      fmtPt(v.total / v.denominador) + '.';
  }
  if (v.tipo === 'malha') {
    return 'a malha tem 100 quadradinhos e os ' + v.pct + ' pintados são ' + v.rotulo +
      '. Cada quadradinho vale ' + fmtPt(v.total / 100) + ' da quantidade toda.';
  }
  return 'veja a disposição dos doces.';
}

function fmtPt(n) {
  const inteiro = Math.round(n * 100) / 100;
  return String(inteiro).replace('.', ',');
}

function mostrarVisual(v) {
  const caixa = $('quizVisual');
  caixa.innerHTML = '';
  caixa.hidden = false;

  const titulo = document.createElement('p');
  titulo.className = 'cv-legenda';
  titulo.textContent = legendaDoVisual(v);
  caixa.appendChild(titulo);

  const corpo = document.createElement('div');
  corpo.className = 'cv-corpo cv-' + v.tipo;
  corpo.setAttribute('role', 'img');
  corpo.setAttribute('aria-label', legendaDoVisual(v));

  if (v.tipo === 'grupos') {
    for (let g = 0; g < v.grupos; g++) {
      const linha = document.createElement('div');
      linha.className = 'cv-linha';
      for (let c = 0; c < v.cada; c++) linha.appendChild(doce(true));
      corpo.appendChild(linha);
    }
  } else if (v.tipo === 'repartir') {
    const pratos = [];
    for (let p = 0; p < v.partes; p++) {
      const prato = document.createElement('div');
      prato.className = 'cv-prato';
      corpo.appendChild(prato);
      pratos.push(prato);
    }
    for (let i = 0; i < v.total; i++) pratos[i % v.partes].appendChild(doce(true));
  } else if (v.tipo === 'barra') {
    for (let i = 0; i < v.denominador; i++) corpo.appendChild(doce(i < v.numerador));
  } else if (v.tipo === 'malha') {
    for (let i = 0; i < 100; i++) corpo.appendChild(doce(i < v.pct));
  }

  caixa.appendChild(corpo);
}

function esconderVisual() {
  const caixa = $('quizVisual');
  caixa.hidden = true;
  caixa.innerHTML = '';
}

let quizDots = [];
let quizTentativas = 0;
let filaQuiz = [];
function updateQuizDots(state, index) {
  if (state !== 'current') quizDots[index] = state;
  document.querySelectorAll('.qdot').forEach((dot, i) => {
    dot.classList.remove('done', 'wrong', 'current');
    if (quizDots[i]) dot.classList.add(quizDots[i]);
    else if (state === 'current' && i === index) dot.classList.add('current');
  });
}

// ──────────────────────────────────────────────────
// 11. CHUVA NUMÉRICA
// ──────────────────────────────────────────────────
let catchDropInterval = null;
let catchPlayerX = 50;
let catchEncerrado = false;

function iniciarChuva() {
  G.catchIndex = 0;
  iniciarRodada();
  $('catchFeedback').classList.remove('show');

  const stage = $('catchStage');
  const player = $('catchPlayer');

  // on* em vez de addEventListener: voltar ao jogo não empilha handlers
  function mover(e) {
    const rect = stage.getBoundingClientRect();
    let pct = ((e.clientX - rect.left) / rect.width) * 100;
    pct = Math.max(10, Math.min(90, pct));
    catchPlayerX = pct;
    player.style.left = pct + '%';
  }
  stage.onpointerdown = (e) => { stage.dataset.arrastando = '1'; mover(e); };
  stage.onpointermove = (e) => { if (stage.dataset.arrastando === '1') mover(e); };
  stage.onpointerup = stage.onpointercancel = () => { stage.dataset.arrastando = '0'; };

  player.style.left = catchPlayerX + '%';

  carregarChuva();
}

function carregarChuva() {
  clearInterval(catchDropInterval);

  const q = proximaPergunta();
  G.currentQ = q;

  $('catchProg').textContent = `${G.catchIndex+1}/${QTD_POR_RODADA}`;
  atualizarBarra('catchStarsBar');
  $('catchText').textContent = q.txt;

  const stage = $('catchStage');
  document.querySelectorAll('.catch-item').forEach(el => el.remove());

  // Cada onda tem as quatro alternativas, uma de cada vez: a resposta
  // certa está sempre na tela e as erradas são erros reais de cálculo.
  soltarOnda(q);

  const vel = [1.8, 2.4, 3, 3.6][G.nivel - 1] * (calmo() ? 0.5 : 1);
  catchDropInterval = safeSetInterval(() => {
    const items = document.querySelectorAll('.catch-item');
    const pRect = $('catchPlayer').getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();

    items.forEach(item => {
      let top = parseFloat(item.style.top || '-40');
      top += vel;
      item.style.top = top + 'px';

      const iRect = item.getBoundingClientRect();

      // A caixa de acerto acompanha o desenho: o doce é pego na altura das
      // patas, não no topo da cabeça, e a margem lateral é proporcional ao
      // tamanho do boneco em cada janela.
      if (
        iRect.bottom >= pRect.top + pRect.height * 0.4 &&
        iRect.top <= pRect.bottom &&
        iRect.right >= pRect.left + pRect.width * 0.22 &&
        iRect.left <= pRect.right - pRect.width * 0.22
      ) {
        item.remove();
        if (item.dataset.correct === 'true') {
          handleCatchWin();
        } else {
          handleCatchFail();
        }
      } else if (top > stageRect.height) {
        item.remove();
      }
    });

    if (!document.querySelectorAll('.catch-item').length && !catchEncerrado) soltarOnda(q);
  }, 30);
}

function soltarOnda(q) {
  catchEncerrado = false;
  const onda = C.embaralhar(q.alt.slice());
  onda.forEach((opt, i) => {
    setTimeout(() => {
      if (catchEncerrado) return;
      spawnCatchItem(opt, opt === q.alt[0], i, onda.length);
    }, i * 420);
  });
}

function spawnCatchItem(text, isCorrect, i, total) {
  const stage = $('catchStage');
  const el = document.createElement('div');
  el.className = 'catch-item';
  el.textContent = text;
  el.dataset.correct = isCorrect;
  const faixa = 82 / total;
  el.style.left = (8 + faixa * i + Math.random() * (faixa - 8)) + '%';
  // O doce é pílula e escala com a janela: entra totalmente acima do palco,
  // não com uma altura fixa que sobraria dentro dele em tela grande.
  el.style.top = '0';
  stage.appendChild(el);
  el.style.top = (-el.offsetHeight - 6) + 'px';
}

function handleCatchWin() {
  catchEncerrado = true;
  clearInterval(catchDropInterval);
  document.querySelectorAll('.catch-item').forEach(el => el.remove());

  ganhou('catch');
  atualizarBarra('catchStarsBar');
  showChuvaFeedback(pick(MSGS.correct));
  saveState();

  setTimeout(() => {
    catchEncerrado = false;
    G.catchIndex++;
    if (G.catchIndex >= QTD_POR_RODADA) finishRound('catch');
    else carregarChuva();
  }, 1500);
}

function handleCatchFail() {
  perdeu();
  atualizarBarra('catchStarsBar');
  showChuvaFeedback('Esse não! A resposta certa ainda está caindo.');
  saveState();
}
function showChuvaFeedback(msg) {
  $('catchFeedbackMsg').textContent = msg;
  $('catchFeedback').classList.add('show');
  setTimeout(() => $('catchFeedback').classList.remove('show'), 1400);
}

// ──────────────────────────────────────────────────
// 12. PUZZLE GAME
// ──────────────────────────────────────────────────
let currentPuzzle = null;
let hintsUsed = 0;

function iniciarCruzadinha() {
  iniciarRodada();
  G.puzIndex = 0;
  $('btnNextPuzzle').style.display = 'none';
  document.querySelectorAll('.btn-check-puzzle').forEach(b => b.disabled = false);
  carregarCruzadinha();
}

function carregarCruzadinha() {
  currentPuzzle = C.cruzadinha(G.ano, G.nivel);
  hintsUsed = 0;
  registrarTrabalho(currentPuzzle);
  $('puzzleLvlLabel').textContent = G.ano + 'º ano · ' + textoNivel();
  atualizarBarra('puzzleStarsBar');
  $('puzzleTitle').textContent = currentPuzzle.o;
  $('puzzleDesc').innerHTML = 'Complete os <strong>?</strong> para que as somas das linhas e colunas batam.';
  renderPuzzleGrid();
}

function renderPuzzleGrid() {
  const p = currentPuzzle;
  const n = p.size;
  const wrap = $('puzzleGridWrap');
  const lacunas = p.respostas;

  const grid = document.createElement('div');
  grid.className = 'puzzle-grid';
  grid.style.gridTemplateColumns = `repeat(${n + 1}, 1fr)`;
  grid.innerHTML = '';

  // Data rows
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = document.createElement('div');
      const key = `${r}-${c}`;
      if (!(key in lacunas)) {
        cell.className = 'pcell fixed';
        cell.textContent = p.grid[r][c];
      } else {
        cell.className = 'pcell blank';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.inputMode = 'numeric';
        inp.autocomplete = 'off';
        inp.id = `cell-${key}`;
        inp.placeholder = '?';
        inp.setAttribute('aria-label', `Casa da linha ${r + 1}, coluna ${c + 1}`);
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkPuzzle(); });
        cell.appendChild(inp);
      }
      grid.appendChild(cell);
    }
    // Row sum label
    const sumCell = document.createElement('div');
    sumCell.className = 'pcell sum-label';
    sumCell.innerHTML = `= <strong>${p.rowSums[r]}</strong>`;
    grid.appendChild(sumCell);
  }

  // Column sum row
  for (let c = 0; c < n; c++) {
    const sumCell = document.createElement('div');
    sumCell.className = 'pcell sum-label';
    sumCell.innerHTML = `= <strong>${p.colSums[c]}</strong>`;
    grid.appendChild(sumCell);
  }
  // Corner
  const corner = document.createElement('div');
  corner.className = 'pcell corner';
  corner.innerHTML = '<i class="fa-solid fa-candy-cane"></i>';
  grid.appendChild(corner);

  wrap.innerHTML = '';
  wrap.appendChild(grid);
}

// A regra do jogo é a soma que aparece na borda: qualquer preenchimento
// que faça todas as linhas e colunas baterem está certo.
function lerCruzadinha() {
  const p = currentPuzzle;
  const mat = [];
  let faltando = false;
  for (let r = 0; r < p.size; r++) {
    const linha = [];
    for (let c = 0; c < p.size; c++) {
      const key = r + '-' + c;
      if (!(key in p.respostas)) { linha.push(p.grid[r][c]); continue; }
      const inp = $('cell-' + key);
      const v = paraNumero(inp.value);
      if (isNaN(v)) { faltando = true; linha.push(null); }
      else linha.push(v);
    }
    mat.push(linha);
  }
  return { mat, faltando };
}

function somasDaGrade(mat) {
  const n = mat.length;
  const linhas = [], colunas = [];
  for (let r = 0; r < n; r++) linhas.push(mat[r].reduce((a, b) => a + (b || 0), 0));
  for (let c = 0; c < n; c++) {
    let s = 0;
    for (let r = 0; r < n; r++) s += mat[r][c] || 0;
    colunas.push(s);
  }
  return { linhas, colunas };
}

function checkPuzzle() {
  const p = currentPuzzle;
  const { mat, faltando } = lerCruzadinha();
  if (faltando) { showToast('Preencha todos os ? primeiro!'); return; }

  const { linhas, colunas } = somasDaGrade(mat);
  const linhaOK = linhas.map((s, i) => s === p.rowSums[i]);
  const colunaOK = colunas.map((s, i) => s === p.colSums[i]);
  const resolvido = linhaOK.every(Boolean) && colunaOK.every(Boolean);

  document.querySelectorAll('.pcell.blank').forEach(cell => {
    const partes = cell.querySelector('input').id.replace('cell-', '').split('-');
    const r = +partes[0], c = +partes[1];
    cell.classList.remove('correct-cell', 'wrong-cell');
    cell.classList.add(linhaOK[r] && colunaOK[c] ? 'correct-cell' : 'wrong-cell');
  });

  if (resolvido) {
    let pts = ganhou('puzzle');
    const desconto = Math.min(hintsUsed * 5, pts - 10);
    if (desconto > 0) { pts -= desconto; G.stars -= desconto; G.roundStars -= desconto; }
    G.puzIndex++;
    saveState();
    showToast('As somas bateram! +' + pts + ' estrelas');
    atualizarBarra('puzzleStarsBar');
    if (G.puzIndex >= totalDaRodada('puzzle')) {
      $('btnNextPuzzle').style.display = 'none';
      setTimeout(() => finishRound('puzzle'), 900);
    } else {
      $('btnNextPuzzle').style.display = 'inline-block';
    }
    document.querySelectorAll('.btn-check-puzzle').forEach(b => (b.disabled = true));
  } else {
    playSound('wrong');
    showToast('Alguma soma não bate — confira as linhas e colunas vermelhas.');
  }
}

function giveHint() {
  const p = currentPuzzle;
  const pendente = Object.keys(p.respostas).filter((key) => {
    const inp = $('cell-' + key);
    return inp && !inp.value;
  });
  if (!pendente.length) { showToast('Todos os ? já estão preenchidos!'); return; }
  const key = C.d1(pendente);
  const inp = $('cell-' + key);
  inp.value = p.respostas[key];
  inp.parentElement.classList.add('hinted');
  hintsUsed++;
  showToast('Um número revelado: isso custa 5 estrelas no final.');
}

function nextPuzzle() {
  $('btnNextPuzzle').style.display = 'none';
  document.querySelectorAll('.btn-check-puzzle').forEach(b => b.disabled = false);
  carregarCruzadinha();
}

// ──────────────────────────────────────────────────
// 12. VERDADEIRO OU FALSO
// ──────────────────────────────────────────────────
let tfAtual = null;

function iniciarVerdadeFalso() {
  G.tfIndex = 0;
  iniciarRodada();
  carregarAfirmacao();
}

function carregarAfirmacao() {
  const a = proximaAfirmacao();
  tfAtual = a;
  $('tfProg').textContent = `${G.tfIndex+1}/${QTD_POR_RODADA}`;
  atualizarBarra('tfStarsBar');
  $('tfFeedback').classList.remove('show');
  $('tfEquation').textContent = a.txt;
  $('tfTag').textContent = selo(a);
  document.querySelectorAll('.btn-tf').forEach(b => (b.disabled = false));
}

function checkTF(resposta) {
  if (!tfAtual || tfAtual.respondida) return;
  tfAtual.respondida = true;
  document.querySelectorAll('.btn-tf').forEach(b => (b.disabled = true));

  const acertou = resposta === tfAtual.certa;
  if (acertou) {
    ganhou('truefalse');
    showTFFeedback(pick(MSGS.correct));
  } else {
    perdeu();
    showTFFeedback((tfAtual.certa ? 'Verdadeiro. ' : 'Falso. ') + tfAtual.explicacao);
  }
  atualizarBarra('tfStarsBar');
  saveState();

  setTimeout(() => {
    G.tfIndex++;
    if (G.tfIndex >= QTD_POR_RODADA) finishRound('truefalse');
    else carregarAfirmacao();
  }, 2600);
}
function showTFFeedback(msg) { $('tfFeedbackMsg').textContent = msg; $('tfFeedback').classList.add('show'); }

// ──────────────────────────────────────────────────
// 13. MEMÓRIA DOCE (expressão ↔ valor)
// ──────────────────────────────────────────────────
let memFlipped = [], memPares = 0, memTravada = false;

function iniciarMemoria() {
  iniciarRodada();
  G.memIndex = 0;
  atualizarBarra('memStarsBar');
  $('memFeedback').classList.remove('show');
  montarMesaMemoria();
}

function montarMesaMemoria() {
  const mesa = C.memoria(G.ano, G.nivel);
  registrarTrabalho(mesa);
  memPares = mesa.pares.length;
  memFlipped = [];
  memTravada = false;

  const cartas = [];
  mesa.pares.forEach((par, i) => {
    cartas.push({ id: i, texto: par.expressao });
    cartas.push({ id: i, texto: par.valor });
  });

  const grid = $('memGrid');
  grid.innerHTML = '';
  C.embaralhar(cartas).forEach((c) => {
    const el = document.createElement('div');
    el.className = 'mem-card';
    el.innerHTML =
      '<div class="mem-card-inner">' +
        '<div class="mem-card-front"><i class="fa-solid fa-candy-cane"></i></div>' +
        '<div class="mem-card-back">' + c.texto + '</div>' +
      '</div>';
    el.onclick = () => virarCarta(el, c);
    grid.appendChild(el);
  });
  $('memFeedbackMsg').textContent = 'Junte cada conta ao seu resultado.';
  $('memFeedback').classList.add('show');
  setTimeout(() => $('memFeedback').classList.remove('show'), 2200);
}

function virarCarta(el, c) {
  if (memTravada || el.classList.contains('flipped') || el.classList.contains('matched')) return;
  el.classList.add('flipped');
  memFlipped.push({ el, c });
  if (memFlipped.length < 2) return;

  memTravada = true;
  const [a, b] = memFlipped;
  setTimeout(() => {
    if (a.c.id === b.c.id) {
      a.el.classList.add('matched');
      b.el.classList.add('matched');
      playSound('correct');
      memFlipped = [];
      memTravada = false;
      if (--memPares === 0) finalizarMesaMemoria();
    } else {
      a.el.classList.remove('flipped');
      b.el.classList.remove('flipped');
      memFlipped = [];
      playSound('wrong');
      memTravada = false;
      // O par errado conta como tentativa da rodada, mas não quebra a
      // sequência nem tira estrelas: memória se avalia pela mesa completa.
      G.roundTotal++;
    }
  }, 800);
}

function finalizarMesaMemoria() {
  G.memIndex++;
  ganhou('memory');
  saveState();
  atualizarBarra('memStarsBar');
  showConfetti();
  if (G.memIndex >= totalDaRodada('memory')) {
    $('memFeedbackMsg').textContent = 'Rodada de mesas concluída!';
    $('memFeedback').classList.add('show');
    setTimeout(() => finishRound('memory'), 1200);
    return;
  }
  $('memFeedbackMsg').textContent = 'Todos os pares! +' + PONTOS.memory + ' estrelas.';
  $('memFeedback').classList.add('show');
  setTimeout(montarMesaMemoria, 2200);
}

// ──────────────────────────────────────────────────
// 14. QUAL A OPERAÇÃO?
//     Os números ficam na faixa da conta de cabeça: o que o jogo
//     avalia é o reconhecimento da operação, não o cálculo difícil.
// ──────────────────────────────────────────────────
const SINAIS = ['+', '-', '×', '÷'];
const TEMA_DO_SINAL = { '+': 'adi', '-': 'sub', '×': 'mult', '÷': 'div' };
const NOME_DO_SINAL = { '+': 'adição', '-': 'subtração', '×': 'multiplicação', '÷': 'divisão' };
const RESULTADO_DO_SINAL = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '×': (a, b) => a * b,
  '÷': (a, b) => (b !== 0 && a % b === 0 ? a / b : NaN),
};

let opAtual = null;
let opTravada = false;

function gerarOperacao() {
  const soma = Math.min(C.faixaDe(G.ano, G.nivel, 'adicao')[1], [20, 40, 80, 120][G.nivel - 1]);
  const fator = Math.min(12, Math.max(4, Math.round(Math.sqrt(soma))));
  for (let t = 0; t < 60; t++) {
    const op = C.d1(SINAIS);
    let a, b, c;
    if (op === '+')      { a = C.ri(2, Math.max(3, soma - 2)); b = C.ri(2, Math.max(3, soma - a)); c = a + b; }
    else if (op === '-') { a = C.ri(4, soma); b = C.ri(2, Math.max(2, a - 1)); c = a - b; }
    else if (op === '×') { a = C.ri(2, fator); b = C.ri(2, fator); c = a * b; }
    else                 { b = C.ri(2, fator); c = C.ri(2, fator); a = b * c; }
    // só vale se nenhum outro sinal chegar ao mesmo resultado
    const possiveis = SINAIS.filter((o) => RESULTADO_DO_SINAL[o](a, b) === c);
    if (possiveis.length === 1 && possiveis[0] === op) {
      return {
        a, b, c, op,
        u: 'numeros',
        o: 'Sentenças das quatro operações com números naturais',
        unidade: C.UNIDADES.numeros,
        bncc: C.cod(TEMA_DO_SINAL[op], G.ano),
      };
    }
  }
  return { a: 7, b: 2, c: 5, op: '-', u: 'numeros',
           o: 'Sentenças das quatro operações com números naturais',
           unidade: C.UNIDADES.numeros, bncc: C.cod('sub', G.ano) };
}

function iniciarOperacao() {
  G.opIndex = 0;
  iniciarRodada();
  carregarOperacao();
}

function carregarOperacao() {
  opAtual = gerarOperacao();
  registrarTrabalho(opAtual);
  opTravada = false;
  $('opProg').textContent = `${G.opIndex+1}/${QTD_POR_RODADA}`;
  atualizarBarra('opStarsBar');
  $('opFeedback').classList.remove('show');
  $('opTag').textContent = selo(opAtual);
  $('opEquation').innerHTML = `${opAtual.a} <span class="op-hole">?</span> ${opAtual.b} = ${opAtual.c}`;
  document.querySelectorAll('.btn-op').forEach((b) => (b.disabled = false));
}

function checkOp(resposta) {
  if (!opAtual || opTravada) return;
  opTravada = true;
  document.querySelectorAll('.btn-op').forEach((b) => (b.disabled = true));

  const certa = opAtual.op;
  const eq = $('opEquation');
  if (resposta === certa) {
    ganhou('operator');
    eq.innerHTML = eq.innerHTML.replace('<span class="op-hole">?</span>',
      `<span class="op-hole" style="color:var(--green)">${certa}</span>`);
    showOpFeedback('Era ' + NOME_DO_SINAL[certa] + ' mesmo!');
  } else {
    perdeu();
    eq.innerHTML = eq.innerHTML.replace('<span class="op-hole">?</span>',
      `<span class="op-hole" style="color:var(--red)">${resposta}</span>`);
    showOpFeedback(`Com ${resposta} a sentença não fecha. O sinal certo era ${certa}.`);
  }
  atualizarBarra('opStarsBar');
  saveState();
  setTimeout(() => {
    G.opIndex++;
    if (G.opIndex >= QTD_POR_RODADA) finishRound('operator');
    else carregarOperacao();
  }, 1800);
}
function showOpFeedback(msg) { $('opFeedbackMsg').textContent = msg; $('opFeedback').classList.add('show'); }

// ──────────────────────────────────────────────────
// 15. BALÕES
// ──────────────────────────────────────────────────
const CORES_BALAO = ['var(--pink)', 'var(--purple)', 'var(--mint)', 'var(--orange)'];
let balInterval = null;
let balTravada = false;

function iniciarBaloes() {
  G.balIndex = 0;
  iniciarRodada();
  carregarBaloes();
}

function carregarBaloes() {
  clearInterval(balInterval);
  const q = proximaPergunta();
  G.currentQ = q;

  $('balProg').textContent = `${G.balIndex+1}/${QTD_POR_RODADA}`;
  atualizarBarra('balStarsBar');
  $('balFeedback').classList.remove('show');
  $('balQuestion').textContent = q.txt;

  const area = $('balArea');
  area.innerHTML = '';
  balTravada = false;
  lancarOndaBaloes(q);

  const vel = [1.1, 1.5, 1.9, 2.4][G.nivel - 1] * (calmo() ? 0.5 : 1);
  balInterval = safeSetInterval(() => {
    document.querySelectorAll('.balloon').forEach((b) => {
      const bottom = parseFloat(b.style.bottom || '-80') + vel;
      b.style.bottom = bottom + 'px';
      if (bottom > area.offsetHeight) b.remove();
    });
    if (!balTravada && !document.querySelectorAll('.balloon').length) lancarOndaBaloes(q);
  }, 30);
}

function lancarOndaBaloes(q) {
  const area = $('balArea');
  C.embaralhar(q.alt.slice()).forEach((opt, i) => {
    const b = document.createElement('div');
    b.className = 'balloon';
    b.textContent = opt;
    b.style.background = CORES_BALAO[i % CORES_BALAO.length];
    b.style.left = (8 + i * 23 + Math.random() * 6) + '%';
    b.style.bottom = (-90 - i * 110) + 'px';
    b.onclick = () => estourarBalao(b, opt === q.alt[0]);
    area.appendChild(b);
  });
}

function estourarBalao(b, certa) {
  if (balTravada || b.classList.contains('popped')) return;
  b.classList.add('popped');
  if (certa) {
    balTravada = true;
    clearInterval(balInterval);
    document.querySelectorAll('.balloon').forEach((el) => el.remove());
    ganhou('balloon');
    atualizarBarra('balStarsBar');
    showBalFeedback(pick(MSGS.correct));
    saveState();
    setTimeout(() => {
      balTravada = false;
      G.balIndex++;
      if (G.balIndex >= QTD_POR_RODADA) finishRound('balloon');
      else carregarBaloes();
    }, 1500);
  } else {
    perdeu();
    atualizarBarra('balStarsBar');
    showBalFeedback('Esse balão não! Ainda dá tempo de achar o certo.');
    setTimeout(() => $('balFeedback').classList.remove('show'), 1300);
    saveState();
  }
}
function showBalFeedback(msg) { $('balFeedbackMsg').textContent = msg; $('balFeedback').classList.add('show'); }

// ──────────────────────────────────────────────────
// 16. PESCARIA
// ──────────────────────────────────────────────────
let fishMov = null;
let pescando = false;

function iniciarPescaria() {
  G.fishIndex = 0;
  iniciarRodada();

  const pool = document.querySelector('.fish-area');
  const hook = $('fishHook');
  pool.onpointermove = (e) => {
    const rect = pool.getBoundingClientRect();
    const pct = Math.max(6, Math.min(94, ((e.clientX - rect.left) / rect.width) * 100));
    hook.style.left = pct + '%';
    hook.dataset.x = pct;
  };
  carregarPeixes();
}

function carregarPeixes() {
  clearInterval(fishMov);
  const q = proximaPergunta();
  G.currentQ = q;
  pescando = false;

  $('fishProg').textContent = `${G.fishIndex+1}/${QTD_POR_RODADA}`;
  atualizarBarra('fishStarsBar');
  $('fishFeedback').classList.remove('show');
  $('fishQuestion').textContent = q.txt;

  const pool = $('fishPool');
  pool.innerHTML = '';
  const area = document.querySelector('.fish-area');
  C.embaralhar(q.alt.slice()).forEach((opt, i) => {
    const f = document.createElement('div');
    f.className = 'fish';
    f.textContent = opt;
    f.dataset.correct = opt === q.alt[0];
    f.style.top = (20 + i * 18 + Math.random() * 6) + '%';
    f.style.left = (6 + Math.random() * 74) + '%';
    f.dataset.dir = Math.random() < 0.5 ? '1' : '-1';
    f.dataset.vel = ((0.5 + G.nivel * 0.45 + Math.random() * 0.6) * (calmo() ? 0.5 : 1)).toFixed(2);
    pool.appendChild(f);
  });

  const largura = () => (area.clientWidth || 320);
  fishMov = safeSetInterval(() => {
    document.querySelectorAll('.fish').forEach((f) => {
      let l = parseFloat(f.style.left);
      l += (parseFloat(f.dataset.vel) * 100) / largura() * parseFloat(f.dataset.dir);
      if (l < 2) { l = 2; f.dataset.dir = '1'; }
      if (l > 78) { l = 78; f.dataset.dir = '-1'; }
      f.style.left = l + '%';
    });
  }, 60);
}

function dropHook() {
  if (pescando) return;
  pescando = true;
  const hook = $('fishHook');
  const area = document.querySelector('.fish-area');
  hook.style.top = Math.round(area.clientHeight * 0.6) + 'px';

  setTimeout(() => {
    const h = hook.getBoundingClientRect();
    const hx = h.left + h.width / 2;
    let alvo = null, menor = 60;
    document.querySelectorAll('.fish').forEach((f) => {
      const r = f.getBoundingClientRect();
      const dist = Math.abs(r.left + r.width / 2 - hx);
      if (dist < menor) { menor = dist; alvo = f; }
    });

    if (!alvo) {
      // Anzol vazio é mira, não conta: nenhuma alternativa foi escolhida, então
      // não entra no histórico nem quebra a sequência de acertos.
      playSound('wrong');
      showFishFeedback('O anzol voltou vazio — mire em um peixe!');
    } else if (alvo.dataset.correct === 'true') {
      clearInterval(fishMov);
      ganhou('fishing');
      showFishFeedback(pick(MSGS.correct));
    } else {
      perdeu();
      showFishFeedback('Peixe errado! A resposta certa ainda nada por aí.');
      alvo.remove();
    }
    atualizarBarra('fishStarsBar');
    saveState();
    hook.style.top = '0';

    if (alvo && alvo.dataset.correct === 'true') {
      setTimeout(() => {
        G.fishIndex++;
        if (G.fishIndex >= QTD_POR_RODADA) finishRound('fishing');
        else carregarPeixes();
      }, 1600);
    } else {
      setTimeout(() => { pescando = false; $('fishFeedback').classList.remove('show'); }, 1400);
    }
  }, 700);
}
function showFishFeedback(msg) { $('fishFeedbackMsg').textContent = msg; $('fishFeedback').classList.add('show'); }

// ──────────────────────────────────────────────────
// 17. ORDENAR
// ──────────────────────────────────────────────────
let ordenarAtual = null;
let selSort = null;

function iniciarOrdenar() {
  G.sortIndex = 0;
  iniciarRodada();
  carregarOrdenar();
}

function carregarOrdenar() {
  const p = C.ordenar(G.ano, G.nivel);
  ordenarAtual = p;
  registrarTrabalho(p);
  selSort = null;

  $('sortProg').textContent = `${G.sortIndex+1}/${QTD_POR_RODADA}`;
  atualizarBarra('sortStarsBar');
  $('sortFeedback').classList.remove('show');
  $('sortTag').textContent = selo(p);
  document.querySelector('.sort-inst').textContent =
    'Toque em duas peças para trocá-las: ' +
    (p.ordem === 'crescente' ? 'do menor para o maior!' : 'do maior para o menor!');

  const area = $('sortArea');
  area.innerHTML = '';
  p.pecas.forEach((peca) => {
    const el = document.createElement('div');
    el.className = 'sort-item';
    el.innerHTML = `<i class="fa-solid fa-candy-cane"></i> ${peca.txt}`;
    el.dataset.valor = peca.v;
    el.onclick = () => trocarPecas(el);
    area.appendChild(el);
  });
}

function trocarPecas(el) {
  if (!selSort) { selSort = el; el.classList.add('selected'); return; }
  if (selSort === el) { el.classList.remove('selected'); selSort = null; return; }

  const outro = selSort;
  const html = el.innerHTML, valor = el.dataset.valor;
  el.innerHTML = outro.innerHTML;
  el.dataset.valor = outro.dataset.valor;
  outro.innerHTML = html;
  outro.dataset.valor = valor;
  outro.classList.remove('selected');
  selSort = null;
  playSound('buy');
}

function checkSort() {
  if (!ordenarAtual) return;
  const vals = Array.from(document.querySelectorAll('.sort-item')).map((e) => parseFloat(e.dataset.valor));
  const crescente = ordenarAtual.ordem === 'crescente';
  const foraDeLugar = [];
  for (let i = 1; i < vals.length; i++) {
    if (crescente ? vals[i] < vals[i - 1] : vals[i] > vals[i - 1]) foraDeLugar.push(i);
  }

  if (!foraDeLugar.length) {
    ganhou('sort');
    atualizarBarra('sortStarsBar');
    showSortFeedback('Ordem perfeita!');
    saveState();
    setTimeout(() => {
      G.sortIndex++;
      if (G.sortIndex >= QTD_POR_RODADA) finishRound('sort');
      else carregarOrdenar();
    }, 1500);
  } else {
    perdeu();
    atualizarBarra('sortStarsBar');
    showSortFeedback('A posição ' + (foraDeLugar[0] + 1) + ' está fora de lugar.');
    saveState();
  }
}
function showSortFeedback(msg) { $('sortFeedbackMsg').textContent = msg; $('sortFeedback').classList.add('show'); }

// ──────────────────────────────────────────────────
// 18. TOUPEIRA
// ──────────────────────────────────────────────────
let whackInterval = null;
let whackBaralho = [];
let whackTravada = false;

function iniciarToupeira() {
  G.whackIndex = 0;
  iniciarRodada();
  carregarToupeira();
}

function carregarToupeira() {
  clearInterval(whackInterval);
  const q = proximaPergunta();
  G.currentQ = q;
  whackTravada = false;
  whackBaralho = [];

  $('whackProg').textContent = `${G.whackIndex+1}/${QTD_POR_RODADA}`;
  atualizarBarra('whackStarsBar');
  $('whackFeedback').classList.remove('show');
  $('whackQuestion').textContent = q.txt;
  document.querySelectorAll('.mole').forEach((m) => { m.classList.remove('up', 'hit'); m.textContent = ''; });

  const tempo = [1500, 1250, 1050, 900][G.nivel - 1] * (calmo() ? 1.7 : 1);
  const simultaneas = G.nivel >= 3 && !calmo() ? 2 : 1;
  whackInterval = safeSetInterval(() => {
    if (whackTravada) return;
    document.querySelectorAll('.mole.up').forEach((m) => { m.classList.remove('up'); m.textContent = ''; });
    const buracos = C.embaralhar([0, 1, 2, 3, 4, 5]).slice(0, simultaneas);
    buracos.forEach((idx) => {
      if (!whackBaralho.length) whackBaralho = C.embaralhar(q.alt.slice());
      const m = $('mole' + idx);
      m.textContent = whackBaralho.pop();
      m.classList.add('up');
    });
  }, tempo);
}

function whackMole(idx) {
  const mole = $('mole' + idx);
  if (!mole.classList.contains('up') || whackTravada) return;
  mole.classList.add('hit');

  if (mole.textContent === G.currentQ.alt[0]) {
    whackTravada = true;
    clearInterval(whackInterval);
    ganhou('whack');
    atualizarBarra('whackStarsBar');
    showWhackFeedback(pick(MSGS.correct));
    saveState();
    setTimeout(() => {
      document.querySelectorAll('.mole').forEach((m) => { m.classList.remove('up', 'hit'); m.textContent = ''; });
      G.whackIndex++;
      if (G.whackIndex >= QTD_POR_RODADA) finishRound('whack');
      else carregarToupeira();
    }, 1600);
  } else {
    perdeu();
    atualizarBarra('whackStarsBar');
    showWhackFeedback('Não é essa! O valor certo ainda vai aparecer.');
    setTimeout(() => $('whackFeedback').classList.remove('show'), 1200);
    saveState();
  }
}
function showWhackFeedback(msg) { $('whackFeedbackMsg').textContent = msg; $('whackFeedback').classList.add('show'); }

// ──────────────────────────────────────────────────
// 19. SEQUÊNCIA
// ──────────────────────────────────────────────────
let seqAtual = null;
let seqTravada = false;

function iniciarSequencia() {
  G.seqIndex = 0;
  iniciarRodada();
  carregarSequencia();
}

function carregarSequencia() {
  seqAtual = C.sequencia(G.ano, G.nivel);
  seqTravada = false;
  registrarTrabalho(seqAtual);

  $('seqProg').textContent = `${G.seqIndex+1}/${QTD_POR_RODADA}`;
  atualizarBarra('seqStarsBar');
  $('seqFeedback').classList.remove('show');
  $('seqTag').textContent = selo(seqAtual);
  $('seqBox').innerHTML = seqAtual.seq.join(', ') + ', <span class="seq-hole">?</span>';

  const box = $('seqOptions');
  box.innerHTML = '';
  C.embaralhar([seqAtual.resposta].concat(seqAtual.erradas)).forEach((o) => {
    const b = document.createElement('button');
    b.className = 'btn-tf btn-opcao-numerica';
    b.textContent = o;
    b.onclick = () => checkSeq(o);
    box.appendChild(b);
  });
}

function checkSeq(valor) {
  if (seqTravada || !seqAtual) return;
  seqTravada = true;
  document.querySelectorAll('#seqOptions button').forEach((b) => (b.disabled = true));
  const acertou = valor === seqAtual.resposta;

  if (acertou) {
    ganhou('sequence');
    $('seqBox').innerHTML = seqAtual.seq.join(', ') + ', <span class="seq-hole" style="color:var(--green)">' + valor + '</span>';
    showSeqFeedback('A regra é: ' + seqAtual.regra + '.');
  } else {
    perdeu();
    $('seqBox').innerHTML = seqAtual.seq.join(', ') + ', <span class="seq-hole" style="color:var(--red)">' + valor + '</span>';
    showSeqFeedback('O próximo termo é ' + seqAtual.resposta + ' — a regra é: ' + seqAtual.regra + '.');
  }
  atualizarBarra('seqStarsBar');
  saveState();
  setTimeout(() => {
    G.seqIndex++;
    if (G.seqIndex >= QTD_POR_RODADA) finishRound('sequence');
    else carregarSequencia();
  }, 2400);
}
function showSeqFeedback(msg) { $('seqFeedbackMsg').textContent = msg; $('seqFeedback').classList.add('show'); }

// ──────────────────────────────────────────────────
// 19. BALANÇA DA IGUALDADE
// ──────────────────────────────────────────────────
let balnAtual = null;
let balnTravada = false;

function iniciarBalanca() {
  G.balnIndex = 0;
  iniciarRodada();
  carregarBalanca();
}

function carregarBalanca() {
  const p = C.balanca(G.ano, G.nivel);
  balnAtual = p;
  registrarTrabalho(p);
  balnTravada = false;

  $('balnProg').textContent = `${G.balnIndex+1}/${QTD_POR_RODADA}`;
  atualizarBarra('balnStarsBar');
  $('balnFeedback').classList.remove('show');
  $('balnTag').textContent = selo(p);
  ['balnLeft', 'balnRight'].forEach((id) => $(id).classList.remove('heavy', 'light'));

  const partes = p.frase.split('=');
  const buraco = (texto) =>
    texto.includes('___')
      ? texto.replace('___', '<span class="baln-hole">?</span>')
      : texto.replace('x', '×<span class="baln-hole">?</span>');
  $('balnLeft').innerHTML = buraco(partes[0].trim());
  $('balnRight').innerHTML = partes[1].trim();

  const box = $('balnOptions');
  box.innerHTML = '';
  C.embaralhar(p.alternativas.slice()).forEach((o) => {
    const btn = document.createElement('button');
    btn.className = 'btn-op';
    btn.textContent = o;
    btn.onclick = () => checkBaln(o);
    box.appendChild(btn);
  });
}

function checkBaln(candidato) {
  if (balnTravada || !balnAtual) return;
  const certa = candidato === balnAtual.resposta;
  balnTravada = true;
  document.querySelectorAll('#balnOptions .btn-op').forEach((b) => (b.disabled = true));

  const buraco = $('balnLeft').querySelector('.baln-hole');
  if (buraco) {
    buraco.textContent = candidato;
    buraco.style.color = certa ? 'var(--green)' : 'var(--red)';
  }

  if (certa) {
    ganhou('balance');
    showBalnFeedback('Os dois lados valem o mesmo: equilibrada!');
  } else {
    perdeu();
    const deMais = paraNumero(candidato) > balnAtual.valor;
    $(deMais ? 'balnLeft' : 'balnRight').classList.add('heavy');
    $(deMais ? 'balnRight' : 'balnLeft').classList.add('light');
    showBalnFeedback('Faltou peso: com ' + candidato + ' a balança pende. O termo certo é ' + balnAtual.resposta + '.');
  }
  atualizarBarra('balnStarsBar');
  saveState();

  setTimeout(() => {
    ['balnLeft', 'balnRight'].forEach((id) => $(id).classList.remove('heavy', 'light'));
    G.balnIndex++;
    if (G.balnIndex >= QTD_POR_RODADA) finishRound('balance');
    else carregarBalanca();
  }, 2200);
}
function showBalnFeedback(msg) { $('balnFeedbackMsg').textContent = msg; $('balnFeedback').classList.add('show'); }

// ──────────────────────────────────────────────────
// 20. ROLETA
//     O setor que para no pino define o prêmio — nada de sorteio
//     escondido depois da resposta.
// ──────────────────────────────────────────────────
const ANGULO_SETOR = 360 / 6;
let roulGiros = 0;
let roulPrêmio = null;
let roulTravada = false;
let roulTentativas = 0;

function iniciarRoleta() {
  iniciarRodada();
  G.roulIndex = 0;
  roulGiros = 0;
  $('roulWheel').style.transform = 'rotate(0deg)';
  montarRoleta();
  prepararGiro();
}

// Cada novo giro mantém a rodada; só a entrada do jogo zera o placar.
function prepararGiro() {
  $('roulStarsBar').textContent = numBR(G.stars);
  $('roulFeedback').classList.remove('show');
  $('roulQuestionBox').style.display = 'none';
  $('btnSpin').style.display = 'block';
  $('btnSpin').disabled = false;
  roulPrêmio = null;
  roulTravada = false;
  roulTentativas = 0;
}

function montarRoleta() {
  const roda = $('roulWheel');
  roda.innerHTML = '';
  // O raio dos rótulos sai do tamanho real da roda, que é fluido: a roleta
  // funciona igual em 320 px e em uma tela de 1400 px.
  const raio = Math.round(roda.clientWidth * 0.31);
  C.ROLETA.forEach((seg, i) => {
    const ang = i * ANGULO_SETOR + ANGULO_SETOR / 2;
    const s = document.createElement('span');
    s.className = 'roul-num';
    s.style.transform =
      `translate(-50%,-50%) rotate(${ang}deg) translateY(${-raio}px) rotate(${-ang}deg)`;
    s.textContent = seg.rotulo;
    roda.appendChild(s);
  });
}

function spinRoulette() {
  if (roulTravada) return;
  $('btnSpin').style.display = 'none';

  const setor = C.ri(0, C.ROLETA.length - 1);
  roulPrêmio = C.ROLETA[setor].estrelas;
  const centroDoSetor = setor * ANGULO_SETOR + ANGULO_SETOR / 2;
  const tremida = C.rf(-ANGULO_SETOR / 2 + 6, ANGULO_SETOR / 2 - 6);
  roulGiros += 4 * 360 + (360 - centroDoSetor) - (roulGiros % 360) + tremida;

  $('roulWheel').style.transform = `rotate(${roulGiros}deg)`;
  playSound('buy');

  setTimeout(() => {
    const q = proximaPergunta();
    G.currentQ = q;
    roulTravada = false;
    $('roulQuestionText').textContent = q.txt;
    const box = $('roulOptions');
    box.innerHTML = '';
    C.embaralhar(q.alt.slice()).forEach((o) => {
      const b = document.createElement('button');
      b.className = 'btn-tf btn-opcao-numerica';
      b.textContent = o;
      b.onclick = () => checkRoul(o);
      box.appendChild(b);
    });
    $('roulQuestionBox').style.display = 'block';
  }, MOVIMENTO_REDUTO ? 500 : 3300);
}

function checkRoul(valor) {
  if (roulTravada) return;
  const btns = Array.from(document.querySelectorAll('#roulOptions button'));
  const escolhida = btns.find((b) => b.textContent === valor);
  const acertou = valor === G.currentQ.alt[0];

  if (acertou) {
    roulTravada = true;
    btns.forEach((b) => (b.disabled = true));
    registrarResultado(true);
    G.stars += roulPrêmio;
    G.totalCorrect++;
    G.roundCorrect++;
    G.roundTotal++;
    G.streak++;
    if (G.streak > G.bestStreak) G.bestStreak = G.streak;
    playSound('correct');
    showConfetti();
    G.roundStars += roulPrêmio;
    showRoulFeedback('Certo! O setor premiou ' + roulPrêmio + ' estrelas.');
    $('roulStarsBar').textContent = numBR(G.stars);
    saveState();
    setTimeout(encerrarOuGirar, 2600);
    return;
  }

  if (escolhida) {
    escolhida.disabled = true;
    escolhida.classList.add('errada');
  }
  roulTentativas++;

  // Primeira errada do giro: pista e nova chance, sem perder o prêmio.
  if (roulTentativas === 1) {
    showRoulFeedback(pistaDaPergunta(G.currentQ));
    return;
  }

  roulTravada = true;
  btns.forEach((b) => (b.disabled = true));
  const certa = btns.find((b) => b.textContent === G.currentQ.alt[0]);
  if (certa) certa.classList.add('certa');
  perdeu();
  atualizarBarra('roulStarsBar');
  const expRoul = explicacaoDe(G.currentQ);
  showRoulFeedback('A resposta certa era ' + G.currentQ.alt[0] + '. ' +
    (expRoul ? expRoul + ' ' : '') + 'Sem prêmio neste giro.');
  saveState();
  setTimeout(encerrarOuGirar, 6000);
}
// A roleta também tem rodada: 5 giros e o resumo entra como nos outros jogos.
function encerrarOuGirar() {
  G.roulIndex++;
  if (G.roulIndex >= totalDaRodada('roulette')) finishRound('roulette');
  else prepararGiro();
}
function showRoulFeedback(msg) { $('roulFeedbackMsg').textContent = msg; $('roulFeedback').classList.add('show'); }

// ──────────────────────────────────────────────────
// 21. FIM DE RODADA
//     A rodada é o que regula o nível: rodada cheia sobe um degrau,
//     um acerto ou nenhum volta um. O ano continua sendo escolha do jogador.
// ──────────────────────────────────────────────────
function finishRound(mode) {
  const feitos = G.roundCorrect;
  const total = totalDaRodada(mode);
  const bonus = feitos === total ? 25 : feitos >= 3 ? 10 : 0;
  const ganho = G.roundStars + bonus;
  const nivelAnterior = G.nivel;

  if (!nivelEhFixo()) {
    if (feitos === total && G.nivel < 4) G.nivel++;
    else if (feitos <= 1 && G.nivel > 1) G.nivel--;
    if (G.nivel > nivelAnterior) CM_METAS.registrarDegrau(G.metas, G.nivel);
  }

  G.stars += bonus;
  CM_METAS.registrarRodada(G.metas, { acertos: feitos, total: total }, Date.now());
  premiarMetas();
  saveState();

  document.querySelector('.lu-title').textContent =
    feitos >= 3 ? 'Rodada concluída!' : 'Boa — vamos de novo!';
  const textoDesafio = desafioAtivo
    ? 'Desafio ' + desafioAtivo.codigo + ': ' + feitos + ' de ' + total + ' em ' + tempoDeRelogio(Date.now() - desafioAtivo.inicio) +
      '. Quem tem o mesmo código joga as mesmas perguntas: comparem os resultados conversando.'
    : '';
  $('luPhaseText').textContent = textoDesafio ? textoDesafio : (nivelEhFixo()
    ? 'Este jogo está com a dificuldade fixa em ' + textoNivel() + ' (Ajustes). O seu nível no resto do jogo continua o mesmo.'
    : nivelAnterior === G.nivel
    ? 'Fica no ' + textoNivel() + ': ' + DESCRICAO_NIVEL[G.nivel - 1].split('.')[0] + '.'
    : G.nivel > nivelAnterior
      ? 'Você acertou a rodada inteira, então o próximo degrau vem um pouco mais difícil: ' +
        C.NIVEIS[nivelAnterior - 1] + ' → ' + C.NIVEIS[G.nivel - 1] + '.'
      : 'Esse nível travou bastante, então dou um passo de volta: ' +
        C.NIVEIS[nivelAnterior - 1] + ' → ' + C.NIVEIS[G.nivel - 1] + '. É o mesmo conteúdo do seu ano.');
  $('luStarsText').innerHTML = '+' + ganho + ' <i class="fa-solid fa-star"></i>' +
    (bonus ? ' (sendo ' + bonus + ' de bônus da rodada)' : '');
  $('luConteudo').textContent = G.trabalhados.length
    ? 'Você praticou: ' + G.trabalhados.join(' · ')
    : '';

  openModal('modalLevelUp');
  spawnLevelUpConfetti();
  playSound('levelup');
}

// ── Desafio por código (sem internet) ─────────────────
// O código vem do duelo.js (CM_DUELO.desafio): ano, nível e semente. A rodada
// é um quiz de 5 perguntas sorteadas com a semente — iguais em qualquer
// aparelho —, sem reforço e sem revisão no meio, e não mexe no nível nem no
// ano de quem joga. Nada é enviado.
function tempoDeRelogio(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function avisoDesafio(texto) { const m = $('desafioMsg'); if (m) m.textContent = texto; }
function criarDesafio() {
  const D = window.CM_DUELO && CM_DUELO.desafio;
  if (!D) return;
  const codigo = D.codigo({ ano: G.ano, nivel: G.nivel, semente: D.novaSemente() });
  $('desafioCodigo').value = codigo;
  avisoDesafio('Código criado: ' + codigo + ' (' + G.ano + 'º ano, ' + textoNivel() + '). Passe para quem vai jogar e toque em Jogar.');
}
function jogarDesafio() {
  const D = window.CM_DUELO && CM_DUELO.desafio;
  if (!D) return;
  const lido = D.ler(($('desafioCodigo').value || '').slice(0, 16));
  if (!lido.ok) { avisoDesafio(lido.erro); return; }
  if (window.CM_DUELO.parar) CM_DUELO.parar();
  clearAllGameIntervals();
  restaurarNivel();
  anoGlobal = G.ano; nivelGlobal = G.nivel;
  G.ano = lido.ano; G.nivel = lido.nivel;
  G.currentMode = 'quiz';
  G.quizIndex = 0;
  quizDots = [];
  iniciarRodada();
  filaQuiz = D.perguntas(lido);
  desafioAtivo = { codigo: lido.codigo, inicio: Date.now() };
  carregarQuiz();
  showScreen('screenQuiz');
  showToast('Desafio ' + lido.codigo + ': ' + lido.ano + 'º ano, ' + C.NIVEIS[lido.nivel - 1] + '. Boa sorte!');
}

// ──────────────────────────────────────────────────
// 13b. VELHA DOCE — jogo da velha: cada X custa uma conta certa
//      A criança responde; acertou, escolhe a casa. Errou, lê a explicação e
//      a vez passa. A Juba joga depois: ao acaso no Base, às vezes bloqueia no
//      Prática, bloqueia e ataca no Desafio e no Domínio.
// ──────────────────────────────────────────────────
const LINHAS_VELHA = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
let velha = { casas: [], fase: 'fim' };

function iniciarVelha() {
  iniciarRodada();
  velha = { casas: ['', '', '', '', '', '', '', '', ''], fase: 'pergunta' };
  $('velhaFeedback').classList.remove('show');
  pintarTabuleiro();
  perguntaDaVelha();
}

function vencedorDaVelha(casas) {
  for (const l of LINHAS_VELHA) {
    if (casas[l[0]] && casas[l[0]] === casas[l[1]] && casas[l[1]] === casas[l[2]]) return casas[l[0]];
  }
  return casas.every(Boolean) ? 'empate' : null;
}

function pintarTabuleiro() {
  const tab = $('velhaTabuleiro');
  tab.textContent = '';
  velha.casas.forEach((v, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'velha-casa' + (v === 'X' ? ' velha-x' : v === 'O' ? ' velha-o' : '');
    b.textContent = v;
    b.disabled = !(velha.fase === 'escolher' && !v);
    b.setAttribute('aria-label', 'Linha ' + (Math.floor(i / 3) + 1) + ', coluna ' + (i % 3 + 1) + ': ' +
      (v === 'X' ? 'seu X' : v === 'O' ? 'O da Juba' : 'vazia'));
    b.addEventListener('click', () => jogarNaCasa(i));
    tab.appendChild(b);
  });
}

function perguntaDaVelha() {
  const q = proximaPergunta();
  G.currentQ = q;
  velha.fase = 'pergunta';
  $('velhaProg').textContent = 'Sua vez';
  atualizarBarra('velhaStarsBar');
  $('velhaTag').textContent = selo(q);
  $('velhaTexto').textContent = q.txt;
  $('velhaStatus').textContent = 'Sua vez: acerte a conta para colocar um X.';
  $('velhaContinuar').hidden = true;
  const { ordem, certa } = embaralharOpcoes(q.alt);
  const caixa = $('velhaOpcoes');
  caixa.textContent = '';
  ordem.forEach((opt, i) => {
    const b = document.createElement('button');
    b.className = 'ans-btn';
    b.textContent = opt;
    b.addEventListener('click', () => responderVelha(i, certa, b));
    caixa.appendChild(b);
  });
  pintarTabuleiro();
}

function responderVelha(escolha, certa, btn) {
  if (velha.fase !== 'pergunta') return;
  const btns = Array.prototype.slice.call(document.querySelectorAll('#velhaOpcoes .ans-btn'));
  btns.forEach((b) => (b.disabled = true));
  if (escolha === certa) {
    btn.classList.add('correct');
    ganhou('velha');
    atualizarBarra('velhaStarsBar');
    velha.fase = 'escolher';
    showVelhaFeedback(pick(MSGS.correct) + ' Escolha a casa do seu X.');
    $('velhaStatus').textContent = 'Acertou! Toque numa casa vazia para colocar o seu X.';
    pintarTabuleiro();
    const livre = document.querySelector('#velhaTabuleiro .velha-casa:not(:disabled)');
    if (livre) livre.focus({ preventScroll: true });
    saveState();
    return;
  }
  btn.classList.add('wrong');
  btns[certa].classList.add('reveal');
  perdeu();
  atualizarBarra('velhaStarsBar');
  velha.fase = 'leitura';
  const exp = explicacaoDe(G.currentQ);
  showVelhaFeedback('A resposta certa é ' + G.currentQ.alt[0] + '. ' + (exp ? exp + ' ' : '') + 'A vez passa para a Juba.');
  $('velhaStatus').textContent = 'Leia a explicação e toque em Continuar.';
  saveState();
  const botao = $('velhaContinuar');
  botao.hidden = false;
  botao.onclick = () => { botao.hidden = true; botao.onclick = null; jogadaDaJuba(); };
}

function jogarNaCasa(i) {
  if (velha.fase !== 'escolher' || velha.casas[i]) return;
  velha.casas[i] = 'X';
  velha.fase = 'juba';
  pintarTabuleiro();
  if (fimDaVelha()) return;
  $('velhaStatus').textContent = 'Vez da Juba…';
  $('velhaProg').textContent = 'Vez da Juba';
  setTimeout(jogadaDaJuba, 700);
}

// Uma casa que completa a linha de quem joga, se existir.
function casaQueFecha(casas, marca) {
  for (const l of LINHAS_VELHA) {
    const marcas = l.filter((k) => casas[k] === marca).length;
    const vazia = l.find((k) => !casas[k]);
    if (marcas === 2 && vazia !== undefined) return vazia;
  }
  return -1;
}

// A jogada da Juba muda com o nível: é aqui que a partida fica mais difícil.
function escolherJogadaDaJuba(casas, nivel, sorte) {
  const livres = casas.map((v, k) => (v ? -1 : k)).filter((k) => k >= 0);
  const r = typeof sorte === 'function' ? sorte : Math.random;
  if (nivel >= 3) {
    const ganha = casaQueFecha(casas, 'O');
    if (ganha >= 0) return ganha;
  }
  if (nivel >= 3 || (nivel === 2 && r() < 0.5)) {
    const bloqueia = casaQueFecha(casas, 'X');
    if (bloqueia >= 0) return bloqueia;
  }
  if (nivel >= 3 && !casas[4]) return 4;
  return livres[Math.floor(r() * livres.length)];
}

function jogadaDaJuba() {
  if (velha.fase === 'fim' || !$('screenVelha').classList.contains('active')) return;
  const k = escolherJogadaDaJuba(velha.casas, G.nivel);
  if (k !== undefined) velha.casas[k] = 'O';
  pintarTabuleiro();
  if (fimDaVelha()) return;
  perguntaDaVelha();
}

function fimDaVelha() {
  const v = vencedorDaVelha(velha.casas);
  if (!v) return false;
  velha.fase = 'fim';
  pintarTabuleiro();
  document.querySelectorAll('#velhaOpcoes .ans-btn').forEach((b) => (b.disabled = true));
  const texto = v === 'X' ? 'Você fechou a linha e venceu a Juba!'
    : v === 'O' ? 'A Juba fechou a linha desta vez. Na próxima, de olho nas casas dela!'
    : 'Deu velha: ninguém fechou a linha.';
  $('velhaStatus').textContent = texto;
  $('velhaProg').textContent = v === 'X' ? 'Vitória' : v === 'O' ? 'Juba venceu' : 'Empate';
  showVelhaFeedback(texto);
  saveState();
  setTimeout(() => { if ($('screenVelha').classList.contains('active')) finishRound('velha'); }, 1600);
  return true;
}

function showVelhaFeedback(msg) { $('velhaFeedbackMsg').textContent = msg; $('velhaFeedback').classList.add('show'); }

// ──────────────────────────────────────────────────
// 14. SHOP / WARDROBE
// ──────────────────────────────────────────────────
let shopFilter = 'all';

// As abas vêm do catálogo: trocar uma categoria em guarda-roupa.js
// não exige mexer no HTML.
function montarAbasLoja() {
  const caixa = $('shopTabs');
  if (!caixa || caixa.dataset.montada === '1') return;
  caixa.innerHTML = '';
  GR.abas.forEach((aba, i) => {
    const b = document.createElement('button');
    b.className = 'stab' + (i === 0 ? ' active' : '');
    b.type = 'button';
    b.innerHTML = '<i class="fa-solid ' + aba.icone + '"></i> ' + aba.rotulo;
    b.onclick = () => filterShop(aba.cat, b);
    caixa.appendChild(b);
  });
  caixa.dataset.montada = '1';
}

function openShop() {
  montarAbasLoja();
  $('shopCoins').textContent = numBR(G.stars);
  pecaEmProva = null;
  renderShop('all');
  document.querySelectorAll('#shopTabs .stab').forEach(t => t.classList.remove('active'));
  const primeira = $('shopTabs').querySelector('.stab');
  if (primeira) primeira.classList.add('active');
  updateWardrobePreview();
  openModal('modalShop');
}

function filterShop(cat, btn) {
  shopFilter = cat;
  document.querySelectorAll('#shopTabs .stab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderShop(cat);
}

function renderShop(cat) {
  const grid = $('shopGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const itens = cat === 'mine'
    ? GR.itens.filter((i) => G.owned.indexOf(i.id) >= 0)
    : GR.naAba(cat || 'all');

  if (!itens.length) {
    const vazio = document.createElement('p');
    vazio.className = 'shop-vazio';
    vazio.textContent = 'Sua caixa ainda está vazia. Jogue uma rodada, junte estrelas e volte aqui para escolher a roupa da Juba.';
    grid.appendChild(vazio);
    return;
  }

  itens.forEach(item => {
    const owned    = G.owned.includes(item.id);
    const equipped = G.equip[item.slot] === item.id;
    const canAfford = G.stars >= item.price;
    const completo = item.tipo === 'conjunto';

    const card = document.createElement('div');
    card.className = `shop-item-card${owned?' owned':''}${equipped?' equipped':''}${completo?' completo':''}`;
    card.setAttribute('data-peca', item.id);
    const brinde = (item.brinde || [])
      .map((id) => { const p = GR.porId(id); return p ? p.name : ''; })
      .filter(Boolean);
    card.innerHTML = `
      ${completo ? '<span class="sic-tag">COMPLETO</span>' : ''}
      <div class="sic-peca">${MASCOTE ? MASCOTE.peca(item.slot, item.id) : ''}</div>
      <div class="sic-name">${item.name}</div>
      <div class="sic-desc">${item.desc || ROTULO_CURTO[item.slot] || ''}</div>
      <div class="sic-price">${owned
        ? '<i class="fa-solid fa-circle-check"></i> Possuído'
        : '<i class="fa-solid fa-star"></i> '+numBR(item.price)
      }</div>
      ${owned
        ? `<button class="sic-btn ${equipped?'unequip-btn':'equip-btn'}"
             data-acao="toggleEquip" data-args="${attrJson([item.id, item.slot])}">
             ${equipped
               ? '<i class="fa-solid fa-xmark"></i> Tirar'
               : '<i class="fa-solid fa-wand-magic-sparkles"></i> Vestir'}
           </button>`
        : `<button class="sic-btn ${canAfford?'buy-btn':'locked-btn'}"
             data-acao="buyItem" data-args="${attrJson([item.id])}"
             ${canAfford?'':'disabled'}>
             ${canAfford
               ? (completo ? '<i class="fa-solid fa-gift"></i> Levar conjunto'
                           : '<i class="fa-solid fa-cart-shopping"></i> Comprar')
               : '<i class="fa-solid fa-lock"></i> '+numBR(item.price)}
           </button>`
      }
      ${!owned && brinde.length ? `<div class="sic-brinde">Vem junto: ${brinde.join(', ')}</div>` : ''}
    `;
    grid.appendChild(card);
  });
}

const ROTULO_CURTO = GR.rotuloSlot;

function buyItem(id) {
  const item = GR.porId(id);
  if (!item || G.stars < item.price) { showToast('Estrelas insuficientes!'); return; }
  G.stars -= item.price;
  G.owned.push(id);
  // Conjunto traz as peças combinando de brinde, já possuídas.
  (item.brinde || []).forEach((extra) => {
    if (GR.porId(extra) && G.owned.indexOf(extra) < 0) G.owned.push(extra);
  });
  saveState();
  showToast(item.tipo === 'conjunto'
    ? 'Conjunto completo! As peças de brinde já estão na sua caixa.'
    : 'Comprado: ' + item.name + '!');
  playSound('buy');
  $('shopCoins').textContent = numBR(G.stars);
  renderShop(shopFilter);
  updateWardrobePreview();
  updateHubUI();
}

function toggleEquip(id, slot) {
  const item = GR.porId(id);
  if (!item) return;
  const alvo = slot || item.slot;
  if (G.equip[alvo] === id) {
    G.equip[alvo] = null; showToast('Item tirado!');
  } else {
    // Máscara e óculos disputam o mesmo pedaço do rosto: vestir um tira o
    // outro, e o aviso diz qual saiu. Empilhar os dois escondia os olhos.
    const saida = GR.conflitaCom(alvo)
      .filter((s) => G.equip[s])
      .map((s) => { const p = GR.porId(G.equip[s]); G.equip[s] = null; return p ? p.name : ''; })
      .filter(Boolean);
    G.equip[alvo] = id;
    showToast(saida.length
      ? item.name + ' vestido! ' + saida.join(' e ') + ' saiu para caber.'
      : item.name + ' vestido!');
  }
  pecaEmProva = null;
  saveState();
  renderShop(shopFilter);
  updateWardrobePreview();
  updateHubUI();
}

function limparEquip() {
  const tinha = SLOTS_EQUIP.some((s) => G.equip[s]);
  if (!tinha) { showToast('A Juba já está sem nenhuma peça.'); return; }
  G.equip = GR.equipVazio();
  pecaEmProva = null;
  saveState();
  renderShop(shopFilter);
  updateWardrobePreview();
  updateHubUI();
  showToast('Figurino guardado na caixa. A Juba voltou ao pelo e à bandana.');
}

function updateWardrobePreview() {
  const lista = $('wdSlots');
  if (lista) {
    lista.innerHTML = '';
    const vestidos = SLOTS_EQUIP.filter((s) => G.equip[s]);
    lista.classList.toggle('vazio', vestidos.length === 0);
    SLOTS_EQUIP.forEach((slot) => {
      const item = G.equip[slot] ? GR.porId(G.equip[slot]) : null;
      const li = document.createElement('li');
      li.className = 'wd-slot' + (item ? ' posto' : '');
      li.innerHTML =
        '<span class="ws-rotulo">' + GR.rotuloSlot[slot] + '</span>' +
        '<span class="ws-peca">' + (item ? item.name : 'nada') + '</span>' +
        (item
          ? '<button class="ws-tirar" data-acao="toggleEquip" data-args="' + attrJson([item.id, slot]) +
            '" aria-label="Tirar ' + item.name.replace(/"/g, '&quot;') + '">' +
            '<i class="fa-solid fa-xmark"></i></button>'
          : '');
      lista.appendChild(li);
    });
    const nada = document.createElement('li');
    nada.className = 'wd-slot-vazio';
    nada.textContent = 'Nada vestido ainda. Escolha uma peça abaixo — ela aparece na Juba na hora.';
    lista.appendChild(nada);
  }
  pintarPalco();
}

// ──────────────────────────────────────────────────
// 15. RECORDS
// ──────────────────────────────────────────────────
// Boletim, exclusão e conexão são de quem acompanha. Com conta criada, os três
// passam pela senha; sem conta, não há senha a pedir e nada muda.
const DIALOGOS_DO_ADULTO = ['modalPais', 'modalApagar', 'modalNuvem'];

function openModal(id) {
  if (DIALOGOS_DO_ADULTO.indexOf(id) >= 0 && window.CM_CONTAS && !CM_CONTAS.adultoLiberado()) {
    CM_CONTAS.pedirSenha('Área de quem acompanha', function () { abrirModalDeVerdade(id); });
    return;
  }
  abrirModalDeVerdade(id);
}

function abrirModalDeVerdade(id) {
  if (id === 'modalRecords') {
    $('recStars').textContent   = numBR(G.stars);
    $('recConteudo').textContent = G.aprendidas.length;
    $('recStreak').textContent  = G.bestStreak;
    const seqDias = pintarDias();
    $('recDias').textContent = seqDias.atual;
    $('recDiasRecorde').textContent = seqDias.recorde;
    $('recCorrect').textContent = numBR(G.totalCorrect);
    montarRoteiro();
    const colecao = pintarConquistas();
    if (colecao) $('recMedalhasConta').textContent = colecao.ganhas + ' de ' + colecao.total;
  }
  if (id === 'modalConquistas') pintarConquistas();
  if (id === 'modalAjustes') pintarAjustes();
  if (id === 'modalMapa') montarMapa();
  // O boletim inteiro vive em avaliacao.js: aqui só avisamos que ele abriu,
  // para que os números sejam relidos na hora (e não os da última vez).
  if (id === 'modalPais' && window.CM_AVALIACAO) window.CM_AVALIACAO.boletim();
  // A tela de apagar tem de dizer a verdade sobre a conta naquele momento,
  // senão o botão de cima promete uma exclusão que não tem quem assine.
  if (id === 'modalApagar') pintarApagar();
  // A tela da conexão é desenhada pelo nuvem.js e muda sozinha - login, clique
  // no e-mail, sair da conta. Abrir sem repintar é mostrar o retrato de quando
  // a página carregou: a pessoa entrava, fechava, voltava e continuava
  // "sem conta".
  if (id === 'modalNuvem' && window.CM_NUVEM && CM_NUVEM.repintar) CM_NUVEM.repintar();
  const jaHavia = !!dialogoAberto();
  $(id).style.display = 'block';
  $('modalOverlay').classList.add('open');
  // O cabeçalho do diálogo só tem altura medida depois de o diálogo existir na
  // tela (antes ele está com display:none), então a régua roda aqui.
  soltarBarras($(id));
  // Quem abriu é anotado só no primeiro da pilha: fechar depois devolve a
  // pessoa ao botão que ela apertou, não ao meio da lista.
  if (!jaHavia) focoAntesDoDialogo = document.activeElement;
  else focoQueAbriu[id] = document.activeElement;
  entrarNoDialogo($(id));
}
function closeModal(id) {
  $(id).style.display = 'none';
  if (id === 'modalShop') fimDaProva();
  const anyOpen = document.querySelectorAll('.modal[style*="display: block"], .modal[style*="display:block"]');
  const quemAbriu = focoQueAbriu[id];
  delete focoQueAbriu[id];
  if (!anyOpen.length) {
    $('modalOverlay').classList.remove('open');
    devolverFocoDoDialogo();
    return;
  }
  // Ainda há diálogo aberto: o foco volta ao botão que abriu este, se ele
  // continua na tela; senão, entra no diálogo que ficou por cima.
  if (quemAbriu && quemAbriu.isConnected && quemAbriu.getClientRects().length) quemAbriu.focus({ preventScroll: true });
  else if (dialogoAberto()) entrarNoDialogo(dialogoAberto());
}
function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
  Object.keys(focoQueAbriu).forEach((k) => { delete focoQueAbriu[k]; });
  fimDaProva();
  $('modalOverlay').classList.remove('open');
  devolverFocoDoDialogo();
}

// Sugestão de caminho a partir do histórico por conteúdo. Só aparecem os
// conteúdos com três ou mais tentativas, para não tirar conclusão de um erro.
function montarRoteiro() {
  const caixa = $('recRoteiro');
  const lista = $('recLista');
  if (!caixa || !lista) return;
  lista.innerHTML = '';

  const entradas = Object.keys(G.hist)
    .map((nome) => ({ nome: nome, feitas: G.hist[nome].feitas, certas: G.hist[nome].certas }))
    .filter((h) => h.feitas >= 3);
  const taxa = (h) => h.certas / h.feitas;
  const dominadas = entradas.filter((h) => taxa(h) >= 0.8).sort((x, y) => taxa(y) - taxa(x)).slice(0, 3);
  const revisar = entradas.filter((h) => taxa(h) < 0.6).sort((x, y) => taxa(x) - taxa(y)).slice(0, 3);

  const linha = (grupo, cor, itens) => {
    itens.forEach((h) => {
      const li = document.createElement('li');
      li.className = 'rec-item ' + cor;
      const alvo = document.createElement('span');
      alvo.className = 'rec-item-situacao';
      alvo.textContent = grupo;
      const texto = document.createElement('span');
      texto.textContent = h.nome + ' — ' + h.certas + ' de ' + h.feitas + ' acertos';
      li.appendChild(alvo);
      li.appendChild(texto);
      lista.appendChild(li);
    });
  };
  linha('Vale revisar', 'ri-revisar', revisar);
  linha('Você já domina', 'ri-domina', dominadas);

  caixa.hidden = !revisar.length && !dominadas.length;
}

// ──────────────────────────────────────────────────
// 15b. APOIO AO BOLETIM DOS RESPONSÁVEIS
//      O documento em si está em avaliacao.js. Este arquivo empresta duas
//      tabelas de leitura: o que cada conteúdo é (unidade, código BNCC) e o
//      que ainda não apareceu para o ano e nível escolhidos.
// ──────────────────────────────────────────────────
// O histórico guarda o nome do conteúdo. Para saber a unidade e o código da
// habilidade de cada um, montamos uma tabela a partir do banco e dos
// geradores. Ela é construída uma vez, na primeira abertura do painel.
let _metaConteudo = null;
function metaConteudo() {
  if (_metaConteudo) return _metaConteudo;
  const mapa = {};
  const anotar = (o, u, bncc) => {
    if (o && !mapa[o]) mapa[o] = { u: u, cod: (bncc || [])[0] || '' };
  };
  (window.BANCO_ITENS || []).forEach((i) => anotar(i.o, i.u, i.bncc));
  (window.BANCO_AFIRMACOES || []).forEach((a) => anotar(a.o, a.u, a.bncc));
  Object.keys(C.GER).forEach((chave) => {
    if (!C.GER[chave]) return;
    for (let ano = 1; ano <= 9; ano++) {
      for (let nv = 1; nv <= 4; nv++) {
        const it = C.gerarChave(chave, ano, nv);
        if (it) anotar(it.o, it.u, it.bncc);
      }
    }
  });
  _metaConteudo = mapa;
  return mapa;
}

// Conteúdos que o ano + nível escolhido têm e que ainda não apareceram.
function conteudosPendentes() {
  const nomes = {};
  const somar = (it) => { if (it && it.o && !G.hist[it.o]) nomes[it.o] = 1; };
  (window.BANCO_ITENS || []).forEach((i) => { if (i.ano === G.ano && i.nv === G.nivel) somar(i); });
  (window.BANCO_AFIRMACOES || []).forEach((a) => { if (a.ano === G.ano && a.nv === G.nivel) somar(a); });
  C.chavesDo(G.ano, G.nivel).forEach((k) => somar(C.gerarChave(k, G.ano, G.nivel)));
  return Object.keys(nomes);
}

/* O painel dos responsáveis era montado aqui, com meia dúzia de números soltos.
   Ele foi embora: a leitura agora é documento, não placar, e por isso mora em
   avaliacao.js (CM_AVALIACAO.boletim), que fala de período, amostra, unidade
   temática, prova e limite de interpretação. Este arquivo só chama. */

/* As duas teclas de apagar moram no boletim dos responsáveis, não na tela da
   criança: nada aqui é um toque de distância de destruir o histórico. Cada uma
   precisa de dois cliques seguidos no mesmo botão, e o segundo expira em doze
   segundos — clicar uma vez e sair não apaga nada. */
let armaQual = null;
let armaAte = 0;

function armarDestruicao(botao) {
  const agora = Date.now();
  if (armaQual === botao && agora < armaAte) {
    armaQual = null;
    botao.classList.remove('armada');
    return true;
  }
  armaQual = botao;
  armaAte = agora + 12000;
  botao.dataset.rotuloAntes = botao.textContent;
  botao.textContent = 'Clique de novo para apagar';
  botao.classList.add('armada');
  setTimeout(() => {
    if (armaQual !== botao) return;
    botao.textContent = botao.dataset.rotuloAntes || 'Apagar';
    botao.classList.remove('armada');
    armaQual = null;
  }, 12000);
  return false;
}

// Só o armazenamento local. O saveState() normal não serve aqui: ele avisa a
// nuvem, e "apagar deste aparelho" não pode reescrever o vazio por cima da
// cópia que está na conta.
function apagarLocal(semAviso) {
  G.stars = 0; G.ano = 5; G.nivel = 1;
  G.totalCorrect = 0; G.streak = 0; G.bestStreak = 0;
  G.trabalhados = []; G.aprendidas = []; G.hist = {};
  recentes = [];
  G.equip = GR.equipVazio();
  G.owned = [];
  G.duelos = { jogados: 0, ganhos: 0, achados: 0, melhorTempo: 0, recorde: [] };
  G.provas = [];
  G.comoJogarVisto = {};
  G.desde = Date.now();
  G.codigoVinculo = '';
  G.apelidoCrianca = '';
  G.metas = CM_METAS.vazio();
  G.prefs = prefsVazias();
  aplicarPreferencias();
  resetarMonte();
  const guardado = gravarLocal();
  closeAllModals();
  updateHubUI();
  goHub();
  // A tecla da conta apaga primeiro o banco e depois limpa aqui: nessa ordem o
  // recado é um só, e ele diz a verdade inteira.
  if (!semAviso) {
    showToast(guardado ? 'Apagado deste aparelho.'
      : 'Apaguei aqui, mas este navegador não deixa guardar nada.');
  }
  return guardado;
}

function desarmar(botao, rotulo) {
  armaQual = null;
  botao.classList.remove('armada');
  botao.textContent = botao.dataset.rotuloAntes || rotulo;
}

function apagarDoAparelho() {
  const botao = $('btnApagarLocal');
  if (!botao || !armarDestruicao(botao)) return;
  desarmar(botao, 'Apagar deste aparelho');
  apagarLocal();
}

async function apagarNaConta() {
  const botao = $('btnApagarConta');
  const linha = $('apagarContaEstado');
  if (!botao) return;
  const nuvem = window.CM_NUVEM;
  if (!nuvem || !nuvem.apagarRegistros) {
    if (linha) linha.textContent = 'A conexão não carregou neste aparelho: não há o que apagar na conta.';
    return;
  }
  if (!armarDestruicao(botao)) return;
  botao.disabled = true;
  if (linha) linha.textContent = 'Apagando na conta…';
  const resposta = await nuvem.apagarRegistros();
  if (!resposta || !resposta.ok) {
    // Falha nunca vira sucesso de tela: o que aconteceu fica escrito aqui.
    botao.disabled = false;
    botao.textContent = 'Tentar de novo';
    if (linha) linha.textContent = 'A conta não apagou: ' + ((resposta && resposta.erro) || 'sem resposta do banco');
    return;
  }
  apagarLocal(true);
  desarmar(botao, 'Apagar da conta');
  botao.disabled = true;
  showToast('Registros da conta apagados e este aparelho limpo.');
}

// A tecla da conta só existe com conta de verdade; enquanto não há, a linha diz
// o que falta em vez de um botão morto.
function pintarApagar() {
  const botao = $('btnApagarConta');
  const linha = $('apagarContaEstado');
  if (!botao || !linha) return;
  const nuvem = window.CM_NUVEM;
  const logado = !!(nuvem && nuvem.logado && nuvem.logado());
  botao.disabled = !logado;
  if (logado) {
    linha.textContent = 'A conta deste aparelho está ativa. O pedido de exclusão vai para o banco do projeto ' +
      'publicado e remove o que é seu — nada de outra conta.';
    return;
  }
  if (nuvem && nuvem.ativa && nuvem.ativa()) {
    linha.textContent = 'Sem conta ativa neste aparelho. Entre em "Conta e conexão" para apagar pela conta.';
  } else {
    linha.textContent = 'Este jogo está no modo aparelho fechado: não há conta nem registros em banco nenhum, ' +
      'então só a tecla de cima tem efeito.';
  }
}

// ──────────────────────────────────────────────────
// 16. SOUND EFFECTS (Web Audio API)
// ──────────────────────────────────────────────────
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playSound(type) {
  if (!G.soundOn) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;

    if (type === 'correct') {
      osc.frequency.setValueAtTime(659, t);
      osc.frequency.setValueAtTime(784, t+0.1);
      osc.frequency.setValueAtTime(1046,t+0.2);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t+0.4);
      osc.start(t); osc.stop(t+0.4);
    } else if (type === 'wrong') {
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.setValueAtTime(150, t+0.2);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t+0.4);
      osc.start(t); osc.stop(t+0.4);
    } else if (type === 'levelup') {
      const freqs=[523,659,784,1046];
      freqs.forEach((f,i) => {
        const o2=ctx.createOscillator(), g2=ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.frequency.setValueAtTime(f,t+i*0.12);
        g2.gain.setValueAtTime(0.2,t+i*0.12);
        g2.gain.exponentialRampToValueAtTime(0.001,t+i*0.12+0.2);
        o2.start(t+i*0.12); o2.stop(t+i*0.12+0.25);
      });
      osc.stop(t);
    } else if (type === 'buy') {
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1100,t+0.1);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t+0.25);
      osc.start(t); osc.stop(t+0.25);
    }
  } catch(e) {}
}

// O botão "Ouvir" pede a frase atual ao módulo de voz. Toda a política (IA,
// voz do aparelho, silêncio, parar a fala anterior) está em narracao.js — aqui
// só entrega o texto da pergunta e nada mais.
function speakText() {
  if (!G.currentQ) return;
  const voz = window.CM_NARRACAO;
  if (voz && voz.podeFalar()) { voz.falar(G.currentQ.txt); return; }
  if (typeof showToast === 'function') showToast('A narração está desligada. Acenda em Voz.');
}

function pararFala() {
  const voz = window.CM_NARRACAO;
  if (voz) voz.parar();
}

function toggleSound() {
  G.soundOn = !G.soundOn;
  const el = $('soundIcon');
  el.className = G.soundOn ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
  saveState();
  showToast(G.soundOn ? 'Som ativado!' : 'Som desativado');
}

// ──────────────────────────────────────────────────
// 17. VISUAL EFFECTS (confetti / particles)
// ──────────────────────────────────────────────────
let canvas, ctx2d;
function setupParticleCanvas() {
  canvas = $('particleCanvas');
  ctx2d  = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

const CONFETTI_COLORS = ['#FF6B9D','#FFD93D','#4ECDC4','#9B5DE5','#FF9A3C','#6BCB77','#3DBBFF'];

function showConfetti() {
  if (MOVIMENTO_REDUTO || calmo()) return;
  for (let i = 0; i < 50; i++) {
    setTimeout(() => spawnParticle(), i * 20);
  }
}
function spawnLevelUpConfetti() {
  if (MOVIMENTO_REDUTO || calmo()) return;
  for (let i = 0; i < 120; i++) {
    setTimeout(() => spawnParticle(true), i * 15);
  }
}

const particles = [];
function spawnParticle(big = false) {
  particles.push({
    x: Math.random() * canvas.width,
    y: -10,
    vx: (Math.random()-0.5) * (big?6:4),
    vy: Math.random() * (big?5:3) + 2,
    size: Math.random()*(big?14:10)+4,
    color: pick(CONFETTI_COLORS),
    rot: Math.random()*360,
    rotV: (Math.random()-0.5)*10,
    life: 1,
    decay: Math.random()*0.01+0.008,
  });
  if (!animating) animateParticles();
}
let animating = false;
function animateParticles() {
  if (!particles.length) { animating=false; return; }
  animating = true;
  ctx2d.clearRect(0,0,canvas.width,canvas.height);
  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.rot += p.rotV; p.life -= p.decay;
    if (p.life <= 0 || p.y > canvas.height) { particles.splice(i,1); continue; }
    ctx2d.save();
    ctx2d.globalAlpha = p.life;
    ctx2d.fillStyle = p.color;
    ctx2d.translate(p.x, p.y);
    ctx2d.rotate(p.rot * Math.PI/180);
    ctx2d.fillRect(-p.size/2, -p.size/2, p.size, p.size * 0.5);
    ctx2d.restore();
  }
  requestAnimationFrame(animateParticles);
}

// ──────────────────────────────────────────────────
// 18. TOAST NOTIFICATION
// ──────────────────────────────────────────────────
// O balão nasce pronto, com o texto dentro: criado junto, nenhum leitor de
// tela anuncia — anúncio exige uma região que já existia e mudou. Por isso o
// balão é só desenho e a fala vai por uma região fixa, sempre vazada antes de
// receber o texto novo (senão a segunda mensagem igual à primeira é ignorada).
let regiaoDeAvisos = null;
function falarAviso(texto) {
  if (!regiaoDeAvisos || !document.body.contains(regiaoDeAvisos)) {
    regiaoDeAvisos = document.createElement('div');
    regiaoDeAvisos.className = 'sr-only';
    regiaoDeAvisos.setAttribute('role', 'status');
    regiaoDeAvisos.setAttribute('aria-live', 'polite');
    document.body.appendChild(regiaoDeAvisos);
  }
  regiaoDeAvisos.textContent = '';
  setTimeout(() => { regiaoDeAvisos.textContent = texto; }, 40);
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('aria-hidden', 'true');
  t.textContent = msg;
  document.body.appendChild(t);
  falarAviso(msg);
  setTimeout(() => {
    t.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => t.remove(), 300);
  }, 2200);
}

// ──────────────────────────────────────────────────
// 19. SAVE / LOAD (localStorage)
//     v3 guarda ano + nível. Quem tinha o v2 (com "fase") não perde
//     as estrelas nem os itens: migramos na primeira leitura.
// ──────────────────────────────────────────────────
const CHAVE = 'candymath_v3';
const CHAVE_ANTIGA = 'candymath_v2';
// Cópia do que veio danificado: progresso nunca é descartado em silêncio.
const CHAVE_QUEBRADA = 'candymath_v3_danificado';
let avisoStorageDado = false;

// Com perfil ativo, cada estudante tem a própria chave. É isto que separa os
// dados de dois irmãos no mesmo navegador — não uma promessa na tela.
function chaveAtual() {
  return window.CM_CONTAS ? CM_CONTAS.chaveDoSave() : CHAVE;
}

function avisoDeStorage(texto) {
  if (avisoStorageDado) return;
  avisoStorageDado = true;
  showToast(texto);
}

function gravarLocal() {
  try {
    localStorage.setItem(chaveAtual(), JSON.stringify({
      stars:        G.stars,
      // Gravar no meio de uma rodada de nível fixo guarda o nível de verdade.
      nivel:        nivelGlobal !== null ? nivelGlobal : G.nivel,
      ano:          anoGlobal !== null ? anoGlobal : G.ano,
      totalCorrect: G.totalCorrect,
      streak:       G.streak,
      bestStreak:   G.bestStreak,
      soundOn:      G.soundOn,
      aprendidas:   G.aprendidas,
      hist:         G.hist,
      equip:        G.equip,
      owned:        G.owned,
      duelos:       G.duelos,
      provas:       G.provas,
      comoJogarVisto: G.comoJogarVisto,
      desde:        G.desde,
      codigoVinculo: G.codigoVinculo,
      apelidoCrianca: G.apelidoCrianca,
      metas:        G.metas,
      prefs:        G.prefs,
    }));
    return true;
  } catch (e) {
    // Sem espaço (ou navegador em modo privado) o jogo continua jogável, mas
    // dizer "salvo" seria mentira: um aviso por visita e nada de repetir.
    avisoDeStorage('Não deu para guardar o progresso neste aparelho. O jogo continua, mas feche a aba sabendo que ele pode não estar aqui amanhã.');
    return false;
  }
}

function saveState() {
  gravarLocal();
  // Com conta ativa, o progresso também sobe para o banco. Sem conta, nada
  // acontece e o jogo segue somente no aparelho.
  if (window.CM_NUVEM && window.CM_NUVEM.aoSalvar) window.CM_NUVEM.aoSalvar();
}
// Um histórico só é aceito se trouxer números inteiros positivos por conteúdo.
function historyValido(hist) {
  if (!hist || typeof hist !== 'object' || Array.isArray(hist)) return false;
  return Object.keys(hist).every((nome) => {
    const h = hist[nome];
    return h && typeof h === 'object' &&
      Number.isInteger(h.feitas) && Number.isInteger(h.certas) &&
      h.feitas >= 0 && h.certas >= 0 && h.certas <= h.feitas;
  });
}
// O storage é entrada não confiável: texto no lugar de número não pode
// entrar no estado, senão a interface começa a somar string.
function contadorValido(n) {
  return Number.isInteger(n) && n >= 0 && n <= 999999 ? n : 0;
}

// Registro do duelo: só números inteiros e uma lista curta de recordes.
// Cada recorde volta pelo molde — o storage é entrada não confiável, e uma
// linha torta aqui viraria "Seu melhor relógio: NaN" na tela de montagem.
function recordeSanit(e) {
  if (!e || typeof e !== 'object') return null;
  return {
    quando:    Number.isFinite(e.quando) && e.quando > 0 ? Math.round(e.quando) : Date.now(),
    densidade: [20, 40, 60, 80].indexOf(e.densidade) >= 0 ? e.densidade : 40,
    modo:      e.modo === 'rede' || e.modo === 'coop' ? e.modo : 'local',
    placar:    Array.isArray(e.placar) ? [contadorValido(e.placar[0]), contadorValido(e.placar[1])] : [0, 0],
    tempo:     contadorValido(e.tempo),
    tempoMeu:  contadorValido(e.tempoMeu),
    vencedor:  e.vencedor === 0 || e.vencedor === 1 ? e.vencedor : -1,
  };
}
function duelosSanit(d) {
  const vazio = { jogados: 0, ganhos: 0, achados: 0, melhorTempo: 0, recorde: [] };
  if (!d || typeof d !== 'object') return vazio;
  return {
    jogados:     contadorValido(d.jogados),
    ganhos:      contadorValido(d.ganhos),
    achados:     contadorValido(d.achados),
    melhorTempo: contadorValido(d.melhorTempo),
    recorde:     Array.isArray(d.recorde)
      ? d.recorde.map(recordeSanit).filter(Boolean).slice(-20) : [],
  };
}

// Uma prova só volta para o estado se trouxer o mínimo honesto para leitura:
// contagem coerente e itens com nome de conteúdo e sim/não.
function provasSanit(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.filter((p) => p && typeof p === 'object' &&
      Number.isInteger(p.acertos) && Number.isInteger(p.total) &&
      p.acertos >= 0 && p.total > 0 && p.acertos <= p.total)
    .slice(-10)
    .map((p) => ({
      quando: Number.isFinite(p.quando) ? p.quando : Date.now(),
      duracao: contadorValido(p.duracao),
      ano: C.clampAno(p.ano),
      nv: C.clampNv(p.nv),
      total: p.total,
      respondidas: Number.isInteger(p.respondidas) ? Math.min(p.respondidas, p.total) : p.total,
      acertos: p.acertos,
      itens: Array.isArray(p.itens) ? p.itens.filter((i) => i && i.o && typeof i.acerto === 'boolean')
        .map((i) => ({ o: i.o, u: i.u || '', bncc: i.bncc || '', acerto: i.acerto })) : [],
    }));
}

// Os tutoriais já vistos: um liga/desliga por modo, nada mais que isso.
function vistosSanit(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return {};
  const out = {};
  Object.keys(d).forEach((k) => { if (d[k]) out[k] = true; });
  return out;
}

function loadState() {
  let d = null;
  const chave = chaveAtual();
  try {
    const guardado = localStorage.getItem(chave);
    d = JSON.parse(guardado);
    if (!d && chave === CHAVE) {
      const antigo = JSON.parse(localStorage.getItem(CHAVE_ANTIGA) || 'null');
      if (antigo) d = { stars: antigo.stars, equip: antigo.equip, owned: antigo.owned,
                        totalCorrect: antigo.totalCorrect, bestStreak: antigo.bestStreak,
                        soundOn: antigo.soundOn };
    }
  } catch (e) {
    d = null;
    // Arquivo danificado não vira "começar do zero" em silêncio: a peça
    // quebrada é posta de lado e a pessoa fica sabendo.
    try {
      const resto = localStorage.getItem(chave);
      if (resto && !localStorage.getItem(CHAVE_QUEBRADA)) {
        localStorage.setItem(CHAVE_QUEBRADA, resto.slice(0, 200000));
      }
      avisoDeStorage('O progresso guardado neste aparelho estava danificado e não pôde ser lido. ' +
        'Guardei uma cópia do que veio e o jogo abriu do zero.');
    } catch (e2) {
      avisoDeStorage('O progresso guardado neste aparelho estava danificado e não havia como guardar a cópia.');
    }
  }
  if (!d) return;
  G.ano          = C.clampAno(d.ano);
  G.nivel        = C.clampNv(d.nivel);
  G.stars        = contadorValido(d.stars);
  G.totalCorrect = contadorValido(d.totalCorrect);
  G.streak       = contadorValido(d.streak);
  G.bestStreak   = contadorValido(d.bestStreak);
  G.soundOn      = d.soundOn !== undefined ? d.soundOn : true;
  G.equip        = equipSanit(d.equip);
  G.owned        = ownedSanit(d.owned);
  G.aprendidas   = Array.isArray(d.aprendidas) ? d.aprendidas : [];
  G.hist         = historyValido(d.hist) ? d.hist : {};
  G.duelos       = duelosSanit(d.duelos);
  G.provas       = provasSanit(d.provas);
  G.comoJogarVisto = vistosSanit(d.comoJogarVisto);
  // Quem jogava antes de existir período observado ganha hoje como começo:
  // melhor começar a contar agora do que fingir um passado que não temos.
  G.desde        = Number.isFinite(d.desde) && d.desde > 0 ? d.desde : Date.now();
  // O vínculo com a conta é texto livre vindo do storage: limitado, sem
  // espaços e sem quebra — é um código de 6 letras ou um apelido, não HTML.
  G.codigoVinculo   = typeof d.codigoVinculo === 'string' ? d.codigoVinculo.replace(/[^\w-]/g, '').slice(0, 12) : '';
  G.apelidoCrianca  = typeof d.apelidoCrianca === 'string' ? d.apelidoCrianca.replace(/[<>]/g, '').slice(0, 30) : '';
  // Save de antes das metas não tem o campo: começa vazio, sem tocar no resto.
  G.metas           = CM_METAS.sanitizar(d.metas, Date.now());
  G.prefs           = prefsSanit(d.prefs);
  const sIcon = $('soundIcon');
  if (sIcon) sIcon.className = G.soundOn ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
}
// Auto-save every 15s
setInterval(saveState, 15000);

// ──────────────────────────────────────────────────
// 20. UTILITIES
// ──────────────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

// ──────────────────────────────────────────────────
// 21. AÇÕES DOS BOTÕES (sem script inline)
// ──────────────────────────────────────────────────
// O CSP deste projeto não admite `onclick=` na página nem script embutido: um
// texto de questão que vazasse para dentro de um atributo viraria código
// executado. O botão declara o que fazer (data-acao) e um único ouvinte chama
// a função — e só as funções desta lista. Nome fora da lista não faz nada,
// então um atributo inventado na página não alcança qualquer global.
const ACOES_DOS_BOTOES = {
  buyItem:       function (id)        { buyItem(id); },
  checkOp:       function (op)        { checkOp(op); },
  checkPuzzle:   function ()          { checkPuzzle(); },
  checkSort:     function ()          { checkSort(); },
  checkTF:       function (valor)     { checkTF(valor); },
  closeAllModals:function ()          { closeAllModals(); },
  closeModal:    function (id)        { closeModal(id); },
  dropHook:      function ()          { dropHook(); },
  giveHint:      function ()          { giveHint(); },
  goHub:         function ()          { goHub(); },
  imprimir:      function ()          { window.print(); },
  limparEquip:   function ()          { limparEquip(); },
  nextPuzzle:    function ()          { nextPuzzle(); },
  openModal:     function (id)        { openModal(id); },
  openShop:      function ()          { openShop(); },
  apagarDoAparelho: function ()       { apagarDoAparelho(); },
  apagarNaConta:    function ()       { apagarNaConta(); },
  trocarEstudante:  function ()       { if (window.CM_CONTAS) CM_CONTAS.sair(); irParaEntrada(); },
  jogarSemConta:    function ()       { if (window.CM_CONTAS) CM_CONTAS.jogarSemConta(); trocarEstudante(null); },
  abrirPerfis:      function ()       {
    if (!window.CM_CONTAS) return;
    CM_CONTAS.pedirSenha('Perfis e conta', function () {
      closeAllModals();
      CM_CONTAS.mostrar(CM_CONTAS.temConta() ? 'gerenciar' : 'semConta');
      showScreen('screenEntrada');
    });
  },
  speakText:     function ()          { speakText(); },
  ouvirExplicacao: function ()        { ouvirExplicacao(); },
  criarDesafio:  function ()          { criarDesafio(); },
  jogarDesafio:  function ()          { jogarDesafio(); },
  spinRoulette:  function ()          { spinRoulette(); },
  startMode:     function (modo)      { startMode(modo); },
  toggleSound:   function ()          { toggleSound(); },
  toggleEquip:   function (id, slot)  { toggleEquip(id, slot); },
  whackMole:     function (idx)       { whackMole(idx); },
};

// O valor do data-args é JSON dentro de um atributo HTML: as aspas precisam
// virar entidade, senão o atributo se quebra no meio.
function attrJson(valor) {
  return JSON.stringify(valor)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function argumentosDe(el) {
  const bruto = el.getAttribute('data-args');
  if (!bruto) return [];
  let lido;
  try { lido = JSON.parse(bruto); } catch (e) { return []; }
  if (!Array.isArray(lido) || lido.length > 3) return [];
  // Só o que um botão precisa saber dizer: texto, número ou sim/não.
  return lido.filter((v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean');
}

function dispararAcao(el) {
  const nome = el.getAttribute('data-acao');
  const acao = Object.prototype.hasOwnProperty.call(ACOES_DOS_BOTOES, nome)
    ? ACOES_DOS_BOTOES[nome] : null;
  if (!acao) return false;
  acao.apply(null, argumentosDe(el));
  return true;
}

document.addEventListener('click', function (ev) {
  const alvo = ev.target && ev.target.closest ? ev.target.closest('[data-acao]') : null;
  if (alvo) dispararAcao(alvo);
});

// Pelo teclado é o ouvinte da seção 6 que faz o trabalho: ele transforma
// Enter/espaço em um click no elemento em foco, e este mesmo ouvinte atende.
