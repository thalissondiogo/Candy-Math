/* ===================================================
   CANDY MATH — pedagogia.js
   Modelo de habilidades e evidências (Fase 6.1).

   O QUE ESTE MÓDULO FAZ
   - Separa três coisas que o jogo não pode confundir:
       · HABILIDADE  = código da BNCC (ex.: EF03MA05). Vem de item.bncc, que o
                       conteudo.js e o banco já declaram. Nada é inventado aqui.
       · CONTEÚDO    = o objeto de conhecimento mostrado à criança (item.o).
       · EXERCÍCIO   = o tipo de questão que gerou a resposta: um gerador
                       ('ger:<chave>'), um item do banco ('banco'), uma
                       afirmação ('afirmacao') ou um jogo próprio ('memoria',
                       'cruz', 'sequencia'...).
     A relação habilidade↔conteúdo é muitos-para-muitos: um conteúdo aparece
     com códigos diferentes conforme o ano, e um código cobre vários conteúdos.
   - Guarda EVIDÊNCIAS: cada resposta vira um registro curto com habilidade,
     conteúdo, dia, resultado, uso de ajuda, tipo de exercício e jogo.
     Fica no save do perfil (G.evidencias), só no aparelho, separado de G.hist,
     que continua exatamente como era.
   - Mantém um GRAFO DE PRÉ-REQUISITOS entre temas (as chaves de CM.COD).

   O QUE ESTE MÓDULO NÃO FAZ (de propósito, nesta fase)
   - Não decide domínio, não diagnostica, não recomenda nada. Os estados de
     domínio são da Fase 6.2 e precisam de aprovação.
   - Não transforma um erro em incapacidade: um registro é um registro.
   - Não trata o histórico antigo (G.hist) como evidência: ele não tem data,
     ajuda nem tipo. resumoLegado() o mostra à parte, marcado como
     insuficiente para afirmar domínio.

   AJUDA: conta como ajuda só o que o JOGO ofereceu para resolver a questão
   (a pista depois do primeiro erro, o desenho depois do segundo). Recursos de
   acessibilidade — narração, modo calmo, contraste, fonte para dislexia,
   velocidade da voz — NUNCA marcam ajuda: não são atalho para a resposta.

   PRIVACIDADE: nenhum nome, apelido, texto de enunciado ou horário exato.
   O dia basta. Nada daqui sobe para a nuvem (nuvem.js envia campos listados
   um a um e este não está entre eles).

   O storage é entrada não confiável: sanitizar() refaz tudo e descarta o
   que não confere (datas impossíveis, números repetidos, códigos fora do
   formato, tabelas adulteradas).
   =================================================== */
