/* ===================================================
   CANDY MATH — nuvem.js
   A conta do responsável, a verificação de e-mail, a subida do progresso e
   as salas do duelo. Tudo aqui é opcional por construção:

   · sem CM_CONFIG preenchido → nada acontece além de uma tela explicando o
     que falta. O jogo continua inteiro no aparelho, offline, sem pedir nada
     a ninguém.
   · com config, sem internet → cada chamada falha avisando, nunca sumindo;
     o progresso local segue em localStorage como sempre esteve.
   · com config e internet    → login de responsável com e-mail verificado,
     vínculo com a criança por código de 6 letras, histórico sincronizado e
     sala por código para o duelo em aparelhos diferentes.

   Nenhuma chave é inventada aqui: quem publica cola a chave do próprio
   projeto em config.js. Nada sobe antes de o adulto registrar a criança.
   =================================================== */
(function (root) {
'use strict';

const CHAVE_ID_APARELHO = 'candymath_id_aparelho';
const TAMANHO_CODIGO = 6;
// Sem as letras que se confundem quando alguém copia o código à mão.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
// A URL do projeto vem do painel do Supabase sem barra no fim
// ("https://abcd.supabase.co"), então o padrão não pode exigir uma.
const PADRAO_BANCO = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)(\/[^\s]*)?$/i;

const N = {
  cliente: null,        // cliente do supabase-js, só existe com config válida
  sessao: null,         // sessão devolvida pelo banco (null = sem login)
  erro: '',             // último erro visto por quem acompanha
  aoMudar: [],          // funções que redrawem a tela da conexão
  subida: null,         // timer do debounce da sincronização
  sala: null,           // transporte da sala em uso agora
  canal: null,          // canal Realtime da sala
  varredura: null,      // intervalo de segurança quando o Realtime não pega
  porSegundo: false,    // true = estamos varrendo em vez de escutar
  vistoUltimamente: 0,  // carimbo da última jogada recebida
};

// G é const no script.js: mora no escopo global, mas não aparece em window.
// O try/catch é o que segura o antes-do-script-carregar — referência a const
// em TDZ estoura, e aí a nuvem segue a vida sem estado, offline.
function estado() { try { return G; } catch (e) { return null; } }

// ── 1. CONFIGURAÇÃO ─────────────────────────────────────
// Vazio, "coloque-aqui" ou URL que nem parece banco conta como não
// configurado: é melhor o jogo se declarar offline do que bater numa porta
// inventada.
function config() {
  const c = root.CM_CONFIG || {};
  const url = String(c.supabaseUrl || '').trim();
  const chave = String(c.supabaseAnonKey || '').trim();
  const valido = PADRAO_BANCO.test(url) && chave.length > 20 && !/coloque|preencha|sua-?chave/i.test(chave);
  return { url: url, chave: chave, valido: valido, bruto: c };
}

function ativa() { return !!(config().valido && N.cliente); }
function logado() { return !!(N.sessao && N.sessao.user); }
function verificado() {
  const u = N.sessao && N.sessao.user;
  if (!u) return false;
  return !!(u.email_confirmed_at || u.confirmed_at);
}
// Só há sincronização depois de registrar a criança: é o consentimento do
// adulto traduzido em estado. Antes disso o jogo inteiro fica local.
function vinculada() {
  const g = estado();
  return !!(g && g.codigoVinculo);
}

function idAparelho() {
  try {
    let v = localStorage.getItem(CHAVE_ID_APARELHO);
    if (!v) {
      v = 'ap-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
      localStorage.setItem(CHAVE_ID_APARELHO, v);
    }
    return v;
  } catch (e) { return 'ap-descartavel'; }
}

function codigoDe(n) {
  let out = '';
  for (let i = 0; i < n; i++) out += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return out;
}

function mensagemDe(e) {
  if (!e) return 'erro desconhecido';
  if (typeof e === 'string') return e;
  return e.message || e.error_description || e.msg || 'erro inesperado';
}

// A biblioteca chega por CDN apenas quando faz diferença. Abrir o jogo do
// disco, sem chave, não baixa nada de fora.
function carregarBiblioteca() {
  if (root.supabase && root.supabase.createClient) return Promise.resolve();
  const destino = config().bruto.supabaseJs ||
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = destino;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('não foi possível carregar a biblioteca do banco'));
    document.head.appendChild(s);
  });
}

async function montarCliente() {
  const cfg = config();
  if (!cfg.valido) { N.erro = 'sem chave configurada'; return null; }
  if (N.cliente) return N.cliente;
  try {
    await carregarBiblioteca();
    if (!root.supabase || !root.supabase.createClient) throw new Error('biblioteca indisponível');
    N.cliente = root.supabase.createClient(cfg.url, cfg.chave, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 8 } },
    });
    N.erro = '';
    return N.cliente;
  } catch (e) {
    N.cliente = null;
    N.erro = mensagemDe(e);
    return null;
  }
}

