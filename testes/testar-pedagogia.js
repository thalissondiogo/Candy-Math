#!/usr/bin/env node
/* ============================================================
   PEDAGOGIA — testes/testar-pedagogia.js
   O modelo de habilidades e evidências (pedagogia.js) sem navegador:
   grafo de pré-requisitos (integridade, sem ciclos), relações
   habilidade↔conteúdo tiradas do próprio conteúdo, registro de evidências,
   limites de armazenamento, isolamento entre perfis, saves antigos e
   adulterados, datas inválidas, repetidos e persistência.

   O comportamento dentro do jogo (gravar, recarregar, trocar de estudante,
   apagar, marcar ajuda) é conferido em navegador real por testar-jogo.js.
   Rodar: node testes/testar-pedagogia.js
   ============================================================ */
'use strict';

// Fuso diferente de UTC: é aqui que um dia calculado em UTC aparece.
process.env.TZ = 'America/Sao_Paulo';

const fs = require('fs');
const path = require('path');
const { RAIZ } = require('./_raiz.js');

global.window = {};
const P = require(path.join(RAIZ, 'pedagogia.js'));
const CM = require(path.join(RAIZ, 'conteudo.js'));
const { BANCO_ITENS } = require(path.join(RAIZ, 'banco-itens.js'));

let checagens = 0;
const problemas = [];
function confere(rotulo, condicao, detalhe) {
  checagens++;
  if (!condicao) problemas.push(rotulo + (detalhe !== undefined ? ' — ' + JSON.stringify(detalhe) : ''));
}
const em = (a, m, d, h, min) => new Date(a, m - 1, d, h === undefined ? 12 : h, min || 0).getTime();
const copia = (o) => JSON.parse(JSON.stringify(o));
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const AGORA = em(2026, 11, 19);
const HOJE = P.diaNumero(AGORA);
const item = (o, bncc, extra) => Object.assign({ o: o, u: 'numeros', bncc: bncc, txt: 'Quanto é 2 + 3?' }, extra || {});

// ── 1. módulo e privacidade ────────────────────────────────
confere('módulo exposto no window do navegador', global.window.CM_PEDAGOGIA === P);
const fonte = fs.readFileSync(path.join(RAIZ, 'pedagogia.js'), 'utf8');
confere('pedagogia.js não abre conexão nem mexe no storage sozinho',
  !/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB/.test(fonte));
const nuvem = fs.readFileSync(path.join(RAIZ, 'nuvem.js'), 'utf8');
const pacote = (nuvem.match(/function pacoteDoProgresso\(\)\s*\{[\s\S]*?\n\}/) || [''])[0];
confere('o pacote da nuvem foi encontrado para conferir', pacote.length > 100);
confere('as evidências não entram no pacote que sobe para a nuvem', !/evidencia|pedagogia/i.test(pacote));
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
confere('index.html carrega pedagogia.js antes de script.js',
  html.indexOf('src="pedagogia.js"') > 0 && html.indexOf('src="pedagogia.js"') < html.indexOf('src="script.js"'));
