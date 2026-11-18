/* ============================================================
   CANDY MATH — contas.js
   Conta do responsável e perfis de estudante, no próprio aparelho.

   Por que existe: a conexão com o banco (nuvem.js) é opcional e só
   funciona depois de alguém publicar um projeto Supabase. Sem ela,
   qualquer pessoa que abrisse o jogo no mesmo navegador via o mesmo
   progresso — dois irmãos, uma turma inteira. Aqui cada estudante tem
   o próprio save, e a área de quem acompanha fica atrás de senha.

   O que este módulo NÃO faz, de propósito:
     - não pede e-mail, nome completo, idade, escola nem foto;
     - não manda nada para a rede (a conta local é só deste aparelho);
     - não finge que o PIN é criptografia: ele separa irmãos, e a senha
       do adulto é a única porta da área de quem acompanha.

   Senha e PIN nunca são guardados: guarda-se sal + derivado PBKDF2.
   Sem WebCrypto (página aberta em http de rede local, por exemplo) a
   criação de conta fica desligada com o motivo escrito na tela —
   guardar senha sem cofre seria pior do que não ter conta.
   ============================================================ */
(function (root) {
'use strict';

const CHAVE_CONTAS = 'candymath_contas_v1';
const CHAVE_SAVE = 'candymath_v3';
const CHAVE_ADULTO = 'candymath_adulto_ate';
const ITERACOES = 600000;          // PBKDF2-SHA256, recomendação OWASP
const BITS = 256;
const DIAS_DA_SESSAO = 30;
const MINUTOS_DO_ADULTO = 10;
const TENTATIVAS_DO_PIN = 5;
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // sem I, L, O, 0, 1
const TAMANHO_CODIGO = 12;

const K = {
  registro: null,      // { versao, responsavel, perfis, sessao }
  painel: 'perfis',    // o que a tela de entrada está mostrando
  alvo: null,          // perfil esperando PIN
  recado: null,        // { texto, tipo } do formulário visível
  aoMudar: [],
  pendente: null,      // ação esperando a senha do adulto
  codigoNovo: '',      // código de recuperação recém-criado, mostrado uma vez
};

// ── 1. COFRE ────────────────────────────────────────────
function cofre() {
  return !!(root.crypto && root.crypto.subtle && root.crypto.getRandomValues);
}

function motivoSemCofre() {
  if (cofre()) return '';
  return 'Este navegador não liberou o cofre de senhas (WebCrypto). Ele só abre em endereço ' +
    'https ou em localhost. Sem cofre não dá para guardar senha com segurança — então a conta ' +
    'não é criada, e o jogo continua funcionando sem conta neste aparelho.';
}

function bytes(n) {
  const b = new Uint8Array(n);
  root.crypto.getRandomValues(b);
  return b;
}

function para64(buf) {
  const b = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return root.btoa(s);
}

function de64(txt) {
  const s = root.atob(String(txt || ''));
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}

async function derivar(texto, sal, iteracoes) {
  const material = await root.crypto.subtle.importKey(
    'raw', new TextEncoder().encode(String(texto)), 'PBKDF2', false, ['deriveBits']);
  const saida = await root.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: sal, iterations: iteracoes, hash: 'SHA-256' }, material, BITS);
  return para64(saida);
}

async function segredoDe(texto) {
  const sal = bytes(16);
  return { sal: para64(sal), hash: await derivar(texto, sal, ITERACOES), iter: ITERACOES };
}

// Comparação de tempo constante: um `===` de string devolve no primeiro
// caractere diferente, e isso mede quantos caracteres acertaram.
function igual(a, b) {
  const x = String(a || ''), y = String(b || '');
  if (x.length !== y.length) return false;
  let dif = 0;
  for (let i = 0; i < x.length; i++) dif |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return dif === 0;
}

async function confere(texto, guardado) {
  if (!guardado || !guardado.sal || !guardado.hash) return false;
  const iter = Number(guardado.iter) || ITERACOES;
  try {
    return igual(await derivar(texto, de64(guardado.sal), iter), guardado.hash);
  } catch (e) { return false; }
}

function codigoAleatorio() {
  let out = '';
  while (out.length < TAMANHO_CODIGO) {
    const b = bytes(TAMANHO_CODIGO);
    for (let i = 0; i < b.length && out.length < TAMANHO_CODIGO; i++) {
      // 31 letras não dividem 256: o resto enviesaria o sorteio.
      if (b[i] < 31 * 8) out += ALFABETO[b[i] % 31];
    }
  }
  return out;
}

function codigoBonito(c) {
  return String(c || '').replace(/(.{4})(?=.)/g, '$1 ');
}

function idNovo(prefixo) {
  return prefixo + '-' + Array.from(bytes(6)).map((b) => b.toString(36).padStart(2, '0')).join('');
}

