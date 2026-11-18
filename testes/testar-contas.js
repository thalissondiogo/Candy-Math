#!/usr/bin/env node
/* ============================================================
   CONTAS — testes/testar-contas.js
   Roda o fluxo de contas num navegador de verdade, clicando nos botões que a
   família vê. Não é teste de aparência: é teste de consequência. Cada passo
   confere o que ficou guardado, o que apareceu na tela e o que NÃO pode vazar
   de um estudante para o outro.

   O que ele percorre:
     entrada sem conta → criar conta → código de recuperação → perfis →
     migração do progresso de convidado → PIN errado → PIN travado →
     porta do adulto → troca de estudante → exportação → autorização por
     finalidade (e a recusa de cada saída sem ela) → recuperação de senha →
     apagar perfil → apagar conta → recarregar e continuar.

   Precisa de um servidor de arquivos na porta 8765 (npm run servir).
   Rodar: node testes/testar-contas.js
   ============================================================ */
'use strict';

const { criarNavegador, conectar, avaliar, espera, abrir } = require('./_navegador.js');

const PORTA = 9334;
const BASE = 'http://127.0.0.1:8765/index.html';
const SENHA = 'doce-de-leite-42';
const SENHA_NOVA = 'brigadeiro-de-colher-77';

const nav = criarNavegador(PORTA, 'contas');
let conexao = null;
let checagens = 0;
const problemas = [];

function confere(rotulo, condicao, detalhe) {
  checagens++;
  if (!condicao) problemas.push(rotulo + (detalhe ? ' — ' + JSON.stringify(detalhe) : ''));
}

/* Helpers que rodam DENTRO da página. Só clicam em elemento visível: um botão
   em tela escondida aceita .click() e faz o teste passar sem ninguém ter visto
   a tela, que foi exatamente o engano que este arquivo existe para evitar. */
const dentro = `(function(){
  window.__T = {
    vis: function(el){ if(!el) return false; var r=el.getBoundingClientRect();
      return r.width>0 && r.height>0 && el.checkVisibility({visibilityProperty:true, opacityProperty:true}); },
    tela: function(){ var a=document.querySelector('.screen.active'); return a?a.id:'nenhuma'; },
    botoes: function(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel+' button')).filter(window.__T.vis).map(function(b){return b.textContent.trim();}); },
    achar: function(sel, texto){
      var todos=Array.prototype.slice.call(document.querySelectorAll(sel+' button'));
      var b=todos.filter(function(x){ return window.__T.vis(x) && x.textContent.indexOf(texto)>=0; })[0];
      if(!b) throw new Error('sem botão visível "'+texto+'" em '+sel
        +' — havia: '+window.__T.botoes(sel).join(' | ')
        +' · brutos: '+todos.map(function(x){var r=x.getBoundingClientRect();var s=getComputedStyle(x);
            return '"'+x.textContent.trim().slice(0,18)+'" '+Math.round(r.width)+'x'+Math.round(r.height)
            +' vis='+s.visibility+' op='+s.opacity+' disp='+s.display;}).join(' / ')
        +' · caixa: '+document.querySelector(sel).innerHTML.slice(0,300));
      return b;
    },
    clicar: function(sel, texto){ window.__T.achar(sel,texto).click(); },
    msg: function(){ var m=document.querySelector('#entradaCorpo .conta-msg'); return m&&window.__T.vis(m)?m.textContent:null; },
    cofreMsg: function(){ var m=document.querySelector('#cofreCorpo .conta-msg'); return m&&window.__T.vis(m)?m.textContent:null; },
    valor: function(id, v){ var e=document.getElementById(id); if(!e) throw new Error('sem campo #'+id); e.value=v; return true; },
    marcar: function(id, v){ var e=document.getElementById(id); if(!e) throw new Error('sem caixa #'+id); e.checked=v; return true; },
    chaves: function(){ return Object.keys(localStorage).sort(); },
    save: function(chave){ try{ return JSON.parse(localStorage.getItem(chave)||'null'); }catch(e){ return null; } }
  };
  return true;
})()`;

async function tela(c) { return avaliar(c, 'window.__T.tela()'); }
async function clicar(c, sel, texto) { await avaliar(c, `window.__T.clicar(${JSON.stringify(sel)},${JSON.stringify(texto)})`); }
async function valor(c, id, v) { await avaliar(c, `window.__T.valor(${JSON.stringify(id)},${JSON.stringify(v)})`); }

/* PBKDF2 com 600 mil iterações leva o tempo que a máquina levar. Esperar um
   número fixo de milissegundos faz o teste passar num computador e falhar em
   outro, então cada passo espera a CONDIÇÃO, com teto para não pendurar. */
