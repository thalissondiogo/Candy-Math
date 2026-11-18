# Relatório de testes — Candy Math

Executado em **17/11/2026**, nesta máquina: Windows 10 (10.0.19045), Node
**v24.22.1**, Git Bash. Sem `npm install` — a suíte inteira é Node puro, sem
dependências. Os números abaixo são saída colada dos comandos, não uma conta de
memória.

Histórico: a primeira execução é de 30/10/2026 (Node v24.15.0); houve uma
reexecução em 04/11/2026 em Linux com Node v22.23.4, depois de entrar o cache de
narração no Supabase. A terceira execução cobriu a reconstrução das contas
locais, do consentimento por finalidade e do guarda-roupa, e os dois percursos
em navegador real que nasceram com ela (`testar-contas.js`, `testar-jogo.js`).
Esta quarta execução cobre o upgrade geral de layout e de conteúdo: explicação
do raciocínio em toda questão de múltipla escolha, revelação que espera a
leitura (botão "Continuar") e geradores com ramo por ano onde a habilidade BNCC
muda de forma (equação do 2º grau, quadrilátero, ângulo inscrito).

Estado no fim desta auditoria: **`npm test` termina com código 0**, os dois
percursos em navegador terminam com código 0 e as cinco variações do auditor de
layout terminam com código 0. **Seis coisas ficaram sem prova real** e estão
listadas no item 5 — elas não passam por aprovadas.

---

## 1. A suíte completa (`npm test`)

Encadeia, nesta ordem, e para na primeira falha:

| script | o que ele conferiu | resultado real |
|---|---|---|
| `testes/testar-estrutura.js` | raiz, referências do HTML (agora incluindo o ícone da aba), ordem de carregamento dos módulos, caminhos dos scripts do `package.json` e do README, `node --check` em todo JS, páginas HTML sem `<script>` inline / sem `on*` / sem `javascript:`, e a autorização por finalidade presente no caminho de cada saída de dados | **943 checagens · 0 problemas** |
| `testes/testar-segredos.js` | 49 arquivos lidos atrás de `service_role`, JWT `eyJ…`, chave Fish, token genérico ≥ 32 caracteres e chave SSH; `.gitignore`/`.env.example`; valores falsos no exemplo; 20 referências locais do HTML; 9 casos de autoconferência | **0 problemas · 0 avisos** |
| `testes/testar-politicas-sql.js` | invariantes de autorização no `schema.sql` + 2 migrações + arquivos do navegador: RLS nas 8 tabelas, nenhuma política `using (true)`/`for all`, `revoke` do `anon`, 20/20 `security definer` com `search_path`, SELECT-only em `salas`/`jogadas`, formato e trava de enumeração do código, cache `narracoes` sem política e sem grant, bucket privado, RPCs só para `service_role` — e a invariante de ordem: nenhuma função chamada antes de existir | **87 verificações · 0 falhas** |
| `testes/testar-autorizacao.js` | parte estática (A0): o interruptor do duelo é conferido **antes** de cada chamada de rede, em 12 portas, e recusa o modo rede no clique | **17 verificações · 0 falhas** + `NÃO EXECUTADO — faltam credenciais de teste. Nada foi provado aqui.` |
| `testes/testar-narracao.js` | ponte de voz com `fetch` e `env` falsos: teto de texto, vozes fora da lista, sem chave → 503, limite → 429, upstream → 502, interrupção, troca de voz, cache com revogação, queda de rede em cada etapa, SSRF recusado, `CM_CACHE=off`, e a recusa de sair sem autorização por finalidade | `★ TESTE SIMULADO` — **272 verificações · todas verdes** |
| `testes/testar-mascote.js` | as 79 peças: catálogo, desenho de cada uma, vitrine, exclusividade mask/glasses, brindes apontando para peças reais, e o SVG seguro para `innerHTML` (sem `id=`, sem `on…=`, sem `url(`, sem `undefined/NaN`) | **79 peças · 669 conferências · todas verdes** |
| `testes/validar-banco.js` | os 311 itens autorais e as 96 afirmações: id único, 4 alternativas sem repetição por valor, `valor` batendo com a resposta, unidade válida, código BNCC na lista oficial, e **explicação do raciocínio em todo item** (texto de 12 a 220 caracteres, sem `undefined`/`NaN`) | `itens: 311 \| afirmações: 96` — **erros: 0** |
| `testes/validar-conteudo.js` | os 55 geradores em 9 anos × 4 níveis, os 311 itens um a um, afirmações V/F, jogos de sequência/ordenação/memória/cruzadinha/balança, representações em doces, duplicata numérica, proibição de `(opção N)` e a mesma trava de explicação dos itens autorais | **erros encontrados: 0** |
| `testes/relatorio-bncc.js` | vínculo código ↔ ano ↔ unidade e cobertura; regrava `RELATORIO-BNCC.md` com semente fixa | **16 conferências estruturais, todas verdes** · índice 247 · usados 194 · sem uso 53 · uma vez só 29 · unidades múltiplas 4 |
| `testes/validar-css.js` | 940 regras lidas (103 ajustes por `@media`): escala fluida, largura fixa sem freio, variável sem definição, seletores duplicados em conflito, id citado no JS ausente no HTML, classe criada no JS sem regra no CSS | `regras lidas: 940` · todas as famílias **nenhuma** · **css revisado sem pendências** |

