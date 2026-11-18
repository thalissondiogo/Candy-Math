/* Scratch: fotografa a bolha de revelação com o botão Continuar nos três
   aparelhos de referência. Rodar: node testes/_captura-revelacao.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { criarNavegador, conectar, avaliar, espera, abrir } = require('./_navegador.js');
const BASE = 'http://127.0.0.1:8765/index.html';
const nav = criarNavegador(9331, 'revelacao');

const DENTRO = `(function(){
  window.__J = {
    vis: function(el){ if(!el) return false; var r=el.getBoundingClientRect();
      return r.width>0 && r.height>0 && el.checkVisibility({visibilityProperty:true, opacityProperty:true}); },
    responder: function(certa){
      var q=G.currentQ; var bs=Array.prototype.slice.call(document.querySelectorAll('#quizAnswers .ans-btn'))
        .filter(function(b){ return !b.disabled && window.__J.vis(b); });
      var alvo=bs.filter(function(b){ return certa ? b.textContent===String(q.alt[0]) : b.textContent!==String(q.alt[0]); })[0];
      if(!alvo) throw new Error('sem alternativa'); alvo.click(); return true;
    }
  };
})()`;

async function main() {
  await nav.portaLivre();
  nav.subir();
  const c = await conectar((await nav.alvo()).webSocketDebuggerUrl);
  await c.chamar('Page.enable');
  await c.chamar('Runtime.enable');
  await c.chamar('Page.bringToFront');
  for (const [w, h] of [[320, 640], [768, 1024], [1440, 900]]) {
    await abrir(c, w, h, BASE);
    await avaliar(c, 'localStorage.clear();sessionStorage.clear();true');
    await abrir(c, w, h, BASE);
    await espera(400);
    await avaliar(c, DENTRO);
    if (await avaliar(c, "!document.getElementById('avisoDados').hidden"))
      await avaliar(c, "(function(){var b=Array.prototype.slice.call(document.querySelectorAll('#avisoDados button')).filter(function(x){return x.textContent.indexOf('Entendi')>=0;})[0]; if(b) b.click(); return true;})()");
    await avaliar(c, "document.getElementById('btnPlay').click()");
    await espera(400);
    await avaliar(c, "document.querySelector('.mode-card.mc-quiz').click()");
    await espera(400);
    await avaliar(c, "(function(){var b=Array.prototype.slice.call(document.querySelectorAll('#tutoAcoes button')).filter(function(x){return x.textContent.indexOf('Começar a jogar')>=0;})[0]; if(b) b.click(); return true;})()");
    for (let i = 0; i < 60; i++) {
      if (await avaliar(c, "Array.prototype.slice.call(document.querySelectorAll('#quizAnswers .ans-btn')).length===4 && Array.prototype.slice.call(document.querySelectorAll('#quizAnswers .ans-btn')).every(function(b){return window.__J.vis(b);})")) break;
      await espera(120);
    }
    await avaliar(c, 'window.__J.responder(true)');
    await espera(2100);
    for (let t = 0; t < 4; t++) {
      if (await avaliar(c, "!!document.querySelector('#quizAnswers .ans-btn.reveal')")) break;
      await avaliar(c, 'window.__J.responder(false)');
      await espera(300);
    }
    await espera(400);
    const med = await avaliar(c, `(function(){
      var b=document.getElementById('quizContinuar');
      b.scrollIntoView({block:'center'});
      var r=b.getBoundingClientRect(); var f=document.getElementById('quizFeedback').getBoundingClientRect();
      return {botaoVisivel:!b.hidden&&window.__J.vis(b), rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},
        dentroDaTela:r.x>=0&&r.right<=innerWidth&&r.width>0,
        bolha:{w:Math.round(f.width),h:Math.round(f.height)},
        rolagemHorizontal:document.documentElement.scrollWidth>document.documentElement.clientWidth,
        texto:document.getElementById('quizFeedbackMsg').textContent.length};
    })()`);
    await espera(250);
    const png = await c.chamar('Page.captureScreenshot', { format: 'png' });
    const arq = path.join(__dirname, 'capturas', 'revelacao-' + w + 'x' + h + '.png');
    fs.writeFileSync(arq, Buffer.from(png.data, 'base64'));
    console.log(w + 'x' + h + ' → ' + JSON.stringify(med) + ' → ' + path.basename(arq));
  }
  await nav.desligar(c);
}
main().catch(async (e) => { console.error(e.message); try { await nav.desligar(); } catch (x) {} process.exitCode = 1; });