// ── 2. CONTA E VERIFICAÇÃO ──────────────────────────────
async function registrar(dados) {
  await montarCliente();
  if (!N.cliente) return { ok: false, erro: N.erro || 'conexão não configurada' };
  try {
    const { data, error } = await N.cliente.auth.signUp({
      email: dados.email,
      password: dados.senha,
      options: { data: { apelido: dados.apelido } },
    });
    if (error) return { ok: false, erro: mensagemDe(error) };
    N.sessao = data.session || null;
    if (data.user) await criarPerfil(data.user, dados.apelido);
    avisouMudanca();
    return { ok: true, precisaVerificar: !data.session, email: dados.email };
  } catch (e) {
    return { ok: false, erro: mensagemDe(e) };
  }
}

async function entrar(email, senha) {
  await montarCliente();
  if (!N.cliente) return { ok: false, erro: N.erro || 'conexão não configurada' };
  try {
    const { data, error } = await N.cliente.auth.signInWithPassword({ email: email, password: senha });
    if (error) return { ok: false, erro: mensagemDe(error) };
    N.sessao = data.session || null;
    avisouMudanca();
    return { ok: true, verificado: verificado() };
  } catch (e) {
    return { ok: false, erro: mensagemDe(e) };
  }
}

async function sair() {
  try { if (N.cliente) await N.cliente.auth.signOut(); } catch (e) {}
  N.sessao = null;
  avisouMudanca();
}