// ── 2. REGISTRO ─────────────────────────────────────────
function textoLimpo(v, max) {
  return String(v == null ? '' : v).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function segredoValido(s) {
  if (!s || typeof s !== 'object') return null;
  if (typeof s.sal !== 'string' || typeof s.hash !== 'string') return null;
  if (s.sal.length > 64 || s.hash.length > 128) return null;
  const iter = Number(s.iter);
  if (!Number.isInteger(iter) || iter < 100000 || iter > 2000000) return null;
  return { sal: s.sal, hash: s.hash, iter: iter };
}

function perfilValido(p) {
  if (!p || typeof p !== 'object') return null;
  const id = textoLimpo(p.id, 40);
  const apelido = textoLimpo(p.apelido, 24);
  if (!/^pf-[a-z0-9]+$/.test(id) || !apelido) return null;
  const ano = Number(p.ano);
  return {
    id: id,
    apelido: apelido,
    ano: Number.isInteger(ano) && ano >= 1 && ano <= 9 ? ano : 5,
    pin: segredoValido(p.pin),
    tentativas: Number.isInteger(p.tentativas) && p.tentativas >= 0 ? Math.min(p.tentativas, 99) : 0,
    criado: Number.isFinite(p.criado) && p.criado > 0 ? p.criado : Date.now(),
    ultimo: Number.isFinite(p.ultimo) && p.ultimo > 0 ? p.ultimo : 0,
  };
}

function registroValido(r) {
  if (!r || typeof r !== 'object' || r.versao !== 1) return null;
  const resp = r.responsavel;
  if (!resp || typeof resp !== 'object') return null;
  const senha = segredoValido(resp.senha);
  const recuperacao = segredoValido(resp.recuperacao);
  if (!senha || !recuperacao) return null;
  const perfis = Array.isArray(r.perfis) ? r.perfis.map(perfilValido).filter(Boolean).slice(0, 12) : [];
  const ids = {};
  const unicos = perfis.filter((p) => (ids[p.id] ? false : (ids[p.id] = true)));
  const s = r.sessao && typeof r.sessao === 'object' ? r.sessao : null;
  const sessao = s && ids[s.perfilId] && Number.isFinite(s.expira) && s.expira > Date.now()
    ? { perfilId: s.perfilId, desde: Number(s.desde) || Date.now(), expira: s.expira } : null;
  return {
    versao: 1,
    responsavel: {
      id: textoLimpo(resp.id, 40) || idNovo('ad'),
      nome: textoLimpo(resp.nome, 40) || 'Responsável',
      senha: senha,
      recuperacao: recuperacao,
      criado: Number.isFinite(resp.criado) && resp.criado > 0 ? resp.criado : Date.now(),
    },
    perfis: unicos,
    sessao: sessao,
  };
}

function ler() {
  try {
    const bruto = root.localStorage.getItem(CHAVE_CONTAS);
    if (!bruto) return null;
    return registroValido(JSON.parse(bruto));
  } catch (e) { return null; }
}

function gravar() {
  try {
    if (!K.registro) { root.localStorage.removeItem(CHAVE_CONTAS); return true; }
    root.localStorage.setItem(CHAVE_CONTAS, JSON.stringify(K.registro));
    return true;
  } catch (e) { return false; }
}

function avisou() { K.aoMudar.forEach((f) => { try { f(); } catch (e) { /* uma tela que estoura não leva as outras */ } }); }

function dizer(texto, tipo) {
  K.recado = { texto: texto, tipo: tipo || '' };
  avisou();
}

// ── 3. SESSÃO ───────────────────────────────────────────
function temConta() { return !!(K.registro && K.registro.responsavel); }
function perfis() { return K.registro ? K.registro.perfis.slice() : []; }
function perfilPorId(id) { return perfis().filter((p) => p.id === id)[0] || null; }

function ativo() {
  if (!K.registro || !K.registro.sessao) return null;
  return perfilPorId(K.registro.sessao.perfilId);
}

function chaveDoSave() {
  const p = ativo();
  return p ? CHAVE_SAVE + '#' + p.id : CHAVE_SAVE;
}

function abrirSessao(id) {
  if (!K.registro) return false;
  const p = perfilPorId(id);
  if (!p) return false;
  p.ultimo = Date.now();
  p.tentativas = 0;
  K.registro.sessao = { perfilId: id, desde: Date.now(), expira: Date.now() + DIAS_DA_SESSAO * 864e5 };
  return gravar();
}

function fecharSessao() {
  if (!K.registro) return;
  K.registro.sessao = null;
  gravar();
  trancarAdulto();
}

// A senha do adulto vale por dez minutos e morre quando a aba fecha: fica em
// sessionStorage, não no disco. Boletim, exclusão e perfis passam por aqui.
function adultoLiberado() {
  if (!temConta()) return true;      // sem conta não há porta a trancar
  try {
    const ate = Number(root.sessionStorage.getItem(CHAVE_ADULTO) || 0);
    return ate > Date.now();
  } catch (e) { return false; }
}

function liberarAdulto() {
  try { root.sessionStorage.setItem(CHAVE_ADULTO, String(Date.now() + MINUTOS_DO_ADULTO * 6e4)); } catch (e) {}
}

function trancarAdulto() {
  try { root.sessionStorage.removeItem(CHAVE_ADULTO); } catch (e) {}
}

// ── 4. AÇÕES ────────────────────────────────────────────
const SENHA_MINIMA = 8;

function senhaAceitavel(senha, nome) {
  const s = String(senha || '');
  if (s.length < SENHA_MINIMA) return 'A senha precisa de pelo menos ' + SENHA_MINIMA + ' caracteres.';
  if (s.length > 128) return 'A senha passou de 128 caracteres.';
  if (/^\d+$/.test(s)) return 'Uma senha só de números é fácil de adivinhar. Misture letras.';
  if (nome && s.toLowerCase() === String(nome).toLowerCase()) return 'A senha não pode ser igual ao nome.';
  if (/^(senha|password|12345678|abcdefgh|candymath)/i.test(s)) return 'Essa senha é das mais tentadas. Escolha outra.';
  return '';
}

async function criarResponsavel(dados) {
  if (!cofre()) return { ok: false, erro: motivoSemCofre() };
  if (temConta()) return { ok: false, erro: 'Este aparelho já tem uma conta de responsável.' };
  const nome = textoLimpo(dados && dados.nome, 40);
  if (nome.length < 2) return { ok: false, erro: 'Escreva um nome ou apelido de quem acompanha (2 letras ou mais).' };
  const problema = senhaAceitavel(dados && dados.senha, nome);
  if (problema) return { ok: false, erro: problema };
  const codigo = codigoAleatorio();
  K.registro = {
    versao: 1,
    responsavel: {
      id: idNovo('ad'), nome: nome,
      senha: await segredoDe(dados.senha),
      recuperacao: await segredoDe(codigo),
      criado: Date.now(),
    },
    perfis: [],
    sessao: null,
  };
  if (!gravar()) { K.registro = null; return { ok: false, erro: 'O navegador não deixou guardar a conta neste aparelho.' }; }
  liberarAdulto();
  K.codigoNovo = codigo;
  return { ok: true, codigo: codigo };
}

async function entrarResponsavel(senha) {
  if (!temConta()) return { ok: false, erro: 'Não há conta neste aparelho.' };
  if (!(await confere(senha, K.registro.responsavel.senha))) {
    return { ok: false, erro: 'Senha não confere.' };
  }
  liberarAdulto();
  return { ok: true };
}

async function recuperar(dados) {
  if (!temConta()) return { ok: false, erro: 'Não há conta neste aparelho.' };
  const codigo = String((dados && dados.codigo) || '').toUpperCase().replace(/[^A-Z2-9]/g, '');
  if (!(await confere(codigo, K.registro.responsavel.recuperacao))) {
    return { ok: false, erro: 'Código de recuperação não confere. Ele tem 12 letras e números, sem espaços.' };
  }
  const problema = senhaAceitavel(dados && dados.senha, K.registro.responsavel.nome);
  if (problema) return { ok: false, erro: problema };
  K.registro.responsavel.senha = await segredoDe(dados.senha);
  // O código usado é queimado: quem achou o papel velho não entra mais.
  const novo = codigoAleatorio();
  K.registro.responsavel.recuperacao = await segredoDe(novo);
  if (!gravar()) return { ok: false, erro: 'Não deu para gravar a nova senha neste aparelho.' };
  liberarAdulto();
  K.codigoNovo = novo;
  return { ok: true, codigo: novo };
}

async function criarPerfil(dados) {
  if (!temConta()) return { ok: false, erro: 'Crie a conta de quem acompanha primeiro.' };
  if (!adultoLiberado()) return { ok: false, erro: 'Confirme a senha de quem acompanha antes de criar perfil.' };
  const apelido = textoLimpo(dados && dados.apelido, 24);
  if (apelido.length < 2) return { ok: false, erro: 'Escreva o apelido do estudante (2 letras ou mais).' };
  if (perfis().some((p) => p.apelido.toLowerCase() === apelido.toLowerCase())) {
    return { ok: false, erro: 'Já existe um perfil com esse apelido. Use outro para não confundir.' };
  }
  if (perfis().length >= 12) return { ok: false, erro: 'Este aparelho já tem 12 perfis.' };
  const ano = Number(dados && dados.ano);
  const pin = String((dados && dados.pin) || '').trim();
  if (pin && !/^\d{4}$/.test(pin)) return { ok: false, erro: 'O PIN são 4 números. Deixe vazio se não quiser PIN.' };
  const p = {
    id: idNovo('pf'), apelido: apelido,
    ano: Number.isInteger(ano) && ano >= 1 && ano <= 9 ? ano : 5,
    pin: pin ? await segredoDe(pin) : null,
    tentativas: 0, criado: Date.now(), ultimo: 0,
  };
  K.registro.perfis.push(p);
  if (!gravar()) { K.registro.perfis.pop(); return { ok: false, erro: 'O navegador não deixou guardar o perfil.' }; }
  if (dados && dados.trazerProgresso) migrarSaveConvidado(p.id);
  return { ok: true, id: p.id };
}

// O progresso que já estava no aparelho não se perde: ele passa para o
// primeiro perfil, e a entrada "sem conta" fica zerada para quem vier depois.
function migrarSaveConvidado(id) {
  try {
    const antigo = root.localStorage.getItem(CHAVE_SAVE);
    if (!antigo) return false;
    root.localStorage.setItem(CHAVE_SAVE + '#' + id, antigo);
    root.localStorage.removeItem(CHAVE_SAVE);
    return true;
  } catch (e) { return false; }
}

function temProgressoConvidado() {
  try {
    const d = JSON.parse(root.localStorage.getItem(CHAVE_SAVE) || 'null');
    return !!(d && (Number(d.stars) > 0 || Number(d.totalCorrect) > 0));
  } catch (e) { return false; }
}

async function removerPerfil(id) {
  if (!adultoLiberado()) return { ok: false, erro: 'Confirme a senha de quem acompanha antes de apagar perfil.' };
  const p = perfilPorId(id);
  if (!p) return { ok: false, erro: 'Perfil não encontrado.' };
  K.registro.perfis = perfis().filter((x) => x.id !== id);
  if (K.registro.sessao && K.registro.sessao.perfilId === id) K.registro.sessao = null;
  gravar();
  try { root.localStorage.removeItem(CHAVE_SAVE + '#' + id); } catch (e) {}
  return { ok: true };
}

async function abrirPerfil(id, pin) {
  const p = perfilPorId(id);
  if (!p) return { ok: false, erro: 'Perfil não encontrado.' };
  if (p.pin) {
    if (p.tentativas >= TENTATIVAS_DO_PIN) {
      return { ok: false, erro: 'pin-travado', travado: true, aviso: 'Muitas tentativas. Peça a senha de quem acompanha para abrir este perfil.' };
    }
    if (!(await confere(String(pin || ''), p.pin))) {
      p.tentativas++;
      gravar();
      const restam = TENTATIVAS_DO_PIN - p.tentativas;
      if (restam <= 0) {
        return { ok: false, travado: true, erro: 'PIN não confere. O perfil travou: peça a senha de quem acompanha para abrir.' };
      }
      return { ok: false, erro: 'PIN não confere. Restam ' + restam + ' tentativa(s).' };
    }
  }
  if (!abrirSessao(id)) return { ok: false, erro: 'O navegador não deixou guardar a sessão.' };
  return { ok: true, perfil: p };
}

// Quem acompanha já provou a senha nos últimos minutos: destravar o PIN do
// próprio filho não pode pedir tudo de novo, e muito menos falhar calado.
function abrirComoAdulto(id) {
  const p = perfilPorId(id);
  if (!p) return { ok: false, erro: 'Perfil não encontrado.' };
  p.tentativas = 0;
  abrirSessao(id);
  K.painel = 'perfis';
  K.alvo = null;
  K.recado = null;
  if (root.CM_APP && root.CM_APP.trocarEstudante) root.CM_APP.trocarEstudante(p);
  return { ok: true, perfil: p };
}

function destravarPerfil(id) {
  if (adultoLiberado()) { abrirComoAdulto(id); return; }
  pedirSenha('Abrir o perfil de ' + (perfilPorId(id) || {}).apelido, (senha) => abrirComSenha(id, senha));
}

async function abrirComSenha(id, senha) {
  const r = await entrarResponsavel(senha);
  if (!r.ok) return r;
  return abrirComoAdulto(id);
}

function jogarSemConta() {
  fecharSessao();
  K.painel = 'perfis';
  avisou();
}

function sair() {
  fecharSessao();
  K.painel = 'perfis';
  avisou();
}

async function apagarConta() {
  if (!adultoLiberado()) return { ok: false, erro: 'Confirme a senha de quem acompanha antes de apagar a conta.' };
  const ids = perfis().map((p) => p.id);
  try {
    ids.forEach((id) => root.localStorage.removeItem(CHAVE_SAVE + '#' + id));
    root.localStorage.removeItem(CHAVE_CONTAS);
  } catch (e) {}
  K.registro = null;
  K.codigoNovo = '';
  trancarAdulto();
  avisou();
  return { ok: true };
}

// Portabilidade (LGPD, art. 18, V): o que existe sobre cada estudante sai
// daqui em JSON legível por máquina, sem senha e sem derivado de senha.
function exportar() {
  const saida = {
    formato: 'candy-math/dados-locais',
    versao: 1,
    geradoEm: new Date().toISOString(),
    aviso: 'Dados guardados neste aparelho. Senhas e PINs não são exportados: só o derivado existe, e ele não sai daqui.',
    responsavel: temConta() ? { nome: K.registro.responsavel.nome, criadoEm: new Date(K.registro.responsavel.criado).toISOString() } : null,
    // A decisão sobre cada saída de dados também é dado de quem acompanha:
    // portabilidade sem ela entregaria metade do que existe sobre a pessoa.
    consentimento: root.CM_CONSENTIMENTO ? root.CM_CONSENTIMENTO.resumo() : null,
    estudantes: [],
    semConta: null,
  };
  const lerSave = (chave) => {
    try { return JSON.parse(root.localStorage.getItem(chave) || 'null'); } catch (e) { return null; }
  };
  perfis().forEach((p) => {
    saida.estudantes.push({
      apelido: p.apelido, ano: p.ano,
      criadoEm: new Date(p.criado).toISOString(),
      ultimoAcesso: p.ultimo ? new Date(p.ultimo).toISOString() : null,
      progresso: lerSave(CHAVE_SAVE + '#' + p.id),
    });
  });
  saida.semConta = lerSave(CHAVE_SAVE);
  return saida;
}

// ── 5. CONSTRUTORES DE TELA ─────────────────────────────
function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto != null) e.textContent = texto;
  return e;
}

