# Candy Math

Jogo de matemática para o Ensino Fundamental (1º ao 9º ano), com conteúdo
alinhado às habilidades da BNCC. Abre direto no navegador, sem instalação,
sem servidor e sem dependências externas.

Na tela inicial há 15 cartões: **13 jogos de rodada** (Quiz Doce, Verdadeiro
ou Falso, Roleta, Pescaria, Balões, Chuva Numérica, Caça-Toupeira, Memória,
Cruzadinha, Ordene, Sequência, Operador e Balança), o **Caça ao Número** — um
duelo 1 x 1 por turnos — e a **Prova de Aprendizagem**, que verifica se o
conteúdo ficou quando ninguém ajuda.

## Como rodar

Abra o arquivo `index.html` no navegador. Ele funciona com o protocolo
`file://`, então basta dar dois cliques.

Se preferir servir por HTTP (alguns navegadores tratam `file://` com
restrições extras), use qualquer servidor estático, por exemplo
`npx serve .` na pasta do projeto.

O jogo inteiro funciona **sem internet e sem conta**. A nuvem (login,
verificação de e-mail, boletim lido de outro aparelho e sala por código no
duelo) é opcional e só acende quando você preenche `config.js` com o seu
próprio projeto Supabase — veja "Publicar e ligar a nuvem".

## Estrutura

```
index.html        telas, hub dos 15 cartões, guarda-roupa, recordes, boletim dos responsáveis
style.css         visual candy, responsivo, foco de teclado e movimento reduzido
script.js         estado, fluxo de rodada, feedback pedagógico, save/load
conteudo.js       motor de conteúdo: 55 geradores com valores calculados
banco-itens.js    banco autoral: 311 situações escritas + 96 afirmações V/F
guarda-roupa.js   catálogo da loja: 79 peças, preços, abas e conjuntos
como-jogar.js     explicação de regras que entra antes da primeira partida de cada jogo
avaliacao.js      prova de aprendizagem (12 perguntas) + boletim dos responsáveis
duelo.js          Caça ao Número: tabuleiro de números, turnos e relógio dos dois lados
config.js         as três linhas que ligam o jogo ao Supabase (vazio = offline)
nuvem.js          conta, verificação de e-mail, vínculo com o responsável, sincronização e salas
supabase/         schema.sql com tabelas, RLS e a lista de mensagens do Realtime
vercel.json       configuração de publicação como site estático
testes/           validadores de conteúdo/CSS e a auditoria de layout
```

Os dados ficam separados da interface. `script.js` só consome a API pública
`window.CM` exposta por `conteudo.js`, as listas de `banco-itens.js` e o
catálogo `window.CM_GUARDAROPA` de `guarda-roupa.js`. A ordem de
carregamento no HTML é essa e não deve mudar.

Uma nota sobre escopo, porque ela pega quem mexe nesses arquivos tarde:
função declarada no topo de um `<script>` clássico vira propriedade de
`window`, mas `const`/`let` do topo não. Por isso os módulos novos leem o
estado por `try { return G; } catch (e) {}` e não por `window.G`.

## Modelo de progressão

O jogador escolhe **ano** (1º ao 9º) e **nível** (Base, Prática, Desafio,
Domínio) no hub. A dupla ano + nível define o baralho da rodada:

- faixas numéricas e tipos de operação escalam por ano e por nível, a partir
  de `PERFIS` em `conteudo.js`;
- cada item carrega `ano`, `nv`, unidade temática, `o` (objeto de
  conhecimento), `bncc` (código da habilidade) e, quando numérica, `valor`;
- dentro de uma rodada nada se repete, e as últimas 12 perguntas ficam em
  memória para não repetir enunciado ao trocar de jogo.

As cinco unidades seguem a BNCC: Números, Álgebra, Geometria, Grandezas e
Medidas, Probabilidade e Estatística.

### O que cada nível faz

O nível não troca o conteúdo do ano — troca o tamanho dos números e quantas
etapas a resolução tem. O hub mostra esta explicação em uma linha, que muda
conforme o nível escolhido:

- **Base** — números menores e uma etapa por vez. É o começo tranquilo do
  conteúdo do ano.
- **Prática** — os números do seu ano, ainda com tempo para pensar. Aqui a
  conta fica mais completa.
- **Desafio** — problemas com mais etapas, medidas para converter e números
  que exigem atenção.
- **Domínio** — o mesmo conteúdo, misturado e com conta mais longa. Aqui você
  resolve sozinho.

A regra de movimento é uma só, e aparece no fim de cada rodada: rodada
completa sobe um degrau, um acerto ou nenhum desce um. O ano nunca muda sem o
jogador pedir. Os chips de nível também levam a descrição em `title` e
`aria-label`, para quem passa o mouse ou usa leitor de tela.

## Conteúdo

Duas fontes, usadas em conjunto:

- **Motor** (`conteudo.js`): gera a questão na hora, com os números
  calculados. Usado quando a dificuldade precisa de ajuste fino por nível —
  operações, frações, porcentagem, expressões algébricas, equações, sistemas,
  potenciação, radiciação, Teorema de Pitágoras, funções, volume,
  probabilidade e estatística.
- **Banco autoral** (`banco-itens.js`): situações escritas uma a uma para os
  temas que o motor não alcança bem, principalmente geometria, grandezas e
  medidas e tratamento da informação no Fundamental 1, e leitura de gráficos
  e tabelas.

O sorteio (`C.sortear`) combina as duas fontes e prioriza o que o jogador
ainda não usou.

## Ciclo de aprendizagem em cada jogo

Todos os 13 jogos de rodada devolvem um texto que diz o que aconteceu, não só
um som de acerto ou erro. "Qual o Sinal?" explica qual era o sinal certo;
Verdadeiro ou Falso sempre traz a justificativa da afirmação; Ordene os Números aponta a
posição que está fora de lugar; Pescaria, Balões Doces, Chuva Numérica e
Caça-Toupeira avisam que a resposta certa ainda está em jogo.

No **Quiz Doce**, que é a atividade de questão única com tempo para pensar, o
erro tem três degraus:

1. **Primeiro erro** — aparece uma pista, escrita por unidade temática, que
   orienta como ler o enunciado. Nenhuma pista entrega a resposta. A
   alternativa errada fica indisponível, mas a criança ainda pode acertar e
   recebe a estrela cheia.
2. **Segundo erro** — aparece a **representação da situação em doces**, se o
   item tiver estrutura representável. A criança continua podendo responder.
3. **Terceiro erro** — a resposta certa é revelada junto com o nome do
   conteúdo praticado, e uma questão de **consolidação** do mesmo objeto de
   conhecimento entra como a próxima pergunta. A rodada continua com cinco
   questões; a de reforço ocupa um desses lugares.

Na Roleta da Sorte, que é de tempo curto, o degrau do meio não cabe: lá são
pista no primeiro erro e revelação no segundo.

## Representação em doces

Quatro tipos de desenho explicam a estrutura da conta, em vez de enfeitar:

- **grupos** — fileiras de bombons para a ideia de "a caixas com b em cada
  uma";
- **repartir** — balas distribuídas uma a uma em pratos, para divisão exata;
- **barra** — barra dividida em partes iguais, com as partes contadas
  pintadas, para fração de uma quantidade;
- **malha** — malha de 100 quadradinhos com a porcentagem pintada, dizendo
  quanto vale cada quadradinho.

O `visual` é dado, criado junto com o item em `conteudo.js`; `script.js` só o
desenha. Um item vem sem visual quando os números são grandes demais para o
desenho fazer sentido (mais de 10 grupos, mais de 60 balas, mais de 12 partes)
ou quando a situação é textual demais para uma representação honesta — nesses
casos o Quiz para na pista e na revelação. Os validadores conferem se o
desenho bate com a resposta: `grupos × cada`, `total ÷ partes` e o valor da
parte pintada.

Nas afirmações de Verdadeiro ou Falso a justificativa sempre acompanha o
resultado.

## Fim de rodada