async function reenviar(email) {
  await montarCliente();
  if (!N.cliente) return { ok: false, erro: 'conexão não configurada' };
  try {
    const { error } = await N.cliente.auth.resend({ type: 'signup', email: email });
    if (error) return { ok: false, erro: mensagemDe(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemDe(e) };
  }
}

async function lerSessao() {
  if (!N.cliente) return;
  try {
    const { data } = await N.cliente.auth.getSession();
    N.sessao = data && data.session ? data.session : null;
  } catch (e) {
    N.sessao = null;
    N.erro = 'não foi possível ler a sessão: ' + mensagemDe(e);
  }
}

function avisouMudanca() {
  N.aoMudar.forEach((fn) => { try { fn(); } catch (e) {} });
}

// ── 3. PERFIS, CRIANÇAS E VÍNCULO ───────────────────────
// A conta é do adulto. A criança não tem login: ela tem um código de seis
// letras gerado neste aparelho, e é esse código que liga o boletim local ao
// adulto em outro aparelho.
async function criarPerfil(user, apelido) {
  try {
    await N.cliente.from('perfis').upsert(
      { id: user.id, papel: 'responsavel', apelido: apelido || 'Responsável' },
      { onConflict: 'id' });
  } catch (e) { /* tabela ainda não criada: a conta existe, o resto vem depois */ }
}

async function registrarCrianca(apelido) {
  await montarCliente();
  if (!ativa()) return { ok: false, erro: 'conexão não configurada' };
  if (!logado() || !verificado()) return { ok: false, erro: 'confirme o e-mail da conta antes' };
  const g = estado();
  try {
    const codigo = codigoDe(TAMANHO_CODIGO);
    const { data, error } = await N.cliente.from('criancas').insert({
      codigo: codigo,
      apelido: apelido || 'Criança',
      responsavel_id: N.sessao.user.id,
      id_aparelho: idAparelho(),
      ano: g ? g.ano : 5,
      nivel: g ? g.nivel : 1,
    }).select().single();
    if (error) return { ok: false, erro: mensagemDe(error) };
    if (g) {
      g.codigoVinculo = data.codigo;
      g.apelidoCrianca = data.apelido;
      if (typeof root.saveState === 'function') root.saveState();
    }
    avisouMudanca();
    return { ok: true, crianca: data };
  } catch (e) {
    return { ok: false, erro: mensagemDe(e) };
  }
}

async function listarCriancas() {
  if (!ativa() || !logado()) return { ok: false, erro: 'sem conta ativa', lista: [] };
  try {
    // A view já traz tanto a criança registrada por esta conta quanto as
    // vinculadas por código: o filtro é o banco quem decide (RLS), não aqui.
    const { data, error } = await N.cliente.from('criancas_visiveis')
      .select('*')
      .order('criada_em', { ascending: false });
    if (error) return { ok: false, erro: mensagemDe(error), lista: [] };
    return { ok: true, lista: data || [] };
  } catch (e) {
    return { ok: false, erro: mensagemDe(e), lista: [] };
  }
}

// Vincular é para o adulto que já tem um código anotado (o do aparelho da
// criança, por exemplo). A função do banco checa o código e grava o vínculo.
async function vincularPorCodigo(codigo) {
  if (!ativa() || !logado()) return { ok: false, erro: 'sem conta ativa' };
  const limpo = String(codigo || '').trim().toUpperCase();
  if (limpo.length !== TAMANHO_CODIGO) return { ok: false, erro: 'o código tem seis letras' };
  try {
    const { data, error } = await N.cliente.rpc('vincular_por_codigo', { p_codigo: limpo });
    if (error) return { ok: false, erro: mensagemDe(error) };
    return { ok: true, crianca: data };
  } catch (e) {
    return { ok: false, erro: mensagemDe(e) };
  }
}

// ── 4. SUBIDA DO PROGRESSO ──────────────────────────────
// O jogo grava em localStorage a cada mudança. Subir a cada gravação seria
// escrever demais, então a subida atrasa um pouco e manda só a última versão
// — e apenas quando há conta verificada E criança registrada.
function aoSalvar() {
  if (!ativa() || !logado() || !verificado() || !vinculada()) return;
  const atraso = Number(config().bruto.atrasoSubidaMs) || 2500;
  if (N.subida) clearTimeout(N.subida);
  N.subida = setTimeout(() => { subirProgresso(); }, atraso);
}

function pacoteDoProgresso() {
  const g = estado();
  if (!g) return null;
  return {
    apelido: g.apelidoCrianca || 'Criança deste aparelho',
    estrelas: g.stars,
    ano: g.ano,
    nivel: g.nivel,
    desde: g.desde || Date.now(),
    atualizado_em: new Date().toISOString(),
    conteudos: Object.keys(g.hist || {}).length,
    respostas: Object.keys(g.hist || {}).reduce((s, k) => s + (g.hist[k].feitas || 0), 0),
    acertos: g.totalCorrect || 0,
    hist: g.hist || {},
    provas: g.provas || [],
    duelos: g.duelos || {},
    equipment: g.equip || {},
    owned: (g.owned || []).length,
  };
}

async function subirProgresso(agora) {
  if (!ativa()) return { ok: false, erro: 'conexão não configurada' };
  if (!logado() || !verificado()) return { ok: false, erro: 'confirme o e-mail da conta' };
  if (!vinculada()) return { ok: false, erro: 'registre a criança antes de sincronizar' };
  if (N.subida) { clearTimeout(N.subida); N.subida = null; }
  const dados = pacoteDoProgresso();
  if (!dados) return { ok: false, erro: 'o jogo ainda não abriu' };
  try {
    const { error } = await N.cliente.from('progressos').upsert(
      { codigo_crianca: estado().codigoVinculo, dados: dados, atualizado_em: dados.atualizado_em },
      { onConflict: 'codigo_crianca' });
    N.erro = error ? mensagemDe(error) : '';
    if (agora || error) avisouMudanca();
    return error ? { ok: false, erro: N.erro } : { ok: true, dados: dados };
  } catch (e) {
    N.erro = mensagemDe(e);
    avisouMudanca();
    return { ok: false, erro: N.erro };
  }
}

// Leitura do adulto em outro aparelho: o pacote mais recente daquela criança.
async function baixarProgresso(codigo) {
  if (!ativa() || !logado()) return { ok: false, erro: 'sem conta ativa' };
  try {
    const { data, error } = await N.cliente.from('progressos')
      .select('codigo_crianca, atualizado_em, dados')
      .eq('codigo_crianca', String(codigo || '').trim().toUpperCase())
      .maybeSingle();
    if (error) return { ok: false, erro: mensagemDe(error) };
    return { ok: true, pacote: data ? data.dados : null, quando: data ? data.atualizado_em : '' };
  } catch (e) {
    return { ok: false, erro: mensagemDe(e) };
  }
}

// ── 5. SALAS DO DUELO ───────────────────────────────────
// Duas estradas para a mesma mensagem: o Realtime, que é instantâneo, e uma
// varredura curta quando o websocket não pega (rede escolar, proxy, banco sem
// publicação). O duelo não precisa saber em qual estrada está.
async function criarSala() {
  await montarCliente();
  if (!ativa()) throw new Error('a conexão não está configurada neste aparelho');
  const codigo = codigoDe(TAMANHO_CODIGO);
  const nome = nomeDaSala(true);
  const { error } = await N.cliente.from('salas')
    .upsert({ codigo, anfitriao: nome }, { onConflict: 'codigo' });
  if (error) throw new Error(mensagemDe(error));
  return abrirSala({ codigo, assento: 0, nome, adversario: '' });
}

async function entrarSala(codigo) {
  await montarCliente();
  if (!ativa()) throw new Error('a conexão não está configurada neste aparelho');
  const limpo = String(codigo || '').trim().toUpperCase();
  if (limpo.length !== TAMANHO_CODIGO) throw new Error('o código da sala tem seis letras');
  // Antes de sentar à mesa, a sala precisa existir no banco: sem essa leitura,
  // um código digitado errado abriria um jogo fantasma para dois lados que
  // nunca se veem.
  const { data, error } = await N.cliente.from('salas')
    .select('codigo, anfitriao').eq('codigo', limpo).maybeSingle();
  if (error) throw new Error(mensagemDe(error));
  if (!data) throw new Error('nenhuma sala aberta com o código ' + limpo);
  return abrirSala({ codigo: limpo, assento: 1, nome: nomeDaSala(false), adversario: data.anfitriao || '' });
}

function nomeDaSala(anfitriao) {
  const meta = N.sessao && N.sessao.user && N.sessao.user.user_metadata;
  if (meta && meta.apelido) return meta.apelido;
  const g = estado();
  if (g && g.apelidoCrianca) return g.apelidoCrianca;
  return anfitriao ? 'Anfitrião' : 'Desafiante';
}

// O transporte exposto ao duelo é mínimo: código, assento, os dois nomes e
// enviar/sair. O resto (canal, tabela, varredura) fica aqui dentro.
function abrirSala(dados) {
  fecharSala();
  const sala = {
    codigo: dados.codigo,
    assento: dados.assento,
    nome: dados.nome,
    adversario: dados.adversario || '',
    enviar: function (tipo, dado) { gravarJogada(sala, tipo, dado); },
    sair: function () { fecharSala(); },
  };
  N.sala = sala;
  N.erro = '';
  escutar(sala.codigo);
  avisouMudanca();
  return sala;
}

async function gravarJogada(sala, tipo, dado) {
  if (!ativa() || !N.sala || N.sala.codigo !== sala.codigo) return;
  try {
    await N.cliente.from('jogadas').insert({
      sala: sala.codigo,
      assento: sala.assento,
      tipo: tipo,
      dado: dado || {},
    });
  } catch (e) {
    N.erro = 'a jogada não subiu: ' + mensagemDe(e);
    avisouMudanca();
  }
}

function escutar(codigo) {
  try {
    N.canal = N.cliente
      .channel('sala-' + codigo)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'jogadas', filter: 'sala=eq.' + codigo },
        (payload) => entregar(payload && payload.new))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { N.porSegundo = false; pararVarredura(); return; }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          N.porSegundo = true;
          varredura(codigo);
        }
      });
  } catch (e) {
    N.porSegundo = true;
    varredura(codigo);
  }
  // Se em quatro segundos nada chegou e o canal também não confirmou, a
  // varredura assume — o duelo não pode ficar esperando mensagem que não vem.
  setTimeout(() => { if (N.sala && N.sala.codigo === codigo && !escutando()) varredura(codigo); }, 4000);
}