function botao(rotulo, classe, aoClicar, icone) {
  const b = el('button', 'btn-conta' + (classe ? ' ' + classe : ''));
  b.type = 'button';
  if (icone) {
    const i = el('i', 'fa-solid ' + icone);
    i.setAttribute('aria-hidden', 'true');
    b.appendChild(i);
  }
  b.appendChild(document.createTextNode(' ' + rotulo));
  b.onclick = aoClicar;
  return b;
}

function campo(tipo, rotulo, nome, dica, autocompletar) {
  const r = el('label', 'conta-campo');
  r.appendChild(el('span', 'conta-rotulo', rotulo));
  const i = el('input', 'conta-entrada');
  i.type = tipo;
  i.id = nome;
  i.name = nome;
  i.placeholder = dica || '';
  i.autocomplete = autocompletar || 'off';
  if (tipo === 'password') {
    i.spellcheck = false;
    i.setAttribute('autocapitalize', 'none');
    i.setAttribute('autocorrect', 'off');
  }
  if (tipo === 'text' && /apelido|nome/i.test(nome)) i.maxLength = 24;
  r.appendChild(i);
  return { caixa: r, entrada: i, get valor() { return i.value; } };
}

function recado() {
  const p = el('p', 'conta-msg');
  if (!K.recado) { p.hidden = true; return p; }
  p.className = 'conta-msg' + (K.recado.tipo === 'erro' ? ' conta-erro' : K.recado.tipo === 'ok' ? ' conta-ok' : '');
  p.textContent = K.recado.texto;
  p.setAttribute('role', K.recado.tipo === 'erro' ? 'alert' : 'status');
  return p;
}