Cada rodada tem 5 questões (3 na Cruzadinha e na Memória Doce, onde o esforço
é de outra ordem). Pontuação por acerto varia por jogo, e o fim da rodada soma
bônus: 25 estrelas no acerto completo, 10 a partir de 3 acertos. A tela de fim
de rodada diz o que aconteceu com o nível e por quê.

## Como se jogar (tutorial)

Antes da **primeira** partida de cada jogo, uma tela de regras entra no
caminho: o que o jogo treina, quantos passos tem, o que acontece quando se
erra e como a partida termina. São passos numerados, curtos, na linguagem do
jogo. No duelo, a explicação ainda traz um tabuleiro de mentira para tocar: a
criança escolhe o número da conta e vê na hora o que acerto e erro fazem.

Depois da primeira vez o cartão abre o jogo direto, e o "?" no canto do
cartão reabre a mesma explicação. O registro de "já viu" mora no
`localStorage`, então trocar de aparelho mostra o tutorial de novo — o que é
o comportamento desejado para quem joga pela primeira vez em outro lugar.

Arquivo: `como-jogar.js` (`window.CM_TUTORIAL`). Cada jogo tem seu próprio
texto; os números citados nele vêm das mesmas constantes usadas pelo jogo, e
não de um texto solto.

## Caça ao Número — duelo 1 x 1 por turnos

Um cartão do hub (`hc-duelo`) abre uma partida em que a tela se enche de
números e uma conta aparece no topo. O jogador resolve a conta e toca no
número certo no meio de todos os outros.

- **Densidade**: 20, 40, 60 ou 80 números na tela, escolhidos antes da
  partida. A partida só termina quando **todos** os números forem achados —
  por isso a fila de contas tem exatamente o tamanho do tabuleiro, e essa
  igualdade (peças vivas = contas na fila) é a invariantes do jogo.
- **Turnos**: cada vez é de um jogador. O relógio dele corre; o do outro fica
  parado. Ao passar a vez — acerto, erro, tempo esgotado ou "Passar a vez" —
  entra um portão com "Estou pronto", para ninguém ser pego com o relógio
  rodando sem olhar a tela.
- **Tempo por vez**: 30 s no Base e no Prática, 40 s no Desafio, 45 s no
  Domínio, com a opção "Dobrar o tempo de cada vez" para quem ainda está
  ganhando fôlego.
- **Erro**: não elimina. A mesma conta volta na próxima vez da pessoa, e o
  custo é tempo. Se ninguém achar a resposta em três passadas seguidas, o
  número certo começa a brilhar e vale para quem tocar primeiro.
- **Placar**: 1 estrela por número achado, mais 15 de bônus de vitória para
  quem fecha a caçada. Empate é um resultado possível e explicado.
- **Dois modos**: *Dois no aparelho* (local, os dois se revezando no mesmo
  celular) e *Sala por código*, em que cada um joga do seu aparelho e as
  jogadas trafegam pelo banco. Sem nuvem configurada, o modo rede avisa e a
  partida acontece local, com o mesmo tabuleiro e as mesmas regras.

O duelo **não muda o nível** do ano: ele treina conta rápida com atenção
dividida. Isso aparece na tela de fim e no boletim, para o número não ser
lido como se fosse outra coisa. Arquivo: `duelo.js` (`window.CM_DUELO`).

Uma nota sobre o tabuleiro, porque é o tipo de coisa que volta a quebrar se
alguém mexer na fonte: o número é a peça, e um `19.968` partido ao meio
("19.96" / "8") cria um número que não existe na rodada. `ajustarGrade()` mede
o maior número da tela com `canvas.measureText`, na fonte computada da própria
peça, e usa essa medida como largura mínima de coluna — por isso a régua vale
tanto com a webfont carregada quanto sem ela, e é refeita quando o
`document.fonts.ready` chega. Se mesmo assim a largura não der, o tabuleiro
rola dentro do próprio quadro (o teto é `max-height`) em vez de deixar a conta
e o relógio saírem da tela. Em janela a partir de 900 px a coluna da partida
abre para 920 px: aqui a tela cheia é o jogo.