function escutando() {
  try { return N.canal && N.canal.state === 'joined'; } catch (e) { return false; }
}

function varredura(codigo) {
  if (N.varredura) return;
  const intervalo = Number(config().bruto.varreduraSalaMs) || 900;
  N.varredura = setInterval(async () => {
    if (!N.sala || N.sala.codigo !== codigo) { pararVarredura(); return; }
    try {
      const desde = new Date(Date.now() - 20000).toISOString();
      const { data } = await N.cliente.from('jogadas')
        .select('*').eq('sala', codigo).gt('criado_em', desde)
        .order('criado_em', { ascending: true }).limit(40);
      (data || []).forEach(entregar);
    } catch (e) { /* a próxima varredura tenta de novo */ }
  }, intervalo);
}

function pararVarredura() {
  if (N.varredura) { clearInterval(N.varredura); N.varredura = null; }
}

// A mesma jogada pode chegar pelo canal e pela varredura. O carimbo decide o
// que já foi visto, senão o tabuleiro apagaria a peça duas vezes.
const vistas = [];
function jaVista(id) {
  if (vistas.indexOf(id) >= 0) return true;
  vistas.push(id);
  if (vistas.length > 300) vistas.shift();
  return false;
}

function entregar(nova) {
  if (!nova || !N.sala) return;
  const id = String(nova.id || (nova.criado_em + ':' + nova.assento + ':' + nova.tipo));
  if (jaVista(id)) return;
  N.vistoUltimamente = Date.now();
  const duelo = root.CM_DUELO;
  if (duelo && duelo.receber) {
    duelo.receber(nova.tipo, Object.assign({}, nova.dado, { assento: nova.assento }));
  }
}