function nota(texto) { return el('p', 'conta-nota', texto); }

function ocupado(b, texto) {
  b.disabled = true;
  b.dataset.rotulo = b.textContent;
  b.textContent = texto;
}
function livre(b) {
  b.disabled = false;
  if (b.dataset.rotulo) b.textContent = b.dataset.rotulo;
}

// Cada perfil aparece com a Juba vestida como aquele estudante deixou: é o
// jeito de uma criança que ainda não lê reconhecer o próprio boneco.
function avatarDe(id) {
  const caixa = el('div', 'conta-avatar');
  let equip = null;
  try {
    const d = JSON.parse(root.localStorage.getItem(CHAVE_SAVE + '#' + id) || 'null');
    if (d && d.equip) equip = d.equip;
  } catch (e) { equip = null; }
  if (root.CM_MASCOTE) {
    caixa.innerHTML = root.CM_MASCOTE.svg(equip || {}, { corte: 'rosto', titulo: '' });
    const svg = caixa.querySelector('svg');
    if (svg) { svg.setAttribute('aria-hidden', 'true'); svg.removeAttribute('aria-label'); }
  }
  return caixa;
}

function cartaoDePerfil(p) {
  const b = el('button', 'conta-cartao');
  b.type = 'button';
  // Perfil travado não oferece o campo de PIN: nenhum PIN abre enquanto o
  // contador não for zerado por quem acompanha. Mandar a criança digitar à toa
  // seria pior do que dizer logo o que aconteceu.
  const travado = p.tentativas >= TENTATIVAS_DO_PIN;
  b.appendChild(avatarDe(p.id));
  b.appendChild(el('span', 'conta-cartao-nome', p.apelido));
  b.appendChild(el('span', 'conta-cartao-ano', p.ano + 'º ano'));
  if (p.pin) {
    const c = el('span', 'conta-cartao-pin' + (travado ? ' conta-cartao-travado' : ''));
    const i = el('i', travado ? 'fa-solid fa-lock' : 'fa-solid fa-key');
    i.setAttribute('aria-hidden', 'true');
    c.appendChild(i);
    c.appendChild(document.createTextNode(travado ? ' Travado' : ' PIN'));
    b.appendChild(c);
  }
  b.setAttribute('aria-label', 'Jogar como ' + p.apelido + ', ' + p.ano + 'º ano'
    + (travado ? ', travado por tentativas de PIN: precisa da senha de quem acompanha'
      : p.pin ? ', protegido por PIN' : ''));
  b.onclick = () => {
    K.recado = null;
    // O estado é relido no clique: a lista pode ter sido desenhada antes de o
    // contador chegar ao limite, e um cartão velho não pode mandar a criança
    // digitar um PIN que já não abre nada.
    const agora = perfilPorId(p.id) || p;
    if (agora.tentativas >= TENTATIVAS_DO_PIN) { destravarPerfil(agora.id); return; }
    if (agora.pin) { K.alvo = agora.id; K.painel = 'pin'; avisou(); }
    else escolher(agora.id, '');
  };
  return b;
}