## Prova de aprendizagem

Um cartão próprio no hub abre 12 perguntas do ano escolhido, do nível Base até
o nível em que a criança está agora — ela é cobrada pelo conteúdo que lhe foi
proposto, não por um degrau acima.

A diferença para o jogo é deliberada: **sem pista, sem desenho de doce, sem
correção na hora**. A criança marca uma resposta e segue; o resultado só
aparece no fim, com a leitura por unidade temática. A prova não dá estrela e
não mexe no nível — se desse, todo mundo faria a prova pelo prêmio e o número
deixaria de valer alguma coisa.

Ficam guardadas as últimas 10 provas no aparelho (data, acertos, leitura por
unidade), e elas alimentam a seção de provas do boletim. Arquivo:
`avaliacao.js` (`window.CM_AVALIACAO`).

## Recordes e painel de estudo

O modal de recordes traz estrelas, conteúdos praticados, sequência e acertos,
e um painel **Por onde continuar**. Ele só considera conteúdos com pelo menos
3 tentativas e mostra dois grupos: "Vale revisar" (menos de 60% de acerto) e
"Você já domina" (80% ou mais). É uma estimativa baseada no que foi jogado
aqui, não uma nota escolar — o texto na tela diz isso.

## Boletim dos responsáveis

O botão **Responsáveis** no hub abre um documento — não um painel de
pontuação. A linguagem é formal e a leitura é declaradamente parcial: o
boletim diz o que o jogo registrou, o que isso permite concluir e o que ele
**não** mede. São dez seções numeradas:

1. **Situação observada** — ano, nível, período e o tamanho da amostra em uma
   linha, com os números ao lado (respostas registradas, acertos, conteúdos
   tocados, duelos, provas, estrelas).
2. **O que o jogo está medindo** — e, com o mesmo cuidado, o que ele não
   mede: atenção em sala, sono, humor, competência da professora.
3. **Resultado por unidade temática** — uma barra por unidade da BNCC, com
   acertos sobre tentativas escritos na linha. Unidade sem jogo aparece como
   "ainda não jogado", sem percentual inventado.
4. **Onde deve focar e onde já se adapta melhor** — conteúdos travando
   (abaixo de 60%) e conteúdos que a criança já resolve sozinha (80% ou
   mais), sempre a partir de 3 tentativas; abaixo disso o texto diz que a
   observação é insuficiente. A seção fecha com a **cobertura do ano**:
   quanto do previsto já apareceu pelo menos uma vez. Aparição não é domínio,
   e a linha diz isso.
5. **Provas de aprendizagem aplicadas** — cada prova de 12 perguntas com a
   data e a leitura por unidade, para comparar uma aplicação com a seguinte.
6. **Leitura combinada: jogo e prova** — a comparação que importa: o acerto
   nas rodadas (onde existe pista, desenho e consolidação) contra o acerto na
   prova (onde não existe nada disso). A distância entre os dois é o que diz
   se o conteúdo ficou ou se estava sendo carregado pela ajuda.
7. **Recomendações para quem acompanha** — o que fazer com o que foi lido
   acima, escrito para o adulto, não para a criança.
8. **Como o jogo regula a dificuldade** — a escada de ajuda (pista → desenho
   → resposta com consolidação) e a regra de subir e descer de nível.
9. **Habilidades da BNCC que apareceram** — só o vocabulário comum com a
   escola: os códigos, nunca uma nota.
10. **Conta e onde ficam os dados** — o aparelho, e o que muda se a conexão
    for ligada.

Sem a nuvem ligada, o boletim lê somente o `localStorage` do aparelho e a
primeira seção diz que nada saiu dali. Com a nuvem ligada, ele explica o
cadastro do adulto, o e-mail verificado e que apenas o apelido escolhido viaja
junto com o desempenho.

## Guarda-roupa

Estrelas compram peças para o mascote. São **79 itens em 8 abas**, e a lista
de abas é montada a partir do catálogo — criar uma categoria nova em
`guarda-roupa.js` não exige mexer no HTML.