function fecharSala() {
  pararVarredura();
  try { if (N.canal && N.cliente) N.cliente.removeChannel(N.canal); } catch (e) {}
  N.canal = null;
  N.sala = null;
  vistas.length = 0;
}

// ── 6. A TELA DA CONEXÃO ────────────────────────────────
function pintar() {
  const caixa = document.getElementById('nuvemCorpo');
  if (!caixa) return;
  const cfg = config();
  caixa.innerHTML = '';
  caixa.appendChild(estadoLinha(cfg));
  if (!cfg.valido) { caixa.appendChild(painelSemConfig()); return; }
  if (!N.cliente) { caixa.appendChild(painelCarregando()); return; }
  if (!logado()) { caixa.appendChild(painelEntrar()); return; }
  if (!verificado()) { caixa.appendChild(painelVerificacao()); return; }
  caixa.appendChild(painelLigado());
}

function estadoLinha(cfg) {
  const p = document.createElement('p');
  p.className = 'nuvem-fit';
  const transporte = N.sala ? (N.porSegundo ? 'varredura' : 'Realtime') : '—';
  p.innerHTML = '<span><i class="fa-solid fa-key"></i> config.js: <b>' +
    (cfg.valido ? 'chave válida' : 'vazia') + '</b></span>' +
    '<span><i class="fa-solid fa-envelope-circle-check"></i> e-mail: <b>' +
    (logado() ? (verificado() ? 'confirmado' : 'aguardando clique') : 'sem conta') + '</b></span>' +
    '<span><i class="fa-solid fa-cloud-arrow-up"></i> sincronia: <b>' +
    (vinculada() ? 'ligada a ' + esc(estado().codigoVinculo) : 'desligada') + '</b></span>' +
    '<span><i class="fa-solid fa-wifi"></i> sala: <b>' + transporte + '</b></span>';
  return p;
}

function painelSemConfig() {
  const d = document.createElement('div');
  d.className = 'nuvem-painel';
  d.innerHTML =
    '<h3 class="nuvem-titulo"><i class="fa-solid fa-plug"></i> Conexão desligada — e o jogo funciona assim</h3>' +
    '<p class="nuvem-texto">Nada foi enviado para nenhum servidor, e nada será enquanto esta tela mostrar ' +
      'isto. Login, verificação de e-mail, boletim lido de outro aparelho e sala por código no duelo só ' +
      'existem depois de ligar o jogo ao seu próprio projeto do Supabase.</p>' +
    '<ol class="nuvem-passos">' +
      '<li>Crie um projeto gratuito em <b>supabase.com</b>.</li>' +
      '<li>No <b>SQL Editor</b>, cole o conteúdo de <code>supabase/schema.sql</code> e rode uma vez.</li>' +
      '<li>Em <b>Project Settings → API</b>, copie a <b>Project URL</b> e a <b>anon public key</b>.</li>' +
      '<li>Cole as duas em <code>config.js</code> e recarregue esta página.</li>' +
      '<li>Em <b>Authentication → URL configuration</b>, ponha o endereço público do jogo como <b>Site URL</b>, ' +
        'para o link de confirmação voltar para cá.</li>' +
      '<li>Em <b>Database → Replication</b>, marque a tabela <code>jogadas</code> no <code>supabase_realtime</code> ' +
        '(sem isso, a sala funciona por varredura — mesmo resultado, um pouco mais lento).</li>' +
    '</ol>' +
    '<p class="nuvem-nota"><i class="fa-solid fa-shield-halved"></i> A anon key é pública por natureza: o que ' +
      'protege os dados são as políticas (RLS) do schema, não a chave. Já a <b>service role key</b> nunca entra ' +
      'num navegador — deixe-a fora do projeto.</p>';
  return d;
}

function painelCarregando() {
  const d = document.createElement('div');
  d.className = 'nuvem-painel';
  const p = document.createElement('p');
  p.className = 'nuvem-texto';
  p.textContent = N.erro
    ? 'A conexão configurada não respondeu: ' + N.erro + '. O jogo segue funcionando neste aparelho.'
    : 'Configuração encontrada. Tentando conversar com o banco…';
  d.appendChild(p);
  d.appendChild(botao('<i class="fa-solid fa-rotate"></i> Tentar de novo', 'btn-nuvem-primario', async () => {
    N.cliente = null;
    pintar();
    await montarCliente();
    await lerSessao();
    pintar();
  }));
  return d;
}

