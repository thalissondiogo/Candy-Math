/* ===================================================
   CANDY MATH — privacidade.js
   Autorização por finalidade. Este módulo existe porque um aviso bonito não
   protege ninguém: o que protege é o dado não sair.

   Como funciona de verdade:
     • Cada saída de dados tem uma finalidade própria, desligada de fábrica.
     • nuvem.js e narracao.js perguntam aqui ANTES de mandar qualquer coisa.
       Sem autorização, o caminho de rede não é percorrido — não é escondido
       da tela, é recusado no código.
     • Autorizar exige a senha de quem acompanha (LGPD, art. 14, §1º: o
       consentimento sobre dado de criança é do responsável legal).
     • Revogar não exige senha nenhuma: parar de enviar é sempre permitido e
       imediato (art. 8º, §5º). A assimetria é de propósito.
     • Fica registrado quando e sobre qual versão do texto a pessoa decidiu.
       Mudou o texto, a autorização caduca e volta a ser pedida.

   O que este módulo NÃO faz: não declara conformidade integral com a LGPD nem
   com a Lei nº 15.211/2025, não prova que o adulto é o responsável legal e não
   substitui a análise jurídica de quem publica. Ele implementa o mecanismo;
   a base legal, o controlador e o encarregado são preenchimento de quem
   publica, e estão marcados como pendentes em privacidade.html.
   =================================================== */