confere('o service worker guarda pedagogia.js para jogar offline',
  /'pedagogia\.js'/.test(fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8')));

// ── 2. grafo de pré-requisitos ─────────────────────────────
const TEMAS = Object.keys(CM.COD);
const g = P.verificarGrafo(null, TEMAS);
confere('o grafo cobre exatamente os temas do conteúdo, sem ciclo e sem pré-requisito desconhecido', g.ok, g.problemas);
confere('o grafo tem um nó por tema (' + TEMAS.length + ')', Object.keys(P.PREREQUISITOS).length === TEMAS.length);
const ordem = P.ordemTopologica();
confere('existe ordem topológica com todos os temas', Array.isArray(ordem) && ordem.length === TEMAS.length);
confere('na ordem, todo pré-requisito vem antes do tema',
  ordem && ordem.every((t, i) => P.PREREQUISITOS[t].every((p) => ordem.indexOf(p) < i)));
confere('a ordem é estável (mesma entrada, mesma saída)', igual(P.ordemTopologica(), ordem));
confere('o grafo está marcado como proposta não validada', P.STATUS_GRAFO === 'proposta-nao-validada');
confere('as decisões pedagógicas pendentes estão registradas', P.PENDENCIAS.length >= 3 && P.PENDENCIAS.every((s) => typeof s === 'string' && s.length > 20));
confere('o grafo é imutável em tempo de execução', Object.isFrozen(P.PREREQUISITOS));
confere('detecta ciclo de dois', !P.verificarGrafo({ a: ['b'], b: ['a'] }).ok && P.ordemTopologica({ a: ['b'], b: ['a'] }) === null);
confere('detecta ciclo de três', !P.verificarGrafo({ a: ['c'], b: ['a'], c: ['b'] }).ok);
confere('detecta tema que depende de si mesmo', P.verificarGrafo({ a: ['a'] }).problemas.some((p) => /si mesmo/.test(p)));
confere('detecta pré-requisito desconhecido', P.verificarGrafo({ a: ['zz'] }).problemas.some((p) => /desconhecido/.test(p)));
confere('detecta pré-requisito repetido', P.verificarGrafo({ a: [], b: ['a', 'a'] }).problemas.some((p) => /repetido/.test(p)));
confere('detecta tema do conteúdo sem entrada no grafo', P.verificarGrafo({ a: [] }, ['a', 'b']).problemas.some((p) => /sem entrada/.test(p)));
const antTrig = P.antecessores('trig');
confere('antecessores são transitivos (trig chega até adição e triângulos)',
  ['pitag', 'razao', 'pot', 'mult', 'adi', 'triang'].every((t) => antTrig.indexOf(t) >= 0), antTrig);
confere('raízes do grafo não têm antecessores', P.antecessores('adi').length === 0);
confere('nenhum tema é antecessor de si mesmo', TEMAS.every((t) => P.antecessores(t).indexOf(t) < 0));
// Coerência com a BNCC do próprio jogo: um pré-requisito não pode começar
// num ano posterior ao do tema que depende dele.
const primeiroAno = (t) => Math.min.apply(null, Object.keys(CM.COD[t]).map(Number));
const fora = [];
TEMAS.forEach((t) => P.PREREQUISITOS[t].forEach((p) => { if (primeiroAno(p) > primeiroAno(t)) fora.push(t + '(' + primeiroAno(t) + ') ← ' + p + '(' + primeiroAno(p) + ')'); }));
confere('nenhum pré-requisito começa depois do tema que depende dele (pelos anos de CM.COD)', fora.length === 0, fora);

// ── 3. relações habilidade ↔ conteúdo ──────────────────────
const BNCC = new Set((fs.readFileSync(path.join(RAIZ, 'testes', 'bncc-matematica.txt'), 'utf8').match(/EF0[1-9]MA\d{2}/g)) || []);
const itens = P.itensDoConteudo(CM, BANCO_ITENS, 3);
const ix = P.indexar(itens);
const habs = Object.keys(ix.conteudosPorHabilidade);
confere('o índice relaciona mais de 150 habilidades e 300 conteúdos',
  habs.length > 150 && Object.keys(ix.habilidadesPorConteudo).length > 300, [habs.length, Object.keys(ix.habilidadesPorConteudo).length]);
confere('toda habilidade do índice existe no índice oficial de códigos', habs.every((h) => BNCC.has(h)), habs.filter((h) => !BNCC.has(h)));
let simetrico = true;
Object.keys(ix.habilidadesPorConteudo).forEach((o) => ix.habilidadesPorConteudo[o].forEach((h) => { if (ix.conteudosPorHabilidade[h].indexOf(o) < 0) simetrico = false; }));
Object.keys(ix.conteudosPorHabilidade).forEach((h) => ix.conteudosPorHabilidade[h].forEach((o) => { if (ix.habilidadesPorConteudo[o].indexOf(h) < 0) simetrico = false; }));
confere('a relação é simétrica nos dois sentidos', simetrico);
confere('é muitos-para-muitos: há conteúdo com várias habilidades',
  Object.values(ix.habilidadesPorConteudo).some((l) => l.length > 1));
confere('é muitos-para-muitos: há habilidade com vários conteúdos',
  Object.values(ix.conteudosPorHabilidade).some((l) => l.length > 1));
const gerados = itens.filter((i) => typeof i.ref === 'string' && i.ref.indexOf('ger:') === 0);
confere('todo item gerado declara o tema', gerados.length > 300 && gerados.every((i) => typeof i.tema === 'string' && CM.COD[i.tema]),
  gerados.filter((i) => !i.tema).map((i) => i.ref).slice(0, 5));
const especiais = itens.filter((i) => ['sequencia', 'ordenar', 'memoria', 'cruzadinha', 'balanca'].indexOf(i.tipo) >= 0);
confere('todo jogo de montagem própria declara o tema', especiais.length > 100 && especiais.every((i) => CM.COD[i.tema]));
const incoerentes = gerados.concat(especiais).filter((i) => !igual(i.bncc, CM.cod(i.tema, i.ano)));
confere('o tema declarado é o mesmo que produziu o código BNCC (nada inventado)', incoerentes.length === 0,
  incoerentes.slice(0, 3).map((i) => [i.ref || i.tipo, i.tema, i.bncc]));
confere('tema por habilidade só vem de itens que o declaram',
  Object.values(ix.temasPorHabilidade).every((l) => l.every((t) => CM.COD[t])));
confere('tipo de exercício: gerador, banco e afirmação são distinguidos',
  P.tipoDoItem({ ref: 'ger:somaSimples' }) === 'ger:somaSimples' && P.tipoDoItem(BANCO_ITENS[0]) === 'banco' &&
  P.tipoDoItem({ id: 'af:3', tipo: 'afirmacao' }) === 'afirmacao' && P.tipoDoItem({ tipo: 'memoria' }) === 'memoria' &&
  P.tipoDoItem({}) === 'outro' && P.tipoDoItem(null) === 'outro');
confere('tipos de gerador do índice existem em CM.GER',
  Object.keys(ix.habilidadesPorTipo).filter((t) => t.indexOf('ger:') === 0).every((t) => CM.GER[t.slice(4)]));
confere('habilidadesDoItem descarta códigos fora do formato e repetidos',
  igual(P.habilidadesDoItem(item('x', ['EF03MA05', 'EF03MA05', 'ef03ma05', 'EF10MA01', 'EM13MAT101', 7])), ['EF03MA05']));

// ── 4. registro de evidências ──────────────────────────────
let ev = P.vazio();
const soma = item('Adição com reagrupamento', ['EF03MA05'], { ref: 'ger:somaComReserva', tema: 'adi' });
confere('uma resposta válida entra uma vez por habilidade', P.registrar(ev, { item: soma, acertou: true, ajuda: false, jogo: 'quiz' }, AGORA) === 1);
let lidas = P.evidencias(ev, 'EF03MA05');
confere('a evidência traz habilidade, conteúdo, data, resultado, ajuda, tipo e jogo',
  igual(lidas, [{ n: 1, habilidade: 'EF03MA05', conteudo: 'Adição com reagrupamento', data: '2026-11-19', resultado: 'acerto', ajuda: false, tipo: 'ger:somaComReserva', jogo: 'quiz' }]), lidas);
confere('a mesma questão chamada de novo não conta duas vezes', P.registrar(ev, { item: soma, acertou: false, jogo: 'quiz' }, AGORA) === 0);
const outra = item('Adição com reagrupamento', ['EF03MA05'], { ref: 'ger:somaComReserva' });
confere('outra questão do mesmo conteúdo conta', P.registrar(ev, { item: outra, acertou: true, ajuda: true, jogo: 'quiz' }, AGORA) === 1);
confere('acerto com ajuda fica marcado como ajuda', P.evidencias(ev, 'EF03MA05')[1].ajuda === true && P.evidencias(ev, 'EF03MA05')[1].resultado === 'acerto');
confere('a questão volta a valer depois de outra no meio', P.registrar(ev, { item: soma, acertou: false, jogo: 'chuva' }, AGORA) === 1);
confere('erro fica como erro, sem nenhum rótulo de incapacidade',
  igual(Object.keys(P.evidencias(ev, 'EF03MA05')[2]).sort(), ['ajuda', 'conteudo', 'data', 'habilidade', 'jogo', 'n', 'resultado', 'tipo']) &&
  P.evidencias(ev, 'EF03MA05')[2].resultado === 'erro');
const duas = item('Frações equivalentes', ['EF05MA03', 'EF05MA04'], { ref: 'ger:fracEquiv', tema: 'frac' });
confere('item com dois códigos vira um registro em cada', P.registrar(ev, { item: duas, acertou: true, jogo: 'quiz' }, AGORA) === 2);
const ultimas = P.evidencias(ev).filter((e) => e.conteudo === 'Frações equivalentes');
confere('os dois registros são a mesma resposta (mesmo número)', ultimas.length === 2 && ultimas[0].n === ultimas[1].n && ultimas[0].n === ev.n);
confere('sem código BNCC não há evidência', P.registrar(ev, { item: item('Sem código', []), acertou: true }, AGORA) === 0);
confere('sem conteúdo não há evidência', P.registrar(ev, { item: item('', ['EF01MA01']), acertou: true }, AGORA) === 0);
confere('sem item não há evidência', P.registrar(ev, { acertou: true }, AGORA) === 0 && P.registrar(ev, null, AGORA) === 0);
confere('registro em store inválido não quebra', P.registrar(null, { item: soma }) === 0 && P.registrar({}, { item: soma }) === 0);
const nAntes = ev.n;
P.registrar(ev, { item: item('Contagem', ['EF01MA01']), acertou: 'sim', ajuda: 1, jogo: '<script>' }, AGORA);
const estranho = P.evidencias(ev, 'EF01MA01')[0];
confere('só true é acerto e só true é ajuda; jogo fora do formato vira "outro"',
  estranho.resultado === 'erro' && estranho.ajuda === false && estranho.jogo === 'outro', estranho);
confere('o número da resposta cresce de um em um', ev.n === nAntes + 1);
confere('o enunciado da questão não é guardado', JSON.stringify(ev).indexOf('Quanto é') < 0);
// Dia local: 23h30 em Brasília do dia 18 já é dia 19 em UTC.
const tarde = P.vazio();
P.registrar(tarde, { item: item('Contagem', ['EF01MA01']), acertou: true, jogo: 'quiz' }, em(2026, 11, 18, 23, 30));
confere('a data é o dia do relógio local, não o UTC', P.evidencias(tarde)[0].data === '2026-11-18', P.evidencias(tarde)[0]);

// ── 5. limites de armazenamento ────────────────────────────
const L = P.LIMITES;
const cheio = P.vazio();
const todos = habs.slice();
let t0 = Date.now();
for (let i = 0; i < 6000; i++) {
  const h = todos[i % todos.length];
  P.registrar(cheio, { item: item('Conteúdo ' + (i % 500) + ' ' + 'x'.repeat(80), [h], { ref: 'ger:k' + (i % 60) }), acertou: i % 3 > 0, ajuda: i % 5 === 0, jogo: 'quiz' }, AGORA - (6000 - i) * 3600000);
}
const msCheio = Date.now() - t0;
confere('nunca passa do teto de habilidades', P.habilidades(cheio).length <= L.habilidades, P.habilidades(cheio).length);
confere('nunca passa do teto por habilidade', Object.values(cheio.h).every((l) => l.length <= L.porHabilidade));
confere('nunca passa do teto de bytes', P.tamanho(cheio) <= L.bytes, P.tamanho(cheio));
confere('o mais recente sobrevive ao corte', P.evidencias(cheio).some((e) => e.n === cheio.n));
confere('o corte tira primeiro os mais antigos', Math.min.apply(null, P.evidencias(cheio).map((e) => e.n)) > 6000 - L.habilidades * L.porHabilidade - 1);
confere('as tabelas não guardam nome que nenhum registro usa',
  cheio.t.c.every((_, i) => Object.values(cheio.h).some((l) => l.some((r) => r[4] === i))));
confere('6000 respostas no teto levam menos de 3 s', msCheio < 3000, msCheio);
confere('depois de cheio, sanitizar não muda nada', igual(P.sanitizar(copia(cheio), AGORA), cheio));
// Ordem de chegada diferente da ordem alfabética, com a primeira habilidade
// aparada pelo teto: o JSON tem de ser o mesmo depois de recarregar.
const ordem2 = P.vazio();
P.registrar(ordem2, { item: item('Zeta', ['EF09MA01']), acertou: true, jogo: 'quiz' }, AGORA);
for (let i = 0; i < 20; i++) P.registrar(ordem2, { item: item('Alfa ' + i, ['EF01MA01']), acertou: true, jogo: 'quiz' }, AGORA);
for (let i = 0; i < 13; i++) P.registrar(ordem2, { item: item('Zeta ' + i, ['EF09MA01']), acertou: true, jogo: 'quiz' }, AGORA);
confere('a forma guardada é canônica: recarregar devolve o mesmo JSON, chave por chave',
  JSON.stringify(P.sanitizar(copia(ordem2), AGORA)) === JSON.stringify(ordem2) && igual(Object.keys(ordem2.h), ['EF01MA01', 'EF09MA01']));

// ── 6. isolamento entre estudantes ─────────────────────────
const ana = P.vazio(), beto = P.vazio();
const q = item('Multiplicação', ['EF04MA06'], { ref: 'ger:mult' });
P.registrar(ana, { item: q, acertou: true, jogo: 'quiz' }, AGORA);
confere('responder no perfil de um não toca o do outro', P.habilidades(beto).length === 0 && beto.n === 0);
confere('a trava de repetido é por perfil: a mesma questão vale no outro', P.registrar(beto, { item: q, acertou: false, jogo: 'quiz' }, AGORA) === 1);
confere('cada perfil numera as próprias respostas', ana.n === 1 && beto.n === 1 && P.evidencias(ana)[0].resultado === 'acerto' && P.evidencias(beto)[0].resultado === 'erro');
confere('vazio() devolve sempre um objeto novo', P.vazio() !== P.vazio() && P.vazio().t !== P.vazio().t);

// ── 7. saves antigos, adulterados e persistência ───────────
confere('save sem o campo começa vazio', igual(P.sanitizar(undefined, AGORA), P.vazio()));
['lixo', 42, null, [], [1, 2], true].forEach((x) => confere('lixo vira vazio: ' + JSON.stringify(x), igual(P.sanitizar(x, AGORA), P.vazio())));
confere('ida e volta pelo JSON preserva tudo', igual(P.sanitizar(copia(ev), AGORA), ev));
const recarregado = P.sanitizar(copia(ev), AGORA);
const nRec = recarregado.n;
P.registrar(recarregado, { item: item('Divisão', ['EF04MA07']), acertou: true, jogo: 'quiz' }, AGORA);
confere('depois de recarregar, a numeração continua de onde parou', recarregado.n === nRec + 1);
const base = () => ({ v: 1, n: 5, t: { c: ['Adição'], x: ['banco'], j: ['quiz'] }, h: { EF03MA05: [[1, HOJE, 1, 0, 0, 0]] } });
const casos = [
  ['habilidade fora do formato', (b) => { b.h['EF10MA99'] = [[2, HOJE, 1, 0, 0, 0]]; b.h['<img>'] = [[3, HOJE, 1, 0, 0, 0]]; }, 1],
  ['__proto__ como habilidade', (b) => { b.h = JSON.parse('{"__proto__":[[2,' + HOJE + ',1,0,0,0]],"EF03MA05":[[1,' + HOJE + ',1,0,0,0]]}'); }, 1],
  ['registro com tamanho errado', (b) => { b.h.EF03MA05.push([2, HOJE, 1, 0, 0], [3, HOJE, 1, 0, 0, 0, 9], 'x', null, {}); }, 1],
  ['número repetido na mesma habilidade', (b) => { b.h.EF03MA05.push([1, HOJE, 0, 0, 0, 0]); }, 1],
  ['número zero, negativo, quebrado ou texto', (b) => { b.h.EF03MA05.push([0, HOJE, 1, 0, 0, 0], [-2, HOJE, 1, 0, 0, 0], [2.5, HOJE, 1, 0, 0, 0], ['3', HOJE, 1, 0, 0, 0]); }, 1],
  ['dia antes de o jogo existir', (b) => { b.h.EF03MA05.push([2, 100, 1, 0, 0, 0]); }, 1],
  ['dia no futuro distante', (b) => { b.h.EF03MA05.push([2, HOJE + 30, 1, 0, 0, 0]); }, 1],
  ['dia como texto, NaN, quebrado ou infinito', (b) => { b.h.EF03MA05.push([2, '2026-11-19', 1, 0, 0, 0], [3, null, 1, 0, 0, 0], [4, HOJE + 0.5, 1, 0, 0, 0], [5, 1e400, 1, 0, 0, 0]); }, 1],
  ['bits fora de 0..3', (b) => { b.h.EF03MA05.push([2, HOJE, 4, 0, 0, 0], [3, HOJE, -1, 0, 0, 0]); }, 1],
  ['posição fora da tabela', (b) => { b.h.EF03MA05.push([2, HOJE, 1, 9, 0, 0], [3, HOJE, 1, 0, 9, 0], [4, HOJE, 1, 0, 0, -1]); }, 1],
  ['tabela com HTML, vazio ou texto longo', (b) => { b.t.c.push('<b>x</b>', '', 'y'.repeat(500), 7); b.h.EF03MA05.push([2, HOJE, 1, 0, 1, 0], [3, HOJE, 1, 0, 2, 0], [4, HOJE, 1, 0, 3, 0], [5, HOJE, 1, 0, 4, 0]); }, 1],
  ['tipo e jogo fora do formato', (b) => { b.t.x.push('Tipo Com Espaço'); b.t.j.push('jogo-com-traço'); b.h.EF03MA05.push([2, HOJE, 1, 1, 0, 0], [3, HOJE, 1, 0, 0, 1]); }, 1],
  ['tabelas que não são lista', (b) => { b.t = { c: 'Adição', x: {}, j: null }; }, 0],
];
casos.forEach(([rotulo, estraga, sobram]) => {
  const b = base(); estraga(b);
  let s; let ok = true;
  try { s = P.sanitizar(copia(b), AGORA); } catch (e) { ok = false; }
  confere('adulterado (' + rotulo + '): não quebra e sobra só o válido', ok && P.evidencias(s).length === sobram, ok && P.evidencias(s));
});
const amanha = base(); amanha.h.EF03MA05.push([2, HOJE + 1, 1, 0, 0, 0]);
confere('amanhã é tolerado (relógio em outro fuso)', P.evidencias(P.sanitizar(amanha, AGORA)).length === 2);
const orfaos = base(); orfaos.t.c.push('Ninguém usa'); orfaos.t.x.push('ninguem');
const so = P.sanitizar(orfaos, AGORA);
confere('nomes que nenhum registro usa somem das tabelas', so.t.c.length === 1 && so.t.x.length === 1);
const nMenor = base(); nMenor.n = 0; nMenor.h.EF03MA05.push([40, HOJE, 1, 0, 0, 0]);
confere('contador menor que o maior registro é corrigido (nada de número repetido depois)', P.sanitizar(nMenor, AGORA).n === 40);
const nTexto = base(); nTexto.n = '99';
confere('contador que não é inteiro é ignorado', P.sanitizar(nTexto, AGORA).n === 1);
// Save inflado à mão: muitas habilidades, muitos registros, nomes longos.
const inflado = { v: 1, n: 0, t: { c: [], x: ['banco'], j: ['quiz'] }, h: {} };
for (let i = 0; i < 400; i++) inflado.t.c.push('Conteúdo ' + i + ' ' + 'z'.repeat(100));
habs.forEach((h, k) => { inflado.h[h] = []; for (let i = 0; i < 300; i++) inflado.h[h].push([k * 1000 + i + 1, HOJE - (i % 400), i % 4, 0, (k + i) % 400, 0]); });
t0 = Date.now();
const desinflado = P.sanitizar(inflado, AGORA);
const msInflado = Date.now() - t0;
confere('save inflado volta dentro dos tetos', P.habilidades(desinflado).length <= L.habilidades &&
  Object.values(desinflado.h).every((l) => l.length <= L.porHabilidade) && P.tamanho(desinflado) <= L.bytes, P.tamanho(desinflado));
confere('save inflado é saneado em menos de 2 s', msInflado < 2000, msInflado);
confere('sanitizar não altera o objeto recebido', inflado.h[habs[0]].length === 300);

// ── 8. histórico antigo ───────────────────────────────────
const hist = { 'Adição com reagrupamento': { feitas: 10, certas: 9 }, 'Torto': { feitas: 2, certas: 5 }, 'Texto': 'x', 'Negativo': { feitas: -1, certas: 0 } };
const histAntes = copia(hist);
const leg = P.resumoLegado(hist, ix);
confere('histórico antigo aparece como legado e nunca basta para domínio', leg.fonte === 'legado' && leg.suficienteParaDominio === false);
confere('histórico antigo válido é mostrado como estava', igual(Object.keys(leg.conteudos), ['Adição com reagrupamento']) && leg.conteudos['Adição com reagrupamento'].feitas === 10);
confere('habilidades do legado são só candidatas, vindas do índice',
  Array.isArray(leg.conteudos['Adição com reagrupamento'].habilidadesPossiveis));
confere('o histórico antigo não é alterado', igual(hist, histAntes));
confere('histórico antigo nunca vira evidência', P.evidencias(P.sanitizar({ hist: hist }, AGORA)).length === 0);
confere('legado de lixo é vazio', igual(P.resumoLegado(null).conteudos, {}) && igual(P.resumoLegado([1]).conteudos, {}));

// ── 9. o jogo usa o módulo do jeito combinado ──────────────
const script = fs.readFileSync(path.join(RAIZ, 'script.js'), 'utf8');
confere('as evidências são gravadas, lidas, zeradas na troca e no apagar',
  /evidencias:\s+G\.evidencias/.test(script) && /G\.evidencias\s*=\s*CM_PEDAGOGIA\.sanitizar\(d\.evidencias/.test(script) &&
  /evidencias: CM_PEDAGOGIA\.vazio\(\)/.test(script) && /G\.evidencias = CM_PEDAGOGIA\.vazio\(\)/.test(script));
confere('a ajuda é marcada só em três lugares: pista do quiz, desenho do quiz e pista da roleta',
  (script.match(/ajudaNoItem = true/g) || []).length === 3);
const ouvir = (script.match(/function ouvirExplicacao\(\)\s*\{[\s\S]*?\n\}/) || [''])[0];
const prefs = (script.match(/function aplicarPreferencias\(\)\s*\{[\s\S]*?\n\}/) || [''])[0];
confere('narração e preferências de acessibilidade não marcam ajuda',
  ouvir.length > 20 && prefs.length > 20 && !/ajudaNoItem/.test(ouvir) && !/ajudaNoItem/.test(prefs));

// ── 10. tamanho real ──────────────────────────────────────
// Um ano de uso pesado com questões de verdade: 30 respostas por dia.
const ano = P.vazio();
const amostra = itens.filter((i) => P.habilidadesDoItem(i).length && i.o);
for (let d = 0; d < 365; d++) for (let k = 0; k < 30; k++) {
  P.registrar(ano, { item: Object.assign({}, amostra[(d * 30 + k) * 7 % amostra.length]), acertou: k % 4 > 0, ajuda: k % 6 === 0, jogo: ['quiz', 'chuva', 'roulette', 'duelo'][k % 4] }, AGORA - (365 - d) * 86400000);
}
const bytesAno = P.tamanho(ano);
confere('um ano de uso pesado cabe no teto', bytesAno <= L.bytes, bytesAno);

console.log('pedagogia — habilidades, grafo de pré-requisitos e evidências');
console.log('tempo: 6000 respostas no teto em ' + msCheio + ' ms; save inflado saneado em ' + msInflado + ' ms');
console.log('tamanho medido: 1 ano a 30 respostas/dia = ' + bytesAno + ' bytes (' + P.habilidades(ano).length + ' habilidades); teto ' + L.bytes + ' bytes');
if (problemas.length) console.log('\n' + problemas.join('\n'));
else console.log('grafo, relações, registro, limites, isolamento, saves antigos e adulterados: tudo conferido.');
console.log('checagens: ' + checagens + ' · problemas: ' + problemas.length);
process.exitCode = problemas.length ? 1 : 0;