Comandos individuais, se quiser rodar um só:

```bash
node testes/testar-estrutura.js
node testes/testar-segredos.js
node testes/testar-politicas-sql.js
node testes/testar-autorizacao.js      # pede credenciais; sem elas se autodeclara pendente
node testes/testar-narracao.js         # simulado, e diz que é simulado
node testes/testar-mascote.js          # npm run mascote
node testes/validar-banco.js
node testes/validar-conteudo.js
node testes/relatorio-bncc.js          # npm run bncc
node testes/validar-css.js
```

**As checagens batem de verdade?** Em 04/11 o núcleo da voz foi sabotado três
vezes, numa cópia da árvore em `/tmp` (o projeto não foi tocado): (1) o acerto de
cache parar de contar o uso → **3 falhas contadas**; (2) o `catch` da gravação
passar a deixar o erro subir → a suíte morre exatamente na cena do upload que
cai; (3) o `catch` da procura idem → morre na cena da queda de dns. Duas das três
sabotagens só foram pegas depois de entrarem as oito checagens de **queda de
rede** (`fetch` rejeitando, não devolvendo 500). É por isso que elas existem: erro
de rede com o banco é o caminho mais provável de acontecer em produção, e era o
único não exercido.

---

## 2. Os dois percursos em navegador real

Precisam do servidor na porta 8765 (`npm start`). Cada um sobe o próprio
Chromium/Edge headless (portas 9334 e 9335) e o desliga pelo `Browser.close` no
fim — no Windows o navegador se relança fora da árvore do processo, e matar só o
lançador deixaria a porta presa para a rodada seguinte.

```bash
npm run contas   # node testes/testar-contas.js
npm run jogo     # node testes/testar-jogo.js
```

| percurso | o que percorre, clicando nos botões que a família vê | resultado real |
|---|---|---|
| `testar-contas.js` | sem conta → criar conta → código de recuperação → perfis → migração do progresso de convidado → PIN errado e travado → porta do adulto → troca de estudante → exportação sem segredo → **autorização por finalidade** (as três nascem desligadas; autorizar pede a senha tanto pela tela quanto por chamada direta à API; senha errada não autoriza; revogar não pede senha e vale na hora; sem autorização a subida, o registro da criança, a voz por IA e o duelo em rede são recusados; desligar tudo zera; autorização sobre texto velho caduca) → recuperação de senha → apagar perfil → apagar conta → recarregar e continuar | **114 checagens · 0 problemas** |
| `testar-jogo.js` | ano e nível pelos chips → explicação antes da primeira partida → acerto (estrela, sequência, histórico por conteúdo, save na hora) → erro em três degraus (pista sem tirar estrela → desenho da situação com legenda → revelação com a explicação do raciocínio, o nome do conteúdo e consolidação do mesmo objeto) → **a revelação espera a leitura: botão "Continuar" visível e questão parada até o clique** → resumo da rodada com o que foi praticado → rodada inteira que sobe o degrau e avisa → verdadeiro/falso com a explicação do erro → loja (catálogo inteiro, uma aba por categoria, preço travado com o valor à vista, caixa vazia honesta) → compra que desconta exatamente o preço → **peça que entra no SVG da Juba** (contagem de nós e rótulo falado, no palco e no hub) → experimentar pelo foco sem comprar nem gravar → máscara e óculos que não se empilham, com o aviso de qual saiu → tirar uma e tirar tudo → recarregar com estrelas, ano, degrau, histórico, caixa e figurino intactos | **157 checagens · 0 problemas** |