(function (root) {
  'use strict';

  const VERSAO = 1;

  // Teto rígido por perfil. Com os limites abaixo o pior caso medido fica
  // abaixo de BYTES; o corte por BYTES é a última barreira.
  const LIMITES = Object.freeze({
    porHabilidade: 12,     // registros mais recentes guardados por habilidade
    habilidades: 120,      // habilidades com registro (a BNCC usada tem 194)
    tabela: 400,           // nomes distintos de conteúdo, tipo ou jogo
    texto: 120,            // tamanho máximo de um nome de conteúdo
    bytes: 48 * 1024,      // tamanho máximo do campo serializado
  });

  const RE_HABILIDADE = /^EF0[1-9]MA\d{2}$/;
  const RE_TIPO = /^[a-z][\w:.-]{0,39}$/;
  const RE_JOGO = /^[a-z][a-zA-Z]{0,19}$/;
  const DIA_MINIMO = 18628;           // 2021-01-01: antes disso o jogo não existia
  const MS_DIA = 86400000;

  // ── GRAFO DE PRÉ-REQUISITOS ───────────────────────────────
  // STATUS: PROPOSTA NÃO VALIDADA POR EDUCADOR.
  // Cada tema lista os temas que costumam vir antes dele. Foi montado a
  // partir da progressão dos próprios códigos BNCC em CM.COD (ano em que cada
  // tema aparece) e de dependências aritméticas evidentes (dividir pede
  // multiplicar). Serve para organizar, não para bloquear: nenhuma parte do
  // jogo usa o grafo para esconder conteúdo. Antes de qualquer uso adaptativo
  // (Fase 6.3+), precisa da revisão de um educador — ver PENDENCIAS.
  // Regra conferida em teste: nenhum pré-requisito aparece pela primeira vez
  // num ano posterior ao do tema que depende dele (pelos anos de CM.COD). Por
  // isso triângulos (3º ano) não dependem de ângulos (4º), temperatura (4º)
  // não depende de negativos (7º) e equação (7º) depende de expressão, não de
  // expressão algébrica (8º).
  const PREREQUISITOS = Object.freeze({
    adi: [], posic: [], angul: [], triang: [],
    sub: ['adi'],
    mist: ['adi', 'sub'],
    inverso: ['adi', 'sub'],
    mult: ['adi'],
    div: ['mult', 'sub'],
    dobro: ['adi'],
    comparar: ['posic'],
    estim: ['posic', 'adi'],
    dec: ['posic', 'frac'],
    frac: ['div'],
    dinheiro: ['adi', 'sub', 'dec'],
    porct: ['frac', 'dec', 'mult'],
    neg: ['sub', 'comparar'],
    expr: ['adi', 'sub', 'mult', 'div'],
    exprAlg: ['expr'],
    iguald: ['adi', 'sub'],
    eq: ['iguald', 'expr'],
    sistema: ['eq'],
    razao: ['frac', 'div'],
    pot: ['mult'],
    rad: ['pot'],
    cient: ['pot', 'dec'],
    primos: ['mult', 'div'],
    mdcmmc: ['primos'],
    unid: ['mult', 'div', 'dec'],
    perim: ['adi', 'unid'],
    area: ['mult', 'perim'],
    vol: ['area'],
    tempo: ['adi', 'sub'],
    temp: ['sub', 'comparar'],
    polig: ['angul'],
    plano: ['posic'],
    media: ['adi', 'div'],
    moda: ['comparar'],
    prob: ['frac'],
    pitag: ['pot', 'rad', 'triang'],
    trig: ['pitag', 'razao'],
    func: ['eq', 'plano'],
    seq: ['adi', 'mult'],
    ordem: ['comparar'],
    memoria: ['adi', 'sub', 'mult'],
    cruz: ['adi'],
  });
  const STATUS_GRAFO = 'proposta-nao-validada';

  // Decisões que dependem de educador e não foram tomadas aqui.
  const PENDENCIAS = Object.freeze([
    'Validar cada aresta do grafo de pré-requisitos (ex.: frac ← div; nos anos iniciais "metade" vem antes da divisão formal).',
    'Confirmar os códigos de CM.COD contra o documento oficial da BNCC (o índice de testes não registra a fonte).',
    'Decidir se a pista depois do primeiro erro deve pesar diferente do desenho depois do segundo.',
    'Decidir se o acerto no jogo de tempo (chuva, balões) vale tanto quanto o acerto no quiz.',
    'Decidir quantos registros por habilidade bastam para os estados de domínio (Fase 6.2).',
  ]);

  // ── utilidades ────────────────────────────────────────────
  function diaNumero(agora) {
    const d = new Date(Number.isFinite(agora) ? agora : Date.now());
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_DIA);
  }
  function diaTexto(n) {
    return new Date(n * MS_DIA).toISOString().slice(0, 10);
  }
  function inteiro(x, min, max) {
    return Number.isInteger(x) && x >= min && x <= max;
  }
  function textoLimpo(s, max) {
    if (typeof s !== 'string') return '';
    const t = s.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim();
    return t.length <= max ? t : '';
  }

  // ── grafo ─────────────────────────────────────────────────
  // Confere o grafo: todo tema conhecido tem entrada, todo pré-requisito é um
  // tema que existe, ninguém depende de si mesmo e não há ciclo (Kahn).
  function verificarGrafo(grafo, temasConhecidos) {
    const g = grafo || PREREQUISITOS;
    const nomes = Object.keys(g);
    const problemas = [];
    (temasConhecidos || []).forEach((t) => { if (!g[t]) problemas.push('tema sem entrada no grafo: ' + t); });
    nomes.forEach((t) => {
      if (!Array.isArray(g[t])) { problemas.push('entrada inválida: ' + t); return; }
      g[t].forEach((p) => {
        if (p === t) problemas.push('tema depende de si mesmo: ' + t);
        else if (!g[p]) problemas.push('pré-requisito desconhecido: ' + t + ' ← ' + p);
      });
      if (new Set(g[t]).size !== g[t].length) problemas.push('pré-requisito repetido em ' + t);
    });
    if (temasConhecidos) nomes.forEach((t) => { if (temasConhecidos.indexOf(t) < 0) problemas.push('tema do grafo fora do conteúdo: ' + t); });
    const ordem = ordemTopologica(g);
    if (!ordem) problemas.push('o grafo tem ciclo');
    return { ok: problemas.length === 0, problemas: problemas, ordem: ordem || [] };
  }
  // Ordem em que cada tema vem depois de todos os seus pré-requisitos, ou
  // null se houver ciclo. Desempate alfabético: a mesma entrada dá a mesma saída.
  function ordemTopologica(grafo) {
    const g = grafo || PREREQUISITOS;
    const falta = {};
    const depois = {};
    Object.keys(g).forEach((t) => { falta[t] = 0; depois[t] = []; });
    Object.keys(g).forEach((t) => (g[t] || []).forEach((p) => {
      if (!(p in falta)) return;
      falta[t]++; depois[p].push(t);
    }));
    const prontos = Object.keys(falta).filter((t) => falta[t] === 0).sort();
    const ordem = [];
    while (prontos.length) {
      const t = prontos.shift();
      ordem.push(t);
      depois[t].forEach((u) => { if (--falta[u] === 0) { prontos.push(u); prontos.sort(); } });
    }
    return ordem.length === Object.keys(g).length ? ordem : null;
  }
  // Todos os temas que vêm antes de um tema (fecho transitivo).
  function antecessores(tema, grafo) {
    const g = grafo || PREREQUISITOS;
    const vistos = new Set();
    const pilha = (g[tema] || []).slice();
    while (pilha.length) {
      const p = pilha.pop();
      if (vistos.has(p)) continue;
      vistos.add(p);
      (g[p] || []).forEach((q) => pilha.push(q));
    }
    return Array.from(vistos).sort();
  }

  // ── do item para a evidência ──────────────────────────────
  function habilidadesDoItem(item) {
    if (!item || !Array.isArray(item.bncc)) return [];
    return Array.from(new Set(item.bncc.filter((c) => typeof c === 'string' && RE_HABILIDADE.test(c))));
  }
  function tipoDoItem(item) {
    if (!item) return 'outro';
    const ref = typeof item.ref === 'string' ? item.ref : '';
    if (ref.indexOf('ger:') === 0 && RE_TIPO.test(ref)) return ref;
    if (typeof item.tipo === 'string' && RE_TIPO.test(item.tipo)) return item.tipo;
    if (typeof item.id === 'string' && item.id.indexOf('af:') === 0) return 'afirmacao';
    if (typeof item.id === 'string' && item.id) return 'banco';
    return 'outro';
  }

  // ── índice muitos-para-muitos ─────────────────────────────
  // Monta as relações a partir de itens reais (banco, afirmações, amostras
  // dos geradores). Só relaciona o que os itens declaram.
  function indexar(itens) {
    const porConteudo = {}, porHabilidade = {}, temasPorHabilidade = {}, porTipo = {};
    const junta = (mapa, k, v) => { const l = mapa[k] || (mapa[k] = []); if (l.indexOf(v) < 0) l.push(v); };
    (itens || []).forEach((item) => {
      const o = item && textoLimpo(item.o, LIMITES.texto);
      if (!o) return;
      habilidadesDoItem(item).forEach((h) => {
        junta(porConteudo, o, h);
        junta(porHabilidade, h, o);
        if (typeof item.tema === 'string' && PREREQUISITOS[item.tema]) junta(temasPorHabilidade, h, item.tema);
        junta(porTipo, tipoDoItem(item), h);
      });
    });
    [porConteudo, porHabilidade, temasPorHabilidade, porTipo].forEach((m) => Object.keys(m).forEach((k) => m[k].sort()));
    return { habilidadesPorConteudo: porConteudo, conteudosPorHabilidade: porHabilidade,
             temasPorHabilidade: temasPorHabilidade, habilidadesPorTipo: porTipo };
  }
  // Itens de todo o conteúdo do jogo: banco inteiro, todas as afirmações e
  // `amostras` sorteios de cada gerador em cada ano e nível.
  function itensDoConteudo(CM, banco, amostras) {
    const lista = (banco || []).slice();
    const n = amostras || 3;
    for (let ano = 1; ano <= 9; ano++) {
      for (let nv = 1; nv <= 4; nv++) {
        (CM.chavesDo(ano, nv) || []).forEach((k) => {
          if (!CM.GER[k]) return;
          for (let i = 0; i < n; i++) {
            const it = CM.gerarChave(k, ano, nv);
            if (it) lista.push(Object.assign({ ref: 'ger:' + k }, it));
          }
        });
        if (typeof CM.afirmacao === 'function') for (let i = 0; i < n; i++) lista.push(CM.afirmacao(ano, nv, []));
        // Jogos com montagem própria (sequência, ordenar, memória, cruzadinha, balança).
        ['sequencia', 'ordenar', 'memoria', 'cruzadinha', 'balanca'].forEach((f) => {
          if (typeof CM[f] === 'function') for (let i = 0; i < n; i++) { const it = CM[f](ano, nv); if (it) lista.push(it); }
        });
      }
    }
    return lista;
  }

  // ── armazenamento de evidências ───────────────────────────
  // Forma guardada (compacta, para caber no limite):
  //   { v:1, n:<último número>, t:{ c:[conteúdos], x:[tipos], j:[jogos] },
  //     h:{ <habilidade>: [[n, dia, bits, x, c, j], ...] } }
  //   n    número da resposta, crescente no perfil (protege contra repetidos)
  //   dia  dias desde 1970-01-01 do calendário local (sem hora)
  //   bits 1 = acertou, 2 = usou ajuda do jogo
  //   x,c,j posições nas tabelas de tipo, conteúdo e jogo
  // Uma resposta com dois códigos BNCC vira um registro em cada um, com o
  // mesmo n: é a mesma resposta vista por duas habilidades.
  function vazio() {
    return { v: VERSAO, n: 0, t: { c: [], x: [], j: [] }, h: {} };
  }

  function tabelaSanit(lista, valida) {
    if (!Array.isArray(lista)) return [];
    return lista.slice(0, LIMITES.tabela).map((s) => (valida(s) ? s : null));
  }

  function sanitizar(bruto, agora) {
    const ev = vazio();
    if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return ev;
    const hoje = diaNumero(agora);
    const t = bruto.t && typeof bruto.t === 'object' ? bruto.t : {};
    const tc = tabelaSanit(t.c, (s) => typeof s === 'string' && textoLimpo(s, LIMITES.texto) === s && s !== '');
    const tx = tabelaSanit(t.x, (s) => typeof s === 'string' && RE_TIPO.test(s));
    const tj = tabelaSanit(t.j, (s) => typeof s === 'string' && RE_JOGO.test(s));
    const h = bruto.h && typeof bruto.h === 'object' && !Array.isArray(bruto.h) ? bruto.h : {};
    let maiorN = 0;
    const registros = [];   // [hab, tupla com textos resolvidos]
    Object.keys(h).forEach((hab) => {
      if (!RE_HABILIDADE.test(hab) || !Array.isArray(h[hab])) return;
      const vistos = new Set();
      h[hab].forEach((r) => {
        if (!Array.isArray(r) || r.length !== 6) return;
        const [n, dia, bits, x, c, j] = r;
        if (!inteiro(n, 1, 1e9) || vistos.has(n)) return;
        // Dia impossível: antes do jogo existir ou depois de amanhã (relógio
        // adiantado em outro fuso tolera um dia).
        if (!inteiro(dia, DIA_MINIMO, hoje + 1)) return;
        if (!inteiro(bits, 0, 3)) return;
        if (!inteiro(x, 0, tx.length - 1) || !tx[x]) return;
        if (!inteiro(c, 0, tc.length - 1) || !tc[c]) return;
        if (!inteiro(j, 0, tj.length - 1) || !tj[j]) return;
        vistos.add(n);
        if (n > maiorN) maiorN = n;
        registros.push([hab, n, dia, bits, tx[x], tc[c], tj[j]]);
      });
    });
    // Reconstrói tabelas só com o que é usado e na ordem dos registros.
    registros.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    registros.forEach((r) => inserir(ev, r[0], r[1], r[2], r[3], r[4], r[5], r[6]));
    ev.n = Math.max(maiorN, inteiro(bruto.n, 0, 1e9) ? bruto.n : 0);
    aparar(ev);
    return ev;
  }

  function posicao(lista, valor) {
    let i = lista.indexOf(valor);
    if (i < 0) { lista.push(valor); i = lista.length - 1; }
    return i;
  }
  function inserir(ev, hab, n, dia, bits, tipo, conteudo, jogo) {
    const l = ev.h[hab] || (ev.h[hab] = []);
    l.push([n, dia, bits, posicao(ev.t.x, tipo), posicao(ev.t.c, conteudo), posicao(ev.t.j, jogo)]);
    if (l.length > LIMITES.porHabilidade) l.splice(0, l.length - LIMITES.porHabilidade);
  }

  // Aplica os tetos: habilidades demais saem as de registro mais antigo;
  // tabelas são refeitas só com o usado; bytes demais saem os registros mais
  // antigos do perfil inteiro, um a um.
  function aparar(ev) {
    let habs = Object.keys(ev.h);
    if (habs.length > LIMITES.habilidades) {
      habs.sort((a, b) => ultimo(ev.h[a]) - ultimo(ev.h[b]));
      habs.slice(0, habs.length - LIMITES.habilidades).forEach((k) => delete ev.h[k]);
    }
    compactarTabelas(ev);
    // Corte em lotes proporcionais ao excesso (cada registro custa ~30 bytes
    // mais o nome que só ele usa): poucas voltas mesmo com save adulterado.
    let medida = tamanho(ev), guarda = 0;
    while (medida > LIMITES.bytes && guarda++ < 200) {
      const todos = [];
      Object.keys(ev.h).forEach((k) => ev.h[k].forEach((r) => todos.push([r[0], k])));
      if (!todos.length) break;
      todos.sort((a, b) => a[0] - b[0]);
      const sai = Math.max(1, Math.min(todos.length, Math.floor((medida - LIMITES.bytes) / 160)));
      todos.slice(0, sai).forEach((par) => {
        const l = ev.h[par[1]];
        l.splice(l.findIndex((r) => r[0] === par[0]), 1);
        if (!l.length) delete ev.h[par[1]];
      });
      compactarTabelas(ev);
      medida = tamanho(ev);
    }
    return ev;
  }
  function ultimo(lista) { return lista[lista.length - 1][0]; }

  function compactarTabelas(ev) {
    // Habilidades em ordem alfabética num objeto novo: a ordem das chaves
    // não pode depender da história (quem entrou primeiro, quem foi aparado),
    // senão o mesmo conteúdo vira JSON diferente depois de recarregar.
    const nova = { c: [], x: [], j: [] };
    const h = {};
    Object.keys(ev.h).sort().forEach((k) => {
      h[k] = ev.h[k].map((r) => [r[0], r[1], r[2],
        posicao(nova.x, ev.t.x[r[3]]), posicao(nova.c, ev.t.c[r[4]]), posicao(nova.j, ev.t.j[r[5]])]);
    });
    ev.h = h;
    ev.t = nova;
  }

  function tamanho(ev) {
    try { return JSON.stringify(ev).length; } catch (e) { return Infinity; }
  }

  // A mesma questão nunca conta duas vezes seguidas, mesmo que o jogo chame
  // de novo (o script.js já evita; aqui é a segunda trava). Fica fora do save.
  const ultimoItem = typeof WeakMap === 'function' ? new WeakMap() : null;

  // Registra uma resposta. dados = { item, acertou, ajuda, jogo }.
  // Devolve quantos registros entraram (um por habilidade do item; 0 se a
  // resposta não tem habilidade, conteúdo ou é repetida).
  function registrar(ev, dados, agora) {
    if (!ev || typeof ev !== 'object' || !ev.h || !ev.t) return 0;
    const item = dados && dados.item;
    if (!item || typeof item !== 'object') return 0;
    if (ultimoItem && ultimoItem.get(ev) === item) return 0;
    const habs = habilidadesDoItem(item);
    const conteudo = textoLimpo(item.o, LIMITES.texto);
    if (!habs.length || !conteudo) return 0;
    const jogo = typeof dados.jogo === 'string' && RE_JOGO.test(dados.jogo) ? dados.jogo : 'outro';
    const bits = (dados.acertou === true ? 1 : 0) | (dados.ajuda === true ? 2 : 0);
    const n = (inteiro(ev.n, 0, 1e9) ? ev.n : 0) + 1;
    ev.n = n;
    const dia = diaNumero(agora);
    habs.forEach((hab) => inserir(ev, hab, n, dia, bits, tipoDoItem(item), conteudo, jogo));
    if (ultimoItem) ultimoItem.set(ev, item);
    // aparar() deixa a forma canônica (tabelas só com o usado, em ordem fixa):
    // o que está na memória é igual ao que volta do storage.
    aparar(ev);
    return habs.length;
  }

  // Registros de uma habilidade (ou de todas), legíveis e do mais antigo ao
  // mais novo. Nunca devolve as tuplas internas.
  function evidencias(ev, habilidade) {
    if (!ev || !ev.h) return [];
    const habs = habilidade ? [habilidade] : Object.keys(ev.h).sort();
    const saida = [];
    habs.forEach((hab) => (ev.h[hab] || []).forEach((r) => saida.push({
      n: r[0], habilidade: hab, conteudo: ev.t.c[r[4]], data: diaTexto(r[1]),
      resultado: r[2] & 1 ? 'acerto' : 'erro', ajuda: !!(r[2] & 2),
      tipo: ev.t.x[r[3]], jogo: ev.t.j[r[5]],
    })));
    return saida.sort((a, b) => a.n - b.n || (a.habilidade < b.habilidade ? -1 : 1));
  }
  function habilidades(ev) {
    return ev && ev.h ? Object.keys(ev.h).sort() : [];
  }

  // ── histórico antigo ──────────────────────────────────────
  // G.hist só tem {feitas, certas} por conteúdo: sem data, sem ajuda, sem
  // tipo. Mostramos o que ele diz, à parte, e com o aviso explícito de que
  // NÃO basta para afirmar domínio. Nunca é convertido em evidência.
  function resumoLegado(hist, indice) {
    const conteudos = {};
    if (hist && typeof hist === 'object' && !Array.isArray(hist)) {
      Object.keys(hist).forEach((nome) => {
        const h = hist[nome];
        if (!h || !inteiro(h.feitas, 0, 1e9) || !inteiro(h.certas, 0, h.feitas)) return;
        conteudos[nome] = {
          feitas: h.feitas, certas: h.certas,
          // Um conteúdo pode corresponder a mais de uma habilidade (anos
          // diferentes): são candidatas, não atribuição.
          habilidadesPossiveis: indice && indice.habilidadesPorConteudo[nome] ? indice.habilidadesPorConteudo[nome].slice() : [],
        };
      });
    }
    return { fonte: 'legado', suficienteParaDominio: false, conteudos: conteudos };
  }

  const CM_PEDAGOGIA = {
    VERSAO, LIMITES, PREREQUISITOS, STATUS_GRAFO, PENDENCIAS,
    diaNumero, diaTexto,
    verificarGrafo, ordemTopologica, antecessores,
    habilidadesDoItem, tipoDoItem, indexar, itensDoConteudo,
    vazio, sanitizar, registrar, evidencias, habilidades, tamanho, aparar,
    resumoLegado,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CM_PEDAGOGIA;
  root.CM_PEDAGOGIA = CM_PEDAGOGIA;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