async function escolher(id, pin) {
  const r = await abrirPerfil(id, pin);
  if (!r.ok) {
    // No erro que trava, a criança não fica olhando um campo de PIN que não
    // abre mais nada: a porta de quem acompanha aparece na hora, e o motivo
    // fica escrito na tela para quando ela voltar.
    if (r.travado) {
      K.recado = { texto: r.aviso || r.erro, tipo: 'erro' };
      destravarPerfil(id);
      return;
    }
    dizer(r.erro, 'erro');
    return;
  }
  K.painel = 'perfis';
  K.alvo = null;
  K.recado = null;
  if (root.CM_APP && root.CM_APP.trocarEstudante) root.CM_APP.trocarEstudante(r.perfil);
}

// ── 6. PAINÉIS DA TELA DE ENTRADA ───────────────────────
function painelPerfis() {
  const f = el('div', 'conta-painel');
  const lista = perfis();
  if (!lista.length) return painelNovoPerfil();
  const grade = el('div', 'conta-grade');
  lista.forEach((p) => grade.appendChild(cartaoDePerfil(p)));
  f.appendChild(grade);
  f.appendChild(recado());
  const acoes = el('div', 'conta-acoes');
  acoes.appendChild(botao('Adicionar estudante', 'conta-sec', () => {
    K.recado = null; K.painel = 'novoPerfil'; avisou();
  }, 'fa-user-plus'));
  acoes.appendChild(botao('Gerenciar perfis', 'conta-sec', () => {
    pedirSenha('Gerenciar perfis', () => { K.painel = 'gerenciar'; K.recado = null; avisou(); return { ok: true }; });
  }, 'fa-users-gear'));
  f.appendChild(acoes);
  return f;
}

function painelNovoPerfil() {
  const f = el('form', 'conta-painel');
  f.appendChild(el('h3', 'conta-subtitulo', 'Quem vai estudar neste aparelho'));
  f.appendChild(nota('Só o apelido e o ano. Cada estudante guarda o próprio progresso, ' +
    'as próprias estrelas e a própria roupa da Juba — nada se mistura.'));
  const apelido = campo('text', 'Apelido do estudante', 'contaApelido', 'Ex.: Manu', 'nickname');
  f.appendChild(apelido.caixa);
  const ano = el('label', 'conta-campo');
  ano.appendChild(el('span', 'conta-rotulo', 'Ano do Ensino Fundamental'));
  const sel = el('select', 'conta-entrada');
  sel.id = 'contaAno';
  sel.name = 'contaAno';
  for (let a = 1; a <= 9; a++) {
    const o = el('option', '', a + 'º ano');
    o.value = String(a);
    if (a === 5) o.selected = true;
    sel.appendChild(o);
  }
  ano.appendChild(sel);
  f.appendChild(ano);
  const pin = campo('password', 'PIN de 4 números (opcional)', 'contaPin', 'Deixe vazio para não usar', 'new-password');
  pin.entrada.inputMode = 'numeric';
  pin.entrada.maxLength = 4;
  f.appendChild(pin.caixa);
  f.appendChild(nota('O PIN evita que um irmão abra o perfil do outro por engano. Ele não é uma senha forte: ' +
    'a proteção da área de quem acompanha é a senha do responsável.'));
  let trazer = null;
  if (temProgressoConvidado()) {
    trazer = el('label', 'conta-marca');
    const c = el('input', '');
    c.type = 'checkbox';
    c.checked = true;
    c.id = 'contaTrazer';
    trazer.appendChild(c);
    trazer.appendChild(el('span', '', 'Trazer o progresso que já está neste aparelho para este perfil'));
    f.appendChild(trazer);
  }
  f.appendChild(recado());
  const acoes = el('div', 'conta-acoes');
  const criar = botao('Criar perfil', 'conta-principal', async () => {
    ocupado(criar, 'Criando…');
    const r = await criarPerfil({
      apelido: apelido.valor, ano: sel.value, pin: pin.valor,
      trazerProgresso: !!(trazer && trazer.querySelector('input').checked),
    });
    livre(criar);
    if (!r.ok) { dizer(r.erro, 'erro'); return; }
    K.painel = 'perfis';
    dizer('Perfil criado. Toque nele para jogar.', 'ok');
  }, 'fa-check');
  acoes.appendChild(criar);
  if (perfis().length) {
    acoes.appendChild(botao('Voltar', 'conta-sec', () => { K.painel = 'perfis'; K.recado = null; avisou(); }, 'fa-arrow-left'));
  }
  f.appendChild(acoes);
  f.onsubmit = (ev) => { ev.preventDefault(); criar.click(); };
  return f;
}

function painelPin() {
  const p = perfilPorId(K.alvo);
  const f = el('form', 'conta-painel');
  if (!p) { K.painel = 'perfis'; return painelPerfis(); }
  const topo = el('div', 'conta-pin-topo');
  topo.appendChild(avatarDe(p.id));
  topo.appendChild(el('h3', 'conta-subtitulo', 'Oi, ' + p.apelido + '!'));
  f.appendChild(topo);
  // Perfil travado não tem campo de PIN: nenhum número abre enquanto quem
  // acompanha não zerar o contador. Oferecer o campo seria pedir trabalho à toa.
  if (p.tentativas >= TENTATIVAS_DO_PIN) {
    f.appendChild(nota('Este perfil travou depois de muitas tentativas de PIN. '
      + 'Quem acompanha precisa confirmar a senha para abrir de novo.'));
    f.appendChild(recado());
    const travadas = el('div', 'conta-acoes');
    travadas.appendChild(botao('Chamar quem acompanha', 'conta-principal',
      () => destravarPerfil(p.id), 'fa-user-shield'));
    travadas.appendChild(botao('Voltar', 'conta-sec',
      () => { K.painel = 'perfis'; K.alvo = null; avisou(); }, 'fa-arrow-left'));
    f.appendChild(travadas);
    return f;
  }
  f.appendChild(nota('Digite o PIN de 4 números deste perfil.'));
  const pin = campo('password', 'PIN', 'contaPinEntrar', '••••', 'current-password');
  pin.entrada.inputMode = 'numeric';
  pin.entrada.maxLength = 4;
  f.appendChild(pin.caixa);
  f.appendChild(recado());
  const acoes = el('div', 'conta-acoes');
  const entrar = botao('Entrar', 'conta-principal', async () => {
    ocupado(entrar, 'Conferindo…');
    await escolher(p.id, pin.valor);
    livre(entrar);
  }, 'fa-door-open');
  acoes.appendChild(entrar);
  acoes.appendChild(botao('Voltar', 'conta-sec', () => { K.painel = 'perfis'; K.alvo = null; K.recado = null; avisou(); }, 'fa-arrow-left'));
  acoes.appendChild(botao('Esqueci o PIN', 'conta-sec', () => destravarPerfil(p.id), 'fa-key'));
  f.appendChild(acoes);
  f.onsubmit = (ev) => { ev.preventDefault(); entrar.click(); };
  setTimeout(() => pin.entrada.focus(), 60);
  return f;
}