A contagem do `testar-jogo.js` varia entre execuções: os degraus de erro e a
consolidação só acrescentam checagens quando a pergunta sorteada traz
representação em doces ou gêmea no banco. O que não varia é o zero de problemas.

Dois cuidados que estes arquivos tornam explícitos, porque já enganaram:

- **Só clicam em elemento visível e habilitado.** Um botão em tela escondida
  aceita `.click()` e faz o teste passar sem ninguém ter visto a tela.
- **Esperam a condição, não um número de milissegundos.** O cartão da pergunta
  entra com `slideUp` e cada alternativa com um `popIn` atrasado (até 0,5 s com
  opacidade 0); a prontidão é *todas* as alternativas visíveis e livres. E os
  dois percursos chamam `Page.bringToFront`: sem a aba ativa o Chromium headless
  não dispara `focusin`/`focusout`, e o experimentar-peça do guarda-roupa — que é
  ligado por foco — nunca rodaria.

---

## 3. O auditor de layout (Chrome headless)

```bash
npm start                       # ou: node testes/servidor-estatico.js
node testes/auditar-layout.js   # em outro terminal
```

| modo | o que faz | resultado real |
|---|---|---|
| padrão | mede tela por tela em 320×640, 390×844, 768×1024 e 1440×900: corte vertical, caixa passando da largura da janela, trilho de rolagem horizontal, texto cortado, alvo de toque abaixo de 40 px, elemento colapsado a 0×0 e ícone da Font Awesome cujo nome não existe no conjunto free; `privacidade.html` e `cookies.html` medidos como documento | **telas medidas: 218 · com achado: 0** |
| `--prova` | prova que o medidor enxerga quebra: injeta **seis** defeitos conhecidos na tela do jogo, mais um caso de acessibilidade, uma prova do ouvido (erro de console e recurso que faltou) e um de documento preso | **6/6 injetados achados** (`corteVertical 345px`, `foraDaTela direita 1010px`, `alvoPequeno 60x19`, `colapsado 0x0`, `iconeVazio fa-lollipop`, `textoVazado 154/56`), "medidor confiável", ícones de enfeite escondidos com o nome do botão preservado, ouvido pega `console.error`, exceção assíncrona e recurso local ausente (e ignora ruído de CDN), e leitura limpa de **8570 px** com o bloqueio injetado notado |
| `--rolagem` | rola de verdade em janela baixa e barra de tela: barra que sobe, barra grudada, movimento reduzido, retorno de toque e navegação por foco em diálogo | verde — 4 barras grudadas e 1 devolvendo espaço; chip de ano afunda `none → matrix(0.99,0,0,0.99,0,4) → none`; foco entrou em cada diálogo, percorreu 3 alvos sem vazar e voltou ao hub; desligando a entrada do diálogo, **o vazamento aparece** |
| `--doces` | confere a chuva de doces girando nos dois ramos de movimento | verde — 9 doces na tela, 8 moveram entre leituras com movimento liberado e 10 com movimento reduzido (a chuva é igual à das versões antigas, pedida de volta pelo dono) |
| `--mascote` | cada peça cabe no próprio recorte do SVG, nos três cortes | **265 recortes medidos · 0 peça cortada** |

O `--prova` não é decoração: foi ele que mostrou que as quatro famílias de achado
estavam **CEGAS** porque o portão do tutorial engolia a abertura do jogo. E foi
ele que pegou dois defeitos reais desta auditoria: o ícone `fa-lollipop` (do
conjunto pago, desenhava vazio no splash) e o mascote da bolha da prova lido como
ruído por leitor de tela porque a bolha nasce vazia no boot. Os dois foram
corrigidos na causa, e o detector que os pega agora é permanente.

---

## 4. O que cada prova **não** cobre

- Um teste de sintaxe não diz se a questão é boa para a idade.
- `validar-css.js` e o auditor medem geometria; nenhum leitor de tela de verdade
  (NVDA/VoiceOver) narrou estas telas. O caso de acessibilidade do `--prova`
  confere atributos e região viva, não a experiência de quem ouve.