| Aba | Itens | O que tem |
|---|---|---|
| Conjuntos | 16 | fantasias completas (herói, armadura, colosso verde, motoqueiro, cowboy, baile e doces) |
| Roupas | 16 | camisetas e calças tradicionais, enfeitadas para o lado do doce e com contas matemáticas |
| Calçados | 16 | 4 saltos, 3 tênis sociais, 5 crocs (branca, lilás, azul-bebê, preta, rosa), botinas e botas |
| Chapéus | 9 | coroas, bonés, capacetes e máscaras de baile |
| Óculos | 8 | todos de confeitaria: rosquinha, calda de chocolate escorrendo, pirulito de menta, algodão-doce |
| Perucas | 6 | só franja, cabelo curto completo, longa, e as outras três variações do mascote |
| Extras | 8 | acessórios soltos |
| Tudo | 79 | a loja inteira em uma lista |

Conjunto (`tipo: 'conjunto'`) é a fantasia completa e por isso custa mais
(150–180 estrelas): a compra desconta uma vez e entrega as peças avulsas que
o compõem, listadas no cartão como "Vem junto". Os nomes são autorais e
inspirados em tipos consagrados — nenhum pertence a marca ou estúdio.

A compra desconta estrelas na hora, o item entra em `owned` e o que está
vestido em `equip`. Nada na loja é decoração falsa: todo item listado pode
ser comprado e equipado, e o retrato do mascote reflete o conjunto.

## Publicar e ligar a nuvem (opcional)

O jogo é 100% local até você preencher `config.js`. A nuvem traz quatro
coisas: cadastro de quem acompanha, com **e-mail verificado**, vínculo com a
criança por código de 6 letras, leitura do boletim em outro aparelho e o
duelo em **sala por código**.

**1. Banco (Supabase).** Crie um projeto gratuito em `supabase.com`, abra o
*SQL Editor*, cole o conteúdo de `supabase/schema.sql` e rode. O arquivo é
idempotente — pode rodar de novo. Ele cria `perfis`, `criancas`, `vinculos`,
`progressos`, `salas` e `jogadas`, ativa as políticas de RLS e entra
`jogadas` na lista de mensagens do Realtime.

**2. Chaves.** Em *Project Settings → API*, copie o **Project URL** e a
**anon public key** e cole nas duas primeiras linhas de `config.js`. A anon
key é pública por natureza: quem protege os dados são as políticas RLS do
schema, não a chave. A **service role key nunca entra em arquivo algum do
navegador** — se você colar uma chave que começa com `eyJ…` num lugar que não
seja `config.js`, está errado.

**3. Publicar (Vercel).** Importe a pasta como projeto. O `vercel.json` já
declara o build como estático (`framework: null`, `outputDirectory: "."`),
com `index.html` na raiz e cabeçalhos de cache e segurança. Não há variável
de ambiente: as chaves vivem em `config.js`, que é texto no repositório —
por isso só cole ali a anon key, nunca um segredo.

**4. Verificação de e-mail.** Em *Authentication → URL configuration*, ponha
o endereço público do jogo como **Site URL**, para o link de confirmação
voltar para a mesma página. Em *Authentication → Providers → Email*, deixe o
e-mail habilitado. Sem o clique no link, o jogo avisa que a conta existe mas
não está verificada, e nada sincroniza até verificar.

**O que sobe para o banco**: apelido da criança, ano, nível, estrelas,
histórico por conteúdo, provas e o registro dos duelos. **O que não sobe**:
nome real, foto, escola, endereço, CPF, geolocalização. A criança aparece
como um apelido que o adulto digita e um código gerado no aparelho dela.

**Se a nuvem estiver desligada** (configuração vazia, sem internet, ou rede
que bloqueia websocket), o jogo continua igual: o painel de conexão explica o
que falta, a sala por código cede lugar ao modo local com um aviso honesto, e
o Realtime tem varredura a cada 900 ms como reserva.

## Persistência e privacidade