function painelSemConta() {
  const f = el('div', 'conta-painel');
  f.appendChild(el('h3', 'conta-subtitulo', 'Uma conta para quem acompanha'));
  f.appendChild(nota('A conta separa o progresso de cada estudante e tranca o boletim, a exclusão de dados ' +
    'e a conexão com a internet atrás de uma senha. Ela fica só neste aparelho: não pedimos e-mail ' +
    'nem nome completo, e nada é enviado para a rede.'));
  f.appendChild(recado());
  const acoes = el('div', 'conta-acoes');
  if (cofre()) {
    acoes.appendChild(botao('Criar conta', 'conta-principal', () => { K.painel = 'criar'; K.recado = null; avisou(); }, 'fa-user-shield'));
  } else {
    f.appendChild(el('p', 'conta-msg conta-erro', motivoSemCofre()));
  }
  acoes.appendChild(botao('Jogar sem conta', 'conta-sec', () => {
    jogarSemConta();
    if (root.CM_APP && root.CM_APP.trocarEstudante) root.CM_APP.trocarEstudante(null);
  }, 'fa-gamepad'));
  f.appendChild(acoes);
  f.appendChild(nota('Sem conta o jogo funciona inteiro, com um único progresso guardado neste navegador.'));
  return f;
}

function painelCriar() {
  const f = el('form', 'conta-painel');
  f.appendChild(el('h3', 'conta-subtitulo', 'Conta de quem acompanha'));
  const nome = campo('text', 'Seu nome ou apelido', 'contaNomeResp', 'Ex.: Mãe da Manu', 'nickname');
  f.appendChild(nome.caixa);
  const senha = campo('password', 'Senha (mínimo 8 caracteres)', 'contaSenhaNova', '••••••••', 'new-password');
  f.appendChild(senha.caixa);
  const outra = campo('password', 'Repita a senha', 'contaSenhaNova2', '••••••••', 'new-password');
  f.appendChild(outra.caixa);
  f.appendChild(nota('Esta senha abre o boletim, os perfis, a conexão e a exclusão de dados. ' +
    'Ela não é guardada: só um derivado dela, que não serve para descobrir a senha.'));
  f.appendChild(recado());
  const acoes = el('div', 'conta-acoes');
  const criar = botao('Criar conta', 'conta-principal', async () => {
    if (senha.valor !== outra.valor) { dizer('As duas senhas estão diferentes.', 'erro'); return; }
    ocupado(criar, 'Guardando com segurança…');
    const r = await criarResponsavel({ nome: nome.valor, senha: senha.valor });
    livre(criar);
    if (!r.ok) { dizer(r.erro, 'erro'); return; }
    K.painel = 'codigo';
    K.recado = null;
    avisou();
  }, 'fa-user-shield');
  acoes.appendChild(criar);
  acoes.appendChild(botao('Voltar', 'conta-sec', () => { K.painel = temConta() ? 'perfis' : 'semConta'; K.recado = null; avisou(); }, 'fa-arrow-left'));
  f.appendChild(acoes);
  f.onsubmit = (ev) => { ev.preventDefault(); criar.click(); };
  return f;
}

function painelCodigo() {
  const f = el('div', 'conta-painel');
  f.appendChild(el('h3', 'conta-subtitulo', 'Guarde o código de recuperação'));
  f.appendChild(nota('Sem servidor de e-mail, este código é o único caminho de volta se a senha for esquecida. ' +
    'Ele aparece uma vez só. Anote em papel e guarde fora deste aparelho.'));
  const caixa = el('p', 'conta-codigo', codigoBonito(K.codigoNovo));
  f.appendChild(caixa);
  f.appendChild(recado());
  const acoes = el('div', 'conta-acoes');
  acoes.appendChild(botao('Copiar código', 'conta-sec', async () => {
    try {
      await root.navigator.clipboard.writeText(codigoBonito(K.codigoNovo));
      dizer('Código copiado.', 'ok');
    } catch (e) { dizer('O navegador não deixou copiar. Anote o código à mão.', 'erro'); }
  }, 'fa-copy'));
  const guardei = el('label', 'conta-marca');
  const c = el('input', '');
  c.type = 'checkbox';
  c.id = 'contaGuardei';
  guardei.appendChild(c);
  guardei.appendChild(el('span', '', 'Anotei o código em lugar seguro'));
  f.appendChild(guardei);
  const seguir = botao('Continuar', 'conta-principal', () => {
    if (!c.checked) { dizer('Marque que anotou o código: depois desta tela ele não aparece mais.', 'erro'); return; }
    K.codigoNovo = '';
    K.painel = 'novoPerfil';
    K.recado = null;
    avisou();
  }, 'fa-arrow-right');
  acoes.appendChild(seguir);
  f.appendChild(acoes);
  return f;
}

