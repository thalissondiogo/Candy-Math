/* ===================================================
   CANDY MATH — narracao.js
   A voz do mascote. Duas escolhas, um único botão de parada:

     · 'peixe'    → uma das quatro vozes do projeto (Sarah, Bruna, Miguel,
                    Evellyn), pedida à função api/voz.js;
     · 'desligada'→ sem voz. Tem criança que não quer ouvir nada, e isso é
                    escolha dela.

   A voz sintética do aparelho (Web Speech API) saiu por decisão do dono do
   projeto: o jogo fala só com as vozes escolhidas. Quando a voz por IA não
   pode tocar (sem autorização de quem acompanha, sem internet, falha da
   função), a pergunta fica em silêncio e o motivo aparece por escrito.
   Saves com a preferência antiga 'aparelho' passam para 'peixe'.

   O que NÃO acontece aqui:
     · o texto enviado para /api/voz é só a frase a ser lida. Nem nome, nem
       e-mail, nem código de vínculo, nem estrelas, nem histórico;
     · nada é gravado em disco: o único cache é o de memória desta aba, com
       teto de entradas e sem dado pessoal na chave;
     · duas vozes nunca falam juntas: a frase nova cancela a anterior antes;
     · falha não trava o jogo: quem clica em "Ouvir" e a API não responde lê
       uma nota discreta, nunca uma tela quebrada.
   =================================================== */
