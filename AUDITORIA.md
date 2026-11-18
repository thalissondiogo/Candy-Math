# Auditoria — Candy Math

Data: 30/10/2026, com reexecução em 04/11/2026 (cache de narração) e uma terceira
rodada em **17/11/2026** (contas locais, autorização por finalidade, guarda-roupa e
os dois percursos em navegador real). Escopo: todo o arquivo deste repositório —
HTML, CSS, JavaScript, SQL, configuração de publicação, testes e documentação.
O que a rodada de 17/11 acrescentou está no item 8; os números citados no corpo
foram reconferidos nela.

Como ler este arquivo: cada entrada diz **o que estava errado**, **o que foi feito**
e **como isso foi conferido**. Quando a conferência não foi possível neste ambiente,
a entrada diz isso em vez de sugerir que passou. A lista do que ficou pendente está
no item 5, e os riscos aceitos estão no item 6. Nada aqui é um teste de invasão.

---

## 1. Método

- Leitura completa antes da primeira linha alterada: os 13 arquivos JS da raiz,
  `index.html`, `style.css`, `supabase/schema.sql`, `vercel.json`, `README.md` e os
  quatro validadores que já existiam.
- Toda correção abaixo ou tem um teste novo que a confere, ou foi conferida no
  navegador real aberto sobre estes arquivos. Correção sem conferência não entra
  neste relatório como concluída — entra no item 5.
- Os números citados (itens, checagens, políticas, linhas) saem dos scripts, não
  da memória. `npm test` imprime a maioria deles.

Ferramentas que hoje existem no projeto para sustentar esta auditoria:

| instrumento | o que ele prova |
|---|---|
| `testes/testar-estrutura.js` | raiz única, referências inteiras, ordem de carregamento, `node --check` em todo JS |
| `testes/testar-segredos.js` | nenhuma chave privilegiada ou token em arquivo versionado |
| `testes/testar-politicas-sql.js` | invariantes de autorização dentro do SQL (estático) |
| `testes/testar-rls.sql` | 16 cenários de autorização **rodando no Postgres** (não executado aqui) |
| `testes/testar-autorizacao.js` | os mesmos cenários contra um projeto Supabase real com contas de teste |
| `testes/testar-narracao.js` | a ponte de voz: teto, vozes, erros, ausência de segredo no navegador |
| `testes/validar-banco.js` | o banco autoral, item por item |
| `testes/validar-conteudo.js` | os 55 geradores em todo ano × nível, mais o banco inteiro |
| `testes/validar-css.js` | escala fluida, larguras sem freio, variável sem definição |
| `testes/relatorio-bncc.js` | vínculo código ↔ ano ↔ unidade e cobertura (`RELATORIO-BNCC.md`) |
| `testes/auditar-layout.js` | geometria tela por tela em Chrome headless, com `--prova` de si mesmo |
| `testes/testar-mascote.js` | as 79 peças desenhadas uma a uma e o SVG seguro para `innerHTML` |
| `testes/testar-contas.js` | conta, perfis, PIN, porta do adulto e autorização por finalidade, clicando no navegador |
| `testes/testar-jogo.js` | uma rodada inteira jogada no navegador: degraus de erro, loja, figurino e save |

---

## 2. Correções críticas

### C1 — O código da sala era a credencial (autorização do duelo)

**O que estava errado.** As políticas de `salas` e `jogadas` permitiam a operação
quando a sala **existisse**. Quem soubesse o código — por adivinhação, por um
print, por um link compartilhado — lia o estado da partida e escrevia lances no
nome de outra pessoa. Conhecimento do código funcionava como senha, e código de
seis caracteres não sustenta essa função.

**O que foi feito** (em [supabase/schema.sql](supabase/schema.sql)):