function painelEntrar() {
  const d = document.createElement('div');
  d.className = 'nuvem-painel';
  const titulo = document.createElement('h3');
  titulo.className = 'nuvem-titulo';
  titulo.innerHTML = '<i class="fa-solid fa-user-shield"></i> Conta de quem acompanha';
  d.appendChild(titulo);
  const explic = document.createElement('p');
  explic.className = 'nuvem-texto';
  explic.textContent = 'A conta é do adulto, não da criança. Ela serve para duas coisas: ler o boletim em ' +
    'outro aparelho e abrir salas do duelo por código. Nenhum dado sai deste aparelho antes de você ' +
    'registrar a criança — e o vínculo é feito com um código de seis letras gerado aqui.';
  d.appendChild(explic);

  const forms = [];
  const abaCriar = painelCriarConta();
  const abaEntrar = painelEntrarConta();
  forms.push(abaCriar, abaEntrar);

  const abas = document.createElement('div');
  abas.className = 'nuvem-abas';
  ['Criar conta', 'Entrar'].forEach((texto, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nuvem-aba' + (i === 0 ? ' ativa' : '');
    b.textContent = texto;
    b.onclick = () => {
      Array.prototype.forEach.call(abas.children, (c) => c.classList.remove('ativa'));
      b.classList.add('ativa');
      forms.forEach((f, j) => { f.hidden = j !== i; });
    };
    abas.appendChild(b);
  });
  d.appendChild(abas);
  forms.forEach((f) => d.appendChild(f));
  return d;
}

function painelCriarConta() {
  const f = document.createElement('div');
  f.className = 'nuvem-form';
  const nome = campo('text', 'Como você quer ser chamada(o)', 'nuvemApelido', 'Mãe, pai, tio…');
  const email = campo('email', 'Seu e-mail', 'nuvemEmail', 'voce@exemplo.com');
  const senha = campo('password', 'Senha (mínimo de 6 caracteres)', 'nuvemSenha', '••••••');
  const msg = recado();
  f.appendChild(nome.caixa); f.appendChild(email.caixa); f.appendChild(senha.caixa);
  f.appendChild(botao('<i class="fa-solid fa-envelope"></i> Criar conta e enviar o link', 'btn-nuvem-primario', async () => {
    if (nome.valor.trim().length < 2) { msg.dizer('Diga como quer ser chamada(o).', 'erro'); return; }
    if (!/\S+@\S+\.\S+/.test(email.valor)) { msg.dizer('O e-mail não parece válido.', 'erro'); return; }
    if (senha.valor.length < 6) { msg.dizer('A senha precisa de pelo menos 6 caracteres.', 'erro'); return; }
    msg.dizer('Criando conta…');
    const r = await registrar({ email: email.valor.trim(), senha: senha.valor, apelido: nome.valor.trim() });
    if (!r.ok) { msg.dizer('Não deu: ' + r.erro, 'erro'); return; }
    msg.dizer(r.precisaVerificar
      ? 'Conta criada. Abra ' + r.email + ', clique no link de confirmação e volte aqui.'
      : 'Conta criada e confirmada.', 'ok');
    pintar();
  }));
  f.appendChild(msg);
  return f;
}

function painelEntrarConta() {
  const f = document.createElement('div');
  f.className = 'nuvem-form';
  f.hidden = true;
  const email = campo('email', 'Seu e-mail', 'nuvemEmail2', 'voce@exemplo.com');
  const senha = campo('password', 'Senha', 'nuvemSenha2', '••••••');
  const msg = recado();
  f.appendChild(email.caixa); f.appendChild(senha.caixa);
  f.appendChild(botao('<i class="fa-solid fa-right-to-bracket"></i> Entrar', 'btn-nuvem-primario', async () => {
    msg.dizer('Entrando…');
    const r = await entrar(email.valor.trim(), senha.valor);
    if (!r.ok) { msg.dizer('Não entrou: ' + r.erro, 'erro'); return; }
    msg.dizer('Entrou.', 'ok');
    pintar();
  }));
  f.appendChild(msg);
  return f;
}