(function (root) {
  'use strict';

  const CHAVE_LOCAL = 'candymath_voz_v1';
  const TETO_DO_CACHE = 8;          // frases repetidas na mesma sessão
  const FIM_DA_JOGADA = 12000;      // ms esperando a função de voz
  const PREFERENCIAS = ['peixe', 'desligada'];
  // Preferência de antes, que não existe mais: vira a voz do projeto.
  function migrarPreferencia(p) { return p === 'aparelho' ? 'peixe' : p; }

  let preferencia = 'peixe';
  let voz = 'sara';
  let carregando = false;
  let nota = '';
  let ultimoErro = '';
  const ouvintes = [];
  let escutaConsentimento = false;
  const cache = new Map();          // 'voz|texto' → { url, bytes }
  let atual = null;                 // { audio?, fala? } em reprodução

  function config() {
    const c = (root.CM_CONFIG && root.CM_CONFIG.narracao) || {};
    return {
      endpoint: typeof c.endpoint === 'string' ? c.endpoint.trim() : '',
      preferencia: PREFERENCIAS.indexOf(migrarPreferencia(c.preferencia)) >= 0 ? migrarPreferencia(c.preferencia) : 'peixe',
      vozes: Array.isArray(c.vozes) && c.vozes.length ? c.vozes : [],
      maximo: typeof c.maximoCaracteres === 'number' ? c.maximoCaracteres : 320,
    };
  }

  function vozValida(id) {
    const lista = config().vozes;
    if (!lista.length) return id === 'sara' ? 'sara' : null;
    const achada = lista.filter((v) => v && v.id).find((v) => v.id === id);
    return achada ? achada.id : (lista[0].id || null);
  }

  // Sem o módulo de consentimento carregado não há autorização registrada, e a
  // resposta é não: o caminho de rede fica fechado por ausência, não por padrão.
  function autorizada() {
    return !!(root.CM_CONSENTIMENTO && root.CM_CONSENTIMENTO.permitido('vozIA'));
  }

  // A voz que está em uso hoje é, de fato, uma das vozes que este config lista.
  // Sem isso, um config sem vozes continuaria pedindo "sara" à função por inércia.
  function temVozListada() {
    return config().vozes.some((v) => v && v.id === voz);
  }

  function textoSeguro(bruto) {
    if (typeof bruto !== 'string') return '';
    return bruto
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
      // A tag vai inteira embora: sobrar "b" e "/b" soltos na frase é ouvir
      // a voz lendo lixo no meio da conta.
      .replace(/<[^>]*>/g, ' ')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, config().maximo);
  }

  function avisar() {
    ouvintes.forEach((f) => {
      try {
        f(resumo());
      } catch (e) {
        // A tela não pode derrubar a voz — mas engolir a exceção em silêncio
        // apagaria junto o sintoma que levou até ela.
        avisarErro(e);
      }
    });
  }

  function avisarErro(e) {
    if (root.console && root.console.warn) root.console.warn('CM_NARRACAO: a tela de voz falhou ao pintar', e);
  }

  function aoMudar(f) {
    if (typeof f !== 'function') return;
    ouvintes.push(f);
    try {
      f(resumo());
    } catch (e) {
      avisarErro(e);
    }
  }

  function resumo() {
    const c = config();
    const id = c.vozes.find((v) => v.id === voz);
    return {
      preferencia: preferencia,
      voz: voz,
      rotulo: id ? id.rotulo : voz,
      vozes: c.vozes,
      carregando: carregando,
      falando: !!atual,
      nota: nota,
      erro: ultimoErro,
      temEndpoint: !!c.endpoint,
      autorizada: autorizada(),
      desligada: preferencia === 'desligada',
    };
  }

  function salvar() {
    try {
      root.localStorage.setItem(CHAVE_LOCAL, JSON.stringify({ preferencia: preferencia, voz: voz }));
    } catch (e) {
      // Modo privado com cota cheia: a escolha só não pega na próxima vez.
    }
  }

  function carregar() {
    let lido = null;
    try { lido = JSON.parse(root.localStorage.getItem(CHAVE_LOCAL) || 'null'); } catch (e) { lido = null; }
    const c = config();
    const salva = lido ? migrarPreferencia(lido.preferencia) : null;
    preferencia = PREFERENCIAS.indexOf(salva) >= 0 ? salva : c.preferencia;
    voz = (lido && vozValida(lido.voz)) || vozValida('sara') || (c.vozes[0] && c.vozes[0].id) || 'sara';
  }

  // ── reprodução ───────────────────────────────────────────
  function calar() {
    if (atual) {
      if (atual.audio) { try { atual.audio.pause(); } catch (e) { /* já era */ } }
      atual = null;
    }
    carregando = false;
    nota = '';
  }

  // Velocidade da fala, por estudante (Ajustes). Só os três valores da lista.
  let velocidade = 1;
  function definirVelocidade(v) { velocidade = [0.75, 1, 1.25].indexOf(v) >= 0 ? v : 1; return velocidade; }

  // A voz por IA não pôde tocar: a pergunta fica em silêncio e o motivo vai
  // para a tela de voz. Nunca há outra voz no lugar.
  function semVoz(motivo) {
    nota = motivo;
    avisar();
    return false;
  }

  function guardarNoCache(chave, url, bytes) {
    cache.set(chave, { url: url, bytes: bytes });
    while (cache.size > TETO_DO_CACHE) {
      const maisVelha = cache.keys().next().value;
      const sobra = cache.get(maisVelha);
      cache.delete(maisVelha);
      // A URL de blob aponta para memória desta aba: sem revogar, fica presa
      // até o navegador fechar.
      if (sobra && sobra.url) { try { root.URL.revokeObjectURL(sobra.url); } catch (e) { /* nada a fazer */ } }
    }
  }

  function tocarUrl(chave, url) {
    const audio = new root.Audio(url);
    audio.playbackRate = velocidade;
    audio.onended = function () { if (atual && atual.audio === audio) { atual = null; avisar(); } };
    audio.onerror = function () {
      if (atual && atual.audio === audio) atual = null;
      cache.delete(chave);
      ultimoErro = 'o áudio chegou mas este aparelho não soube tocar';
      avisar();
    };
    atual = { audio: audio };
    avisar();
    audio.play().catch(function () {
      // Celular que exige gesto do usuário: o clique já é o gesto; se mesmo
      // assim bloquear, avisa em vez de insistir.
      if (atual && atual.audio === audio) atual = null;
      ultimoErro = 'o navegador não deixou tocar o áudio; toque em Ouvir de novo';
      avisar();
    });
  }

  function apagarCache() {
    cache.forEach((item) => {
      if (item && item.url) { try { root.URL.revokeObjectURL(item.url); } catch (e) { /* nada */ } }
    });
    cache.clear();
  }

  async function falar(bruto) {
    const texto = textoSeguro(bruto);
    if (!texto) return false;
    if (preferencia === 'desligada') return false;
    const c = config();

    calar();                       // nunca duas vozes ao mesmo tempo

    if (!c.endpoint || !temVozListada()) return semVoz('a voz não está disponível neste site');
    // A pergunta sai do aparelho apenas com autorização de quem acompanha.
    // A recusa é no caminho, não na tela.
    if (!autorizada()) return semVoz('a voz precisa da autorização de quem acompanha (Responsáveis)');
    if (root.navigator && root.navigator.onLine === false) return semVoz('sem internet agora: a voz volta quando a conexão voltar');

    const chave = voz + '|' + texto;
    const guardado = cache.get(chave);
    if (guardado && guardado.url) { tocarUrl(chave, guardado.url); return true; }

    carregando = true;
    nota = '';
    avisar();

    const ctrl = root.AbortController ? new root.AbortController() : null;
    const relogio = ctrl
      ? root.setTimeout(function () { try { ctrl.abort(); } catch (e) { /* acabou */ } }, FIM_DA_JOGADA)
      : 0;
    let bytes = null;
    try {
      const resposta = await fetch(c.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Só duas coisas sobem: o que dizer e qual voz da lista usar.
        body: JSON.stringify({ texto: texto, voz: voz }),
        signal: ctrl ? ctrl.signal : undefined,
      });
      if (resposta.ok) {
        const buffer = await resposta.arrayBuffer();
        if (buffer && buffer.byteLength) bytes = buffer;
        else ultimoErro = 'a função de voz voltou vazia';
      } else {
        ultimoErro = 'a função de voz respondeu ' + resposta.status;
      }
    } catch (e) {
      ultimoErro = (e && e.name === 'AbortError') ? 'a voz demorou demais' : 'a voz não chegou';
    } finally {
      if (relogio) root.clearTimeout(relogio);
      carregando = false;
    }

    if (!bytes) {
      // Sem drama: segue o jogo em silêncio. A nota é para quem abriu a
      // tela de voz, não para a criança no meio da conta.
      return semVoz('a voz não veio desta vez; tente Ouvir de novo');
    }

    const url = root.URL.createObjectURL(new root.Blob([bytes], { type: 'audio/mpeg' }));
    guardarNoCache(chave, url, bytes.byteLength);
    tocarUrl(chave, url);
    return true;
  }

  function definirPreferencia(bruta) {
    const nova = migrarPreferencia(bruta);
    if (PREFERENCIAS.indexOf(nova) < 0) return false;
    preferencia = nova;
    if (nova === 'desligada') { calar(); apagarCache(); }
    ultimoErro = '';
    salvar();
    avisar();
    return true;
  }

  function definirVoz(id) {
    // A tela só oferece as vozes do config. Um id de fora é recusado em vez de
    // ser "ajeitado" para a primeira da lista: assim um erro aparece como erro.
    const lista = config().vozes;
    const aceita = lista.some((v) => v && v.id === id) ? id : null;
    if (!aceita) return false;
    if (aceita === voz) return true;
    voz = aceita;
    calar();                       // trocar de voz no meio da fala para a antiga
    apagarCache();                 // o áudio em memória é da voz anterior
    salvar();
    avisar();
    return true;
  }

  // ── interface ────────────────────────────────────────────
  // A tela de voz mora junto da voz: o HTML só traz os containers, e este
  // módulo pinta as opções a partir do config. Assim trocar as quatro vozes é
  // mexer em config.js, não em dois lugares.
  const EXPLICACAO_PREFERENCIA = {
    peixe: 'O texto da pergunta vai para a função de voz deste projeto, que devolve o áudio — só com '
      + 'a autorização de quem acompanha. Sem internet ou sem autorização, a pergunta fica em silêncio.',
    desligada: 'Nenhuma fala. O botão "Ouvir" fica silencioso.',
  };

  function chip(pai, { valor, rotulo, grupo, descricao }) {
    const b = doc().createElement('button');
    b.type = 'button';
    b.className = 'chip-voz';
    b.dataset.valor = valor;
    b.dataset.grupo = grupo;
    b.setAttribute('role', 'radio');
    b.textContent = rotulo;
    if (descricao) b.title = descricao;
    b.addEventListener('click', function () {
      if (grupo === 'preferencia') definirPreferencia(valor);
      else { definirVoz(valor); definirPreferencia('peixe'); }
    });
    pai.appendChild(b);
    return b;
  }

  function doc() { return root.document; }

  function pintar(s) {
    const d = doc();
    if (!d) return;
    // Uma lista só: as vozes do projeto e "Sem voz". Escolher uma voz liga a
    // narração; "Sem voz" desliga.
    d.querySelectorAll('#vozLista .chip-voz').forEach(function (b) {
      const ativa = b.dataset.grupo === 'preferencia' ? s.desligada : (!s.desligada && b.dataset.valor === s.voz);
      b.classList.toggle('ativa', ativa);
      b.setAttribute('aria-checked', String(ativa));
      if (b.dataset.grupo !== 'preferencia') b.disabled = !s.temEndpoint;
    });
    const notaP = d.getElementById('vozNotaPreferencia');
    if (notaP) notaP.textContent = EXPLICACAO_PREFERENCIA[s.preferencia] || '';
    const notaV = d.getElementById('vozNotaVoz');
    if (notaV) {
      notaV.textContent = s.desligada ? EXPLICACAO_PREFERENCIA.desligada
        : (s.vozes.length > 0 ? 'Voz escolhida: ' + s.rotulo + '. ' + EXPLICACAO_PREFERENCIA.peixe : '');
    }
    const estado = d.getElementById('vozEstadoModal');
    if (estado) {
      estado.textContent = s.carregando ? 'Buscando a voz por IA…'
        : s.falando ? 'Falando…'
        : s.nota ? s.nota
        : s.erro ? 'Última falha: ' + s.erro
        : 'Pronto.';
      estado.classList.toggle('voz-ativa', !!(s.carregando || s.falando));
    }
    const pendentes = d.getElementById('vozPendentes');
    if (pendentes) {
      let texto = '';
      if (!s.temEndpoint) {
        texto = 'Pendente: a voz só existe depois de publicar a função api/voz.js na hospedagem e '
          + 'de preencher a variável secreta FISH_AUDIO_API_KEY.';
      } else if (!s.vozes.length) {
        texto = 'Pendente: nenhuma voz está listada em config.js, então a narração por IA fica '
          + 'apagada aqui. O dono do projeto escolhe as vozes na lista "narracao.vozes".';
      } else if (!s.autorizada) {
        texto = 'Falta a autorização de quem acompanha para mandar o texto da pergunta à função de voz. '
          + 'Ela é dada no boletim (Responsáveis), em "Saídas de dados autorizadas". Até lá, as '
          + 'perguntas ficam em silêncio.';
      }
      pendentes.textContent = texto;
      pendentes.hidden = !texto;
    }
    const pending = d.getElementById('vozPreferenciasPending');
    if (pending) pending.hidden = true;

    // Os dois ícones que a criança aperta.
    const icone = d.getElementById('btnFalarIcone');
    if (icone) icone.className = s.carregando ? 'fa-solid fa-spinner fa-spin'
      : s.falando ? 'fa-solid fa-stop'
      : s.desligada ? 'fa-solid fa-volume-xmark'
      : 'fa-solid fa-volume-high';
    const hub = d.getElementById('vozIcon');
    if (hub) hub.className = s.desligada ? 'fa-solid fa-comment-slash' : 'fa-solid fa-comment-dots';
    // Uma palavra ao lado do botão do cartão, para quem não vê o ícone girar.
    const sopro = d.getElementById('vozEstado');
    if (sopro) sopro.textContent = s.carregando ? 'ouvindo…' : s.falando ? 'falando…' : '';
  }

  function montarInterface() {
    const d = doc();
    if (!d) return;
    const grupoP = d.getElementById('vozPreferencias');
    const grupoV = d.getElementById('vozLista');
    // O campo "de onde vem a voz" deixou de existir: sai da tela.
    if (grupoP && grupoP.closest) { const campo = grupoP.closest('fieldset'); if (campo) campo.hidden = true; }
    if (grupoV && !grupoV.querySelector('.chip-voz')) {
      config().vozes.forEach(function (v) {
        chip(grupoV, { valor: v.id, rotulo: v.rotulo, grupo: 'voz' });
      });
      chip(grupoV, { valor: 'desligada', rotulo: 'Sem voz', grupo: 'preferencia', descricao: EXPLICACAO_PREFERENCIA.desligada });
      if (!config().vozes.length) {
        const aviso = d.createElement('p');
        aviso.className = 'voz-pending';
        aviso.textContent = 'Nenhuma voz listada no config.js.';
        grupoV.appendChild(aviso);
      }
    }
    const amostra = d.getElementById('vozTestar');
    if (amostra) amostra.addEventListener('click', function () {
      falar('Sete mais cinco são doze. Você acertou!');
    });
    const pararBotao = d.getElementById('vozParar');
    if (pararBotao) pararBotao.addEventListener('click', function () { calar(); avisar(); });
    aoMudar(pintar);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      root.addEventListener('DOMContentLoaded', montarInterface);
    } else {
      montarInterface();
    }
  }

  root.CM_NARRACAO = {
    iniciar: function () {
      carregar();
      // Autorizar ou revogar muda o que esta tela diz, e muda na hora.
      if (root.CM_CONSENTIMENTO && !escutaConsentimento) {
        escutaConsentimento = true;
        root.CM_CONSENTIMENTO.aoMudar(avisar);
      }
      avisar();
      return resumo();
    },
    falar: function (texto) { return falar(texto); },
    parar: function () { calar(); avisar(); return resumo(); },
    vozes: function () { return config().vozes; },
    preferencias: function () { return PREFERENCIAS.slice(); },
    definirPreferencia: definirPreferencia,
    definirVoz: definirVoz,
    definirVelocidade: definirVelocidade,
    velocidade: function () { return velocidade; },
    estado: function () { return resumo(); },
    aoMudar: aoMudar,
    podeFalar: function () {
      if (preferencia === 'desligada') return false;
      // Só faz sentido haver para onde mandar, uma voz da lista do projeto e a
      // autorização de quem acompanha. Fora isso, silêncio.
      return !!config().endpoint && temVozListada() && autorizada();
    },
    // Frase curta para o aviso do botão "Ouvir" quando não há voz.
    motivoSemVoz: function () {
      if (preferencia === 'desligada') return 'A voz está desligada. Escolha uma em Voz.';
      if (!config().endpoint || !temVozListada()) return 'A voz não está disponível neste site.';
      if (!autorizada()) return 'Para ouvir, quem acompanha autoriza a voz em Responsáveis.';
      return '';
    },
    limiteDeTexto: function () { return config().maximo; },
    // Só para os testes: tamanho e chaves do cache de memória. As chaves
    // aparecem truncadas — o texto da pergunta não sai do arquivo de teste.
    __cache: function () {
      return {
        entradas: cache.size,
        teto: TETO_DO_CACHE,
        chaves: Array.from(cache.keys()).map((k) => (k.length > 30 ? k.slice(0, 30) + '…' : k)),
      };
    },
  };
})(typeof window !== 'undefined' ? window : this);