(function (root) {
  'use strict';

  const CHAVE = 'candymath_consentimento_v1';
  const CHAVE_AVISO = 'candymath_aviso_v1';
  // Data da política que a pessoa leu ao autorizar. Subiu a data, as
  // autorizações de rede caducam: consentimento sobre texto velho não vale.
  const VERSAO_TEXTO = '2026-11-16';

  const FINALIDADES = [
    {
      id: 'nuvem',
      titulo: 'Guardar o progresso na conta de quem acompanha',
      sai: 'Apelido escolhido pelo adulto, ano escolar, estrelas, acertos e erros por conteúdo, '
        + 'provas aplicadas e roupas da Juba.',
      onde: 'Banco de dados do projeto publicado (Supabase): tabelas de crianças, vínculos e progressos. '
        + 'Só a conta que registrou a criança lê esses registros.',
      fica: 'Nada sai enquanto a conexão não estiver configurada, o e-mail da conta não estiver '
        + 'confirmado e a criança não estiver registrada. Esta autorização é mais uma porta, não a única.',
      risco: 'O apelido é o único nome que sobe. Não se pede nome real, idade, escola, foto nem contato.',
    },
    {
      id: 'vozIA',
      titulo: 'Ler a pergunta em voz de inteligência artificial',
      sai: 'Somente o texto da pergunta de Matemática e o nome da voz escolhida.',
      onde: 'Função /api/voz deste projeto e, dela, o serviço de voz contratado por quem publica.',
      fica: 'Não vão juntos: apelido, conta, progresso, identificador do aparelho ou histórico. '
        + 'A frase guardada em cache não é ligada a nenhuma pessoa.',
      risco: 'Sem esta autorização o jogo usa a voz do próprio aparelho, que funciona sem internet '
        + 'e não manda nada para lugar nenhum.',
    },
    {
      id: 'dueloRede',
      titulo: 'Duelo em rede com outra pessoa',
      sai: 'O apelido do estudante e os lances da partida.',
      onde: 'Tabelas de salas e jogadas do banco publicado, visíveis para quem entrou na mesma sala.',
      fica: 'Desligado de fábrica também em config.js, porque as políticas de acesso do banco '
        + 'precisam ser aplicadas e conferidas por quem publica antes de valer.',
      risco: 'Aqui o apelido aparece para outra pessoa. Use um apelido que não identifique a criança. '
        + 'Não há chat, nem foto, nem lista pública de jogadores.',
    },
  ];

  const IDS = FINALIDADES.map((f) => f.id);
  const K = { registro: null, aoMudar: [], revisar: false };

  // ── 1. REGISTRO ─────────────────────────────────────────
  function emBranco() {
    const itens = {};
    IDS.forEach((id) => { itens[id] = { aceito: false, em: 0, texto: '', revogadoEm: 0 }; });
    return { versao: 1, texto: VERSAO_TEXTO, itens: itens };
  }

  function itemValido(bruto) {
    const b = bruto && typeof bruto === 'object' ? bruto : {};
    return {
      aceito: b.aceito === true,
      em: Number.isFinite(Number(b.em)) ? Number(b.em) : 0,
      texto: typeof b.texto === 'string' ? b.texto.slice(0, 20) : '',
      revogadoEm: Number.isFinite(Number(b.revogadoEm)) ? Number(b.revogadoEm) : 0,
    };
  }

  function ler() {
    let bruto = null;
    try { bruto = JSON.parse(root.localStorage.getItem(CHAVE) || 'null'); } catch (e) { bruto = null; }
    const novo = emBranco();
    if (!bruto || bruto.versao !== 1 || !bruto.itens) return novo;
    IDS.forEach((id) => { novo.itens[id] = itemValido(bruto.itens[id]); });
    // Texto antigo: a autorização continua registrada como histórico, mas não
    // vale mais. Quem acompanha decide de novo, sobre o que está escrito hoje.
    if (bruto.texto !== VERSAO_TEXTO) {
      let caducou = false;
      IDS.forEach((id) => {
        if (novo.itens[id].aceito) { caducou = true; novo.itens[id].aceito = false; novo.itens[id].revogadoEm = Date.now(); }
      });
      K.revisar = caducou;
    }
    return novo;
  }

  function gravar() {
    try {
      root.localStorage.setItem(CHAVE, JSON.stringify(K.registro));
      return true;
    } catch (e) { return false; }
  }

  function avisou() { K.aoMudar.forEach((f) => { try { f(); } catch (e) { /* uma tela não derruba as outras */ } }); }

  // ── 2. A PERGUNTA QUE OS MÓDULOS DE REDE FAZEM ──────────
  function permitido(id) {
    if (!K.registro) return false;
    const item = K.registro.itens[id];
    return !!(item && item.aceito && item.texto === VERSAO_TEXTO);
  }

  function adultoPresente() {
    return !!(root.CM_CONTAS && root.CM_CONTAS.temConta());
  }

  function adultoLiberado() {
    if (!adultoPresente()) return true;      // sem conta não há senha a pedir
    return !!root.CM_CONTAS.adultoLiberado();
  }

  // Autorizar é tratamento de dado de criança: passa pela porta do adulto.
  // A checagem mora aqui, e não só na tela, para que nenhum outro código
  // consiga ligar uma finalidade sem ter passado por ela.
  function registrar(id, aceito) {
    if (IDS.indexOf(id) < 0) return { ok: false, erro: 'Finalidade desconhecida.' };
    if (!K.registro) K.registro = emBranco();
    const item = K.registro.itens[id];
    if (aceito) {
      if (!adultoLiberado()) {
        return { ok: false, erro: 'Confirme a senha de quem acompanha antes de autorizar.' };
      }
      item.aceito = true;
      item.em = Date.now();
      item.texto = VERSAO_TEXTO;
      item.revogadoEm = 0;
    } else {
      // Revogar não pede senha: interromper o envio é direito a qualquer momento.
      item.aceito = false;
      item.revogadoEm = Date.now();
    }
    if (!gravar()) {
      item.aceito = !aceito;
      return { ok: false, erro: 'O navegador não deixou guardar esta decisão.' };
    }
    K.revisar = false;
    avisou();
    return { ok: true, aceito: item.aceito };
  }

  function revogarTudo() {
    IDS.forEach((id) => {
      const item = K.registro && K.registro.itens[id];
      if (item && item.aceito) { item.aceito = false; item.revogadoEm = Date.now(); }
    });
    gravar();
    avisou();
  }

  // ── 3. AVISO DE PRIMEIRA VEZ ────────────────────────────
  // Transparência (LGPD, art. 9º) sem parede de consentimento: o armazenamento
  // local é o próprio serviço, não depende de autorização, e por isso não se
  // pede "aceitar" para jogar. Informa-se uma vez, com o caminho para ler mais.
  function avisoPendente() {
    try { return root.localStorage.getItem(CHAVE_AVISO) !== VERSAO_TEXTO; } catch (e) { return false; }
  }

  function marcarAviso() {
    try { root.localStorage.setItem(CHAVE_AVISO, VERSAO_TEXTO); } catch (e) { /* segue sem o aviso */ }
  }

  // ── 4. TELA ─────────────────────────────────────────────
  function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function dataDe(ms) {
    if (!ms) return '';
    try { return new Date(ms).toLocaleDateString('pt-BR'); } catch (e) { return ''; }
  }

  function linha(f) {
    const item = (K.registro && K.registro.itens[f.id]) || { aceito: false };
    const caixa = el('div', 'cs-item' + (item.aceito ? ' cs-ativo' : ''));
    const topo = el('div', 'cs-topo');
    topo.appendChild(el('h4', 'cs-titulo', f.titulo));
    const estado = el('span', 'cs-estado' + (item.aceito ? ' cs-estado-on' : ''),
      item.aceito ? 'Autorizado' : 'Desligado');
    topo.appendChild(estado);
    caixa.appendChild(topo);

    const dl = el('dl', 'cs-dados');
    [['O que sai', f.sai], ['Para onde', f.onde], ['O que não sai', f.fica], ['Atenção', f.risco]]
      .forEach(([rotulo, texto]) => {
        dl.appendChild(el('dt', '', rotulo));
        dl.appendChild(el('dd', '', texto));
      });
    caixa.appendChild(dl);

    const rodape = el('div', 'cs-rodape');
    const quando = item.aceito
      ? 'Autorizado em ' + dataDe(item.em) + ', sobre o texto de ' + VERSAO_TEXTO + '.'
      : item.revogadoEm ? 'Revogado em ' + dataDe(item.revogadoEm) + '.' : 'Nunca foi autorizado.';
    rodape.appendChild(el('span', 'cs-quando', quando));
    const b = el('button', 'cs-botao' + (item.aceito ? ' cs-revogar' : ''));
    b.type = 'button';
    b.textContent = item.aceito ? 'Revogar autorização' : 'Autorizar';
    b.setAttribute('aria-pressed', item.aceito ? 'true' : 'false');
    b.onclick = function () {
      if (item.aceito) { registrar(f.id, false); return; }
      const abrir = function () {
        const r = registrar(f.id, true);
        if (!r.ok && root.showToast) root.showToast(r.erro);
      };
      if (adultoLiberado()) abrir();
      else root.CM_CONTAS.pedirSenha('Autorizar saída de dados', abrir);
    };
    rodape.appendChild(b);
    caixa.appendChild(rodape);
    return caixa;
  }

  function pintar(alvo) {
    const caixa = typeof alvo === 'string' ? document.getElementById(alvo) : alvo;
    if (!caixa) return;
    caixa.textContent = '';
    caixa.appendChild(el('p', 'cs-nota',
      'Tudo abaixo está desligado de fábrica. Enquanto estiver desligado, o jogo funciona inteiro '
      + 'e nenhum dado sai deste aparelho. Autorizar pede a senha de quem acompanha; revogar não pede nada.'));
    if (K.revisar) {
      caixa.appendChild(el('p', 'cs-aviso',
        'O texto da política mudou desde a última autorização. As autorizações anteriores foram '
        + 'desligadas: leia de novo e decida outra vez.'));
    }
    FINALIDADES.forEach((f) => caixa.appendChild(linha(f)));
    const links = el('p', 'cs-links');
    [['privacidade.html', 'Como os dados são tratados'], ['cookies.html', 'Cookies e armazenamento']]
      .forEach(([href, texto]) => {
        const a = el('a', 'btn-conta conta-sec', texto);
        a.href = href;
        links.appendChild(a);
      });
    caixa.appendChild(links);
    const tudo = el('button', 'cs-botao cs-revogar cs-tudo');
    tudo.type = 'button';
    tudo.textContent = 'Desligar todas as saídas de dados';
    tudo.onclick = function () {
      revogarTudo();
      if (root.showToast) root.showToast('Nenhuma saída de dados autorizada.');
    };
    caixa.appendChild(tudo);
  }

  function pintarAviso(alvo) {
    const caixa = typeof alvo === 'string' ? document.getElementById(alvo) : alvo;
    if (!caixa) return;
    caixa.textContent = '';
    caixa.hidden = false;
    const texto = el('p', 'av-texto',
      'O Candy Math guarda o progresso neste aparelho e não manda nada para a internet. '
      + 'Não há anúncio, nem rastreador, nem conta de criança.');
    caixa.appendChild(texto);
    const acoes = el('div', 'av-acoes');
    [['privacidade.html', 'Como os dados são tratados'], ['cookies.html', 'Cookies']]
      .forEach(([href, rotulo]) => {
        const a = el('a', 'btn-conta conta-sec', rotulo);
        a.href = href;
        acoes.appendChild(a);
      });
    const b = el('button', 'av-ok');
    b.type = 'button';
    b.textContent = 'Entendi';
    b.onclick = function () { marcarAviso(); caixa.hidden = true; };
    acoes.appendChild(b);
    caixa.appendChild(acoes);
  }

  // ── 5. ENTRADA ──────────────────────────────────────────
  function iniciar() {
    K.registro = ler();
    gravar();
    return resumo();
  }

  function resumo() {
    const saida = { texto: VERSAO_TEXTO, revisar: K.revisar, finalidades: {} };
    IDS.forEach((id) => {
      const item = (K.registro && K.registro.itens[id]) || {};
      saida.finalidades[id] = { aceito: permitido(id), em: item.em || 0 };
    });
    return saida;
  }

  root.CM_CONSENTIMENTO = {
    iniciar: iniciar,
    permitido: permitido,
    registrar: registrar,
    revogarTudo: revogarTudo,
    finalidades: function () { return FINALIDADES.map((f) => Object.assign({}, f)); },
    versaoTexto: function () { return VERSAO_TEXTO; },
    precisaRevisar: function () { return K.revisar; },
    avisoPendente: avisoPendente,
    marcarAviso: marcarAviso,
    pintar: pintar,
    pintarAviso: pintarAviso,
    aoMudar: function (f) { K.aoMudar.push(f); },
    resumo: resumo,
  };
})(window);