function painelVerificacao() {
  const d = document.createElement('div');
  d.className = 'nuvem-painel';
  const email = (N.sessao && N.sessao.user && N.sessao.user.email) || '';
  const t = document.createElement('h3');
  t.className = 'nuvem-titulo';
  t.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Falta confirmar o e-mail';
  d.appendChild(t);
  d.appendChild(linha('A conta existe, mas ainda não vale para acompanhar ninguém. Mandamos um link para ' +
    email + '. Enquanto o clique não acontecer, nada sobe deste aparelho — o boletim continua só local.'));
  const msg = recado();
  d.appendChild(botao('<i class="fa-solid fa-paper-plane"></i> Reenviar o link', 'btn-nuvem-primario', async () => {
    const r = await reenviar(email);
    if (r.ok) msg.dizer('Reenviado. Confira também a caixa de spam.', 'ok');
    else msg.dizer('Não reenviou: ' + r.erro, 'erro');
  }));
  d.appendChild(botao('<i class="fa-solid fa-rotate"></i> Já cliquei — conferir', '', async () => {
    msg.dizer('Confirmando…');
    await montarCliente();
    await lerSessao();
    if (verificado()) msg.dizer('E-mail confirmado.', 'ok');
    else if (!logado()) msg.dizer('Ainda sem sessão neste aparelho.', 'erro');
    else msg.dizer('O clique ainda não apareceu no banco. Espere alguns segundos e confira de novo.', 'erro');
    pintar();
  }));
  d.appendChild(msg);
  return d;
}

function painelLigado() {
  const d = document.createElement('div');
  d.className = 'nuvem-painel';
  const t = document.createElement('h3');
  t.className = 'nuvem-titulo';
  t.innerHTML = '<i class="fa-solid fa-cloud"></i> Conta ativa: ' +
    esc((N.sessao && N.sessao.user && N.sessao.user.email) || '');
  d.appendChild(t);
  d.appendChild(linha('A partir daqui, o histórico deste aparelho pode ser lido por você em outro aparelho, ' +
    'e as salas do duelo funcionam por código. O que fica no banco: desempenho por conteúdo, provas ' +
    'aplicadas, registro dos duelos e as jogadas da sala enquanto ela estiver aberta. Não fica: nome real, ' +
    'foto, endereço ou qualquer coisa que identificasse a criança além do código de seis letras.'));

  const msg = recado();
  d.appendChild(botao('<i class="fa-solid fa-child"></i> Registrar a criança deste aparelho', 'btn-nuvem-primario', async () => {
    const g = estado();
    msg.dizer('Registrando…');
    const r = await registrarCrianca((g && g.apelidoCrianca) || 'Criança');
    if (!r.ok) { msg.dizer('Não registrou: ' + r.erro, 'erro'); return; }
    msg.dizer('Pronto. Código de vínculo: ' + r.crianca.codigo + ' — anote e guarde.', 'ok');
    carregarLista(lista, msg);
  }));

  d.appendChild(botao('<i class="fa-solid fa-arrow-up-from-bracket"></i> Subir o progresso agora', '', async () => {
    msg.dizer('Subindo…');
    const r = await subirProgresso(true);
    if (!r.ok) { msg.dizer('Não subiu: ' + r.erro, 'erro'); return; }
    msg.dizer('Sincronizado às ' + new Date().toLocaleTimeString('pt-BR') + '.', 'ok');
  }));

  const lista = document.createElement('div');
  lista.className = 'nuvem-criancas';
  d.appendChild(lista);
  carregarLista(lista, msg);

  d.appendChild(botao('<i class="fa-solid fa-right-from-bracket"></i> Sair da conta', 'btn-nuvem-perigo', async () => {
    fecharSala();
    await sair();
  }));
  d.appendChild(msg);
  if (N.erro) d.appendChild(linha('Último erro visto: ' + N.erro, 'nuvem-erro'));
  return d;
}

async function carregarLista(destino, msg) {
  destino.innerHTML = '';
  const r = await listarCriancas();
  if (!r.ok) { destino.appendChild(linha('Não foi possível listar: ' + r.erro)); return; }
  if (!r.lista.length) {
    destino.appendChild(linha('Nenhuma criança vinculada a esta conta ainda. Registre a deste aparelho ' +
      'ou digite o código de seis letras do aparelho onde a criança joga.'));
    const codigo = campo('text', 'Código de vínculo', 'nuvemVinculo', 'ABC123');
    codigo.entrada.style.textTransform = 'uppercase';
    destino.appendChild(codigo.caixa);
    destino.appendChild(botao('<i class="fa-solid fa-link"></i> Vincular por código', '', async () => {
      const v = await vincularPorCodigo(codigo.valor);
      if (v.ok) {
        msg.dizer('Vinculado: ' + ((v.crianca && v.crianca.apelido) || v.crianca.codigo), 'ok');
        carregarLista(destino, msg);
      } else {
        msg.dizer('Não vincula: ' + v.erro, 'erro');
      }
    }));
    return;
  }
  r.lista.forEach((c) => {
    const item = document.createElement('div');
    item.className = 'nuvem-crianca';
    item.innerHTML = '<span class="nuvem-crianca-nome">' + esc(c.apelido || 'sem nome') + '</span>' +
      '<span class="nuvem-crianca-codigo">' + esc(c.codigo || '') + '</span>' +
      '<span class="nuvem-crianca-quando">jogando no ' + esc(c.ano || '?') + 'º ano · ' +
        esc(NIVEIS_NAME(c.nivel)) + '</span>';
    destino.appendChild(item);
    item.appendChild(botao('<i class="fa-solid fa-download"></i> Ler o progresso', 'btn-nuvem-mini', async () => {
      msg.dizer('Lendo…');
      const p = await baixarProgresso(c.codigo);
      if (p.ok && p.pacote) {
        msg.dizer(p.pacote.apelido + ' · ' + (p.pacote.respostas || 0) + ' respostas · ' +
          (p.pacote.provas ? p.pacote.provas.length : 0) + ' prova(s) · atualizado em ' +
          new Date(p.pacote.atualizado_em).toLocaleString('pt-BR'), 'ok');
      } else if (p.ok) {
        msg.dizer('Nada guardado para este código ainda — a criança ainda não sincronizou.', 'erro');
      } else {
        msg.dizer('Não leu: ' + p.erro, 'erro');
      }
    }));
  });
}