O progresso é salvo em `localStorage` na chave `candymath_v3` (há leitura de
migração da chave antiga `candymath_v2`). São guardados apenas estrelas, ano,
nível, sequência, histórico por conteúdo, duelos, provas e itens da loja.
Ao carregar, cada campo é validado antes de ser aceito: números fora de faixa,
`certas > feitas` ou texto onde deveria haver número fazem o campo ser
descartado em vez de quebrar a interface.

Sem a nuvem ligada, não há contas, não há serviços externos e nenhuma
informação do jogador sai do aparelho. Os únicos recursos remotos são a fonte
(Google Fonts) e os ícones (Font Awesome), carregados no início da página; sem
internet eles desaparecem, mas o jogo continua funcionando. Se o jogo for
usado em escola com rede bloqueada, vale baixar essas duas referências e
apontar os `<link>` do `index.html` para os arquivos locais.

Com a nuvem ligada, quem decide é a conta criada pelo adulto: ela é a única
que pode registrar uma criança, ler o progresso dela e desvincular. O vínculo
é por código de 6 letras gerado no aparelho da criança, e várias contas podem
se vincular ao mesmo código (mãe e pai, por exemplo). A conta da criança não
existe: ela é um apelido e um código.

## Acessibilidade

- Navegação por teclado: `Tab` percorre o hub e os jogos, `Enter` ou `Espaço`
  aciona qualquer elemento clicável, `Esc` fecha modais ou volta ao hub.
- Telas ocultas saem da ordem de tabulação e da árvore de acessibilidade. O
  atributo `hidden` manda em qualquer regra de `display` — é a linha
  `[hidden] { display:none !important }` no alto do `style.css`, e é ela que
  impede o formulário de montagem da caçada de continuar aparecendo por baixo
  do tabuleiro.
- Foco visível com contorno de 3px; alvos de toque com no mínimo 40px.
- Acerto e erro não dependem só de cor: ✓ e ✗ aparecem nos botões por CSS.
- Feedback das perguntas é anunciado com `aria-live`; pontos de progresso e
  outros enfeites são `aria-hidden`. No duelo, a troca de vez também é
  anunciada, e o portão "Estou pronto" exige um toque deliberado antes de o
  relógio de alguém começar a correr.