- O auditor roda em Chrome headless num desktop. Telefone de criança, toque com
  dedo úmido e 4G instável não entraram.
- `testar-narracao.js` usa `fetch` falso. Ele prova o contrato da função, não a
  voz que sai da caixinha.
- `testar-contas.js` prova o fluxo local (PBKDF2 no WebCrypto, perfis separados por
  chave de save, porta do adulto). Ele **não** prova o RLS num Postgres de verdade.
- `testar-politicas-sql.js` lê SQL. Ele prova que a regra está escrita, não que o
  Postgres a aplica — e isso cobrou um preço real: em 04/11/2026, quando o
  `schema.sql` encontrou um Postgres de verdade pela primeira vez, ele falhou com
  `ERROR 42883: function public._e_cuidador(text) does not exist`, com a suíte
  estática toda verde. As políticas chamavam uma função que o arquivo só criava
  mais abaixo. O arquivo foi reordenado (seção 2.1) e a invariante de ordem entrou
  no validador; a lição é que "verde no Node" não significa "aplicável no banco".
- O cache de áudio foi exercitado contra um Supabase falso, linha a linha. Nenhum
  MP3 foi gravado num Storage de verdade ainda — isso é o item 5.

---

## 5. Testes que **não** rodaram — e o que falta para rodar

Estes seis são a diferença entre "implementado" e "comprovado no ambiente real".
Nenhum foi escondido: `testar-autorizacao.js` entra na cadeia do `npm test` e
imprime "NÃO EXECUTADO" na própria saída, e `testar-rls.sql` está no repositório
esperando o banco — ele não roda em Node, roda no Postgres.

| teste | por que não rodou aqui | quem roda, e como |
|---|---|---|
| `testes/testar-rls.sql` (16 cenários) | sem `psql` e sem Docker nesta máquina; nenhuma linha foi executada contra Postgres | dono do projeto, no SQL Editor do Supabase: colar e executar; **todas** as linhas devem terminar em `ok` |
| `testes/testar-autorizacao.js` (A1–A10 reais) | sem `SUPABASE_URL`, `SUPABASE_ANON_KEY` e três contas de teste | dono: preencher `.env` (modelo `.env.example`) e rodar `node testes/testar-autorizacao.js` |
| chamada real à Fish Audio | sem `FISH_AUDIO_API_KEY`; a chave é do dono e nunca entra no repositório | dono: publicar a função, definir a variável e ouvir a primeira frase em cada uma das quatro vozes |
| cache de áudio em Storage real | sem `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` na Vercel, nenhum objeto foi escrito no bucket e nenhuma linha entrou em `narracoes` | dono: com as duas variáveis no ar, ouvir uma frase duas vezes e conferir (1) a linha em `select voz, usos, bytes from narracoes;`, (2) o objeto `voz/chave.mp3` no bucket privado e (3) na segunda frase o tempo visivelmente menor, sem chamada nova à Fish Audio |
| deploy na Vercel (preview e produção) | nenhuma publicação foi feita a partir daqui | dono: importar a pasta, `framework: null`, conferir os cabeçalhos com `curl -I` no endereço publicado |
| revisão pedagógica humana | isto não é script | professora/professor de Matemática, começando pela lista de 29 códigos que aparecem uma vez só em `RELATORIO-BNCC.md` |

Enquanto os dois primeiros não passarem, **o duelo em rede continua desligado**
(`config.js` → `dueloRedeHabilitado: false`), que é o estado honesto: sem a prova,
não há como dizer que é seguro. E mesmo com o interruptor ligado, a autorização
por finalidade de quem acompanha continua sendo exigida na frente — os dois
portões são independentes, e o `testar-contas.js` prova o segundo.

---

## 6. Como reproduzir do zero

```bash
node --version            # qualquer 20+ (rodou em 24.15.0, 22.23.4 e 24.22.1)
cd Candy-Math-main
npm test                  # a suíte inteira, sem instalar nada
npm start                 # sobe http://127.0.0.1:8765
npm run contas            # em outro terminal
npm run jogo              # em outro terminal
node testes/auditar-layout.js --prova
```

Para jogar sem servidor: abrir `index.html` no navegador funciona por `file://`
— o WebCrypto das contas está disponível nesse contexto, e isso foi conferido
num navegador real (conta criada, perfil criado, zero erro de console).