- RLS ligado nas 8 tabelas — as 7 alcançáveis pelo navegador e `narracoes`, que
  não é alcançável de jeito nenhum ([schema.sql:184-191](supabase/schema.sql#L184),
  [204-209](supabase/schema.sql#L204)).
- 17 políticas separadas por operação (SELECT / INSERT / UPDATE / DELETE), nenhuma
  com `using (true)` — [schema.sql:302-395](supabase/schema.sql#L302).
- `revoke all ... from anon, authenticated` em todas as tabelas, e só então o
  `grant` estreito: `salas` e `jogadas` ficam **somente com SELECT** para
  membros ([schema.sql:196-202](supabase/schema.sql#L196),
  [213-215](supabase/schema.sql#L213), [382](supabase/schema.sql#L382),
  [393](supabase/schema.sql#L393)). Não existe
  política de escrita nessas duas tabelas: o navegador não pode escrever nelas,
  nem o anfitrião.
- A escrita passou a acontecer dentro de funções: `criar_sala()`,
  `entrar_na_sala(text)`, `registrar_jogada(text, text, jsonb)`, `encerrar_sala(text)`,
  `sair_da_sala(text)` ([schema.sql:430](supabase/schema.sql#L430),
  [475](supabase/schema.sql#L475), [513](supabase/schema.sql#L513),
  [600](supabase/schema.sql#L600), [621](supabase/schema.sql#L621)). Quem calcula
  autor e assento é o banco, a partir de `auth.uid()` — o cliente não envia
  identidade nenhuma.
- Lances conferidos no servidor por `_contas_validas` / `_acerto_valido` /
  `_passada_valida` ([schema.sql:647](supabase/schema.sql#L647),
  [682](supabase/schema.sql#L682), [697](supabase/schema.sql#L697)): tipo
  conhecido, formato, tamanho, turno da vez, sala ativa.
- Gatilho `_sem_transferencia` ([schema.sql:921](supabase/schema.sql#L921)) impede
  reatribuir dono ou código de uma sala já criada.
- `vincular_por_codigo` ([schema.sql:764](supabase/schema.sql#L764)) passou a
  exigir formato `^[A-Z0-9]{3,24}$` e a registrar tentativas em
  `tentativas_vinculo`, com teto de 8 por hora por conta — o código de sala e o
  código de vínculo deixaram de ser oráculo de enumeração.
- Toda função `security definer` declara `set search_path = public` (20 de 20,
  conferidas por teste). `purgar_salas_velhas()` é executável apenas por
  `service_role` ([schema.sql:846](supabase/schema.sql#L846)).
- Códigos sorteados sem viés. O de **vínculo** da criança nasce no aparelho com
  `crypto.getRandomValues` e 10 caracteres ([nuvem.js:24](nuvem.js#L24),
  [nuvem.js:28](nuvem.js#L28)); o de **sala** nasce no banco, com 8, por
  `_novo_codigo` ([schema.sql:406](supabase/schema.sql#L406)) e rejeição de
  módulo exata (248 = 8 × 31). O alfabeto dos dois omite I, L, O, 0 e 1, que se
  confundem quando alguém copia à mão.
- O lado do navegador obedece a um portão único, `dueloLiberado()`
  ([nuvem.js:81](nuvem.js#L81)), e o botão de sala por código nasce **desligado**
  com a explicação do motivo. A bandeira está em
  [config.js:58](config.js#L58) (`dueloRedeHabilitado: false`) e o caminho de
  entrada na rede a consulta antes de qualquer ação.

**Como foi conferido.**
`testes/testar-politicas-sql.js` — 77 invariantes estáticas sobre o SQL e sobre os
arquivos do navegador, 0 falhas. `testes/testar-estrutura.js` e
`testes/testar-segredos.js` também batem nesse ponto.

**O que NÃO foi conferido.** Nenhuma linha de `testar-rls.sql` rodou contra um
Postgres de verdade — a máquina deste trabalho não tem `psql` nem Docker. Os 16
cenários (positivos e negativos) estão escritos para o dono rodar no SQL Editor do
SEU projeto, e `testes/testar-autorizacao.js` se autodeclara "NÃO EXECUTADO" sem
credenciais. **Enquanto esses dois não passarem, o duelo em rede continua
desligado por padrão, e o schema deste repositório não pode ser declarado seguro.**

### C2 — Qualquer escrita do navegador chegava cru ao banco

**O que estava errado.** O cliente montava o pacote de progresso e o payload do
duelo e os entregava ao PostgREST. Campos numéricos sem faixa, texto onde devia
haver número e payload gigante passavam todos.

**O que foi feito.** Filtros antes de subir e depois de descer:
`frearLance`, `frearConta`, `textoSeguro`, `numeroEntre`
([nuvem.js:34-40](nuvem.js#L34) traz os tetos — 3 tipos de lance, 60 000 bytes por
lance, densidade no máximo 80, igual ao teto do banco), `entregar()` conferindo
tipo, assento e eco, e `detalhe()` redigindo o erro antes de aparecer na tela. A
gravação de progresso continua com `upsert` em chave do próprio aparelho.

**Conferido por** `testar-politicas-sql.js` (nenhuma escrita direta às tabelas do
duelo a partir dos arquivos do navegador) e `auditar-layout.js` nos fluxos.

### C3 — Sesgos de script inline e CSP

**O que estava errado.** 64 atributos `onclick` no HTML e mais alguns gerados por
JS. Enquanto existissem, `script-src` precisava de `'unsafe-inline'` — que anula
boa parte do sentido de uma Content-Security-Policy.

**O que foi feito.** Dispatcher delegado com lista fechada de funções
([script.js:2893](script.js#L2893), [2936](script.js#L2936)): os botões declaran
`data-acao` e `data-args` (JSON, no máximo 3 argumentos, só `string|number|boolean`),
e `ACOES_DOS_BOTOES` decide o que pode ser chamado. `attrJson` escapa os valores.
O CSP servido em [vercel.json:17](vercel.json#L17) ficou
`script-src 'self' https://cdn.jsdelivr.net` — sem `unsafe-inline` de script.
`como-jogar.js`, `avaliacao.js` e `duelo.js` adotaram o mesmo caminho.

**Conferido por** `testar-estrutura.js` (nenhum `<script>` inline, nenhum atributo
`on*`, nenhum `javascript:` nos HTML da raiz) e pela partida completa no navegador.

---

## 3. Correções altas

### A1 — A raiz estava achatada; os validadores apontavam para arquivos inexistentes

`README.md` e os scripts descreviam `supabase/` e `testes/`, mas os arquivos estavam
espalhados na raiz, e `validar-*.js` resolviam caminho com `__dirname/..` — o que
fazia os três rodarem contra `C:\Users\pc\Downloads\conteudo.js` e falharem com
`ENOENT` antes da primeira asserção. Restaurada a estrutura documentada e criado
[testes/_raiz.js](testes/_raiz.js), que sobe a partir de `__dirname` até achar os
marcadores `index.html · style.css · script.js · conteudo.js`. Os validadores agora
rodam de qualquer diretório, inclusive de um clone limpo.
Criados também [testes/servidor-estatico.js](testes/servidor-estatico.js) (zero
dependências, serve os mesmos cabeçalhos de segurança do `vercel.json` e devolve
501 para `/api/*`, que só existe na hospedagem) e [package.json](package.json) com
os scripts que o README manda digitar.

### A2 — `validar-css.js` nunca saía com erro

O README prometia "código de saída 1 quando encontram erro". O script calculava as
listas e não fixava `process.exitCode`. Corrigido — a contagem de erros agora inclui
as sete famílias de achado, e `testar-estrutura.js` entraria em falha se um CSS novo
quebrar a escala.

### A3 — Com a verificação de e-mail ligada, o cadastro do adulto quebrava o vínculo

`perfis` só era escrito no momento do cadastro. Com "confirm your email" ativo, o
usuário confirmava em outra janela e entrava por um caminho que **não** criava a
linha — aí `criancas` esbarrava na chave estrangeira e o registro da criança
falhava com um erro sem explicação. Corrigido com `criarPerfil()` chamado dentro de
`entrar()` e `ignoreDuplicates: true` para não amassar um apelido já escolhido.

### A4 — Dois formatos de código convivendo

`duelo.js` aceitava 6 ou mais caracteres enquanto `nuvem.js` exigia exatamente 6.
Uma sala criada num lado não podia ser relida no outro, e o campo pedia 6 quando o
banco gerava outro comprimento. Substituídos por uma expressão única compartilhada
e pelo `maxlength`/`placeholder` do campo ([index.html](index.html), `#dueloCodigo`).

### A5 — A página de privacidade não rolava

[privacidade.html](privacidade.html) carrega `style.css`, e a linha
`html, body { height:100%; overflow:hidden }` — correta para as telas do jogo —
presa o documento de texto numa janela que não passava da primeira tela. Corrigido
com override local, e o auditor ganhou o achado `documentoPreso` mais um caso de
`--prova` que injeta o bloqueio de propósito e exige vê-lo notado. Leitura real
medida: 3788 px roláveis.

### A6 — Questões com duas alternativas numericamente iguais

Esta era a falha pedagógica mais séria do conteúdo: a criança marcava a fração
certa por dois caminhos diferentes, ou a distrator "errada" estava certa. O
parser de texto puro não enxergava isso porque `1/5` e `8/40` são strings
diferentes.

- `opcoes()` já deduplicava por valor; **`itemTexto()` deduplicava por
  semelhança de texto**, e era por ali que passavam os geradores de resposta em
  texto. Criados `valorOpcao` ([conteudo.js:179](conteudo.js#L179)) e
  `mesmaOpcao` ([conteudo.js:210](conteudo.js#L210)) — leitura de fração,
  porcentagem, moeda, decimal com vírgula, notação científica com expoente
  unicode — e `itemTexto` passou a comparar **valor com unidade**
  ([conteudo.js:255-262](conteudo.js#L255)).
- Geradores que ficaram com menos de 3 candidatos depois da deduplicação estrita
  tiveram seus sorteios de distrato ampliados: `dizima` (`54/99` ≡ `6/11`),
  `prob` (`4/10` ≡ `2/5`), `notCient` (`25,7 × 10²` ≡ `2,57 × 10³`),
  `fracEquiv`, `fracSoma`.
- Quatro itens do banco autoral corrigidos, mantendo `alt[0]` certa e trocando o
  distrator que colidia — B174 (`2/12` ≡ `1/6`), B180 (`8/40` ≡ `1/5`),
  B233 (`4,5 × 10⁸` repetido), B243 (`6/10` ≡ `3/5` — duas respostas certas para
  a geratriz de 0,666…).
- A ordem dos candidatos em `itemTexto` agora é sorteada; com sorteio, listas
  grandes de distrato variam de fato entre partidas em vez de mostrar sempre as
  três primeiras.

**Conferido por** regra nova em `confereItem` ([testes/validar-conteudo.js:30-40](testes/validar-conteudo.js#L30)):
igual numérico **com a resposta certa** é erro grave; igual numérico entre
distratores é erro; e o varredor agora percorre os 311 itens do banco **um a um**,
não só os que o sorteio resolvia pescar. As regras foram provadas com duas
sabotagens temporárias em B174 (uma cópia de distrator → 1 erro; cópia da resposta
→ 2 erros) e depois desfeitas.

### A7 — Texto de ralo chegando às crianças: `(opção 1)`

Quando `itemTexto` não achava 3 distratores, ele completava com
`certa + ' (opção N)'` — um lixo visível na tela da criança. Isso acontecia de verdade
em `plano` (quando as duas contas tinham o mesmo resultado) e em `prob`. Corrigido
ampliando os dois sorteios, e o validador passou a falhar se qualquer item contiver
`/\(opção \d\)/`. O galho de reserva continua no código como última linha de defesa,
mas hoje é inalcançável — e deixaria de ser em silêncio se um gerador novo chegar a
isso, porque o teste avisa.

### A8 — O aviso em texto nunca era lido

`.toast` é criado dinamicamente, depois de `marcarDecoracao()` rodar: o
`aria-live` que o README descrevia como existente não estava em lugar nenhum. Agora
o aviso fala por uma região `role="status"` persistente
([script.js:2928-2938](script.js#L2928)), limpa antes de escrever para que a mesma
frase repetida seja anunciada de novo, e o balão visual fica `aria-hidden`.

Junto disso: 181 ícones Font Awesome decorativos no HTML (só 1 tinha `aria-hidden`)
passaram a ser escondidos por [script.js:306-324](script.js#L306), com a regra
conservadora de **não** emudecer ícone que é o único nome de um controle — um
"esconder tudo" teria apagado o nome acessível de botões.
Um `MutationObserver` cobre o que é montado depois do boot (boletim, loja,
tabuleiros). A prova disso entrou como sexto caso do `--prova` do auditor, que
injeta um ícone novo, um botão sem texto e um aviso, e exige ver os três tratados.

### A9 — O auditor de layout media telas que não estavam na tela

As quatro famílias de `--prova` acusaram **CEGO**. A causa não era o medidor: o
portão do tutorial engolia o `startMode`, então o tabuleiro nunca era montado e o
script media uma tela invisível achando que estava tudo bem. Corrigido com
`passarTutorial()` antes de cada caso e com a asserção `conferirFrente`, que reporta
`telaErrada` em vez de medir em silêncio. **Consequência honesta: as 13 telas de
jogo jamais tinham sido medidas antes disto** — e foram, 204 medições em 4 larguras,
0 achados.

### A10 — Os três comprimentos de código não tinham nenhuma amarra

Não era um defeito visível: o banco emitia sala com 8 caracteres
(`supabase/schema.sql:442` → `public._novo_codigo(8)`) e o campo `#dueloCodigo` tinha
`maxlength="8"`, o justo. O problema é o "justo": as duas expressões regulares de
formato aceitam de 6 a 24 (`nuvem.js:25-26`, `duelo.js:40`), o código de vínculo do
aparelho tem 10 (`nuvem.js:24`), e nada prendia uma ponta à outra. Se alguém
aumentasse `_novo_codigo(8)` para 10 — que é exatamente o que se faz quando se quer
mais entropia — o campo cortaria o código digitado em silêncio, e o usuário veria
"entrou" com um código incompleto. Hoje, com o teto do campo em 24, o limite real
volta a ser o do banco, que é onde a decisão mora.

O que entrou de verdade aqui é a **invariante** que faltava, em
`testar-politicas-sql.js`: extrair o comprimento emitido pelo SQL e pelo `nuvem.js` e
exigir que o campo e as duas regex o comportem, mais a coerência de alfabeto entre
os dois lados (o `ALFABETO` do gerador e a classe de `FORMA_CODIGO_SALA`). Prova de
dente, feita por sabotagem e desfeita logo depois: com `maxlength="6"` o teste falha
citando os dois números; com `_novo_codigo(26)` no schema ele falha na faixa aceita.
O comentário de `duelo.js`, que dizia "8 letras hoje" sem dizer onde isso era
decidido, passou a apontar para `criar_sala()`.

---

## 4. Correções médias e baixas

- **Retorno de toque perdido.** `:hover` com `:not()` pesa mais que `:active`
  sozinho, e o afundamento do chip desaparecia nos chips sem seleção. Ajustado em
  `style.css` (seção 19) para `.stab`, `.chip-opcao`, `.chip-voz`, com a prova real
  em `auditar-layout.js --rolagem` (`none → matrix(0.99,0,0,0.99,0,4) → none`).
- **Botão "Apagar dados" com sublinhado de link e alvos pequenos** na página de
  privacidade — alvos reavaliados a 390 px.
- **Comentários misturando idiomas** (espanhol em `testar-politicas-sql.js`,
  inglês em `schema.sql`, palavras chinesas em `narracao.js` e em
  `testar-autorizacao.js`) — tudo reescrito em português do Brasil, que é a língua
  do projeto.
- **Assinatura trocada** `tocarUrl(url, chave)` contra chamadas
  `tocarUrl(chave, url)` em `narracao.js`.
- **`id`s de voz do navegador ≠ lista fechada do servidor**: `config.js` expunha
  `referenceId` e um campo de modelo que o servidor não usava. O navegador agora
  escolhe só `sara|bruna|miguel|evelyn`, e um teste confere que as duas listas
  batem — o `reference_id` mora apenas em
  [api/_voz-nucleo.js:31-34](api/_voz-nucleo.js#L31).
- **Funções mortas** `buscarAudio`/`apagarSilencioso` removidas de `narracao.js`.
- **Pasta `capturas/` criada na raiz** por uma rodada antiga do auditor: removida;
  as capturas agora vivem em `testes/capturas/`.
- **Tabela duplicando cabeçalho** em `RELATORIO-BNCC.md`: linha escrita à mão antes
  do cabeçalho gerado; o gerador foi corrigido.

---

## 5. Pendências — o que este ambiente não permitiu conferir

Nada desta lista foi "concluído". Cada item tem o teste que falta e quem precisa
rodá-lo.

1. **RLS contra Postgres real.** Rodar `testes/testar-rls.sql` (16 cenários) no SQL
   Editor do projeto; toda linha precisa terminar em `ok`. Sem isso, a autorização
   do duelo é *escrita*, não *verificada*.
2. **Autorização contra Supabase real.** `testes/testar-autorizacao.js` com duas ou
   três contas de teste (`CM_TESTE_*` em `.env.local`). Sem credenciais ele imprime
   "NÃO EXECUTADO — faltam credenciais de teste. Nada foi provado aqui." e sai 0 —
   não como sucesso, como ausência de prova.
3. **Chamada real à Fish Audio.** A função está escrita e testada contra uma `fetch`
   falsa rotulada como simulada (`testes/testar-narracao.js`, 272 verificações). Falta
   `FISH_AUDIO_API_KEY` na Vercel e ouvir a primeira frase. As quatro vozes vieram do
   catálogo público conferido em 30/10/2026, são vozes **de comunidade**, e a leitura
   de números em pt-BR só se confirma ouvindo.
4. **Cache de áudio em Storage real.** O caminho de gravação e de leitura foi
   exercitado linha a linha contra um Supabase falso, inclusive a queda de rede em
   cada etapa. Nenhum MP3 foi gravado num bucket de verdade e nenhuma linha entrou
   em `narracoes`: faltam `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ar.
5. **Publicação na Vercel.** Nenhuma deploy foi feita daqui. `vercel.json` e
   `package.json` foram validados como configuração (JSON lido, caminhos
   conferidos por `testar-estrutura.js`); o comportamento hospedado é pendente —
   inclusive se `buildCommand: ""` + `outputDirectory: "."` deixam `api/voz.js`
   ser descoberta como função. A regra de decisão está em
   `CONFIGURACAO-DEPLOY.md` §3, item 4.
6. **Revisão pedagógica humana.** Os 29 códigos que aparecem uma única vez e os 4 com
   unidade ambígua estão listados em `RELATORIO-BNCC.md`. Isto exige quem ensina.
7. **Conferência do índice BNCC.** `testes/bncc-matematica.txt` é cópia ASCII sem
   acentuação. Durante a revisão de unidades, parte dos códigos foi cruzada com
   referências públicas (planos de aula da Nova Escola e Referencial Curricular
   do Paraná); a conferência linha a linha contra o PDF do MEC continua pendente.
8. **Acessibilidade em aparelho real.** Ordem de tabulação e contorno de foco foram
   provados por código (incluindo prova de sabotagem: desligando a entrada do
   diálogo, o vazamento aparece). Leitor de tela de verdade, óculos de toque e
   dedo de criança faltam. **Nenhuma conformidade WCAG 2.2 AA total é declarada aqui.**
9. **Avaliação legal (LGPD / ECA Digital).** Os campos de controlador em
   `privacidade.html` estão marcados "a preencher" de propósito. Não foi inventado
   nome, e-mail, endereço nem base legal. **Isto não é conformidade legal.**
10. **Nada disto foi um teste de invasão.** Não houve pentest, nem varredura de
   vulnerabilidades, nem tentativa de burlar RLS a partir de um cliente hostil real.

---

## 6. Riscos aceitos e registrados

- **`style-src 'unsafe-inline'` continua no CSP.** Motivo: 22 atributos `style=`
  no HTML e 40 escritas `.style.` no JS, concentradas em animações e posições
  calculadas. Redução planejada: mover os `style=` estáticos para classes e
  conservar `unsafe-inline` só enquanto as escritas calculadas existirem, ou adotar
  nonce (imcompatível com cache estático puro). Script não usa `unsafe-inline`.
- **Limitador de requisições da função de voz é em memória.** Cada instância tem seu
  contador (`FISH_AUDIO_POR_HORA`, padrão 240/h). Protege contra deslize de dedo,
  não contra abuso coordenado. Registrado de propósito em `SEGURANCA.md`.
- **Bibliotecas por CDN sem SRI.** `font-awesome` (cdnjs), fonte (Google Fonts) e
  `@supabase/supabase-js` (jsdelivr, fixado em 2.45.4) não têm `integrity`. O
  `nuvem.js` confere a origem antes de injetar ([nuvem.js:156-163](nuvem.js#L156)), e
  o CSP lista as origens. Para uso em escola com rede bloqueada, baixar os arquivos
  e apontar os `<link>` para o caminho local.
- **Sem chave privilegiada no navegador.** A anon key é pública por desenho; o que
  protege são as políticas. `testes/testar-segredos.js` varre os 49 arquivos e proíbe
  `service_role`, JWT `eyJ…` e chave Fish em texto versionado.
- **A conta local não é identidade de servidor.** Sem nuvem ligada, o que existe no
  aparelho é sal + derivado PBKDF2 (600 000 iterações) e a chave de save por perfil.
  Quem copia o `localStorage` pode atacar o derivado offline; a porta do adulto é
  controle parental, não fronteira de segurança contra quem abre o DevTools; o
  progresso não é cifrado em repouso. Os três resíduos estão escritos em
  `SEGURANCA.md` §10.2 — não foram escondidos atrás da palavra "seguro".
- **Duelos simultâneos na mesma sala** não são controlados: a sala tem dois lugares e
  o assento é calculado pelo banco, mas duas partidas em paralelo na mesma sala não
  fazem sentido e não foram bloqueadas além do estado `esperando`/`ativa`/`encerrada`.
- **Perda de dados aceita na migração 00001**: `salas` e `jogadas` são recriadas.
  Estado transitório de partida, sem dado pessoal — documentado no arquivo da
  migração e em `CONFIGURACAO-DEPLOY.md`.
- **A migração de chave antiga de armazenamento** (`candymath_v2` → `candymath_v3`)
  continua lendo a chave antiga; um payload corrompido agora é copiado para
  `candymath_v3_danificado` antes de o jogo recomeçar limpo, para que a família
  possa imprimir o que havia.
- **Publicar a raiz publica `supabase/` e `testes/`.** Com `outputDirectory: "."`, o
  schema, o `testar-rls.sql` e estes documentos ficam em endereço público. Nenhum
  segredo está aí — e é o que a varredura de segredos garante — mas a regra de
  autorização escrita vira leitura pública. As três saídas (aceitar, gerar um
  `dist/` do navegador, ou mover `testes/` e `supabase/` para fora da raiz) estão em
  `SEGURANCA.md`, item 11. Não foi implementada nenhuma: escolher é decisão do dono,
  e a opção (b) mudaria o modelo de "abrir sem build".

---

## 7. Arquivos desta auditoria

**Criados:** `testes/_raiz.js`, `testes/servidor-estatico.js`,
`testes/testar-estrutura.js`, `testes/testar-segredos.js`,
`testes/testar-politicas-sql.js`, `testes/testar-rls.sql`,
`testes/testar-autorizacao.js`, `testes/testar-narracao.js`,
`testes/relatorio-bncc.js`, `api/_voz-nucleo.js`, `api/voz.js`, `narracao.js`,
`privacidade.html`, `package.json`, `.gitignore`, `.env.example`,
`supabase/migrations/00001_endurecer_autorizacao_salas.sql`,
`AUDITORIA.md`, `RELATORIO-TESTES.md`, `SEGURANCA.md`, `CONFIGURACAO-DEPLOY.md`.

**Alterados:** `supabase/schema.sql`, `nuvem.js`, `duelo.js`, `config.js`,
`index.html`, `script.js`, `style.css`, `conteudo.js`, `banco-itens.js`,
`como-jogar.js`, `avaliacao.js`, `vercel.json`,
`README.md`, `testes/validar-conteudo.js`, `testes/validar-css.js`,
`testes/validar-banco.js`, `testes/auditar-layout.js`.

**Acrescentados ou reescritos por inteiro nas rodadas de 04/11 e 17/11:**
`supabase/migrations/00002_cache_narracao.sql`, `mascote.js`, `guarda-roupa.js`,
`contas.js`, `privacidade.js`, `cookies.html`, `favicon.svg`, `favicon.png`,
`testes/_navegador.js`, `testes/testar-mascote.js`, `testes/testar-contas.js`,
`testes/testar-jogo.js`, `APRESENTACAO-ONLINE.md`, `RELATORIO-BNCC.md` (gerado por
`npm run bncc`). O que cada um resolve está no item 8.

**Removidos:** a pasta `capturas/` solta na raiz (as capturas viveram em
`testes/capturas/` o tempo todo, e foi lá que voltaram a ser gravadas); as funções
mortas `buscarAudio`/`apagarSilencioso` de `narracao.js`; os campos `referenceId` e
de modelo que `config.js` expunha sem o servidor usar; e dois scripts de rascunho
desta auditoria (`testes/_icone.js`, `testes/_prova.js`), que geraram o
`favicon.png` e provaram o evento de foco no headless — o que eles provaram virou
código permanente (`Page.bringToFront` nos dois percursos) e os arquivos saíram.

Nenhuma duplicata de arquivo de projeto foi encontrada — o diagnóstico inicial
citava uma `Candy-Math-main/Candy-Math-main/` e referências a `assets/fonts/`;
nenhum dos dois existe nesta árvore, e a correção foi fazer os scripts apontarem
para a raiz real.

---

## 8. Rodada de 17/11/2026 — o que faltava para o produto ser usável por uma família

Os itens acima consertaram o que estava errado no que já existia. Estes seis
atacam o que **não existia** e que a proposta educacional exige: duas crianças no
mesmo aparelho, um adulto que decide o que sai, um Pi que veste o que se compra,
e uma prova de que a rodada inteira funciona.

### B1 — Não havia conta: o progresso era de quem abrisse o navegador

Uma chave só de `localStorage` significa que dois irmãos compartilham estrelas,
ano, degrau e histórico — e que qualquer pessoa que abra o jogo vê o boletim da
criança. Criado `contas.js`: conta de quem acompanha com senha derivada por
**PBKDF2-SHA256, 600 000 iterações, sal de 16 bytes, chave de 256 bits** (nada de
senha em texto, nada de hash rápido), comparação em tempo constante
([contas.js:96-98](contas.js#L96)), código de recuperação mostrado **uma vez**,
perfis de estudante com **chave de save própria** (`candymath_v3#<perfilId>`),
PIN de 4 dígitos com 5 tentativas e travamento, porta do adulto de 10 minutos em
`sessionStorage`, e migração do progresso de convidado para o primeiro perfil.
Funciona por `file://` e sem internet — o WebCrypto está disponível nesse contexto,
e isso foi conferido abrindo o `index.html` direto.

Conferência: `testes/testar-contas.js`, **114 checagens · 0 problemas**, clicando
nos botões que a família vê (criar conta, código de recuperação, perfis, migração,
PIN errado e travado, porta do adulto, troca de estudante, exportação sem segredo,
recuperação de senha, apagar perfil, apagar conta, recarregar e continuar).
O que esta camada **não** é está em `SEGURANCA.md` §10.2: não é identidade de
servidor, e o derivado local pode ser atacado offline por quem copia o armazenamento.

### B2 — O consentimento era um aviso, não uma decisão por finalidade

Um "li e aceito" único autoriza tudo de uma vez, inclusive o que a família não
quer. Criado `privacidade.js` com **três finalidades independentes, desligadas de
fábrica**: `nuvem` (subir progresso), `vozIA` (texto da pergunta para a voz
contratada) e `dueloRede` (apelido e lances para outra pessoa). Cada uma declara
na tela **o que sai, para onde, o que não vai junto e qual é o risco**. Autorizar
exige a senha do adulto — tanto pela tela quanto por chamada direta à API; revogar
**não** exige senha e vale na hora; autorização dada sobre versão antiga do texto
caduca (`VERSAO_TEXTO`). A recusa não é um aviso: `permitido()` é consultado no
caminho de cada saída, e sem autorização a subida, o registro da criança, a voz de
IA e o duelo em rede são recusados.

Conferência: os casos de autorização do `testar-contas.js` (as três nascem
desligadas; senha errada não autoriza; desligar tudo zera; texto velho caduca) e
uma checagem permanente do `testar-estrutura.js` que exige a autorização por
finalidade presente no caminho de cada saída de dados. `cookies.html` lista cada
chave guardada e cada pedido que sai, com o caminho para apagar.

### B3 — O guarda-roupa vendia peça que não aparecia no desenho

Comprar roupa que não muda o mascote é loja quebrada, não loja. `mascote.js`
desenha o Pi em SVG **peça por peça** (79 peças no catálogo de `guarda-roupa.js`),
com recorte próprio por corte, exclusividade declarada entre `mask` e `glasses`
([guarda-roupa.js:210](guarda-roupa.js#L210)) e aviso dizendo **qual peça saiu**;
`script.js` repinta o palco e o hub com cache por assinatura de figurino
(`el.dataset.figurino`) e atualiza o rótulo falado ("Pi vestindo …").
Experimentar uma peça pelo foco **não compra nem grava nada** — estrelas e save
ficam intactos, e o preview some ao sair da vitrine.

Conferência: `testes/testar-mascote.js` (**79 peças · 669 conferências**, incluindo
SVG sem `id=`, sem `on…=`, sem `url(`, sem `undefined/NaN` antes de ir para
`innerHTML`), `auditar-layout.js --mascote` (**265 recortes medidos · 0 peça
cortada**) e as seções 8 a 12 do `testar-jogo.js`, que provam a peça entrando no
SVG por contagem de nós e por rótulo, no palco e no hub.

### B4 — Nenhum teste jogava uma rodada inteira

A suíte validava sintaxe, conteúdo, SQL, CSS e geometria — mas ninguém apertava
"responder". Criado `testes/testar-jogo.js` (**157 checagens · 0 problemas**): ano
e nível pelos chips, explicação antes da primeira partida, acerto com estrela e
sequência, **erro nos três degraus** (pista sem tirar estrela → desenho da situação
→ revelação com o nome do conteúdo e consolidação do mesmo objeto na fila), resumo
da rodada, rodada perfeita que sobe o degrau, verdadeiro/falso com a explicação do
erro, loja inteira com preço travado, compra que desconta exatamente o preço,
experimentar sem comprar, exclusividade máscara/óculos, tirar uma e tirar tudo, e
recarregar com estrelas, ano, degrau, histórico, caixa e figurino intactos.

Dois cuidados que viraram regra do arquivo, porque já enganaram: **só clicar em
elemento visível e habilitado** (botão em tela escondida aceita `.click()` e faz o
teste passar sem ninguém ter visto a tela) e **esperar a condição, não
milissegundos** — cada alternativa entra com `popIn` atrasado e fica invisível até
~0,5 s. E os dois percursos chamam `Page.bringToFront`: sem a aba ativa o Chromium
headless não dispara `focusin`/`focusout`, e o experimentar-peça nunca rodaria.
A contagem varia entre execuções conforme a pergunta sorteada traz
representação em doces ou gêmea no banco; o zero de problemas não varia.

### B5 — Dois defeitos que o próprio auditor pegou

- **`fa-lollipop` desenhava vazio no splash**: o ícone é do conjunto **pago** da
  Font Awesome, e o projeto carrega o free. Não há erro de console — o `<i>` nasce
  com largura zero. Trocado por ícone existente e entrou detector permanente
  (`iconeVazio`) que confere o nome de todo ícone contra o conjunto free.
- **O mascote ao lado da bolha da prova era lido como ruído**: a bolha nasce vazia
  no boot, então a regra conservadora de "só esconder ícone quando sobra texto ao
  redor" não o escondia. O `MutationObserver` passou a reolhar o dono do nó novo
  quando o texto chega depois ([script.js:335-341](script.js#L335)).

### B6 — Toda abertura de página levava um 404

Nenhuma das três páginas declarava ícone, então o navegador pedia `/favicon.ico`
em cada carregamento. Criados `favicon.svg` (a cabeça da Juba com a geometria e a
paleta de `mascote.js`, simplificada para 16 px) e `favicon.png` (retrato 32×32 do
mesmo desenho, para quem não aceita ícone vetorial), com os dois `<link rel="icon">`
em `index.html`, `privacidade.html` e `cookies.html`. O SVG carrega `width`/`height`
porque sem eles o navegador reporta `naturalWidth === 0` e o ícone não rasteriza.
Conferência: `curl` 200 nos dois arquivos e a varredura de console dos dois
percursos, que antes acusava o 404.

## C — Upgrade geral de layout e de conteúdo (17/11/2026)

Pedido do dono: melhorar o layout em todos os aparelhos, arrumar as questões e
varrer erros. O que entrou, e como foi conferido:

### C1 — A revelação agora espera a leitura

Antes, o terceiro degrau do erro revelava a resposta e a rodada avançava sozinha
em 1,8 s — tempo de menos para uma criança ler por que errou. Agora a revelação
fixa a bolha e mostra um botão **"Continuar"** (44 px de alvo, dentro da janela
em 320×640, 768×1024 e 1440×900, medido e fotografado); a questão só avança no
clique. Acertos continuam avançando sozinhos. Na Roleta, a bolha de revelação
ganha seis segundos de leitura. O `testar-jogo.js` confere que a questão fica
parada com o botão visível até o clique.

### C2 — Explicação do raciocínio em toda questão de múltipla escolha

Revelar "a resposta certa é X" sem dizer por quê não ensina. O contrato mudou:
`opcoes()` e `itemTexto()` em `conteudo.js` e `add()` em `banco-itens.js` recebem
a explicação (`exp`), e os dois validadores recusam item sem ela, com texto
curto demais, longo demais para a bolha (12–220 caracteres) ou com
`undefined`/`NaN`. Os 311 itens autorais e as 63 chamadas de gerador receberam
explicação escrita uma a uma, com os números do próprio enunciado; o
Verdadeiro/Falso já carregava a justificativa. A bolha de revelação e a da
roleta mostram a explicação antes do nome do conteúdo.

### C3 — Defeitos objetivos dos geradores, corrigidos na causa

- `fracComp`: uma alternativa errada era **maior** que a resposta certa — a
  pergunta "qual é a maior fração" tinha duas respostas defensáveis.
- `porct`: a base 150 com 15% dava 22,5 **pessoas** numa pesquisa; base trocada
  por 160, e todas as bases agora fecham conta inteira com os percentuais usados.
- `expr`: o ramo de subtração podia dar resultado negativo no 4º/5º ano; o
  subtraendo agora é limitado ao produto menos um.
- `posicional`: tetos pequenos produziam sorteio inválido, e números de 5–6
  dígitos caíam no texto quebrado "ordem das ordem"; nomes de ordem até
  centenas de milhão e sorteio com piso seguro.
- `triang`: só existiam triângulos retângulos; entraram ternos acutângulos e
  obtusângulos, com classificação calculada e explicação por Pitágoras.
- `eq`, `sistema`, `areaTri`, `raiz`: distratores que repetiam a resposta certa
  em outro disfarce (valor morto) trocados por erros de raciocínio reais.
- `volCilindro`: distratores calculados com π de máquina enquanto o enunciado
  manda usar 3,14; agora usam 3,14.
- `tempo`: a hora de início do cinema era informação inútil no enunciado; saiu.
- `sequencia`: erradas negativas ou quebradas em sequências de inteiros dos
  anos iniciais; agora respeitam inteiro e positivo quando a sequência é assim.
- `irr`: "qual das raízes" com alternativas que não são raízes; texto corrigido.
- `memoria`: rótulo "fatos básicos" para contas de seis dígitos no 9º ano;
  rótulo por faixa de ano.

### C4 — BNCC: o ano da habilidade manda na forma da questão

O relatório BNCC exige que o código seja do mesmo ano do item — inclusive na
tabela COD do motor. Onde a habilidade muda de forma entre anos, o gerador
ganhou ramo por ano em vez de código emprestado: `eq` no 8º resolve
`x² = b` (EF08MA09) e no 9º resolve equação fatorável (EF09MA09), mantendo a
equação do 1º grau no 7º (EF07MA18); `polig` no 8º soma os ângulos do
quadrilátero pela diagonal em dois triângulos congruentes (EF08MA14) e no 9º
relaciona ângulo inscrito e central (EF09MA11). `sistema` ficou só no 8º
(EF08MA08) e `mdcmmc` só no 7º (EF07MA01), onde a habilidade existe; `neg` vive
no 7º e no 9º. Temas restritos caem no ano mais próximo quando o validador os
exercita fora do perfil — revisão, nunca código inventado. Unidades corrigidas:
porcentagem é **Números** (oito entradas do banco e os geradores `porct` /
`porctVaria`), igualdade com termo desconhecido até o 5º ano é Números, e
expressões numéricas idem. Resultado: 16 conferências verdes, códigos com
unidade múltipla caíram de 6 para 4.

### C5 — Degrau de dificuldade onde a curva era plana

`expr`, `sistema`, `polig` (soma de ângulos) e `pitag` agora escalam os números
com o nível (ternos pitagóricos multiplicados por 1–4, polígonos até 24 lados,
veículos até 16). Os demais geradores citados na revisão pedagógica continuam
com faixa única por ano: estão corretos, mas planos — ficam listados como
pendência de revisão humana, não como defeito escondido.

### C6 — Conferência desta rodada

`npm test` sai 0 (estrutura 943/0, css 940 regras limpas, banco 0, conteúdo 0,
BNCC 16/16); `npm run contas` 114/0; `npm run jogo` 157/0; auditor de layout nas
cinco variações sai 0 — 218 telas medidas sem achado, prova com 6/6 defeitos
injetados achados mais a prova do ouvido, 265 recortes de mascote sem corte.
Capturas da revelação nos três aparelhos em `testes/capturas/revelacao-*.png`.

---

**Estado no fim desta rodada:** `npm test` sai 0; `npm run contas` sai 0 (114/0);
`npm run jogo` sai 0 (157/0); as cinco variações do auditor saem 0. Os números
colados de cada comando estão em `RELATORIO-TESTES.md`. **Seis provas continuam
sem execução real** (item 5) e o duelo em rede segue desligado em `config.js` até
que as duas primeiras passem — esse é o estado honesto, não um esquecimento.

## D — Observações em aberto para a revisão de privacidade (Fase 5)

Registradas durante a Fase 1 (metas, sequência de dias e missões). Nada aqui foi
alterado ainda: é a lista do que a revisão de privacidade precisa decidir.

### D1 — A biblioteca do Supabase é baixada ao abrir a página, antes da autorização

`script.js` chama `CM_NUVEM.iniciar()` no carregamento; `iniciar` chama
`montarCliente` (`nuvem.js`), que, com `supabaseUrl` e chave preenchidos em
`config.js` (o caso deste repositório), carrega
`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js` e
cria o cliente **sem consultar a autorização por finalidade** (`autorizada()`).
Conferido em navegador real em 18/11/2026: a requisição ao jsdelivr acontece
em toda abertura do jogo, com ou sem conta, com ou sem consentimento.

O que **não** acontece: nenhum dado da criança sobe — `aoSalvar` e
`subirProgresso` continuam barrados por `autorizada('nuvem')`. O que acontece:
o CDN recebe o IP e o momento de cada abertura, e há código de terceiro
executado na página antes de qualquer decisão do responsável. A revisão deve
decidir entre adiar `montarCliente` até a primeira ação que precise da nuvem
(ou até a autorização existir) e servir a biblioteca da própria origem.

### D2 — Metas, sequência de dias e missões ficam só no aparelho

`G.metas` não entra em `pacoteDoProgresso` (`nuvem.js`), e
`testes/testar-metas.js` confere isso. Entra na exportação de dados dos
responsáveis (`CM_CONTAS.exportar` lê o save inteiro) e sai em "Apagar dados"
(`apagarLocal`). Levar esses dados à nuvem exige uma análise própria antes.
