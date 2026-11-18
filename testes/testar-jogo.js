#!/usr/bin/env node
/* ============================================================
   JOGO — testes/testar-jogo.js
   Joga uma partida de verdade num navegador real e confere a consequência de
   cada clique, não a aparência da tela. Os outros testes medem geometria
   (auditar-layout) e conferem o desenho das peças no módulo (testar-mascote);
   nenhum deles respondia uma pergunta, comprava uma roupa ou recarregava a
   página para ver se o figurino voltou. Era esse o buraco.

   O que ele percorre:
     ano e nível pelos chips → explicação antes da primeira partida →
     acerto (estrela, sequência, histórico) → erro que ensina antes de punir →
     fim de rodada com o resumo do que foi praticado → rodada inteira que sobe
     o degrau → loja (catálogo, abas, preço travado) → compra que desconta
     estrela → peça que aparece na Juba → experimentar sem comprar →
     máscara e óculos que não se empilham → tirar tudo → verdadeiro ou falso →
     recarregar e continuar vestido.

   Precisa de um servidor de arquivos na porta 8765 (npm run servir).
   Rodar: node testes/testar-jogo.js
   ============================================================ */
'use strict';

const { criarNavegador, conectar, avaliar, espera, abrir } = require('./_navegador.js');

const PORTA = 9335;
const BASE = 'http://127.0.0.1:8765/index.html';

const nav = criarNavegador(PORTA, 'jogo');
let conexao = null;
let checagens = 0;
const problemas = [];

function confere(rotulo, condicao, detalhe) {
  checagens++;
  if (!condicao) problemas.push(rotulo + (detalhe !== undefined ? ' — ' + JSON.stringify(detalhe) : ''));
}

/* Helpers que rodam DENTRO da página. Só clicam em elemento visível e habilitado:
   um botão em tela escondida aceita .click() e faz o teste passar sem ninguém ter
   jogado, que é exatamente o engano que este arquivo existe para evitar. */
const dentro = `(function(){
  /* Medidor só deste teste: soma as estrelas que missões e marcos de dias pagam.
     As conferências de "acerto vale N estrelas" medem o jogo, e uma missão que
     se cumpre no meio da rodada (depende do par sorteado no dia) não pode fazer
     o teste passar ou falhar conforme a data. O jogo em si não muda. */
  window.__metasPagas = 0;
  if (!CM_METAS.__medido) {
    var colherM = CM_METAS.colherMissoes, colherD = CM_METAS.colherMarco;
    CM_METAS.colherMissoes = function(){ var r = colherM.apply(this, arguments);
      r.forEach(function(m){ window.__metasPagas += m.estrelas; }); return r; };
    CM_METAS.colherMarco = function(){ var r = colherD.apply(this, arguments);
      if (r) window.__metasPagas += r.estrelas; return r; };
    var colherC = CM_METAS.colherConquistas;
    CM_METAS.colherConquistas = function(){ var r = colherC.apply(this, arguments);
      r.forEach(function(m){ window.__metasPagas += m.estrelas; }); return r; };
    CM_METAS.__medido = true;
  }
  window.__J = {
    jogo: function(){ return G.stars - window.__metasPagas; },
    vis: function(el){ if(!el) return false; var r=el.getBoundingClientRect();
      return r.width>0 && r.height>0 && el.checkVisibility({visibilityProperty:true, opacityProperty:true}); },
    tela: function(){ var a=document.querySelector('.screen.active'); return a?a.id:'nenhuma'; },
    aberto: function(id){ var m=document.getElementById(id); return !!m && m.style.display==='block' && window.__J.vis(m); },
    texto: function(id){ var e=document.getElementById(id); return e?e.textContent.trim():null; },
    botoes: function(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel+' button'))
      .filter(window.__J.vis).map(function(b){return b.textContent.trim();}); },
    clicar: function(sel, texto){
      var todos=Array.prototype.slice.call(document.querySelectorAll(sel+' button'));
      var b=todos.filter(function(x){ return window.__J.vis(x) && x.textContent.indexOf(texto)>=0; })[0];
      if(!b) throw new Error('sem botão visível "'+texto+'" em '+sel+' — havia: '+window.__J.botoes(sel).join(' | '));
      b.click(); return true;
    },
    /* A correta é sempre alt[0] no banco; a tela embaralha. Escolher pelo texto
       é o que a criança faz — escolher pelo índice seria testar o embaralhador. */
    responder: function(certa){
      var q=G.currentQ; if(!q) throw new Error('sem pergunta carregada');
      var bs=Array.prototype.slice.call(document.querySelectorAll('#quizAnswers .ans-btn'))
        .filter(function(b){ return !b.disabled && window.__J.vis(b); });
      if(!bs.length) throw new Error('nenhuma alternativa clicável');
      var alvo=bs.filter(function(b){ return certa ? b.textContent===String(q.alt[0]) : b.textContent!==String(q.alt[0]); })[0];
      if(!alvo) throw new Error('sem alternativa '+(certa?'certa':'errada')+' entre: '+bs.map(function(b){return b.textContent;}).join(' | '));
      alvo.click(); return alvo.textContent;
    },
    alternativas: function(){ return Array.prototype.slice.call(document.querySelectorAll('#quizAnswers .ans-btn'))
      .map(function(b){ return {t:b.textContent, livre:!b.disabled, cls:b.className}; }); },
    realcada: function(){ var b=document.querySelector('#quizAnswers .ans-btn.reveal'); return b?b.textContent:null; },
    bolinha: function(i){ var d=document.querySelectorAll('.qdot')[i]; return d?d.className:'sem bolinha'; },
    tf: function(certa){
      if(!tfAtual) throw new Error('sem afirmação carregada');
      var quer = certa ? tfAtual.certa : !tfAtual.certa;
      var b=document.querySelector(quer?'.btn-tf-true':'.btn-tf-false');
      if(!b || b.disabled || !window.__J.vis(b)) throw new Error('botão de verdadeiro/falso indisponível');
      b.click(); return quer;
    },
    /* O boneco é lido pelo que ele diz e pelo que ele desenha: o rótulo para quem
       ouve, a contagem de nós para quem vê. Peça que não entrou no SVG não vestiu. */
    boneco: function(sel){
      var e=document.querySelector(sel); if(!e) return null;
      var s=e.querySelector('svg');
      return { chave:e.dataset.figurino||'', rotulo:s?s.getAttribute('aria-label'):'',
        nos:s?s.querySelectorAll('*').length:0, peso:s?s.innerHTML.length:0 };
    },
    peca: function(id){ return document.querySelector('#shopGrid [data-peca="'+id+'"]'); },
    clicarPeca: function(id, texto){
      var c=window.__J.peca(id); if(!c) throw new Error('sem card da peça '+id+' na grade');
      var b=Array.prototype.slice.call(c.querySelectorAll('button'))
        .filter(function(x){ return x.textContent.indexOf(texto)>=0; })[0];
      if(!b) throw new Error('peça '+id+' sem botão "'+texto+'" — havia: '+window.__J.botoes('#shopGrid [data-peca="'+id+'"]').join(' | '));
      if(b.disabled) throw new Error('botão "'+texto+'" da peça '+id+' está desabilitado');
      b.click(); return true;
    },
    focarPeca: function(id){ var c=window.__J.peca(id); if(!c) throw new Error('sem card '+id);
      var b=c.querySelector('button'); if(!b) throw new Error('card '+id+' sem botão'); b.focus(); return true; },
    card: function(id){ var c=window.__J.peca(id); if(!c) return null;
      return { cls:c.className, nome:(c.querySelector('.sic-name')||{}).textContent,
        preco:(c.querySelector('.sic-price')||{}).textContent.trim(),
        botao:(c.querySelector('.sic-btn')||{}).textContent.trim(),
        travado:!!(c.querySelector('.sic-btn')||{}).disabled,
        desenho:!!c.querySelector('.sic-peca svg') }; },
    vitrine: function(){ return Array.prototype.slice.call(document.querySelectorAll('#shopGrid [data-peca]'))
      .map(function(c){ return c.getAttribute('data-peca'); }); },
    slots: function(){ return Array.prototype.slice.call(document.querySelectorAll('#wdSlots .wd-slot'))
      .map(function(li){ return { rotulo:(li.querySelector('.ws-rotulo')||{}).textContent,
        peca:(li.querySelector('.ws-peca')||{}).textContent, posto:li.classList.contains('posto'),
        tirar:!!li.querySelector('.ws-tirar') }; }); },
    aviso: function(){ return Array.prototype.slice.call(document.querySelectorAll('.toast')).map(function(t){return t.textContent;}); },
    save: function(chave){ try{ return JSON.parse(localStorage.getItem(chave||CM_CONTAS.chaveDoSave())||'null'); }catch(e){ return null; } }
  };
  return true;
})()`;

async function tela(c) { return avaliar(c, 'window.__J.tela()'); }
async function clicar(c, sel, texto) { await avaliar(c, `window.__J.clicar(${JSON.stringify(sel)},${JSON.stringify(texto)})`); }
async function texto(c, id) { return avaliar(c, `window.__J.texto(${JSON.stringify(id)})`); }
async function boneco(c, sel) { return avaliar(c, `window.__J.boneco(${JSON.stringify(sel)})`); }