function NIVEIS_NAME(nv) {
  const C = root.CM;
  return (C && C.NIVEIS && C.NIVEIS[nv - 1]) || 'Base';
}

// ── 7. PEQUENOS CONSTRUTORES DE TELA ────────────────────
function linha(texto, classe) {
  const p = document.createElement('p');
  p.className = 'nuvem-texto' + (classe ? ' ' + classe : '');
  p.textContent = texto;
  return p;
}

// Recado de formulário: a mesma linha, três caras — neutro enquanto trabalha,
// erro quando não deu, ok quando deu. Sem isso, "Não deu: Failed to fetch"
// tem exatamente a mesma roupa de uma instrução e passa despercebido.
function recado() {
  const p = document.createElement('p');
  p.className = 'nuvem-msg';
  p.dizer = function (texto, tipo) {
    p.className = 'nuvem-msg' + (tipo === 'erro' ? ' nuvem-erro' : tipo === 'ok' ? ' nuvem-ok' : '');
    p.textContent = texto;
  };
  return p;
}

function botao(html, classe, aoClicar) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn-nuvem' + (classe ? ' ' + classe : '');
  b.innerHTML = html;
  b.onclick = aoClicar;
  return b;
}

function campo(tipo, rotulo, nome, placeholder) {
  const r = document.createElement('label');
  r.className = 'nuvem-campo';
  const t = document.createElement('span');
  t.className = 'nuvem-rotulo';
  t.textContent = rotulo;
  r.appendChild(t);
  const i = document.createElement('input');
  i.type = tipo;
  i.id = nome;
  i.name = nome;
  i.placeholder = placeholder || '';
  i.autocomplete = tipo === 'email' ? 'email' : 'off';
  r.appendChild(i);
  // Devolvemos os dois: `caixa` é o que se anexa (rótulo + campo), e
  // `valor` é o que se lê. Anexar só o input deixaria o formulário muda.
  return { caixa: r, entrada: i, get valor() { return i.value; } };
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ── 8. ENTRADA ──────────────────────────────────────────
async function iniciar() {
  await montarCliente();
  if (N.cliente) {
    await lerSessao();
    try {
      N.cliente.auth.onAuthStateChange((_evento, sessao) => {
        N.sessao = sessao;
        avisouMudanca();
      });
    } catch (e) { /* versão da biblioteca sem escuta de estado */ }
  }
  pintar();
  // Abrir a tela de conexão mais de uma vez não pode dobrar a escuta: a
  // pintura sairia duas vezes para cada mudança de estado.
  if (N.aoMudar.indexOf(pintar) < 0) N.aoMudar.push(pintar);
}

root.CM_NUVEM = {
  iniciar: iniciar,
  aoSalvar: aoSalvar,
  ativa: ativa,
  logado: logado,
  verificado: verificado,
  vinculada: vinculada,
  criarSala: criarSala,
  entrarSala: entrarSala,
  sairDaSala: fecharSala,
  subir: subirProgresso,
  baixar: baixarProgresso,
  registrarCrianca: registrarCrianca,
  resumo: function () {
    const cfg = config();
    return {
      configurado: cfg.valido,
      cliente: !!N.cliente,
      sessao: logado(),
      verificado: verificado(),
      vinculada: vinculada(),
      erro: N.erro,
      sala: N.sala ? N.sala.codigo : null,
      assento: N.sala ? N.sala.assento : null,
      transporte: N.sala ? (N.porSegundo ? 'varredura' : 'realtime') : null,
    };
  },
  detalhe: function () { return N; },
};
})(typeof window !== 'undefined' ? window : this);