function painelRecuperar() {
  const f = el('form', 'conta-painel');
  f.appendChild(el('h3', 'conta-subtitulo', 'Recuperar o acesso'));
  f.appendChild(nota('Digite o código de 12 caracteres que você anotou quando criou a conta. ' +
    'Um código novo será gerado no lugar dele.'));
  const codigo = campo('text', 'Código de recuperação', 'contaCodigo', 'ABCD EFGH JKMN', 'off');
  codigo.entrada.maxLength = 20;
  codigo.entrada.setAttribute('autocapitalize', 'characters');
  f.appendChild(codigo.caixa);
  const senha = campo('password', 'Nova senha', 'contaSenhaRec', '••••••••', 'new-password');
  f.appendChild(senha.caixa);
  const outra = campo('password', 'Repita a nova senha', 'contaSenhaRec2', '••••••••', 'new-password');
  f.appendChild(outra.caixa);
  f.appendChild(recado());
  const acoes = el('div', 'conta-acoes');
  const trocar = botao('Trocar a senha', 'conta-principal', async () => {
    if (senha.valor !== outra.valor) { dizer('As duas senhas estão diferentes.', 'erro'); return; }
    ocupado(trocar, 'Conferindo o código…');
    const r = await recuperar({ codigo: codigo.valor, senha: senha.valor });
    livre(trocar);
    if (!r.ok) { dizer(r.erro, 'erro'); return; }
    K.painel = 'codigo';
    K.recado = null;
    avisou();
  }, 'fa-key');
  acoes.appendChild(trocar);
  acoes.appendChild(botao('Voltar', 'conta-sec', () => { K.painel = 'perfis'; K.recado = null; avisou(); }, 'fa-arrow-left'));
  f.appendChild(acoes);
  f.onsubmit = (ev) => { ev.preventDefault(); trocar.click(); };
  return f;
}

function painelGerenciar() {
  const f = el('div', 'conta-painel');
  f.appendChild(el('h3', 'conta-subtitulo', 'Perfis deste aparelho'));
  f.appendChild(nota('Responsável: ' + K.registro.responsavel.nome + '. Apagar um perfil apaga o progresso dele junto.'));
  const lista = el('ul', 'conta-lista');
  perfis().forEach((p) => {
    const li = el('li', 'conta-item');
    li.appendChild(avatarDe(p.id));
    const texto = el('div', 'conta-item-texto');
    texto.appendChild(el('span', 'conta-item-nome', p.apelido));
    texto.appendChild(el('span', 'conta-item-detalhe', p.ano + 'º ano · ' + (p.pin ? 'com PIN' : 'sem PIN') +
      (p.ultimo ? ' · último acesso ' + new Date(p.ultimo).toLocaleDateString('pt-BR') : ' · nunca jogou')));
    li.appendChild(texto);
    li.appendChild(botao('Apagar', 'conta-perigo', async () => {
      if (li.dataset.armed !== '1') {
        li.dataset.armed = '1';
        dizer('Toque em "Apagar" de novo para apagar ' + p.apelido + ' e o progresso dele.', 'erro');
        return;
      }
      const r = await removerPerfil(p.id);
      dizer(r.ok ? 'Perfil apagado.' : r.erro, r.ok ? 'ok' : 'erro');
    }, 'fa-trash-can'));
    lista.appendChild(li);
  });
  if (!perfis().length) f.appendChild(nota('Nenhum perfil ainda.'));
  f.appendChild(lista);
  f.appendChild(recado());
  const acoes = el('div', 'conta-acoes');
  acoes.appendChild(botao('Adicionar estudante', 'conta-principal', () => { K.painel = 'novoPerfil'; K.recado = null; avisou(); }, 'fa-user-plus'));
  acoes.appendChild(botao('Baixar meus dados', 'conta-sec', () => {
    if (root.CM_APP && root.CM_APP.baixarDados) root.CM_APP.baixarDados(exportar());
  }, 'fa-file-export'));
  acoes.appendChild(botao('Recuperar acesso', 'conta-sec', () => { K.painel = 'recuperar'; K.recado = null; avisou(); }, 'fa-key'));
  acoes.appendChild(botao('Voltar', 'conta-sec', () => { K.painel = 'perfis'; K.recado = null; avisou(); }, 'fa-arrow-left'));
  f.appendChild(acoes);
  const perigo = el('div', 'conta-zona-perigo');
  perigo.appendChild(el('h4', 'conta-perigo-titulo', 'Apagar a conta inteira'));
  perigo.appendChild(nota('Remove a conta, todos os perfis e todo o progresso guardado neste aparelho. Não há volta.'));
  let armado = false;
  const apagar = botao('Apagar conta e todos os perfis', 'conta-perigo', async () => {
    if (!armado) { armado = true; apagar.textContent = 'Toque de novo para apagar tudo'; return; }
    const r = await apagarConta();
    if (r.ok && root.CM_APP && root.CM_APP.trocarEstudante) root.CM_APP.trocarEstudante(null);
    dizer(r.ok ? 'Conta apagada deste aparelho.' : r.erro, r.ok ? 'ok' : 'erro');
  }, 'fa-triangle-exclamation');
  perigo.appendChild(apagar);
  f.appendChild(perigo);
  return f;
}

const PAINEIS = {
  perfis: painelPerfis, novoPerfil: painelNovoPerfil, pin: painelPin,
  semConta: painelSemConta, criar: painelCriar, codigo: painelCodigo,
  recuperar: painelRecuperar, gerenciar: painelGerenciar,
};