- Cada chip de nível traz a descrição no `aria-label` e no `title`, e as barras
  do boletim têm rótulo em texto ("Números: 8 acertos em 15
  tentativas"), então a informação não depende da largura do traço colorido.
- O `role="radiogroup"` dos chips da caçada (densidade e modo de jogo) faz a
  escolha ser lida como opção, não como botão solto.
- `prefers-reduced-motion` desliga confete, encurta o giro da roleta e reduz
  animações.

## Testes

Quatro scripts, todos em Node puro — sem instalar nada, sem `package.json`.
Eles servem para quem mexe no projeto; para jogar, não são necessários.

```bash
node testes/validar-banco.js        # o banco autoral
node testes/validar-conteudo.js     # os 55 geradores, ano × nível
node testes/validar-css.js          # o guarda-chuva do CSS fluido
node testes/auditar-layout.js       # mede cada tela em vários tamanhos de janela
```

`validar-banco.js` confere ids únicos, quatro alternativas sem repetição,
campo `valor` batendo com a resposta correta, unidade válida e código BNCC
presente na lista oficial (o extrato de habilidades está em
`testes/bncc-matematica.txt`).

`validar-conteudo.js` exercita os 55 geradores em todas as combinações de ano
e nível, além de sorteio, afirmações e dos jogos de sequência, ordenação,
memória, cruzadinha e balança, procurando resposta errada, `NaN`, texto
quebrado ou item fora do ano pedido. Ele também confere as representações em
doces: `grupos × cada`, `total ÷ partes` e a parte pintada da barra têm de dar
exatamente a resposta do item, e o desenho não pode passar dos limites que
ainda fazem sentido visual.

`validar-css.js` procura o que costuma quebrar em janela pequena: tamanho de
letra fora da escala fluida, largura fixa que estoura, variável usada sem
definição e regras duplicadas que se desarmam entre si.

`auditar-layout.js` abre o jogo em navegador headless e mede, tela por tela:
corte vertical, caixa que passa da largura da janela, trilho de rolagem
horizontal, texto cortado, alvo de toque com menos de 40 px e elemento
colapsado a 0×0. Grava as capturas em `testes/capturas/`. Ele precisa de um
servidor de arquivos na porta 8765 (`python3 -m http.server 8765`).

Os três primeiros terminam com código de saída 1 quando encontram erro — vale
rodar de novo depois de mexer no conteúdo ou no CSS.

Uma nota honesta sobre a última verificação: a máquina onde estes arquivos
foram escritos não tem Node instalado, então os quatro scripts não rodaram lá.
O que foi conferido ali foi o jogo de verdade, aberto em navegador real sobre
estes arquivos: os 15 cartões, as 17 telas, as 79 peças do catálogo, uma
partida completa de Caça ao Número até o placar final sem violar nenhuma
invariante e sem erro de página, os dez blocos do boletim e uma prova de 12
perguntas registrada no armazenamento local. As regras que o
`validar-css.js` procura — variável sem definição e tamanho de letra fora da
escala fluida — foram refeitas à mão sobre o `style.css` e não acusaram nada.
Mesmo assim, rode os quatro antes de publicar.

Eles validam a **lógica** do conteúdo e a **geometria** da interface. Não
substituem leitura humana das situações-problema nem avaliação com crianças.

## Limitações conhecidas

- Geometria e medidas continuam mais dependentes de texto do que de desenho.
  As representações em doces cobrem multiplicação, divisão exata, fração de
  uma quantidade e porcentagem; figuras de sólidos, áreas e ângulos ainda não
  foram implementadas.
- A pista é por unidade temática e o visual só existe nos quatro tipos acima.
  Uma dica escrita por questão, e representações para os outros temas, são o
  próximo passo natural.
- A consolidação exige que exista outro item do mesmo objeto de conhecimento
  no ano e nível. Em células com um único item sobre aquele objeto, o reforço
  não vem — preferimos não forçar uma questão de outro assunto.
- O código BNCC por item é uma escolha editorial, conferida contra a lista
  oficial de habilidades. Isso não equivale a uma auditoria curricular
  formal, e o jogo não cobre o currículo inteiro.
- O duelo pesca do mesmo motor de conteúdo dos outros jogos, no ano e no nível
  escolhidos, mas **só entram no tabuleiro contas cuja resposta é um número
  limpo** — fração escrita como `3/4`, resposta em texto ou número com mais
  casas que a peça comporta ficam de fora. A caçada treina o cálculo do ano,
  não o repertório inteiro dele.
- A prova sorteia 12 perguntas do ano, do Base até o nível atual. Doze
  perguntas são uma amostra curta: uma aplicação isolada não sustenta
  conclusão, e o boletim diz isso em vez de fingir que sim. A leitura
  comparativa só aparece com mais de uma prova.
- O boletim é a leitura de um aparelho. Se a criança jogar em dois
  computadores, cada um tem sua história — a nuvem é o que junta as duas, e
  sem ela os números do boletim são os daquele aparelho.
- A sala por código do duelo depende do Realtime do Supabase. Onde o
  websocket não passa, o jogo cai para varredura a cada 900 ms: o resultado é
  o mesmo, com um atraso a mais perceptível em conexão ruim. Duas partidas
  simultâneas na mesma sala não são controladas — a sala é de dois lugares.
- A verificação de e-mail depende da configuração do projeto (Site URL e
  provedor *Email* ativo). Sem isso, a conta nasce não verificada e o jogo
  avisa em vez de sincronizar pela metade.
- Layout, largura de coluna do tabuleiro e alvos de toque foram conferidos em
  navegador real a 390 px e a 1280 px, tela por tela. A ordem de tabulação e o
  contorno de foco continuam verificados por código, não por navegação com
  `Tab`; vale conferir em um aparelho real.
- Nada aqui comprova ganho de aprendizagem. Isso depende de avaliação com
  alunos e professores, ainda não realizada — a prova existe para dar ao jogo
  uma medida interna, não para substituir essa avaliação.