async function esperarPor(c, expressao, teto) {
  const limite = teto || 25000;
  const t0 = Date.now();
  for (;;) {
    if (await avaliar(c, '!!(' + expressao + ')')) return true;
    if (Date.now() - t0 > limite) return false;
    await espera(150);
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

  const ruidos = [];
  await abrir(c, 390, 844, BASE);
  await avaliar(c, 'localStorage.clear();sessionStorage.clear();true');
  await abrir(c, 390, 844, BASE);
  await espera(500);
  await avaliar(c, dentro);

  // ── 1. sem conta o jogo abre direto, e a porta dos perfis está à vista ──
  confere('cofre de criptografia disponível em 127.0.0.1', await avaliar(c, '!!CM_CONTAS.cofreDisponivel()'));
  confere('nasce sem conta', !(await avaliar(c, 'CM_CONTAS.temConta()')));
  await avaliar(c, "document.getElementById('btnPlay').click()");
  await espera(500);
  confere('sem conta o Jogar leva ao hub', (await tela(c)) === 'screenHub', await tela(c));
  const barra = await avaliar(c, "({nome:document.getElementById('hubEstudanteNome').textContent,acao:document.getElementById('hubEstudanteAcaoTexto').textContent,vis:window.__T.vis(document.getElementById('hubEstudanteAcao'))})");
  confere('barra de quem joga aparece sem conta', barra.vis && barra.nome === 'Jogando sem conta', barra);
  confere('barra convida a criar perfis', barra.acao === 'Criar perfis', barra);

  // Progresso de convidado: existe antes da conta e tem de sobreviver a ela.
  await avaliar(c, "G.stars=640;G.totalCorrect=28;G.ano=3;G.owned=['hat_crown'];G.equip={hat:'hat_crown'};saveState();true");
  await espera(150);
  confere('progresso de convidado gravado', (await avaliar(c, "(window.__T.save('candymath_v3')||{}).stars")) === 640);

  await avaliar(c, "document.getElementById('hubEstudanteAcao').click()");
  await espera(500);
  confere('barra abre a tela de entrada', (await tela(c)) === 'screenEntrada', await tela(c));
  const entrada = await avaliar(c, "({op:getComputedStyle(document.getElementById('screenEntrada')).opacity,px:document.getElementById('screenEntrada').getBoundingClientRect().height,mascote:!!document.querySelector('#entradaMascote svg'),botoes:window.__T.botoes('#entradaCorpo')})");
  confere('tela de entrada visível de verdade', Number(entrada.op) > 0.9 && entrada.px > 300, entrada);
  confere('mascote desenhado na entrada', entrada.mascote);
  confere('entrada oferece criar conta e jogar sem conta',
    entrada.botoes.some((b) => /Criar conta/.test(b)) && entrada.botoes.some((b) => /Jogar sem conta/.test(b)), entrada.botoes);

  // ── 2. validação da senha de quem acompanha ──
  // Cada erro repinta o painel, e repintar cria campos novos: por isso todo
  // clique é precedido do preenchimento completo, nunca de um campo só.
  const preencherConta = async (nome, s1, s2) => {
    await valor(c, 'contaNomeResp', nome);
    await valor(c, 'contaSenhaNova', s1);
    await valor(c, 'contaSenhaNova2', s2);
  };
  await clicar(c, '#entradaCorpo', 'Criar conta');
  await espera(200);
  await preencherConta('Ana', '1234', '1234');
  await clicar(c, '#entradaCorpo', 'Criar conta');
  await esperarPor(c, 'window.__T.msg()');
  confere('senha curta é recusada', !(await avaliar(c, 'CM_CONTAS.temConta()')));
  confere('recusa de senha curta aparece na tela', !!(await avaliar(c, 'window.__T.msg()')), await avaliar(c, 'window.__T.msg()'));

  await preencherConta('Ana', SENHA, SENHA + 'x');
  await clicar(c, '#entradaCorpo', 'Criar conta');
  await esperarPor(c, '/diferentes/.test(window.__T.msg()||"")');
  confere('senhas diferentes são recusadas', /diferentes/.test((await avaliar(c, 'window.__T.msg()')) || ''));

  await preencherConta('Mãe da Manu', SENHA, SENHA);
  await clicar(c, '#entradaCorpo', 'Criar conta');
  await esperarPor(c, "document.querySelector('.conta-codigo')", 60000);
  confere('conta criada', await avaliar(c, 'CM_CONTAS.temConta()'), await avaliar(c, 'window.__T.msg()'));
  const cod = await avaliar(c, "(function(){var e=document.querySelector('.conta-codigo');return e&&window.__T.vis(e)?e.textContent.trim():null;})()");
  confere('código de recuperação à vista', !!cod && cod.replace(/\s/g, '').length === 12, cod);
  const codigo = cod ? cod.replace(/\s/g, '') : '';
  const bruto = await avaliar(c, "localStorage.getItem('candymath_contas_v1')") || '{}';
  confere('senha em claro não fica guardada', bruto.indexOf(SENHA) < 0);
  confere('código em claro não fica guardado', bruto.indexOf(codigo) < 0);
  const reg = JSON.parse(bruto);
  if (!reg.responsavel) throw new Error('a conta não foi criada; todo o resto do percurso depende dela');
  confere('derivado com 600 mil iterações', reg.responsavel.senha.iter === 600000, reg.responsavel.senha);
  confere('sal de 16 bytes', Buffer.from(reg.responsavel.senha.sal, 'base64').length === 16);
  confere('derivado de 256 bits', Buffer.from(reg.responsavel.senha.hash, 'base64').length === 32);

  await clicar(c, '#entradaCorpo', 'Continuar');
  await espera(250);
  confere('continuar exige anotar o código', /anotou/.test((await avaliar(c, 'window.__T.msg()')) || ''), await avaliar(c, 'window.__T.msg()'));
  await avaliar(c, "window.__T.marcar('contaGuardei',true)");
  await clicar(c, '#entradaCorpo', 'Continuar');
  await espera(300);

  // ── 3. primeiro perfil, com o progresso de convidado junto ──
  confere('formulário de perfil ofereceu trazer o progresso', await avaliar(c, "!!document.getElementById('contaTrazer')"));
  await valor(c, 'contaApelido', 'Manu');
  await avaliar(c, "window.__T.valor('contaAno','3')");
  await valor(c, 'contaPin', '1234');
  await clicar(c, '#entradaCorpo', 'Criar perfil');
  await esperarPor(c, 'CM_CONTAS.perfis().length===1||window.__T.msg()', 40000);
  const perfis1 = await avaliar(c, 'CM_CONTAS.perfis().map(function(p){return {id:p.id,apelido:p.apelido,ano:p.ano,pin:!!p.pin};})');
  confere('perfil criado com ano e PIN', perfis1.length === 1 && perfis1[0].apelido === 'Manu' && perfis1[0].ano === 3 && perfis1[0].pin, perfis1);
  const idManu = perfis1[0] && perfis1[0].id;
  confere('progresso de convidado migrou para o perfil',
    (await avaliar(c, `(window.__T.save('candymath_v3#${idManu}')||{}).stars`)) === 640);
  confere('chave de convidado esvaziada depois da migração',
    (await avaliar(c, "localStorage.getItem('candymath_v3')")) === null);
  confere('PIN não fica em claro no registro',
    (await avaliar(c, "localStorage.getItem('candymath_contas_v1')")).indexOf('"1234"') < 0);

  // apelido repetido não passa
  await clicar(c, '#entradaCorpo', 'Adicionar estudante');
  await espera(250);
  await valor(c, 'contaApelido', 'manu');
  await clicar(c, '#entradaCorpo', 'Criar perfil');
  await esperarPor(c, 'window.__T.msg()');
  confere('apelido repetido é recusado', /Já existe/.test((await avaliar(c, 'window.__T.msg()')) || ''), await avaliar(c, 'window.__T.msg()'));
  await valor(c, 'contaApelido', 'Téo');
  await avaliar(c, "window.__T.valor('contaAno','7')");
  await valor(c, 'contaPin', '');
  await clicar(c, '#entradaCorpo', 'Criar perfil');
  await esperarPor(c, 'CM_CONTAS.perfis().length===2', 40000);
  const perfis2 = await avaliar(c, 'CM_CONTAS.perfis().map(function(p){return {id:p.id,apelido:p.apelido,ano:p.ano,pin:!!p.pin};})');
  confere('segundo perfil sem PIN', perfis2.length === 2 && perfis2[1].apelido === 'Téo' && !perfis2[1].pin, perfis2);
  const idTeo = perfis2[1] && perfis2[1].id;
  confere('dois perfis, duas chaves de save distintas', idManu !== idTeo);

  // ── 4. escolher Téo: progresso zerado, nada da Manu ──
  // Há metas na memória de quem jogou antes; o Téo ainda não tem save, então é a
  // troca de estudante — não a leitura do save — que tem de zerá-las.
  await avaliar(c, "CM_METAS.registrarResposta(G.metas,{u:'numeros',acertou:true},Date.now());true");
  await clicar(c, '#entradaCorpo', 'Téo');
  await esperarPor(c, "window.__T.tela()==='screenHub'", 40000);
  confere('escolher perfil leva ao hub', (await tela(c)) === 'screenHub', await tela(c));
  const teo = await avaliar(c, "({quem:CM_CONTAS.ativo().apelido,ano:G.ano,stars:G.stars,owned:G.owned.slice(),chave:CM_CONTAS.chaveDoSave(),barra:document.getElementById('hubEstudanteNome').textContent,acao:document.getElementById('hubEstudanteAcaoTexto').textContent})");
  confere('Téo começa do zero', teo.stars === 0 && teo.owned.length === 0, teo);
  const metasNovo = await avaliar(c, 'G.metas');
  confere('perfil novo começa sem as metas de quem jogou antes',
    metasNovo.dia.respostas === 0 && metasNovo.dias.length === 0, metasNovo);
  confere('ano do perfil aplicado ao jogo', teo.ano === 7, teo);
  confere('save do jogo aponta para a chave do perfil', teo.chave === 'candymath_v3#' + idTeo, teo);
  confere('barra mostra quem joga', teo.barra === 'Téo · 7º ano' && teo.acao === 'Trocar', teo);

  await avaliar(c, "G.stars=90;G.totalCorrect=4;G.owned=['acc_cookie'];G.equip={accessory:'acc_cookie'};saveState();true");
  await espera(150);
  confere('progresso do Téo na chave dele', (await avaliar(c, `(window.__T.save('candymath_v3#${idTeo}')||{}).stars`)) === 90);
  confere('progresso da Manu intacto', (await avaliar(c, `(window.__T.save('candymath_v3#${idManu}')||{}).stars`)) === 640);
  // As metas (dias de atividade, contagem do dia) seguem a mesma chave do perfil.
  // A questão passa pelo caminho do jogo: registrarTrabalho e registrarResultado.
  await avaliar(c, "registrarTrabalho({o:'Teste de metas',u:'numeros'});registrarResultado(true);"
    + "registrarTrabalho({o:'Teste de metas',u:'numeros'});registrarResultado(false);saveState();true");
  const metasTeo = await avaliar(c, `(window.__T.save('candymath_v3#${idTeo}')||{}).metas`);
  confere('as metas do Téo vão para a chave dele',
    !!metasTeo && metasTeo.dia.respostas === 2 && metasTeo.dia.acertos === 1 && metasTeo.dias.length === 0, metasTeo);
  const metasManuAntes = await avaliar(c, `(window.__T.save('candymath_v3#${idManu}')||{}).metas`);
  confere('as metas da Manu não recebem as respostas do Téo',
    !metasManuAntes || (metasManuAntes.dia.respostas === 0 && metasManuAntes.dias.length === 0), metasManuAntes);

  // ── 5. trocar para Manu: PIN errado, depois certo ──
  await avaliar(c, "document.getElementById('hubEstudanteAcao').click()");
  await espera(500);
  confere('trocar volta para a entrada', (await tela(c)) === 'screenEntrada', await tela(c));
  const cartoes = await avaliar(c, "Array.prototype.slice.call(document.querySelectorAll('.conta-cartao')).map(function(b){return {nome:b.querySelector('.conta-cartao-nome').textContent,svg:!!b.querySelector('svg'),rotulo:b.getAttribute('aria-label')};})");
  confere('um cartão por estudante, cada um com a própria Juba',
    cartoes.length === 2 && cartoes.every((x) => x.svg), cartoes);
  confere('cartão tem rótulo acessível com nome e ano',
    /Manu/.test(cartoes[0].rotulo) && /3º ano/.test(cartoes[0].rotulo), cartoes[0]);
  const avatares = await avaliar(c, "Array.prototype.slice.call(document.querySelectorAll('.conta-cartao svg')).map(function(s){return s.innerHTML.length;})");
  confere('a Juba de cada perfil é desenhada com a roupa daquele perfil', avatares[0] !== avatares[1], avatares);

  await clicar(c, '#entradaCorpo', 'Manu');
  await espera(400);
  confere('perfil com PIN pede o PIN', await avaliar(c, "!!document.getElementById('contaPinEntrar')"));
  await valor(c, 'contaPinEntrar', '9999');
  await clicar(c, '#entradaCorpo', 'Entrar');
  await esperarPor(c, 'window.__T.msg()');
  confere('PIN errado não abre', (await avaliar(c, 'CM_CONTAS.ativo()')) === null || (await avaliar(c, 'CM_CONTAS.ativo().apelido')) !== 'Manu');
  confere('PIN errado avisa quantas tentativas restam', /Restam 4/.test((await avaliar(c, 'window.__T.msg()')) || ''), await avaliar(c, 'window.__T.msg()'));
  await valor(c, 'contaPinEntrar', '1234');
  await clicar(c, '#entradaCorpo', 'Entrar');
  await esperarPor(c, "window.__T.tela()==='screenHub'", 40000);
  const manu = await avaliar(c, "({quem:CM_CONTAS.ativo()&&CM_CONTAS.ativo().apelido,stars:G.stars,ano:G.ano,hat:(G.equip||{}).hat,tela:window.__T.tela()})");
  confere('PIN certo abre o perfil', manu.quem === 'Manu' && manu.tela === 'screenHub', manu);
  confere('Manu recebe o próprio progresso, não o do Téo', manu.stars === 640 && manu.ano === 3 && manu.hat === 'hat_crown', manu);
  const metasManu = await avaliar(c, 'G.metas');
  confere('Manu entra com as próprias metas, sem os dias do Téo',
    metasManu.dia.respostas === 0 && metasManu.semana.respostas === 0 && metasManu.dias.length === 0, metasManu);

  // ── 6. porta do adulto: boletim, apagamento e nuvem trancam ──
  await avaliar(c, 'CM_CONTAS.trancarAdulto()');
  confere('janela do adulto fechada', !(await avaliar(c, 'CM_CONTAS.adultoLiberado()')));
  await avaliar(c, "openModal('modalPais')");
  await esperarPor(c, "window.__T.botoes('#cofreCorpo').length>0");
  const porta = await avaliar(c, "({cofre:window.__T.vis(document.getElementById('modalCofre')),boletim:window.__T.vis(document.getElementById('modalPais')),campo:!!document.getElementById('cofreSenha')})");
  confere('boletim não abre sem a senha', porta.cofre && !porta.boletim && porta.campo, porta);
  await valor(c, 'cofreSenha', 'senha-errada-qualquer');
  await clicar(c, '#cofreCorpo', 'Abrir');
  await esperarPor(c, 'window.__T.cofreMsg()');
  confere('senha errada não libera', !(await avaliar(c, 'CM_CONTAS.adultoLiberado()')));
  confere('senha errada avisa', /não confere/i.test((await avaliar(c, 'window.__T.cofreMsg()')) || ''), await avaliar(c, 'window.__T.cofreMsg()'));
  await valor(c, 'cofreSenha', SENHA);
  await clicar(c, '#cofreCorpo', 'Abrir');
  await esperarPor(c, 'CM_CONTAS.adultoLiberado()', 40000);
  await espera(250);
  const depoisDaSenha = await avaliar(c, "({liberado:CM_CONTAS.adultoLiberado(),boletim:window.__T.vis(document.getElementById('modalPais')),cofre:window.__T.vis(document.getElementById('modalCofre'))})");
  confere('senha certa libera o boletim e fecha o cofre',
    depoisDaSenha.liberado && depoisDaSenha.boletim && !depoisDaSenha.cofre, depoisDaSenha);
  await avaliar(c, 'closeAllModals()');
  await espera(200);
  await avaliar(c, 'CM_CONTAS.trancarAdulto()');
  await avaliar(c, "openModal('modalApagar')");
  await espera(350);
  confere('apagar dados também tranca', await avaliar(c, "window.__T.vis(document.getElementById('modalCofre'))&&!window.__T.vis(document.getElementById('modalApagar'))"));
  await avaliar(c, 'closeAllModals()');
  await avaliar(c, "openModal('modalNuvem')");
  await espera(350);
  confere('conexão com a internet também tranca', await avaliar(c, "window.__T.vis(document.getElementById('modalCofre'))&&!window.__T.vis(document.getElementById('modalNuvem'))"));
  await valor(c, 'cofreSenha', SENHA);
  await clicar(c, '#cofreCorpo', 'Abrir');
  await esperarPor(c, 'CM_CONTAS.adultoLiberado()', 40000);
  await avaliar(c, 'closeAllModals()');
  await espera(200);

  // ── 7. PIN travado depois de 5 erros, e as duas portas de destravar ──
  // Sair fecha a janela do adulto de propósito: a senha vale por dez minutos
  // numa sessão, não no aparelho inteiro.
  await avaliar(c, 'CM_CONTAS.sair()');
  await espera(200);
  confere('sair tranca a área do adulto junto', !(await avaliar(c, 'CM_CONTAS.adultoLiberado()')));
  await avaliar(c, 'CM_APP.irParaEntrada()');
  await espera(400);
  const idTravado = idManu;
  for (let i = 0; i < 5; i++) {
    const r = await avaliar(c, `CM_CONTAS.abrirPerfil('${idTravado}','0000')`, true);
    if (i === 4) confere('a quinta tentativa errada avisa que travou', /travou/.test(r.erro || ''), r);
    else confere('tentativa ' + (i + 1) + ' ainda conta o que resta', /Restam/.test(r.erro || ''), r);
  }
  const travado = await avaliar(c, `CM_CONTAS.abrirPerfil('${idTravado}','1234')`, true);
  confere('PIN certo não abre perfil travado', travado.erro === 'pin-travado', travado);

  // 7a. com a janela do adulto fechada, o cartão leva à senha
  await clicar(c, '#entradaCorpo', 'Manu');
  // O contêiner do diálogo aparece antes da caixa terminar a animação de
  // entrada: esperar o contêiner dava clique em botão ainda invisível.
  await esperarPor(c, "window.__T.botoes('#cofreCorpo').length>0");
  confere('perfil travado pede a senha de quem acompanha',
    await avaliar(c, "window.__T.vis(document.getElementById('cofreSenha'))"));
  await valor(c, 'cofreSenha', SENHA);
  await clicar(c, '#cofreCorpo', 'Abrir');
  await esperarPor(c, "window.__T.tela()==='screenHub'", 40000);
  confere('senha de quem acompanha destrava o perfil',
    (await avaliar(c, 'CM_CONTAS.ativo()&&CM_CONTAS.ativo().apelido')) === 'Manu', await avaliar(c, 'CM_CONTAS.resumo()'));
  confere('contador de tentativas zerado depois de abrir',
    (await avaliar(c, `CM_CONTAS.perfis().filter(function(p){return p.id==='${idTravado}';})[0].tentativas`)) === 0);

  // 7b. com a janela já aberta, não se pede a senha duas vezes
  for (let i = 0; i < 5; i++) await avaliar(c, `CM_CONTAS.abrirPerfil('${idTravado}','0000')`, true);
  await avaliar(c, 'CM_APP.irParaEntrada()');
  await espera(400);
  await clicar(c, '#entradaCorpo', 'Manu');
  await esperarPor(c, "window.__T.tela()==='screenHub'", 40000);
  confere('com a janela do adulto aberta, o perfil travado abre na hora',
    (await avaliar(c, 'CM_CONTAS.ativo()&&CM_CONTAS.ativo().apelido')) === 'Manu'
    && !(await avaliar(c, "window.__T.vis(document.getElementById('modalCofre'))")), await avaliar(c, 'CM_CONTAS.resumo()'));

  // ── 8. exportação: portabilidade sem segredo ──
  const exportado = await avaliar(c, 'JSON.stringify(CM_CONTAS.exportar())');
  confere('exportação traz os dois estudantes', JSON.parse(exportado).estudantes.length === 2);
  confere('exportação traz o progresso de cada um',
    JSON.parse(exportado).estudantes.some((e) => e.progresso && e.progresso.stars === 640)
    && JSON.parse(exportado).estudantes.some((e) => e.progresso && e.progresso.stars === 90));
  confere('exportação não leva senha, PIN nem derivado',
    !/"senha"|"pin"|"hash"|"sal"/.test(exportado) && exportado.indexOf(SENHA) < 0 && exportado.indexOf(codigo) < 0);
  confere('exportação leva o registro das autorizações',
    !!JSON.parse(exportado).consentimento && !!JSON.parse(exportado).consentimento.finalidades);

  // ── 8b. consentimento por finalidade: a porta é no código, não na tela ──
  await avaliar(c, "showScreen('screenSplash')");
  await espera(400);
  confere('aviso de primeira vez aparece antes de jogar',
    await avaliar(c, "window.__T.vis(document.getElementById('avisoDados'))&&window.__T.botoes('#avisoDados').indexOf('Entendi')>=0"));
  confere('o aviso não tranca o botão de jogar',
    await avaliar(c, "window.__T.vis(document.getElementById('btnPlay'))"));
  await clicar(c, '#avisoDados', 'Entendi');
  await espera(200);
  confere('aviso some e fica marcado como lido',
    !(await avaliar(c, "window.__T.vis(document.getElementById('avisoDados'))"))
    && (await avaliar(c, "localStorage.getItem('candymath_aviso_v1')")) === (await avaliar(c, 'CM_CONSENTIMENTO.versaoTexto()')));

  const nascido = await avaliar(c, 'CM_CONSENTIMENTO.resumo()');
  confere('as três finalidades nascem desligadas',
    ['nuvem', 'vozIA', 'dueloRede'].every((id) => nascido.finalidades[id].aceito === false), nascido);

  await avaliar(c, "showScreen('screenHub');openModal('modalPais')");
  await esperarPor(c, "window.__T.botoes('#bolConsentimento').length>=4");
  const fichas = await avaliar(c, `(function(){
    return Array.prototype.slice.call(document.querySelectorAll('#bolConsentimento .cs-item')).map(function(x){
      return {titulo:x.querySelector('.cs-titulo').textContent, estado:x.querySelector('.cs-estado').textContent,
        rotulos:Array.prototype.slice.call(x.querySelectorAll('dt')).map(function(d){return d.textContent;}),
        textos:Array.prototype.slice.call(x.querySelectorAll('dd')).map(function(d){return d.textContent.length;}),
        botao:x.querySelector('.cs-botao').textContent};});})()`);
  confere('uma ficha por finalidade, com o que sai escrito ao lado',
    fichas.length === 3 && fichas.every((f) => f.rotulos.join(',') === 'O que sai,Para onde,O que não sai,Atenção'
      && f.textos.every((n) => n > 20)), fichas);
  confere('todas as fichas dizem desligado', fichas.every((f) => f.estado === 'Desligado' && f.botao === 'Autorizar'), fichas);

  // Autorizar com a janela do adulto fechada tem de passar pela senha.
  await avaliar(c, 'CM_CONTAS.trancarAdulto()');
  await clicar(c, '#bolConsentimento', 'Autorizar');
  await esperarPor(c, "window.__T.vis(document.getElementById('cofreSenha'))");
  confere('autorizar pede a senha de quem acompanha',
    !(await avaliar(c, "CM_CONSENTIMENTO.permitido('nuvem')")));
  // A recusa vale também por fora da tela: é a função que guarda, não o botão.
  const porFora = await avaliar(c, "CM_CONSENTIMENTO.registrar('vozIA',true)");
  confere('nenhum caminho liga finalidade sem a senha', !porFora.ok && !(await avaliar(c, "CM_CONSENTIMENTO.permitido('vozIA')")), porFora);
  await valor(c, 'cofreSenha', 'senha-errada-qualquer');
  await clicar(c, '#cofreCorpo', 'Abrir');
  await esperarPor(c, 'window.__T.cofreMsg()');
  confere('senha errada não autoriza', !(await avaliar(c, "CM_CONSENTIMENTO.permitido('nuvem')")));
  await valor(c, 'cofreSenha', SENHA);
  await clicar(c, '#cofreCorpo', 'Abrir');
  await esperarPor(c, "CM_CONSENTIMENTO.permitido('nuvem')", 40000);
  await espera(300);
  confere('senha certa autoriza e a ficha passa a dizer autorizado',
    await avaliar(c, "(function(){var x=document.querySelector('#bolConsentimento .cs-item');return x.querySelector('.cs-estado').textContent==='Autorizado'&&x.querySelector('.cs-botao').textContent==='Revogar autorização';})()"));
  confere('a decisão fica registrada com data e versão do texto',
    (await avaliar(c, "(function(){var r=JSON.parse(localStorage.getItem('candymath_consentimento_v1'));return r.itens.nuvem.em>0&&r.itens.nuvem.texto===CM_CONSENTIMENTO.versaoTexto();})()")));

  // Revogar não pede senha nenhuma, e vale na hora.
  await avaliar(c, 'CM_CONTAS.trancarAdulto()');
  await clicar(c, '#bolConsentimento', 'Revogar autorização');
  await espera(300);
  confere('revogar não pede senha',
    !(await avaliar(c, "CM_CONSENTIMENTO.permitido('nuvem')"))
    && !(await avaliar(c, "window.__T.vis(document.getElementById('modalCofre'))")));
  confere('revogar fica registrado com data',
    await avaliar(c, "JSON.parse(localStorage.getItem('candymath_consentimento_v1')).itens.nuvem.revogadoEm>0"));

  // A consequência: sem autorização, o caminho de rede não é percorrido.
  await avaliar(c, `(function(){
    window.__rede=[]; var f=window.fetch;
    window.fetch=function(u,o){ window.__rede.push(String(u)); return f.apply(this,arguments); };
    CM_NARRACAO.definirPreferencia('peixe'); CM_NARRACAO.definirVoz('sara'); return true;})()`);
  const subiu = await avaliar(c, 'CM_NUVEM.subir(true)', true);
  confere('subir progresso sem autorização é recusado', !subiu.ok && /autoriz/i.test(subiu.erro || ''), subiu);
  const registrou = await avaliar(c, "CM_NUVEM.registrarCrianca('Manu')", true);
  confere('registrar criança sem autorização é recusado', !registrou.ok && /autoriz/i.test(registrou.erro || ''), registrou);
  await avaliar(c, "CM_NARRACAO.falar('Quanto é sete mais cinco?')", true);
  await espera(400);
  const vozEstado = await avaliar(c, 'CM_NARRACAO.estado()');
  confere('a voz por IA não manda a pergunta sem autorização',
    (await avaliar(c, "window.__rede.filter(function(u){return u.indexOf('/api/voz')>=0;}).length")) === 0
    && /autoriza/.test(vozEstado.nota || ''), { rede: await avaliar(c, 'window.__rede'), nota: vozEstado.nota });
  confere('o duelo em rede continua fechado', !(await avaliar(c, 'CM_NUVEM.dueloLiberado()')));
  await avaliar(c, 'CM_CONFIG.dueloRedeHabilitado=true');
  confere('mesmo com o interruptor do config ligado, falta a autorização',
    !(await avaliar(c, 'CM_NUVEM.dueloLiberado()')) && /autoriza/.test(await avaliar(c, 'CM_NUVEM.bloqueioDoDuelo()')),
    await avaliar(c, 'CM_NUVEM.bloqueioDoDuelo()'));
  await avaliar(c, 'CM_CONFIG.dueloRedeHabilitado=false');

  // Desligar tudo de uma vez, e a caducidade quando o texto muda.
  await avaliar(c, "CM_CONTAS.entrarResponsavel('" + SENHA + "')", true);
  await avaliar(c, "['nuvem','vozIA','dueloRede'].forEach(function(id){CM_CONSENTIMENTO.registrar(id,true);})");
  confere('as três finalidades podem ser autorizadas',
    await avaliar(c, "['nuvem','vozIA','dueloRede'].every(function(id){return CM_CONSENTIMENTO.permitido(id);})"));
  await clicar(c, '#bolConsentimento', 'Desligar todas as saídas de dados');
  await espera(300);
  confere('desligar tudo zera as três',
    await avaliar(c, "['nuvem','vozIA','dueloRede'].every(function(id){return !CM_CONSENTIMENTO.permitido(id);})"));
  await avaliar(c, `(function(){
    var r=JSON.parse(localStorage.getItem('candymath_consentimento_v1'));
    r.texto='1999-01-01'; r.itens.nuvem.aceito=true; r.itens.nuvem.texto='1999-01-01';
    localStorage.setItem('candymath_consentimento_v1', JSON.stringify(r));
    CM_CONSENTIMENTO.iniciar(); return true;})()`);
  confere('autorização sobre texto velho caduca',
    !(await avaliar(c, "CM_CONSENTIMENTO.permitido('nuvem')")) && (await avaliar(c, 'CM_CONSENTIMENTO.precisaRevisar()')));
  await avaliar(c, "localStorage.removeItem('candymath_consentimento_v1');CM_CONSENTIMENTO.iniciar()");
  await avaliar(c, 'closeAllModals()');
  await espera(200);

  // ── 9. recuperação de senha: código errado, certo, e código queimado ──
  const errado = await avaliar(c, "CM_CONTAS.recuperar({codigo:'AAAABBBBCCCC',senha:'" + SENHA_NOVA + "'})", true);
  confere('código errado não troca a senha', !errado.ok, errado);
  const certo = await avaliar(c, `CM_CONTAS.recuperar({codigo:'${codigo}',senha:'${SENHA_NOVA}'})`, true);
  confere('código certo troca a senha', certo.ok && !!certo.codigo, certo);
  const reuso = await avaliar(c, `CM_CONTAS.recuperar({codigo:'${codigo}',senha:'outra-senha-boa-9'})`, true);
  confere('código usado é queimado', !reuso.ok, reuso);
  confere('senha antiga deixa de valer', !(await avaliar(c, `CM_CONTAS.entrarResponsavel('${SENHA}')`, true)).ok);
  confere('senha nova vale', (await avaliar(c, `CM_CONTAS.entrarResponsavel('${SENHA_NOVA}')`, true)).ok);

  // ── 10. recarregar: conta e sessão continuam, cada save no seu lugar ──
  await abrir(c, 1024, 768, BASE);
  await espera(600);
  await avaliar(c, dentro);
  const voltou = await avaliar(c, "({tem:CM_CONTAS.temConta(),ativo:CM_CONTAS.ativo()&&CM_CONTAS.ativo().apelido,chave:CM_CONTAS.chaveDoSave(),st:G.stars,ano:G.ano})");
  confere('conta sobrevive ao recarregamento', voltou.tem && voltou.ativo === 'Manu', voltou);
  confere('progresso do perfil ativo recarregado da chave dele', voltou.st === 640 && voltou.ano === 3 && voltou.chave === 'candymath_v3#' + idManu, voltou);
  await avaliar(c, "document.getElementById('btnPlay').click()");
  await espera(500);
  confere('com sessão aberta o Jogar vai direto ao hub', (await tela(c)) === 'screenHub', await tela(c));

  // sessão fechada: o Jogar passa pela escolha de estudante
  await avaliar(c, 'CM_CONTAS.sair()');
  await avaliar(c, "showScreen('screenSplash')");
  await espera(250);
  await avaliar(c, "document.getElementById('btnPlay').click()");
  await espera(500);
  confere('sem sessão o Jogar pede quem vai jogar', (await tela(c)) === 'screenEntrada', await tela(c));

  // ── 11. apagar um perfil apaga o progresso dele e só o dele ──
  await avaliar(c, `CM_CONTAS.entrarResponsavel('${SENHA_NOVA}')`, true);
  const apagou = await avaliar(c, `CM_CONTAS.removerPerfil('${idTeo}')`, true);
  confere('perfil apagado', apagou.ok && (await avaliar(c, 'CM_CONTAS.perfis().length')) === 1, apagou);
  confere('save do perfil apagado saiu do aparelho',
    (await avaliar(c, `localStorage.getItem('candymath_v3#${idTeo}')`)) === null);
  confere('save do outro perfil ficou',
    (await avaliar(c, `(window.__T.save('candymath_v3#${idManu}')||{}).stars`)) === 640);

  // ── 12. sem conta o jogo continua inteiro ──
  await avaliar(c, 'CM_CONTAS.jogarSemConta();CM_APP.trocarEstudante(null)');
  await espera(500);
  const semConta = await avaliar(c, "({chave:CM_CONTAS.chaveDoSave(),barra:document.getElementById('hubEstudanteNome').textContent,tela:window.__T.tela()})");
  confere('jogar sem conta volta para a chave de convidado', semConta.chave === 'candymath_v3', semConta);
  confere('barra volta a dizer que joga sem conta', semConta.barra === 'Jogando sem conta', semConta);

  // ── 13. apagar a conta limpa tudo ──
  await avaliar(c, `CM_CONTAS.entrarResponsavel('${SENHA_NOVA}')`, true);
  const fim = await avaliar(c, 'CM_CONTAS.apagarConta()', true);
  confere('conta apagada', fim.ok && !(await avaliar(c, 'CM_CONTAS.temConta()')));
  const resto = await avaliar(c, 'window.__T.chaves().filter(function(k){return k.indexOf("candymath_contas")===0||k.indexOf("candymath_v3#")===0;})');
  confere('nenhum registro de conta ou de perfil sobrou', resto.length === 0, resto);
  confere('área do adulto volta a ficar aberta sem conta', await avaliar(c, 'CM_CONTAS.adultoLiberado()'));

  // ── 14. a tela de entrada cabe em celular pequeno e em computador ──
  for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1440, 900]]) {
    await c.chamar('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: true });
    await avaliar(c, "CM_CONTAS.mostrar('semConta');showScreen('screenEntrada')");
    await espera(420);
    const geo = await avaliar(c, `(function(){
      var s=document.getElementById('screenEntrada'), p=document.querySelector('.entrada-palco');
      var alvos=Array.prototype.slice.call(document.querySelectorAll('#screenEntrada button, #screenEntrada a, #screenEntrada input'));
      var pequenos=alvos.filter(function(b){ return window.__T.vis(b) && b.getBoundingClientRect().height<40; }).map(function(b){return b.textContent.trim().slice(0,20);});
      var fora=alvos.filter(function(b){ var r=b.getBoundingClientRect(); return window.__T.vis(b)&&(r.right>window.innerWidth+2||r.left<-2); }).map(function(b){return b.textContent.trim().slice(0,20);});
      return {largura:window.innerWidth, rola:p.scrollHeight>p.clientHeight+2, docOver:document.documentElement.scrollWidth-window.innerWidth, pequenos:pequenos, fora:fora};
    })()`);
    confere('entrada em ' + w + 'x' + h + ' sem estouro lateral', geo.docOver <= 0 && geo.fora.length === 0, geo);
    confere('entrada em ' + w + 'x' + h + ' com alvos de toque inteiros', geo.pequenos.length === 0, geo);
  }

  // ── 15. nenhum erro de console no caminho ──
  const gritos = c.eventos.filter((e) =>
    (e.method === 'Runtime.exceptionThrown')
    || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error'
      && !/favicon|font|net::ERR|Failed to load resource/i.test(e.params.entry.text)));
  confere('nenhum erro de execução no percurso', gritos.length === 0,
    gritos.slice(0, 4).map((e) => (e.params.entry || {}).text || (e.params.exceptionDetails || {}).text));

  await nav.desligar(c);
  console.log('contas — fluxo completo em navegador real');
  if (problemas.length) console.log('\n' + problemas.join('\n'));
  else console.log('conta, perfis, PIN, porta do adulto, exportação, recuperação e apagamento: tudo conferido.');
  console.log('checagens: ' + checagens + ' · problemas: ' + problemas.length);
  process.exitCode = problemas.length ? 1 : 0;
}

main().catch(async (e) => {
  console.log('contas — o teste não terminou: ' + e.message);
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
      console.log('cofre: ' + await avaliar(conexao,
        "(function(){var m=document.getElementById('modalCofre');if(!m)return 'sem #modalCofre';"
        + "var s=getComputedStyle(m);var r=m.getBoundingClientRect();"
        + "return 'display='+s.display+' style='+m.getAttribute('style')+' caixa='+Math.round(r.width)+'x'+Math.round(r.height)"
        + "+' overlay='+document.getElementById('modalOverlay').className;})()"));
    } catch (e) { /* a página pode ter caído */ }
  }
  // Sem isto o navegador órfão segura a porta e a próxima rodada morre antes
  // de começar. Quem desliga o Edge é o DevTools, não o taskkill no lançador.
  if (conexao) await nav.desligar(conexao);
  else nav.encerrar();
  process.exitCode = 1;
});