/* A transição entre perguntas é um setTimeout do jogo (1,8 s no quiz, 2,6 s no
   verdadeiro/falso). Esperar a CONDIÇÃO, com teto, em vez de um número fixo de
   milissegundos: o teste não pode depender da velocidade desta máquina. */
async function esperarPor(c, expressao, teto) {
  const limite = teto || 20000;
  const t0 = Date.now();
  for (;;) {
    if (await avaliar(c, '!!(' + expressao + ')')) return true;
    if (Date.now() - t0 > limite) return false;
    await espera(120);
  }
}
async function main() {
  await nav.portaLivre();
  nav.subir();
  const alvo = await nav.alvo();
  const c = await conectar(alvo.webSocketDebuggerUrl);
  conexao = c;
  await c.chamar('Page.enable');
  await c.chamar('Runtime.enable');
  await c.chamar('Log.enable');
  /* Sem a aba ativa o Chromium não dispara focusin/focusout: o experimentar-peça
     do guarda-roupa é ligado por foco, e num navegador sem foco ele nunca roda.
     Trazer a página para frente é o que torna o evento de foco verdadeiro. */
  await c.chamar('Page.bringToFront');

  await abrir(c, 390, 844, BASE);
  await avaliar(c, 'localStorage.clear();sessionStorage.clear();true');
  await abrir(c, 390, 844, BASE);
  await espera(500);
  await avaliar(c, dentro);

  /* O cartão da pergunta entra com slideUp e cada alternativa com um popIn
     atrasado (até 0,5 s no total, opacity 0 no preenchimento "backwards").
     Esperar só o número da pergunta — ou só a primeira alternativa — faria o
     teste clicar num botão que ainda não desenhou: a prontidão é TODAS visíveis
     e livres. */
  const esperaQuiz = (n) => esperarPor(c,
    `window.__J.texto('quizProg')==='${n}/5' && !document.getElementById('quizFeedback').classList.contains('show')`
    + ` && window.__J.alternativas().length>0 && window.__J.alternativas().every(function(a){return a.livre;})`
    + ` && Array.prototype.slice.call(document.querySelectorAll('#quizAnswers .ans-btn')).every(function(b){return window.__J.vis(b);})`);
  const esperaTF = (n) => esperarPor(c,
    `window.__J.texto('tfProg')==='${n}/5' && !document.getElementById('tfFeedback').classList.contains('show')`
    + ` && window.__J.vis(document.querySelector('.btn-tf')) && !document.querySelector('.btn-tf').disabled`);
  const esperaResumo = () => esperarPor(c, "window.__J.aberto('modalLevelUp')");

  // ── 1. o hub abre e o ano/nível são escolhidos pelos chips de verdade ──
  // O aviso de dados vive na tela de abertura: depois do Jogar ele já não está
  // visível, então quem o dispensa tem de fazê-lo antes de sair do splash.
  if (await avaliar(c, "!document.getElementById('avisoDados').hidden")) {
    await clicar(c, '#avisoDados', 'Entendi');
    await espera(200);
  }
  await avaliar(c, "document.getElementById('btnPlay').click()");
  await espera(500);
  confere('Jogar leva ao hub', (await tela(c)) === 'screenHub', await tela(c));
  await clicar(c, '#chipsAno', '2º');
  await espera(250);
  confere('chip de ano muda o conteúdo', (await avaliar(c, 'G.ano')) === 2);
  confere('chip de ano aparece no hub', (await texto(c, 'hubAno')) === '2º', await texto(c, 'hubAno'));
  confere('ano escolhido fica guardado', (await avaliar(c, 'window.__J.save().ano')) === 2);
  await clicar(c, '#chipsNivel', 'Base');
  await espera(250);
  confere('chip de nível volta ao primeiro degrau', (await avaliar(c, 'G.nivel')) === 1);
  confere('descrição do nível explica o degrau em vez de só nomeá-lo',
    ((await texto(c, 'nivelDescricao')) || '').length > 30, await texto(c, 'nivelDescricao'));

  // ── 2. a explicação entra no caminho antes da primeira partida ──
  await avaliar(c, "document.querySelector('.mode-card.mc-quiz').click()");
  await espera(400);
  confere('a primeira partida abre o como-se-joga', await avaliar(c, "window.__J.aberto('modalTuto')"));
  confere('o tutorial ainda não começou o jogo', (await tela(c)) === 'screenHub', await tela(c));
  confere('tutorial diz de qual jogo é', /Como se joga/.test((await texto(c, 'tutoTituloText')) || ''), await texto(c, 'tutoTituloText'));
  confere('tutorial tem corpo escrito', ((await texto(c, 'tutoCorpo')) || '').length > 80);
  confere('tutorial oferece jogar e voltar',
    (await avaliar(c, "window.__J.botoes('#tutoAcoes')")).join('|').indexOf('Começar a jogar') >= 0,
    await avaliar(c, "window.__J.botoes('#tutoAcoes')"));
  await clicar(c, '#tutoAcoes', 'Começar a jogar');
  await espera(400);
  confere('tutorial fecha e o quiz começa', (await tela(c)) === 'screenQuiz', await tela(c));
  confere('tutorial fica marcado como visto', (await avaliar(c, 'G.comoJogarVisto.quiz')) === true);
  confere('as quatro alternativas desenham antes de qualquer clique', await esperaQuiz(1));
  confere('pergunta escrita na tela', ((await texto(c, 'quizText')) || '').length > 10, await texto(c, 'quizText'));
  confere('progresso da rodada começa em 1/5', (await texto(c, 'quizProg')) === '1/5', await texto(c, 'quizProg'));
  confere('cartão diz o ano e o degrau', /2º ano · Base/.test((await texto(c, 'quizDiff')) || ''), await texto(c, 'quizDiff'));
  const alt0 = await avaliar(c, 'window.__J.alternativas()');
  confere('alternativas visíveis e clicáveis', alt0.length >= 2 && alt0.every((a) => a.livre), alt0);
  confere('nenhuma alternativa já vem marcada', alt0.every((a) => !/correct|wrong|reveal/.test(a.cls)), alt0);

  // ── 3. acertar soma estrela, sequência e histórico do conteúdo ──
  const antes = await avaliar(c, '({stars:G.stars,jogo:window.__J.jogo(),acertos:G.totalCorrect,seq:G.streak,rodada:G.roundCorrect,feitas:G.roundTotal})');
  const conteudo1 = await avaliar(c, 'G.currentQ.o');
  await avaliar(c, 'window.__J.responder(true)');
  await espera(200);
  const depois = await avaliar(c, '({stars:G.stars,jogo:window.__J.jogo(),acertos:G.totalCorrect,seq:G.streak,rodada:G.roundCorrect,feitas:G.roundTotal,roundStars:G.roundStars})');
  confere('acerto vale 10 estrelas no quiz', depois.jogo - antes.jogo === 10, { antes, depois });
  confere('acerto conta no total e na rodada', depois.acertos === antes.acertos + 1 && depois.rodada === antes.rodada + 1, depois);
  confere('acerto aumenta a sequência', depois.seq === antes.seq + 1, depois);
  confere('barra de estrelas do quiz acompanha', (await texto(c, 'quizStarsBar')) === (await avaliar(c, 'numBR(G.stars)')));
  const alt1 = await avaliar(c, 'window.__J.alternativas()');
  confere('a alternativa certa fica marcada e todas travam',
    alt1.some((a) => /correct/.test(a.cls)) && alt1.every((a) => !a.livre), alt1);
  confere('o retorno aparece escrito na tela',
    await avaliar(c, "document.getElementById('quizFeedback').classList.contains('show') && window.__J.vis(document.getElementById('quizFeedbackMsg')) && window.__J.texto('quizFeedbackMsg').length>3"),
    await texto(c, 'quizFeedbackMsg'));
  confere('a bolinha da questão vira acerto', /done/.test(await avaliar(c, 'window.__J.bolinha(0)')), await avaliar(c, 'window.__J.bolinha(0)'));
  confere('o conteúdo praticado entra no histórico',
    (await avaliar(c, `JSON.stringify(G.hist[${JSON.stringify(conteudo1)}])`)) === '{"feitas":1,"certas":1}',
    await avaliar(c, `G.hist[${JSON.stringify(conteudo1)}]`));
  confere('acerto é gravado na hora', (await avaliar(c, 'window.__J.save().stars')) === depois.stars);
  confere('acerto entra na lista de conteúdos praticados', (await avaliar(c, 'G.aprendidas.indexOf(' + JSON.stringify(conteudo1) + ')')) >= 0);
  confere('resumo da rodada ainda não abriu', !(await avaliar(c, "window.__J.aberto('modalLevelUp')")));
  confere('passou para a segunda pergunta', await esperaQuiz(2));

  // ── 4. errar ensina antes de punir ──
  const antesErro = await avaliar(c, '({stars:G.stars,seq:G.streak,feitas:G.roundTotal,rodada:G.roundCorrect})');
  const q2 = await avaliar(c, '({o:G.currentQ.o,alt:G.currentQ.alt,visual:!!G.currentQ.visual,exp:G.currentQ.exp||""})');
  const histAntes = await avaliar(c, `JSON.stringify(G.hist[${JSON.stringify(q2.o)}]||{feitas:0,certas:0})`);
  await avaliar(c, 'window.__J.responder(false)');
  await espera(200);
  confere('primeiro erro não tira estrela', (await avaliar(c, 'G.stars')) === antesErro.stars);
  confere('primeiro erro não quebra a sequência', (await avaliar(c, 'G.streak')) === antesErro.seq);
  confere('primeiro erro não encerra a questão', (await avaliar(c, 'G.roundTotal')) === antesErro.feitas && (await avaliar(c, 'quizTentativas')) === 1);
  const pista = await texto(c, 'quizFeedbackMsg');
  confere('primeiro erro devolve uma pista, não a resposta',
    (pista || '').length > 10 && !/A resposta certa é/.test(pista), pista);
  const alt2 = await avaliar(c, 'window.__J.alternativas()');
  confere('a alternativa errada fica marcada e travada',
    alt2.some((a) => /wrong/.test(a.cls) && !a.livre), alt2);
  confere('as outras continuam abertas para tentar de novo', alt2.filter((a) => a.livre).length >= 1, alt2);
  confere('a resposta certa ainda não foi revelada', (await avaliar(c, 'window.__J.realcada()')) === null);

  await avaliar(c, 'window.__J.responder(false)');
  await espera(200);
  if (q2.visual) {
    confere('segundo erro desenha a situação antes de dar a resposta',
      await avaliar(c, "(function(){var v=document.getElementById('quizVisual');return !v.hidden && window.__J.vis(v) && v.querySelectorAll('.cv-corpo *').length>0;})()"));
    confere('o desenho vem com legenda que ensina a ler',
      /Olhe o desenho/.test((await texto(c, 'quizFeedbackMsg')) || '') && ((await texto(c, 'quizFeedbackMsg')) || '').length > 40,
      await texto(c, 'quizFeedbackMsg'));
    confere('o desenho não entrega o resultado', (await avaliar(c, 'window.__J.realcada()')) === null);
    confere('com o desenho na mão ainda dá para tentar', (await avaliar(c, 'window.__J.alternativas()')).some((a) => a.livre));
    await avaliar(c, 'window.__J.responder(false)');
    await espera(200);
  }
  const alt3 = await avaliar(c, 'window.__J.alternativas()');
  confere('no fim todas as alternativas travam', alt3.every((a) => !a.livre), alt3);
  confere('a resposta certa é revelada na tela', (await avaliar(c, 'window.__J.realcada()')) === String(q2.alt[0]),
    { revelada: await avaliar(c, 'window.__J.realcada()'), certa: q2.alt[0] });
  confere('erro zera a sequência', (await avaliar(c, 'G.streak')) === 0);
  confere('erro conta como questão respondida', (await avaliar(c, 'G.roundTotal')) === antesErro.feitas + 1);
  confere('erro não dá estrela', (await avaliar(c, 'G.stars')) === antesErro.stars);
  const explicacao = await texto(c, 'quizFeedbackMsg');
  confere('o erro explica a resposta e nomeia o conteúdo',
    (explicacao || '').indexOf('A resposta certa é ' + q2.alt[0]) === 0 && (explicacao || '').indexOf(q2.o.charAt(0).toLowerCase() + q2.o.slice(1)) > 0 &&
    (!q2.exp || (explicacao || '').indexOf(q2.exp) > 0),
    { explicacao, esperada: q2.alt[0], conteudo: q2.o });
  confere('o desenho sai da tela depois da resposta', await avaliar(c, "document.getElementById('quizVisual').hidden"));
  const histDepois = JSON.parse(await avaliar(c, `JSON.stringify(G.hist[${JSON.stringify(q2.o)}]||{feitas:0,certas:0})`));
  confere('o erro entra no histórico sem virar acerto',
    histDepois.feitas === JSON.parse(histAntes).feitas + 1 && histDepois.certas === JSON.parse(histAntes).certas,
    { histAntes, histDepois });
  confere('a bolinha da questão vira erro', /wrong/.test(await avaliar(c, 'window.__J.bolinha(1)')), await avaliar(c, 'window.__J.bolinha(1)'));
  const reforco = await avaliar(c, 'filaQuiz.length');
  if (reforco) {
    confere('a consolidação é do mesmo conteúdo, com outros números',
      (await avaliar(c, 'filaQuiz[0].o')) === q2.o, await avaliar(c, '({fila:filaQuiz[0].o,original:G.currentQ.o})'));
    confere('o aviso diz que vem uma parecida', /parecida/.test((await texto(c, 'quizFeedbackMsg')) || ''));
  }
  confere('a revelação espera a leitura: botão Continuar visível e questão parada',
    await avaliar(c, "(function(){var b=document.getElementById('quizContinuar');return !b.hidden && window.__J.vis(b) && G.quizIndex===1;})()"));
  await avaliar(c, "document.getElementById('quizContinuar').click()");
  confere('passou para a terceira pergunta', await esperaQuiz(3));
  if (reforco) confere('a questão de consolidação entrou no lugar da próxima', (await avaliar(c, 'G.currentQ.o')) === q2.o);

  // ── 5. a rodada termina dizendo o que foi praticado ──
  const antesFim = await avaliar(c, '({stars:G.stars,jogo:window.__J.jogo(),nivel:G.nivel,rodada:G.roundCorrect})');
  for (let i = 0; i < 3; i++) {
    await avaliar(c, 'window.__J.responder(true)');
    if (i < 2) confere('avançou para a pergunta ' + (4 + i), await esperaQuiz(4 + i));
  }
  confere('a rodada abre o resumo', await esperaResumo());
  confere('resumo aparece de verdade na tela', await esperarPor(c,
    "Number(getComputedStyle(document.getElementById('modalLevelUp')).opacity)>0.9", 6000));
  confere('resumo celebra sem esconder o resultado', (await texto(c, 'luTitulo')) === 'Rodada concluída!', await texto(c, 'luTitulo'));
  const estrelasFim = await avaliar(c, 'G.stars');
  const jogoFim = await avaliar(c, 'window.__J.jogo()');
  confere('quatro acertos em cinco dão bônus de 10', jogoFim - antesFim.jogo === 30 + 10,
    { antes: antesFim.jogo, depois: jogoFim, saldo: estrelasFim, acertos: await avaliar(c, 'G.roundCorrect') });
  confere('resumo mostra as estrelas ganhas e o bônus',
    /\+\d+/.test((await texto(c, 'luStarsText')) || '') && /bônus/.test((await texto(c, 'luStarsText')) || ''),
    await texto(c, 'luStarsText'));
  confere('resumo lista os conteúdos praticados',
    /^Você praticou: /.test((await texto(c, 'luConteudo')) || '') && (await texto(c, 'luConteudo')).length > 20,
    await texto(c, 'luConteudo'));
  confere('resumo explica por que o degrau ficou onde está',
    /Fica no Base/.test((await texto(c, 'luPhaseText')) || ''), await texto(c, 'luPhaseText'));
  confere('quatro em cinco não sobe o degrau', (await avaliar(c, 'G.nivel')) === antesFim.nivel);
  confere('a Juba do resumo está desenhada', (await boneco(c, '.lu-onca')).nos > 20, await boneco(c, '.lu-onca'));
  await clicar(c, '#modalLevelUp', 'Continuar');
  await espera(300);
  confere('resumo fecha e devolve ao jogo', !(await avaliar(c, "window.__J.aberto('modalLevelUp')")));

  // ── 6. rodada inteira sobe o degrau e o jogo avisa ──
  await avaliar(c, 'goHub()');
  await espera(400);
  await avaliar(c, "startMode('quiz')");
  await espera(400);
  confere('na segunda vez o jogo começa direto, sem repetir a explicação',
    (await tela(c)) === 'screenQuiz' && !(await avaliar(c, "window.__J.aberto('modalTuto')")), await tela(c));
  const antesSubida = await avaliar(c, '({stars:G.stars,jogo:window.__J.jogo(),metas:window.__metasPagas,nivel:G.nivel})');
  for (let i = 0; i < 5; i++) {
    await avaliar(c, 'window.__J.responder(true)');
    if (i < 4) confere('rodada inteira: pergunta ' + (i + 2), await esperaQuiz(i + 2));
  }
  confere('rodada inteira abre o resumo', await esperaResumo());
  confere('cinco acertos sobem o degrau', (await avaliar(c, 'G.nivel')) === antesSubida.nivel + 1,
    { antes: antesSubida.nivel, depois: await avaliar(c, 'G.nivel') });
  confere('o jogo explica que o próximo degrau vem mais difícil',
    /mais difícil/.test((await texto(c, 'luPhaseText')) || '') && /→/.test((await texto(c, 'luPhaseText')) || ''),
    await texto(c, 'luPhaseText'));
  const depoisSubida = await avaliar(c, '({stars:G.stars,jogo:window.__J.jogo(),metas:window.__metasPagas})');
  confere('rodada inteira dá bônus de 25', depoisSubida.jogo - antesSubida.jogo === 50 + 25, { antesSubida, depoisSubida });
  confere('o saldo é o que o jogo pagou mais o que as metas pagaram, nada além',
    depoisSubida.stars - antesSubida.stars === (depoisSubida.jogo - antesSubida.jogo) + (depoisSubida.metas - antesSubida.metas),
    { antesSubida, depoisSubida });
  await clicar(c, '#modalLevelUp', 'Continuar');
  await espera(300);

  // ── 7. a loja abre com o catálogo inteiro e preço honesto ──
  await avaliar(c, 'goHub()');
  await espera(400);
  confere('o hub mostra o degrau novo depois da rodada', (await texto(c, 'hubNivel')) === 'Prática', await texto(c, 'hubNivel'));
  await avaliar(c, "document.querySelector('.bha-shop').click()");
  await espera(500);
  confere('guarda-roupa abre', await avaliar(c, "window.__J.aberto('modalShop')"));
  confere('o saldo da loja é o saldo do jogo', (await texto(c, 'shopCoins')) === (await avaliar(c, 'numBR(G.stars)')),
    { loja: await texto(c, 'shopCoins'), jogo: await avaliar(c, 'G.stars') });
  const abas = await avaliar(c, "window.__J.botoes('#shopTabs')");
  confere('uma aba por categoria do catálogo', abas.length === (await avaliar(c, 'GR.abas.length')), abas);
  confere('a primeira aba nasce ativa', await avaliar(c, "document.querySelector('#shopTabs .stab').classList.contains('active')"));
  const totalItens = await avaliar(c, 'GR.itens.length');
  confere('a aba Tudo mostra o catálogo inteiro', (await avaliar(c, 'window.__J.vitrine()')).length === totalItens,
    { naGrade: (await avaliar(c, 'window.__J.vitrine()')).length, catalogo: totalItens });
  const semDesenho = await avaliar(c, "window.__J.vitrine().filter(function(id){return !window.__J.card(id).desenho;})");
  confere('toda peça à venda tem desenho na vitrine', semDesenho.length === 0, semDesenho);
  const semNome = await avaliar(c, "window.__J.vitrine().filter(function(id){var c=window.__J.card(id);return !c.nome||!c.preco;})");
  confere('toda peça tem nome e preço escritos', semNome.length === 0, semNome);
  const caro = await avaliar(c, "GR.itens.slice().sort(function(a,b){return b.price-a.price;})[0].id");
  const cardCaro = await avaliar(c, `window.__J.card(${JSON.stringify(caro)})`);
  confere('o que não dá para comprar aparece travado, com o preço à vista',
    cardCaro.travado && /lock/.test(await avaliar(c, `window.__J.peca(${JSON.stringify(caro)}).querySelector('.sic-btn').innerHTML`))
    && cardCaro.preco.indexOf('Possuído') < 0, cardCaro);
  await clicar(c, '#shopTabs', 'Chapéus');
  await espera(250);
  const soChapeus = await avaliar(c, "window.__J.vitrine().every(function(id){return GR.porId(id).cat==='hat';})");
  confere('a aba filtra de verdade', soChapeus && (await avaliar(c, 'window.__J.vitrine()')).length > 0);
  confere('a aba clicada fica marcada', await avaliar(c,
    "(function(){var a=document.querySelector('#shopTabs .stab.active');return a && a.textContent.indexOf('Chapéus')>=0;})()"));
  await clicar(c, '#shopTabs', 'Meus itens');
  await espera(250);
  confere('sem compra a caixa aparece vazia, com o que fazer para enchê-la',
    (await avaliar(c, 'window.__J.vitrine()')).length === 0
    && /Jogue uma rodada/.test((await texto(c, 'shopGrid')) || ''), await texto(c, 'shopGrid'));
  await clicar(c, '#shopTabs', 'Tudo');
  await espera(250);

  // ── 8. comprar desconta estrela e entrega a peça ──
  const barato = await avaliar(c, "GR.itens.slice().sort(function(a,b){return a.price-b.price;})[0].id");
  const precoBarato = await avaliar(c, `GR.porId(${JSON.stringify(barato)}).price`);
  const saldoAntes = await avaliar(c, 'G.stars');
  await avaliar(c, `window.__J.clicarPeca(${JSON.stringify(barato)},'Comprar')`);
  await espera(300);
  confere('comprar desconta exatamente o preço', (await avaliar(c, 'G.stars')) === saldoAntes - precoBarato,
    { antes: saldoAntes, preco: precoBarato, depois: await avaliar(c, 'G.stars') });
  confere('a peça entra na caixa', (await avaliar(c, `G.owned.indexOf(${JSON.stringify(barato)})`)) >= 0);
  confere('a compra é gravada na hora', (await avaliar(c, `window.__J.save().owned.indexOf(${JSON.stringify(barato)})`)) >= 0);
  confere('o saldo da loja é repintado', (await texto(c, 'shopCoins')) === (await avaliar(c, 'numBR(G.stars)')));
  const cardComprado = await avaliar(c, `window.__J.card(${JSON.stringify(barato)})`);
  confere('o card passa a dizer Possuído e oferece Vestir',
    /owned/.test(cardComprado.cls) && /Possuído/.test(cardComprado.preco) && /Vestir/.test(cardComprado.botao), cardComprado);
  confere('a compra avisa o que foi comprado',
    (await avaliar(c, 'window.__J.aviso()')).some((t) => t.indexOf('Comprado') === 0), await avaliar(c, 'window.__J.aviso()'));
  confere('o hub também mostra o saldo novo', (await texto(c, 'hubStars')) === (await avaliar(c, 'numBR(G.stars)')));

  // ── 9. vestir aparece na Juba, não só no card ──
  const slotBarato = await avaliar(c, `GR.porId(${JSON.stringify(barato)}).slot`);
  const nomeBarato = await avaliar(c, `GR.porId(${JSON.stringify(barato)}).name`);
  const palcoAntes = await boneco(c, '#wdMascote');
  const hubAntes = await boneco(c, '#oncaDisplay');
  confere('antes de vestir, a Juba está só de pelo e bandana',
    /só de pelo e bandana azul/.test(palcoAntes.rotulo), palcoAntes);
  await avaliar(c, `window.__J.clicarPeca(${JSON.stringify(barato)},'Vestir')`);
  await espera(350);
  confere('vestir ocupa o slot certo', (await avaliar(c, `G.equip[${JSON.stringify(slotBarato)}]`)) === barato);
  const palcoDepois = await boneco(c, '#wdMascote');
  confere('a peça entrou no desenho do palco', palcoDepois.nos > palcoAntes.nos && palcoDepois.peso > palcoAntes.peso,
    { antes: palcoAntes, depois: palcoDepois });
  confere('o palco diz em voz alta o que ela está vestindo', palcoDepois.rotulo.indexOf(nomeBarato) >= 0, palcoDepois.rotulo);
  confere('a chave do desenho mudou com a roupa', palcoDepois.chave !== palcoAntes.chave && palcoDepois.chave.indexOf(barato) >= 0,
    { antes: palcoAntes.chave, depois: palcoDepois.chave });
  const hubDepois = await boneco(c, '#oncaDisplay');
  confere('a Juba do hub veste a mesma peça', hubDepois.rotulo.indexOf(nomeBarato) >= 0 && hubDepois.nos > hubAntes.nos,
    { antes: hubAntes, depois: hubDepois });
  const lista = await avaliar(c, 'window.__J.slots()');
  confere('a lista de slots tem um lugar por peça do catálogo', lista.length === (await avaliar(c, 'GR.slots.length')), lista);
  const linhaCerta = lista.find((l) => l.peca === nomeBarato);
  confere('o slot vestido mostra o nome da peça e o botão de tirar',
    !!linhaCerta && linhaCerta.posto && linhaCerta.tirar, lista);
  confere('os outros slots continuam dizendo nada', lista.filter((l) => l.peca === 'nada').length === lista.length - 1, lista);
  confere('vestir é gravado na hora', (await avaliar(c, `window.__J.save().equip[${JSON.stringify(slotBarato)}]`)) === barato);
  confere('vestir avisa o que foi vestido',
    (await avaliar(c, 'window.__J.aviso()')).some((t) => t.indexOf(nomeBarato + ' vestido') === 0), await avaliar(c, 'window.__J.aviso()'));
  const cardVestido = await avaliar(c, `window.__J.card(${JSON.stringify(barato)})`);
  confere('o card passa a oferecer Tirar', /equipped/.test(cardVestido.cls) && /Tirar/.test(cardVestido.botao), cardVestido);

  // ── 10. experimentar não compra nem grava ──
  const outra = await avaliar(c, `GR.itens.filter(function(i){return i.slot!==${JSON.stringify(slotBarato)} && i.tipo!=='conjunto';})[0].id`);
  const nomeOutra = await avaliar(c, `GR.porId(${JSON.stringify(outra)}).name`);
  const saldoProva = await avaliar(c, 'G.stars');
  const equipProva = await avaliar(c, 'JSON.stringify(G.equip)');
  await avaliar(c, `window.__J.focarPeca(${JSON.stringify(outra)})`);
  await espera(300);
  confere('passar o foco pelo card avisa que é só experiência',
    await avaliar(c, "(function(){var a=document.getElementById('wdProva');return !a.hidden && window.__J.vis(a) && a.textContent.indexOf('Experimentando')===0;})()"),
    await texto(c, 'wdProva'));
  const palcoProva = await boneco(c, '#wdMascote');
  confere('a peça experimentada aparece no palco', palcoProva.rotulo.indexOf(nomeOutra) >= 0, palcoProva.rotulo);
  confere('experimentar continua vestindo o que já era dela', palcoProva.rotulo.indexOf(nomeBarato) >= 0, palcoProva.rotulo);
  confere('experimentar não gasta estrela', (await avaliar(c, 'G.stars')) === saldoProva);
  confere('experimentar não compra a peça', (await avaliar(c, `G.owned.indexOf(${JSON.stringify(outra)})`)) < 0);
  confere('experimentar não grava no save', (await avaliar(c, 'JSON.stringify(G.equip)')) === equipProva
    && (await avaliar(c, `window.__J.save().equip[${JSON.stringify(slotBarato)}]`)) === barato);
  await avaliar(c, "document.querySelector('#modalShop .btn-close-modal').focus()");
  await espera(300);
  confere('tirar o foco devolve o palco ao figurino de verdade',
    (await boneco(c, '#wdMascote')).rotulo.indexOf(nomeOutra) < 0
    && await avaliar(c, "document.getElementById('wdProva').hidden"), await boneco(c, '#wdMascote'));

  // ── 11. máscara e óculos disputam o mesmo rosto ──
  await avaliar(c, 'G.stars+=400;saveState();openShop()');
  await espera(400);
  const mascara = await avaliar(c, "GR.itens.filter(function(i){return i.cat==='mask';})[0].id");
  const oculos = await avaliar(c, "GR.itens.filter(function(i){return i.cat==='glasses';})[0].id");
  const nomeMascara = await avaliar(c, `GR.porId(${JSON.stringify(mascara)}).name`);
  const nomeOculos = await avaliar(c, `GR.porId(${JSON.stringify(oculos)}).name`);
  await avaliar(c, `window.__J.clicarPeca(${JSON.stringify(mascara)},'Comprar')`);
  await espera(200);
  await avaliar(c, `window.__J.clicarPeca(${JSON.stringify(mascara)},'Vestir')`);
  await espera(300);
  confere('máscara vestida ocupa o slot de máscara', (await avaliar(c, 'G.equip.mask')) === mascara);
  await avaliar(c, `window.__J.clicarPeca(${JSON.stringify(oculos)},'Comprar')`);
  await espera(200);
  await avaliar(c, `window.__J.clicarPeca(${JSON.stringify(oculos)},'Vestir')`);
  await espera(300);
  confere('óculos entram no slot deles', (await avaliar(c, 'G.equip.glasses')) === oculos);
  confere('a máscara sai para os óculos caberem', (await avaliar(c, 'G.equip.mask')) === null);
  confere('o aviso diz qual peça saiu',
    (await avaliar(c, 'window.__J.aviso()')).some((t) => t.indexOf(nomeOculos + ' vestido') === 0 && t.indexOf(nomeMascara) > 0),
    await avaliar(c, 'window.__J.aviso()'));
  const rosto = await boneco(c, '#wdMascote');
  confere('o desenho mostra os óculos e não a máscara',
    rosto.rotulo.indexOf(nomeOculos) >= 0 && rosto.rotulo.indexOf(nomeMascara) < 0, rosto.rotulo);
  confere('o save não guarda as duas peças no mesmo rosto',
    (await avaliar(c, 'window.__J.save().equip.mask')) === null && (await avaliar(c, 'window.__J.save().equip.glasses')) === oculos);

  // ── 12. tirar uma peça e guardar o figurino inteiro ──
  await avaliar(c, `window.__J.clicarPeca(${JSON.stringify(oculos)},'Tirar')`);
  await espera(300);
  confere('tirar esvazia o slot', (await avaliar(c, 'G.equip.glasses')) === null);
  confere('tirar tira a peça do desenho', (await boneco(c, '#wdMascote')).rotulo.indexOf(nomeOculos) < 0);
  confere('tirar é gravado', (await avaliar(c, 'window.__J.save().equip.glasses')) === null);
  await avaliar(c, `window.__J.clicarPeca(${JSON.stringify(oculos)},'Vestir')`);
  await espera(250);
  await clicar(c, '#modalShop', 'Tirar tudo');
  await espera(350);
  confere('tirar tudo zera os sete slots',
    (await avaliar(c, 'GR.slots.every(function(s){return !G.equip[s];})')) === true, await avaliar(c, 'G.equip'));
  confere('a Juba volta ao pelo e à bandana, no desenho e no rótulo',
    /só de pelo e bandana azul/.test((await boneco(c, '#wdMascote')).rotulo), await boneco(c, '#wdMascote'));
  confere('a lista de slots volta a dizer nada em todos',
    (await avaliar(c, 'window.__J.slots()')).every((l) => l.peca === 'nada' && !l.posto));
  confere('tirar tudo avisa para onde foi o figurino',
    (await avaliar(c, 'window.__J.aviso()')).some((t) => /Figurino guardado/.test(t)), await avaliar(c, 'window.__J.aviso()'));
  confere('as peças continuam na caixa depois de tirar tudo',
    (await avaliar(c, 'G.owned.length')) >= 3 && (await avaliar(c, `G.owned.indexOf(${JSON.stringify(barato)})`)) >= 0);
  await avaliar(c, "document.querySelector('#modalShop .btn-close-modal').click()");
  await espera(300);
  confere('fechar a loja volta ao hub', !(await avaliar(c, "window.__J.aberto('modalShop')")) && (await tela(c)) === 'screenHub', await tela(c));

  // ── 13. outro jogo usa a mesma régua e também explica o erro ──
  await avaliar(c, "startMode('truefalse')");
  await espera(400);
  confere('o verdadeiro/falso também explica antes de começar', await avaliar(c, "window.__J.aberto('modalTuto')"));
  await clicar(c, '#tutoAcoes', 'Começar a jogar');
  await espera(500);
  confere('verdadeiro/falso abre na tela dele', (await tela(c)) === 'screenTrueFalse', await tela(c));
  confere('afirmação escrita na tela', ((await texto(c, 'tfEquation')) || '').length > 5, await texto(c, 'tfEquation'));
  const antesTF = await avaliar(c, '({stars:G.stars,jogo:window.__J.jogo(),seq:G.streak})');
  await avaliar(c, 'window.__J.tf(true)');
  await espera(250);
  confere('acerto no verdadeiro/falso vale a mesma estrela', (await avaliar(c, 'window.__J.jogo()')) - antesTF.jogo === 10);
  confere('o retorno do verdadeiro/falso aparece',
    await avaliar(c, "document.getElementById('tfFeedback').classList.contains('show') && window.__J.texto('tfFeedbackMsg').length>3"));
  confere('os dois botões travam depois da resposta', await avaliar(c,
    "Array.prototype.slice.call(document.querySelectorAll('.btn-tf')).every(function(b){return b.disabled;})"));
  confere('passou para a segunda afirmação', await esperaTF(2));
  const erradaTF = await avaliar(c, '({explicacao:tfAtual.explicacao,certa:tfAtual.certa})');
  await avaliar(c, 'window.__J.tf(false)');
  await espera(250);
  const falaTF = await texto(c, 'tfFeedbackMsg');
  confere('o erro diz se era verdadeiro ou falso e explica por quê',
    (falaTF || '').indexOf(erradaTF.certa ? 'Verdadeiro. ' : 'Falso. ') === 0
    && (falaTF || '').indexOf(erradaTF.explicacao) > 0 && (falaTF || '').length > 20,
    { fala: falaTF, esperada: erradaTF });
  confere('erro no verdadeiro/falso zera a sequência', (await avaliar(c, 'G.streak')) === 0);
  for (let i = 3; i <= 5; i++) {
    confere('chegou na afirmação ' + i, await esperaTF(i));
    await avaliar(c, 'window.__J.tf(true)');
  }
  confere('o verdadeiro/falso também fecha a rodada com resumo', await esperaResumo());
  confere('resumo do verdadeiro/falso lista o que foi praticado',
    /^Você praticou: /.test((await texto(c, 'luConteudo')) || ''), await texto(c, 'luConteudo'));
  await clicar(c, '#modalLevelUp', 'Continuar');
  await espera(300);
  await avaliar(c, 'goHub()');
  await espera(400);

  // ── 13b. na chuva, uma questão é um registro, por mais tentativas que leve ──
  /* A resposta certa continua caindo até ser pega, então a criança pode errar
     várias vezes na mesma questão. O histórico guarda o desfecho da questão (régua
     do duelo: só é acerto se veio limpo), não cada tentativa. O movimento é parado
     para o doce não colidir sozinho; quem decide são os mesmos tratadores que a
     colisão chama. */
  await avaliar(c, "startMode('catch')");
  await espera(400);
  if (await avaliar(c, "window.__J.aberto('modalTuto')")) await clicar(c, '#tutoAcoes', 'Começar a jogar');
  confere('a chuva abre na tela dela', await esperarPor(c, "window.__J.tela()==='screenCatch' && !!G.currentQ"), await tela(c));
  const pararChuva = "(function(){clearAllGameIntervals();catchEncerrado=true;"
    + "document.querySelectorAll('.catch-item').forEach(function(e){e.remove();});return true;})()";
  const fotoChuva = '(function(){var h=G.hist[G.currentQ.o]||{feitas:0,certas:0};'
    + 'return {o:G.currentQ.o,feitas:h.feitas,certas:h.certas,stars:window.__J.jogo(),acertos:G.totalCorrect,seq:G.streak};})()';
  await avaliar(c, pararChuva);
  const chuva0 = await avaliar(c, fotoChuva);
  await avaliar(c, 'handleCatchFail(); handleCatchFail(); true');
  const chuva1 = await avaliar(c, fotoChuva);
  confere('dois doces errados na mesma questão contam um erro só',
    chuva1.feitas === chuva0.feitas + 1 && chuva1.certas === chuva0.certas, { chuva0, chuva1 });
  confere('errar na chuva zera a sequência', chuva1.seq === 0, chuva1);
  await avaliar(c, 'handleCatchWin(); true');
  const chuva2 = await avaliar(c, fotoChuva);
  confere('pegar o certo depois de errar não vira acerto no histórico',
    chuva2.feitas === chuva0.feitas + 1 && chuva2.certas === chuva0.certas, { chuva0, chuva2 });
  confere('pegar o certo depois de errar ainda dá as estrelas do jogo', chuva2.stars - chuva0.stars === 20, { chuva0, chuva2 });
  confere('pegar o certo conta nas respostas certas', chuva2.acertos === chuva0.acertos + 1, { chuva0, chuva2 });
  confere('a chuva passa para a segunda questão',
    await esperarPor(c, "window.__J.texto('catchProg')==='2/5'"), await texto(c, 'catchProg'));
  await avaliar(c, pararChuva);
  const chuva3 = await avaliar(c, fotoChuva);
  await avaliar(c, 'handleCatchWin(); true');
  const chuva4 = await avaliar(c, fotoChuva);
  confere('acerto limpo na chuva entra uma vez no histórico',
    chuva4.feitas === chuva3.feitas + 1 && chuva4.certas === chuva3.certas + 1, { chuva3, chuva4 });
  await esperarPor(c, "window.__J.texto('catchProg')==='3/5'");
  await avaliar(c, pararChuva);
  await avaliar(c, 'goHub()');
  await espera(400);

  // ── 13c. as metas contam o mesmo que o histórico, sem tocar nele ──
  /* O teste começou com o storage limpo e tudo foi jogado hoje: cada desfecho que
     entrou em G.hist tem de ter entrado uma vez nas metas do dia e da semana.
     Elas ficam num campo próprio do save, fora do formato de hist. */
  const metas = await avaliar(c, `(function(){
    var f=0,k=0; Object.keys(G.hist).forEach(function(n){ f+=G.hist[n].feitas; k+=G.hist[n].certas; });
    var s=window.__J.save();
    return { feitas:f, certas:k, m:G.metas, hoje:CM_METAS.diaLocal(Date.now()),
      semana:CM_METAS.semanaLocal(Date.now()), salvo:s&&s.metas, histSalvo:s&&s.hist,
      formatoHist:Object.keys(G.hist).every(function(n){ return Object.keys(G.hist[n]).sort().join()==='certas,feitas'; }) };
  })()`);
  confere('cada questão do histórico entrou uma vez nas metas do dia',
    metas.m.dia.respostas === metas.feitas && metas.m.dia.acertos === metas.certas && metas.feitas > 0,
    { hist: [metas.feitas, metas.certas], dia: [metas.m.dia.respostas, metas.m.dia.acertos] });
  confere('a semana soma o mesmo que o dia no primeiro dia',
    metas.m.semana.respostas === metas.m.dia.respostas && metas.m.semana.chave === metas.semana, metas.m.semana);
  confere('o placar por unidade fecha com o total do dia',
    Object.keys(metas.m.dia.porUnidade).reduce(function (t, u) { return t + metas.m.dia.porUnidade[u].feitas; }, 0) === metas.m.dia.respostas,
    metas.m.dia.porUnidade);
  confere('hoje virou dia de atividade, uma vez só', JSON.stringify(metas.m.dias) === JSON.stringify([metas.hoje]), metas.m.dias);
  confere('as rodadas fechadas entraram nas metas (quiz, degrau e verdadeiro/falso)', metas.m.dia.rodadas >= 3, metas.m.dia);
  confere('as metas são gravadas no save do estudante', JSON.stringify(metas.salvo) === JSON.stringify(metas.m),
    { salvo: metas.salvo, memoria: metas.m });
  confere('o histórico continua no formato { feitas, certas }', metas.formatoHist);

  // ── 13d. sequência de dias: hub, Recordes e marco de 3 dias ──
  /* Hoje já contou (as rodadas acima). A ficha do hub aparece no celular, os
     Recordes separam acertos seguidos de dias seguidos, e um marco é pago uma vez. */
  await avaliar(c, 'updateHubUI(); true');
  confere('com o dia de hoje contado, a ficha de dias aparece no hub',
    await avaliar(c, "window.__J.vis(document.getElementById('hubDias'))") && (await texto(c, 'hubDiasVal')) === '1 dia',
    await texto(c, 'hubDiasVal'));
  confere('a ficha de dias se apresenta ao leitor de tela',
    /Dias seguidos estudando/.test(await avaliar(c, "document.getElementById('hubDias').textContent")));
  await avaliar(c, "openModal('modalRecords')");
  await espera(300);
  const recs = await avaliar(c, `({dias:window.__J.texto('recDias'), recorde:window.__J.texto('recDiasRecorde'),
    acertos:window.__J.texto('recStreak'), melhor:G.bestStreak,
    rotulos:Array.prototype.slice.call(document.querySelectorAll('#modalRecords .rc-label')).map(function(e){return e.textContent;}),
    nota:window.__J.texto('recDiasNota')})`);
  confere('Recordes mostram os dias seguidos e o recorde', recs.dias === '1' && recs.recorde === '1', recs);
  confere('Recordes distinguem acertos seguidos de dias seguidos',
    recs.rotulos.indexOf('Acertos seguidos') >= 0 && recs.rotulos.indexOf('Dias seguidos') >= 0
    && recs.rotulos.indexOf('Sequência') < 0 && recs.acertos === String(recs.melhor), recs.rotulos);
  confere('a regra do dia é explicada sem culpa', /5 questões/.test(recs.nota) && /Nada se perde/.test(recs.nota), recs.nota);
  await avaliar(c, "closeModal('modalRecords')");
  /* Ontem e anteontem também foram dias de estudo (vindos do save). Hoje a
     contagem recomeça do zero e o dia passa a contar na quinta questão. */
  const marco = await avaliar(c, `(function(){
    var agora=Date.now(), dia=function(n){ return CM_METAS.diaLocal(agora - n*864e5); };
    G.metas = CM_METAS.sanitizar({ dias:[dia(2), dia(1)], marcos:[], conquistas:G.metas.conquistas }, agora);
    var antes=G.stars, toasts=[];
    for (var i=0;i<5;i++){ registrarTrabalho({o:'Sequência de dias (teste)', u:'numeros'}); registrarResultado(i<3); }
    var depois=G.stars;
    // Erros de propósito: provam que o marco não volta sem avançar missão alguma.
    for (var j=0;j<5;j++){ registrarTrabalho({o:'Sequência de dias (teste)', u:'numeros'}); registrarResultado(false); }
    saveState(); updateHubUI();
    return { ganho:depois-antes, depois:G.stars-depois, marcos:G.metas.marcos.slice(),
      seq:CM_METAS.sequencia(G.metas, agora), aviso:window.__J.aviso().join(' | '),
      ficha:window.__J.texto('hubDiasVal'), salvo:(window.__J.save().metas||{}).marcos };
  })()`);
  confere('o terceiro dia seguido paga o marco de 3 dias (+10)', marco.ganho === 10 && JSON.stringify(marco.marcos) === '[3]', marco);
  confere('o marco não é pago de novo no mesmo dia', marco.depois === 0, marco);
  confere('o marco é avisado em texto', /3 dias seguidos estudando! Ganhou 10 estrelas/.test(marco.aviso), marco.aviso);
  confere('o hub mostra 3 dias', marco.ficha === '3 dias' && marco.seq.atual === 3, marco);
  confere('o marco pago fica gravado no save', JSON.stringify(marco.salvo) === '[3]', marco.salvo);

  // ── 13e. missões: cartão no hub, pagamento único e só por acerto ──
  /* Metas zeradas hoje. Oito acertos em dois assuntos e duas rodadas boas cumprem
     as duas diárias, seja qual for o par sorteado (acertos, rodadas boas,
     assuntos); nenhuma semanal chega lá. O pagamento esperado é 2 × 15. */
  const cartao = await avaliar(c, `(function(){
    var medalhas = G.metas.conquistas; G.metas = CM_METAS.vazio(Date.now()); G.metas.conquistas = medalhas; updateHubUI();
    var lista=function(id){ return Array.prototype.slice.call(document.querySelectorAll('#'+id+' .hm-item')).map(function(li){
      var b=li.querySelector('[role=progressbar]');
      return { texto:li.querySelector('.hm-texto').textContent, conta:li.querySelector('.hm-conta').textContent,
        valor:b&&b.getAttribute('aria-valuetext'), nome:b&&b.getAttribute('aria-label') }; }); };
    return { dia:lista('missoesDia'), semana:lista('missoesSemana'), visivel:window.__J.vis(document.getElementById('hubMissoes')),
      esperado:CM_METAS.missoes(G.metas, Date.now()).map(function(m){ return m.texto; }) };
  })()`);
  confere('o cartão de missões aparece no hub', cartao.visivel);
  confere('duas missões de hoje e duas da semana', cartao.dia.length === 2 && cartao.semana.length === 2, cartao);
  confere('o cartão mostra as missões sorteadas para hoje e para a semana',
    JSON.stringify(cartao.dia.concat(cartao.semana).map((m) => m.texto)) === JSON.stringify(cartao.esperado), cartao);
  confere('cada missão tem barra acessível com nome e valor em texto',
    cartao.dia.concat(cartao.semana).every((m) => m.nome === m.texto && /^0 de \d+$/.test(m.valor) && m.conta === m.valor), cartao);
  const missoes = await avaliar(c, `(function(){
    var agora=Date.now(), antes=G.stars;
    for (var i=0;i<6;i++){ registrarTrabalho({o:'Missão (teste) '+i, u: i%2 ? 'medidas' : 'numeros'}); registrarResultado(false); }
    var aposErros=G.stars;
    for (var k=0;k<8;k++){ registrarTrabalho({o:'Missão (teste) '+k, u: k%2 ? 'medidas' : 'numeros'}); registrarResultado(true); }
    CM_METAS.registrarRodada(G.metas, {acertos:4, total:5}, agora); premiarMetas();
    CM_METAS.registrarRodada(G.metas, {acertos:3, total:5}, agora); premiarMetas();
    var pago=G.stars-antes;
    premiarMetas(); registrarTrabalho({o:'Missão (teste) x', u:'numeros'}); registrarResultado(true);
    saveState(); updateHubUI();
    return { aposErros:aposErros-antes, pago:pago, depois:G.stars-antes-pago, aviso:window.__J.aviso().join(' | '),
      pagas:G.metas.dia.pagas.slice(), semana:G.metas.semana.pagas.slice(),
      contas:Array.prototype.slice.call(document.querySelectorAll('#missoesDia .hm-conta')).map(function(e){return e.textContent.trim();}),
      salvo:(window.__J.save().metas||{}).dia.pagas, stars:G.stars };
  })()`);
  confere('seis erros não pagam missão nenhuma', missoes.aposErros === 0, missoes);
  confere('cumprir as duas diárias paga exatamente 30 estrelas', missoes.pago === 30, missoes);
  confere('missão cumprida não paga de novo', missoes.depois === 0, missoes);
  confere('as duas diárias ficam pagas e nenhuma semanal', missoes.pagas.length === 2 && missoes.semana.length === 0, missoes);
  confere('o cartão marca as duas como Concluída, com palavra e não só cor',
    missoes.contas.length === 2 && missoes.contas.every((t) => t === 'Concluída'), missoes.contas);
  confere('a missão cumprida é avisada', /Missão cumprida: .+ Ganhou 15 estrelas/.test(missoes.aviso), missoes.aviso);
  confere('as missões pagas ficam gravadas no save', JSON.stringify(missoes.salvo) === JSON.stringify(missoes.pagas), missoes);

  // ── 13f. medalhas: coleção, domínio, degrau, reforço e prova ──
  if (reforco) {
    confere('acertar a questão de reforço do quiz deu a medalha Aprendeu com o erro',
      await avaliar(c, '!!G.metas.conquistas.ganhas.reforco_1 && G.metas.conquistas.reforcos >= 1'),
      await avaliar(c, 'G.metas.conquistas'));
  }
  const medalha = await avaliar(c, `(function(){
    var agora=Date.now(), antes=G.stars, jaTinha=!!G.metas.conquistas.ganhas.dom_1;
    var base=C.sortear({ano:G.ano, nv:G.nivel, usadas:[]});
    for (var i=0;i<8;i++){ registrarTrabalho(Object.assign({}, base, {o:'Domínio (teste)'})); registrarResultado(true); }
    saveState();   // o jogo grava depois de cada resposta; aqui também
    var ganho=G.stars-antes, quando=G.metas.conquistas.ganhas.dom_1;
    var antes2=G.stars; premiarMetas(); premiarMetas();
    return { jaTinha:jaTinha, quando:quando, aviso:window.__J.aviso().join(' | '), repetido:G.stars-antes2,
      salvo:((window.__J.save().metas||{}).conquistas||{}).ganhas };
  })()`);
  confere('oito acertos no mesmo conteúdo dão a medalha Primeiro domínio', !medalha.jaTinha && medalha.quando > 0, medalha);
  confere('a medalha nova é avisada com o prêmio', /Nova medalha: Primeiro domínio! Ganhou 20 estrelas/.test(medalha.aviso), medalha.aviso);
  confere('a medalha não é paga duas vezes', medalha.repetido === 0, medalha);
  confere('a medalha fica gravada no save com a data', medalha.salvo && medalha.salvo.dom_1 === medalha.quando, medalha.salvo);
  // Escolher o nível no seletor não é subir de degrau.
  await avaliar(c, 'escolherNivel(4); true');
  confere('escolher Domínio no seletor não dá medalha de degrau',
    await avaliar(c, '!G.metas.conquistas.ganhas.degrau_3 && !G.metas.conquistas.ganhas.degrau_4 && G.metas.conquistas.degrau < 3'));
  const degrau = await avaliar(c, `(function(){
    escolherNivel(2); G.roundCorrect = 5; finishRound('quiz');
    return { nivel:G.nivel, degrau:G.metas.conquistas.degrau, ganhou:!!G.metas.conquistas.ganhas.degrau_3 };
  })()`);
  confere('fechar a rodada inteira no Prática sobe para Desafio e dá a medalha', degrau.nivel === 3 && degrau.degrau === 3 && degrau.ganhou, degrau);
  await esperaResumo();
  await espera(600);
  await clicar(c, '#modalLevelUp', 'Continuar');
  await espera(300);
  // Prova: o mesmo registro que avaliacao.js grava, e a mesma chamada.
  const prova = await avaliar(c, `(function(){
    var antes=G.stars;
    G.provas = G.provas.concat([{quando:Date.now(), duracao:300, ano:G.ano, nv:G.nivel, total:12, respondidas:12, acertos:10,
      itens:[]}]);
    premiarMetas(); saveState();
    return { ganhas:G.metas.conquistas.ganhas, estrelas:G.stars-antes };
  })()`);
  confere('prova feita até o fim com 10 de 12 dá as duas medalhas de prova',
    !!prova.ganhas.prova_1 && !!prova.ganhas.prova_boa, prova.ganhas);
  confere('medalha de prova não dá estrela', prova.estrelas === 0, prova);
  confere('o avaliacao.js chama o premiador quando a prova termina',
    await avaliar(c, "typeof window.premiarMetas === 'function'"));
  // A coleção, pelo caminho da criança: Recordes → Ver medalhas.
  await avaliar(c, "goHub(); openModal('modalRecords')");
  await espera(300);
  const botaoMedalhas = await avaliar(c, "window.__J.texto('recMedalhasConta')");
  confere('Recordes dizem quantas medalhas já foram ganhas', /^\d+ de 10$/.test(botaoMedalhas), botaoMedalhas);
  await clicar(c, '#modalRecords', 'Ver medalhas');
  await espera(400);
  const colecao = await avaliar(c, `(function(){
    var cards=Array.prototype.slice.call(document.querySelectorAll('#conqGrade .conq-card'));
    return { aberto:window.__J.aberto('modalConquistas'), total:cards.length,
      ganhas:cards.filter(function(x){return x.classList.contains('conq-ganha');}).map(function(x){
        return { nome:x.querySelector('.conq-nome').textContent, sit:x.querySelector('.conq-situacao').textContent }; }),
      bloqueadas:cards.filter(function(x){return x.classList.contains('conq-bloqueada');}).map(function(x){
        return { sit:x.querySelector('.conq-situacao').textContent, cadeado:!!x.querySelector('.fa-lock'),
          desc:x.querySelector('.conq-desc').textContent }; }),
      resumo:window.__J.texto('conqResumo'), foco:document.getElementById('modalConquistas').contains(document.activeElement),
      noEstado:Object.keys(G.metas.conquistas.ganhas).length };
  })()`);
  confere('o botão abre a coleção de medalhas', colecao.aberto && colecao.total === 10, colecao);
  confere('a coleção mostra as ganhas com a data', colecao.ganhas.length === colecao.noEstado && colecao.ganhas.length >= 4
    && colecao.ganhas.every((g) => /^Conquistada em \d{2}\/\d{2}\/\d{4}$/.test(g.sit)), colecao.ganhas);
  confere('bloqueadas dizem por escrito que faltam e quanto, com cadeado e critério',
    colecao.bloqueadas.every((b) => /^Ainda não · /.test(b.sit) && b.cadeado && b.desc.length > 20), colecao.bloqueadas);
  confere('o resumo da coleção bate com o botão de Recordes', colecao.resumo === botaoMedalhas + ' medalhas', { resumo: colecao.resumo, botaoMedalhas });
  confere('o foco do teclado entra na coleção', colecao.foco);
  await avaliar(c, "closeModal('modalConquistas'); closeModal('modalRecords'); true");

  // ── 14. recarregar: o figurino e o progresso voltam ──
  await avaliar(c, "document.querySelector('.bha-shop').click()");
  await espera(400);
  await avaliar(c, `window.__J.clicarPeca(${JSON.stringify(barato)},'Vestir')`);
  await espera(250);
  await avaliar(c, `window.__J.clicarPeca(${JSON.stringify(oculos)},'Vestir')`);
  await espera(300);
  const guardado = await avaliar(c, `({chave:CM_CONTAS.chaveDoSave(),stars:G.stars,ano:G.ano,nivel:G.nivel,
    acertos:G.totalCorrect,owned:G.owned.slice().sort(),equip:G.equip,seq:G.bestStreak,hist:Object.keys(G.hist).length,
    metas:JSON.stringify(G.metas), conquistas:JSON.stringify(G.metas.conquistas)})`);
  confere('o save do convidado fica na chave sem perfil', guardado.chave === 'candymath_v3', guardado.chave);
  confere('as duas peças estão vestidas antes de recarregar',
    guardado.equip[slotBarato] === barato && guardado.equip.glasses === oculos, guardado.equip);

  await abrir(c, 390, 844, BASE);
  await espera(600);
  await c.chamar('Page.bringToFront');
  await avaliar(c, dentro);
  await avaliar(c, "document.getElementById('btnPlay').click()");
  await espera(600);
  const voltou = await avaliar(c, `({stars:G.stars,ano:G.ano,nivel:G.nivel,acertos:G.totalCorrect,
    owned:G.owned.slice().sort(),equip:G.equip,seq:G.bestStreak,hist:Object.keys(G.hist).length,
    metas:JSON.stringify(G.metas)})`);
  confere('as estrelas voltam depois de recarregar', voltou.stars === guardado.stars, { guardado: guardado.stars, voltou: voltou.stars });
  confere('o ano e o degrau escolhidos voltam', voltou.ano === guardado.ano && voltou.nivel === guardado.nivel, voltou);
  confere('o total de acertos volta', voltou.acertos === guardado.acertos);
  confere('a melhor sequência volta', voltou.seq === guardado.seq);
  confere('o histórico por conteúdo volta inteiro', voltou.hist === guardado.hist && voltou.hist > 0, voltou);
  confere('as metas do dia e a lista de dias voltam iguais', voltou.metas === guardado.metas, { guardado: guardado.metas, voltou: voltou.metas });
  confere('a ficha de dias volta depois de recarregar', (await texto(c, 'hubDiasVal')) === '1 dia', await texto(c, 'hubDiasVal'));
  const missoesVolta = await avaliar(c, `({ pagas:G.metas.dia.pagas.slice(), stars:G.stars,
    contas:Array.prototype.slice.call(document.querySelectorAll('#missoesDia .hm-conta')).map(function(e){return e.textContent.trim();}) })`);
  const medalhasVolta = await avaliar(c, 'JSON.stringify(G.metas.conquistas)');
  confere('as medalhas e as datas voltam iguais depois de recarregar', medalhasVolta === guardado.conquistas,
    { guardado: guardado.conquistas, voltou: medalhasVolta });
  confere('as missões cumpridas voltam pagas depois de recarregar, sem pagar de novo',
    missoesVolta.pagas.length === 2 && missoesVolta.stars === guardado.stars
    && missoesVolta.contas.every((t) => t === 'Concluída'), missoesVolta);
  confere('a caixa de peças volta', JSON.stringify(voltou.owned) === JSON.stringify(guardado.owned), voltou.owned);
  confere('o figurino volta peça por peça', JSON.stringify(voltou.equip) === JSON.stringify(guardado.equip),
    { guardado: guardado.equip, voltou: voltou.equip });
  const hubVolta = await boneco(c, '#oncaDisplay');
  confere('a Juba do hub já acorda vestida', hubVolta.rotulo.indexOf(nomeBarato) >= 0 && hubVolta.rotulo.indexOf(nomeOculos) >= 0, hubVolta.rotulo);
  confere('o hub mostra o saldo guardado', (await texto(c, 'hubStars')) === (await avaliar(c, 'numBR(G.stars)')));
  confere('o hub mostra o ano guardado', (await texto(c, 'hubAno')) === guardado.ano + 'º');
  await avaliar(c, "document.querySelector('.bha-shop').click()");
  await espera(500);
  const palcoVolta = await boneco(c, '#wdMascote');
  confere('o palco do guarda-roupa acorda com o mesmo figurino',
    palcoVolta.rotulo.indexOf(nomeBarato) >= 0 && palcoVolta.rotulo.indexOf(nomeOculos) >= 0, palcoVolta.rotulo);
  confere('os cards das peças vestidas já oferecem Tirar',
    /Tirar/.test((await avaliar(c, `window.__J.card(${JSON.stringify(barato)}).botao`)))
    && /Tirar/.test((await avaliar(c, `window.__J.card(${JSON.stringify(oculos)}).botao`))));
  confere('a lista de slots acorda preenchida',
    (await avaliar(c, 'window.__J.slots()')).filter((l) => l.posto).length === 2, await avaliar(c, 'window.__J.slots()'));
  await clicar(c, '#shopTabs', 'Meus itens');
  await espera(250);
  confere('a aba Meus itens mostra só o que ela tem',
    (await avaliar(c, 'window.__J.vitrine()')).length === guardado.owned.length
    && (await avaliar(c, 'window.__J.vitrine().every(function(id){return G.owned.indexOf(id)>=0;})')),
    await avaliar(c, 'window.__J.vitrine()'));

  // ── 14b. apagar os dados do aparelho leva as metas junto ──
  await avaliar(c, 'closeAllModals(); apagarLocal(true); true');
  await espera(300);
  const apagado = await avaliar(c, '({m:G.metas, s:(window.__J.save()||{}).metas, stars:G.stars})');
  confere('apagar zera as metas na memória',
    apagado.m.dias.length === 0 && apagado.m.dia.respostas === 0 && apagado.m.semana.rodadas === 0, apagado.m);
  confere('apagar zera as metas gravadas', !!apagado.s && apagado.s.dias.length === 0 && apagado.s.dia.respostas === 0, apagado.s);

  // ── 14c. um save de antes das metas abre inteiro ──
  /* Quem já jogava tem um save sem o campo metas. Ele tem de abrir com o
     progresso intacto e as metas começando do zero, sem aviso de dano. */
  await avaliar(c, `localStorage.setItem('candymath_v3', JSON.stringify({stars:77, ano:4, nivel:2, totalCorrect:9,
    streak:0, bestStreak:5, soundOn:true, aprendidas:['Frações'], hist:{'Frações':{feitas:6,certas:4}},
    equip:{}, owned:[], duelos:{}, provas:[], comoJogarVisto:{quiz:true}, desde:1760000000000})); true`);
  await abrir(c, 390, 844, BASE);
  await espera(600);
  await avaliar(c, dentro);
  const antigo = await avaliar(c, `({stars:G.stars, ano:G.ano, nivel:G.nivel, hist:G.hist, m:G.metas,
    danificado:localStorage.getItem('candymath_v3_danificado'), hoje:CM_METAS.diaLocal(Date.now())})`);
  confere('save sem metas abre com estrelas, ano e nível de antes',
    antigo.stars === 77 && antigo.ano === 4 && antigo.nivel === 2, antigo);
  confere('save sem metas mantém o histórico como estava', JSON.stringify(antigo.hist) === '{"Frações":{"feitas":6,"certas":4}}', antigo.hist);
  confere('save sem metas começa as metas do zero, no dia de hoje',
    antigo.m.dias.length === 0 && antigo.m.dia.respostas === 0 && antigo.m.dia.chave === antigo.hoje, antigo.m);
  confere('save sem metas não é tratado como danificado', antigo.danificado === null);

  // ── 15. nenhum erro de console no percurso ──
  const gritos = c.eventos.filter((e) =>
    (e.method === 'Runtime.exceptionThrown')
    || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error'
      && !/favicon|font|net::ERR|Failed to load resource/i.test(e.params.entry.text)));
  confere('nenhum erro de execução ao jogar, comprar e vestir', gritos.length === 0,
    gritos.slice(0, 4).map((e) => (e.params.entry || {}).text || (e.params.exceptionDetails || {}).text));

  await nav.desligar(c);
  console.log('jogo — partida completa, guarda-roupa e persistência em navegador real');
  if (problemas.length) console.log('\n' + problemas.join('\n'));
  else console.log('rodada, erro que ensina, resumo, degrau, compra, peça no desenho, conflito de rosto e recarregamento: tudo conferido.');
  console.log('checagens: ' + checagens + ' · problemas: ' + problemas.length);
  process.exitCode = problemas.length ? 1 : 0;
}

main().catch(async (e) => {
  console.log('jogo — o teste não terminou: ' + e.message);
  if (problemas.length) console.log('já apurado até aqui:\n' + problemas.join('\n'));
  console.log('checagens: ' + checagens);
  if (conexao) {
    const gritos = conexao.eventos.filter((e) => e.method === 'Runtime.exceptionThrown'
      || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error'));
    if (gritos.length) {
      console.log('erros do navegador:');
      gritos.slice(0, 6).forEach((e) => console.log('  ' + JSON.stringify(
        (e.params.exceptionDetails || {}).exception || (e.params.entry || {}).text).slice(0, 400)));
    }
    try {
      console.log('estado: ' + await avaliar(conexao,
        "(function(){return JSON.stringify({tela:window.__J.tela(),prog:window.__J.texto('quizProg'),"
        + "pergunta:G.currentQ&&G.currentQ.txt,alternativas:window.__J.alternativas(),"
        + "aberto:['modalTuto','modalLevelUp','modalShop'].filter(function(m){return window.__J.aberto(m);})});})()"));
    } catch (e2) { /* a página pode ter caído */ }
  }
  if (conexao) await nav.desligar(conexao);
  else nav.encerrar();
  process.exitCode = 1;
});