function pintarEntrada() {
  const corpo = document.getElementById('entradaCorpo');
  if (!corpo) return;
  if (!temConta()) K.painel = K.painel === 'criar' || K.painel === 'codigo' ? K.painel : 'semConta';
  else if (K.painel === 'semConta') K.painel = 'perfis';
  const titulo = document.getElementById('entradaTitulo');
  if (titulo) {
    titulo.textContent = !temConta() ? 'Antes de jogar'
      : K.painel === 'pin' ? 'Quem é você?'
      : perfis().length ? 'Quem vai jogar?' : 'Vamos criar o primeiro perfil';
  }
  const sub = document.getElementById('entradaSub');
  if (sub) {
    sub.textContent = !temConta()
      ? 'Você pode jogar agora, sem conta nenhuma, ou criar uma conta para separar os estudantes.'
      : 'Cada estudante tem o próprio progresso e a própria Juba Candy.';
  }
  corpo.textContent = '';
  try {
    corpo.appendChild((PAINEIS[K.painel] || painelPerfis)());
  } catch (e) {
    corpo.appendChild(el('p', 'conta-msg conta-erro', 'Não deu para montar esta tela: ' + e.message));
  }
  const rodape = document.getElementById('entradaRodape');
  if (rodape) {
    // Sem conta, "jogar sem conta" já é botão do painel: repetir no rodapé seria
    // duas portas para a mesma coisa. Com conta, o painel mostra os perfis e o
    // rodapé é que oferece a saída.
    const saida = document.getElementById('entradaSemConta');
    if (saida) saida.hidden = !temConta() || K.painel === 'codigo';
  }
  const palco = document.getElementById('entradaMascote');
  if (palco && root.CM_MASCOTE) {
    const p = ativo() || perfis()[0];
    let equip = null;
    // A insígnia da bandana é do perfil mostrado, lida do save dele: sem save,
    // ou com save torto, é o lenço azul de sempre (estágio 1).
    let insignia = { estagio: 1, descricao: '' };
    if (p) {
      try {
        const salvo = JSON.parse(root.localStorage.getItem(CHAVE_SAVE + '#' + p.id) || 'null') || {};
        equip = salvo.equip;
        if (root.CM_METAS) insignia = root.CM_METAS.insignia(root.CM_METAS.sanitizar(salvo.metas, Date.now()));
      } catch (e) { equip = null; insignia = { estagio: 1, descricao: '' }; }
    }
    // Corpo inteiro, não busto: o recorte de busto terminava num corte reto na
    // altura dos ombros, sem moldura, e lia-se como imagem cortada pela metade.
    // A Juba de pé é a mesma do splash — é ela que a criança reconhece.
    palco.innerHTML = root.CM_MASCOTE.svg(equip || {}, { corte: 'inteiro', estagio: insignia.estagio,
      titulo: 'Juba Candy' + (insignia.descricao ? ' ' + insignia.descricao + ',' : '') + ' esperando para jogar' });
  }
}

// ── 7. PORTA DO ADULTO ──────────────────────────────────
// Uma única caixa de senha para tudo que é de quem acompanha. Sem conta,
// nada é trancado: não existe senha para pedir.
function pedirSenha(motivo, aoPassar) {
  if (adultoLiberado()) { aoPassar && aoPassar(null); return; }
  K.pendente = { motivo: motivo, aoPassar: aoPassar };
  const corpo = document.getElementById('cofreCorpo');
  const titulo = document.getElementById('cofreTitulo');
  if (!corpo) { aoPassar && aoPassar(null); return; }
  if (titulo) titulo.textContent = motivo || 'Área de quem acompanha';
  corpo.textContent = '';
  const f = el('form', 'conta-painel');
  f.appendChild(nota('Digite a senha de quem acompanha. Ela vale por ' + MINUTOS_DO_ADULTO + ' minutos e some quando esta aba fecha.'));
  const senha = campo('password', 'Senha', 'cofreSenha', '••••••••', 'current-password');
  f.appendChild(senha.caixa);
  const msg = el('p', 'conta-msg');
  msg.hidden = true;
  f.appendChild(msg);
  const acoes = el('div', 'conta-acoes');
  const entrar = botao('Abrir', 'conta-principal', async () => {
    ocupado(entrar, 'Conferindo…');
    const r = await entrarResponsavel(senha.valor);
    livre(entrar);
    if (!r.ok) {
      msg.hidden = false;
      msg.className = 'conta-msg conta-erro';
      msg.setAttribute('role', 'alert');
      msg.textContent = r.erro;
      senha.entrada.select();
      return;
    }
    const guarda = K.pendente;
    K.pendente = null;
    if (root.CM_APP && root.CM_APP.fecharCofre) root.CM_APP.fecharCofre();
    if (guarda && guarda.aoPassar) guarda.aoPassar(senha.valor);
    avisou();
  }, 'fa-unlock');
  acoes.appendChild(entrar);
  acoes.appendChild(botao('Esqueci a senha', 'conta-sec', () => {
    if (root.CM_APP && root.CM_APP.fecharCofre) root.CM_APP.fecharCofre();
    K.pendente = null;
    K.painel = 'recuperar';
    K.recado = null;
    if (root.CM_APP && root.CM_APP.irParaEntrada) root.CM_APP.irParaEntrada();
    avisou();
  }, 'fa-key'));
  f.appendChild(acoes);
  f.onsubmit = (ev) => { ev.preventDefault(); entrar.click(); };
  corpo.appendChild(f);
  if (root.CM_APP && root.CM_APP.abrirCofre) root.CM_APP.abrirCofre();
  setTimeout(() => senha.entrada.focus(), 60);
}

// ── 8. ENTRADA ──────────────────────────────────────────
function iniciar() {
  K.registro = ler();
  K.painel = temConta() ? 'perfis' : 'semConta';
  K.aoMudar.push(pintarEntrada);
  try { pintarEntrada(); } catch (e) { /* a tela de entrada não pode impedir o jogo de abrir */ }
  return { temConta: temConta(), ativo: ativo() };
}

root.CM_CONTAS = {
  iniciar: iniciar,
  temConta: temConta,
  perfis: perfis,
  ativo: ativo,
  chaveDoSave: chaveDoSave,
  adultoLiberado: adultoLiberado,
  pedirSenha: pedirSenha,
  trancarAdulto: trancarAdulto,
  criarResponsavel: criarResponsavel,
  entrarResponsavel: entrarResponsavel,
  recuperar: recuperar,
  criarPerfil: criarPerfil,
  removerPerfil: removerPerfil,
  abrirPerfil: abrirPerfil,
  jogarSemConta: jogarSemConta,
  sair: sair,
  apagarConta: apagarConta,
  exportar: exportar,
  cofreDisponivel: cofre,
  motivoSemCofre: motivoSemCofre,
  temProgressoConvidado: temProgressoConvidado,
  mostrar: function (painel) {
    K.painel = PAINEIS[painel] ? painel : 'perfis';
    K.recado = null;
    pintarEntrada();
  },
  aoMudar: function (f) { K.aoMudar.push(f); },
  resumo: function () {
    return {
      temConta: temConta(),
      responsavel: temConta() ? K.registro.responsavel.nome : '',
      perfis: perfis().map((p) => ({ apelido: p.apelido, ano: p.ano, pin: !!p.pin })),
      ativo: ativo() ? ativo().apelido : '',
      adultoLiberado: adultoLiberado(),
      iteracoes: ITERACOES,
    };
  },
};
})(window);