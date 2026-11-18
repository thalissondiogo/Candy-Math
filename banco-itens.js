/* =========================================================
   BANCO DE ITENS AUTORAIS — situações escritas uma a uma
   Complementa o motor de conteúdo nos temas que ele não
   alcança no Fundamental 1 (Geometria, Grandezas e Medidas,
   Dados e a Álgebra inicial). alt[0] é sempre a resposta certa.
   Campos: ano, nv (1 a 4), u (unidade BNCC), o (objeto de
   conhecimento), bncc, txt, alt, valor (quando numérica) e
   exp (a explicação que aparece quando a resposta é revelada).
   ========================================================= */
(function (root) {
'use strict';

let contador = 0;
const ITEMS = [];
function add(ano, nv, u, o, bncc, txt, alt, valor, exp) {
  const item = {
    id: 'B' + (++contador), ano: ano, nv: nv, u: u, o: o,
    bncc: [bncc], txt: txt, alt: alt, exp: exp || ''
  };
  if (valor != null) item.valor = valor;
  ITEMS.push(item);
}

// ── 1º ano · Base ─────────────────────────────────────────
add(1, 1, 'numeros', 'Adição com números até 20', 'EF01MA08',
  'Ana tinha 7 lápis na caneta e ganhou mais 5 de presente. Com quantos lápis ficou?',
  ['12', '11', '13', '10'], 12, 'Juntar 7 lápis com mais 5 dá 12, porque 7 + 5 = 12.');
add(1, 1, 'numeros', 'Comparação de quantidades', 'EF01MA05',
  'Ravi leu 9 páginas de um livro e Yara leu 12. Quem leu mais páginas?',
  ['Yara, porque 12 é maior que 9', 'Ravi, porque 9 vem antes de 12', 'Os dois leram a mesma quantidade', 'Não dá para comparar'], null, '12 é maior que 9, então Yara leu mais páginas que Ravi.');
add(1, 1, 'numeros', 'Sequência numérica e antecessor/sucessor', 'EF01MA04',
  'Qual número vem logo depois de 29 na contagem?',
  ['30', '28', '31', '20'], 30, 'Na contagem, depois do 29 vem o 30: é só acrescentar 1.');
add(1, 1, 'geometria', 'Figuras planas', 'EF01MA14',
  'Uma peça de quebra-cabeça tem 3 lados e 3 cantos. Que figura é essa?',
  ['Triângulo', 'Quadrado', 'Retângulo', 'Círculo'], null, 'A figura de 3 lados e 3 cantos se chama triângulo.');
add(1, 1, 'medidas', 'Dias da semana', 'EF01MA17',
  'Quantos dias há em uma semana?',
  ['7', '5', '10', '12'], 7, 'Uma semana tem 7 dias: segunda, terça, quarta, quinta, sexta, sábado e domingo.');
add(1, 1, 'dados', 'Eventos certos e impossíveis', 'EF01MA20',
  'Em uma caixa só há 8 bolinhas vermelhas. Tirando uma bolinha sem olhar, é...',
  ['certo que ela seja vermelha', 'impossível ela ser vermelha', 'talvez ela seja azul', 'impossível tirar uma bolinha'], null, 'Todas as bolinhas da caixa são vermelhas, então qualquer uma que sair será vermelha.');
add(1, 1, 'dados', 'Leitura de tabela simples', 'EF01MA21',
  'Na tabela de frutas favoritas da turma, maçã teve 9 votos, banana teve 5 e laranja teve 7. Quantos votos recebeu a fruta mais escolhida?',
  ['9', '7', '5', '21'], 9, '9 é o maior número de votos: maçã teve 9, laranja 7 e banana 5.');

// ── 1º ano · Prática ──────────────────────────────────────
add(1, 2, 'numeros', 'Composição de um número menor que 20', 'EF01MA07',
  'Qual número completa a sentença 8 + ___ = 10?',
  ['2', '8', '10', '1'], 2, '8 + 2 = 10: faltam 2 para o 8 chegar ao 10.');
add(1, 2, 'numeros', 'Subtração com números até 20', 'EF01MA08',
  'Duas crianças colecionavam conchas. Nicolle tinha 13 e deu 6 para o irmão. Com quantas ficou?',
  ['7', '6', '8', '19'], 7, '13 - 6 = 7: tirar as 6 conchas que ela deu deixa 7.');
add(1, 2, 'geometria', 'Figuras geométricas espaciais no cotidiano', 'EF01MA13',
  'Qual destes objetos tem a forma de uma esfera?',
  ['Bola de gude', 'Lata de leite em pó', 'Caixa de sapato', 'Chapéu de festa de criança'], null, 'A bola de gude é redonda em toda a volta, sem pontas nem faces planas: essa é a forma da esfera.');
add(1, 2, 'medidas', 'Comparação de comprimentos', 'EF01MA15',
  'Um barbante mede 3 canetas de comprimento e um fio de lã mede 5 canetas do mesmo tamanho. O que é mais comprido?',
  ['O fio de lã', 'O barbante', 'Os dois têm o mesmo comprimento', 'Não é possível comparar'], null, '5 canetas é mais comprido que 3 canetas, então o fio de lã é o maior.');
add(1, 2, 'dados', 'Leitura de gráfico de colunas', 'EF01MA21',
  'No gráfico dos bichos favoritos da turma há 12 votos para cachorro, 8 para gato e 6 para peixe. Quantos alunos votaram no gato?',
  ['8', '12', '6', '26'], 8, 'A coluna do gato mostra 8 votos; 12 é do cachorro e 6 é do peixe.');
add(1, 2, 'numeros', 'Composição por dezenas e unidades', 'EF01MA07',
  'Qual número tem 2 dezenas e 4 unidades?',
  ['24', '42', '20', '14'], 24, '2 dezenas valem 20 e 4 unidades valem 4; 20 + 4 = 24.');
add(1, 2, 'medidas', 'Períodos do dia', 'EF01MA16',
  'Qual das atividades abaixo acontece normalmente à noite?',
  ['Dormir', 'Tomar café da manhã', 'Entrar na escola', 'Recreio'], null, 'Dormir acontece à noite; café da manhã, escola e recreio são atividades do dia.');

// ── 1º ano · Desafio ──────────────────────────────────────
add(1, 3, 'numeros', 'Subtração — ideia de retirar', 'EF01MA08',
  'Pedro tinha 15 figurinhas e perdeu 7 no caminho da escola. Com quantas figurinhas ele chegou?',
  ['8', '22', '7', '9'], 8, '15 - 7 = 8: das 15 figurinhas, 7 se perderam e sobraram 8.');
add(1, 3, 'numeros', 'Agrupamentos de dois', 'EF01MA02',
  'Em uma caixa há 10 ovos. Quantas duplas de ovos há nessa caixa?',
  ['5', '10', '2', '20'], 5, 'Juntando os ovos de 2 em 2, os 10 ovos formam 5 duplas.');
add(1, 3, 'geometria', 'Lados das figuras planas', 'EF01MA14',
  'Quantos lados tem um quadrado?',
  ['4', '3', '5', '8'], 4, 'O quadrado tem 4 lados, todos do mesmo tamanho.');
add(1, 3, 'medidas', 'Sistema monetário — moedas', 'EF01MA19',
  'Tiago tem 1 moeda de 1 real e 4 moedas de 25 centavos. Quanto ele tem ao todo?',
  ['R$ 2,00', 'R$ 1,00', 'R$ 4,00', 'R$ 5,00'], 2, '4 moedas de 25 centavos formam R$ 1,00; com a moeda de R$ 1,00, dá R$ 2,00 ao todo.');
add(1, 3, 'dados', 'Maior chance', 'EF01MA20',
  'Um saquinho tem 3 bolinhas azuis e 1 amarela. Retirando uma sem olhar, qual cor tem mais chance de sair?',
  ['Azul', 'Amarela', 'As duas têm a mesma chance', 'Nenhuma delas'], null, 'Há 3 bolinhas azuis e só 1 amarela, então o azul tem mais chance de sair.');
add(1, 3, 'numeros', 'Sequência com regularidade', 'EF01MA10',
  'Observe a sequência: 2, 4, 6, 8, ___, 12. Qual número falta?',
  ['10', '9', '11', '14'], 10, 'A sequência conta de 2 em 2: depois do 8 vem o 10, e depois do 10 vem o 12.');
add(1, 3, 'medidas', 'Meses do ano', 'EF01MA17',
  'Quantos meses tem um ano?',
  ['12', '7', '10', '4'], 12, 'O ano tem 12 meses, de janeiro a dezembro.');

// ── 1º ano · Domínio ──────────────────────────────────────
add(1, 4, 'numeros', 'Problema de dois passos', 'EF01MA08',
  'Carla tinha 12 balas, deu 5 para a irmã e depois ganhou 3 da avó. Com quantas balas ficou?',
  ['10', '14', '4', '8'], 10, '12 - 5 = 7 e 7 + 3 = 10: primeiro ela dá as balas, depois ganha as da avó.');
add(1, 4, 'numeros', 'Comparação com suporte do contexto', 'EF01MA05',
  'Um ônibus tem 26 assentos e entraram 34 passageiros. O que há mais?',
  ['Passageiros, porque 34 é maior que 26', 'Assentos, porque 26 é maior que 34', 'A mesma quantidade dos dois', 'Não dá para saber'], null, '34 é maior que 26, então há mais passageiros que assentos.');
add(1, 4, 'geometria', 'Sólidos e objetos', 'EF01MA13',
  'Qual objeto tem a forma de um cilindro?',
  ['Lata de milho', 'Bola de futebol', 'Chapéu de festa', 'Dado de jogo'], null, 'A lata de milho tem duas bases redondas e uma parte curva que rola: é um cilindro.');
add(1, 4, 'medidas', 'Primeiros meses do ano', 'EF01MA18',
  'Qual é o primeiro mês do ano?',
  ['Janeiro', 'Dezembro', 'Junho', 'Fevereiro'], null, 'Janeiro é o mês que abre o ano; fevereiro vem depois dele.');
add(1, 4, 'numeros', 'Número entre dois dados', 'EF01MA05',
  'Qual número está entre 58 e 60?',
  ['59', '57', '61', '68'], 59, 'Na contagem, 59 vem depois de 58 e antes de 60.');
add(1, 4, 'dados', 'Comparação de dados em tabela', 'EF01MA21',
  'A turma escolheu a brincadeira preferida: roda teve 11 votos, pega-varetas 9 e queimada 13. Qual brincadeira ganhou a escolha?',
  ['Queimada', 'Roda', 'Pega-varetas', 'Roda e pega-varetas empataram'], null, '13 é o maior número de votos: queimada 13, roda 11 e pega-varetas 9.');
add(1, 4, 'numeros', 'Completar a igualdade', 'EF01MA07',
  'Qual número completa 14 + ___ = 20?',
  ['6', '4', '14', '5'], 6, '14 + 6 = 20: do 14 até o 20 faltam 6.');

// ── 2º ano · Base ─────────────────────────────────────────
add(2, 1, 'numeros', 'Adição com reagrupamento', 'EF02MA05',
  'Uma papelaria vendeu 35 borrachas de manhã e 18 à tarde. Quantas borrachas foram vendidas no dia?',
  ['53', '43', '52', '54'], 53, '35 + 18 = 53: somam-se as vendas da manhã e da tarde.');
add(2, 1, 'numeros', 'Subtração com reagrupamento', 'EF02MA05',
  'Na coleção de Beto havia 42 cartões e ele deu 15 cartões repetidos para o amigo. Com quantos cartões ele ficou?',
  ['27', '33', '25', '37'], 27, '42 - 15 = 27: dos 42 cartões, 15 foram dados ao amigo.');
add(2, 1, 'numeros', 'Multiplicação como soma de parcelas iguais', 'EF02MA07',
  'Em cada uma de 4 cestas há 6 maçãs. Quantas maçãs há nas quatro cestas?',
  ['24', '10', '18', '28'], 24, '6 + 6 + 6 + 6 = 24, o mesmo que 4 × 6: são 4 cestas com 6 maçãs cada.');
add(2, 1, 'numeros', 'Dobro', 'EF02MA08',
  'Bruno tem 15 figurinhas e Diego tem o dobro de figurinhas que Bruno. Quantas figurinhas Diego tem?',
  ['30', '17', '13', '45'], 30, 'Dobro é duas vezes: 15 + 15 = 30, ou 2 × 15 = 30.');
add(2, 1, 'geometria', 'Características das figuras planas', 'EF02MA15',
  'Qual figura tem os 4 lados do mesmo tamanho e 4 cantos retos?',
  ['Quadrado', 'Retângulo', 'Triângulo', 'Círculo'], null, 'Só o quadrado tem os 4 lados iguais e os 4 cantos retos; no retângulo os lados não são todos iguais.');
add(2, 1, 'medidas', 'Duração em relógio digital', 'EF02MA19',
  'O desenho começou às 15h e terminou às 16h30. Quanto tempo ele durou?',
  ['1 hora e 30 minutos', '30 minutos', '1 hora', '2 horas'], null, 'De 15h a 16h passa 1 hora, e de 16h a 16h30 passam 30 minutos.');
add(2, 1, 'dados', 'Comparação em tabela', 'EF02MA22',
  'A tabela mostra os livros lidos no mês: Lia leu 8, Tomás leu 6 e Nina leu 9. Quem leu menos livros?',
  ['Tomás', 'Lia', 'Nina', 'Lia e Tomás leram a mesma quantidade'], null, '6 é o menor número de livros: Tomás leu 6, Lia 8 e Nina 9.');
add(2, 1, 'numeros', 'Centenas, dezenas e unidades', 'EF02MA04',
  'No número 327, quantas centenas tem esse número?',
  ['3', '2', '7', '32'], 3, 'No 327, o 3 está na ordem das centenas e vale 300; o 2 são dezenas e o 7, unidades.');

// ── 2º ano · Prática ──────────────────────────────────────
add(2, 2, 'numeros', 'Subtração com números até a ordem das centenas', 'EF02MA06',
  'Uma escola tem 432 estudantes matriculados. Em um dia chuvoso, 128 faltaram. Quantos estudantes compareceram?',
  ['304', '316', '314', '306'], 304, '432 - 128 = 304: dos 432 matriculados, tiram-se os 128 que faltaram.');
add(2, 2, 'numeros', 'Multiplicação — organização retangular', 'EF02MA07',
  'A quadra foi arrumada em 5 fileiras com 8 cadeiras em cada uma. Quantas cadeiras foram usadas?',
  ['40', '13', '35', '48'], 40, '5 fileiras com 8 cadeiras formam 5 × 8 = 40 cadeiras.');
add(2, 2, 'numeros', 'Metade', 'EF02MA08',
  'Sofia dividiu igualmente 26 bombons entre ela e a prima. Quantos bombons ficaram para cada uma?',
  ['13', '26', '12', '52'], 13, 'Dividir 26 em 2 partes iguais dá 13 para cada uma, pois 13 + 13 = 26.');
add(2, 2, 'medidas', 'Relação entre metro e centímetro', 'EF02MA16',
  'Quantos centímetros tem 1 metro?',
  ['100 cm', '10 cm', '1.000 cm', '30 cm'], 100, 'Cada metro tem 100 centímetros, então 1 m = 100 cm.');
add(2, 2, 'geometria', 'Faces dos sólidos', 'EF02MA14',
  'Quantas faces tem um dado em forma de cubo?',
  ['6', '4', '8', '12'], 6, 'O cubo tem 6 faces quadradas: em cima, embaixo e 4 dos lados.');
add(2, 2, 'dados', 'Eventos pouco prováveis', 'EF02MA21',
  'Em uma sacola há 10 cartões verdes e 2 amarelos. Retirar um cartão amarelo sem olhar é...',
  ['pouco provável', 'impossível', 'muito provável', 'certo'], null, 'Só 2 dos 12 cartões são amarelos, então sair amarelo pode acontecer, mas é pouco provável.');
add(2, 2, 'medidas', 'Compra com dinheiro', 'EF02MA20',
  'Um caderno custa R$ 12,00 e um lápis custa R$ 3,00. Quanto custa comprar os dois?',
  ['R$ 15,00', 'R$ 9,00', 'R$ 12,00', 'R$ 13,00'], 15, '12 + 3 = 15, então os dois juntos custam R$ 15,00.');
add(2, 2, 'numeros', 'Leitura e escrita de números', 'EF02MA01',
  'Qual é o número que tem 3 centenas, 5 dezenas e 2 unidades?',
  ['352', '532', '325', '253'], 352, '3 centenas valem 300, 5 dezenas valem 50 e 2 unidades valem 2: 300 + 50 + 2 = 352.');

// ── 2º ano · Desafio ──────────────────────────────────────
add(2, 3, 'numeros', 'Terça parte com apoio de imagem', 'EF02MA08',
  'Um tablete de chocolate com 12 quadradinhos foi dividido em 3 partes iguais. Quantos quadradinhos ficaram em cada parte?',
  ['4', '6', '9', '3'], 4, '12 dividido em 3 partes iguais dá 4 em cada parte, pois 3 × 4 = 12.');
add(2, 3, 'numeros', 'Sequência recursiva', 'EF02MA09',
  'Complete a sequência mantendo a regularidade: 20, 25, 30, 35, ___',
  ['40', '38', '45', '36'], 40, 'A sequência aumenta de 5 em 5: 35 + 5 = 40.');
add(2, 3, 'algebra', 'Termo desconhecido em uma igualdade', 'EF02MA05',
  'Qual número torna verdadeira a sentença 12 + 8 = 10 + ___ ?',
  ['10', '8', '12', '20'], 10, '12 + 8 = 20, e 10 + 10 = 20: os dois lados da igualdade ficam iguais.');
add(2, 3, 'medidas', 'Dias úteis em uma semana', 'EF02MA18',
  'De segunda a sexta-feira, quantos dias a escola funciona?',
  ['5', '7', '6', '4'], 5, 'Segunda, terça, quarta, quinta e sexta são 5 dias; sábado e domingo ficam de fora.');
add(2, 3, 'medidas', 'A medida depende da unidade usada', 'EF02MA16',
  'A mesma mesa mede 6 lápis ou 10 clipes de comprimento. Por que os dois resultados são diferentes?',
  ['Porque o clipe é mais curto que o lápis', 'Porque a mesa mudou de tamanho', 'Porque uma das medidas está errada', 'Porque lápis não serve para medir'], null, 'O clipe é menor que o lápis, por isso cabem mais clipes (10) do que lápis (6) na mesma mesa.');
add(2, 3, 'medidas', 'Problema de dois passos com dinheiro', 'EF02MA20',
  'Luísa tinha uma nota de R$ 20,00. Comprou um lanche de R$ 7,00 e um suco de R$ 5,00. Quanto recebeu de troco?',
  ['R$ 8,00', 'R$ 13,00', 'R$ 12,00', 'R$ 32,00'], 8, 'O lanche e o suco custam 7 + 5 = 12 reais; 20 - 12 = 8, então o troco é R$ 8,00.');
add(2, 3, 'numeros', 'Propriedade comutativa da multiplicação', 'EF02MA07',
  'Qual sentença tem o mesmo resultado de 5 × 6?',
  ['6 × 5', '5 + 6', '5 × 5', '6 × 6'], null, 'Trocar a ordem dos fatores não muda o produto: 5 × 6 e 6 × 5 dão 30.');
add(2, 3, 'geometria', 'Características dos sólidos geométricos', 'EF02MA14',
  'Qual sólido tem as duas bases redondas, rola no chão e não tem nenhum canto pontudo?',
  ['Cilindro', 'Cubo', 'Pirâmide', 'Bloco retangular'], null, 'O cilindro tem as duas bases redondas e o corpo curvo, então rola e não tem cantos pontudos.');

// ── 2º ano · Domínio ──────────────────────────────────────
add(2, 4, 'numeros', 'Mistura de multiplicação e adição', 'EF02MA07',
  'Miguel comprou 3 pacotes com 8 figurinhas cada. Ele já tinha 5 figurinhas. Com quantas ficou?',
  ['29', '24', '16', '13'], 29, '3 pacotes de 8 dão 3 × 8 = 24 figurinhas; somando as 5 que ele já tinha, 24 + 5 = 29.');
add(2, 4, 'numeros', 'Subtração com centenas', 'EF02MA06',
  'Um cinema tem 240 poltronas. Em uma sessão, 168 ingressos foram vendidos. Quantas poltronas ficaram livres?',
  ['72', '82', '128', '62'], 72, '240 - 168 = 72: das 240 poltronas, 168 foram ocupadas.');
add(2, 4, 'medidas', 'Intervalo de horas', 'EF02MA19',
  'A aula começou às 7h30 e terminou às 11h30. Quantas horas de aula os alunos tiveram?',
  ['4 horas', '3 horas', '5 horas', '4 horas e 30 minutos'], 4, 'De 7h30 a 11h30 passam 4 horas, pois 11 - 7 = 4 e os minutos são iguais.');
add(2, 4, 'dados', 'Diferença entre valores de uma tabela', 'EF02MA22',
  'Na escolha do esporte preferido, futebol recebeu 14 votos, natação 9 e dança 11. Quantos votos o futebol recebeu a mais que a natação?',
  ['5', '25', '23', '4'], 5, '14 - 9 = 5: o futebol teve 5 votos a mais que a natação.');
add(2, 4, 'numeros', 'Antecessor na centena', 'EF02MA01',
  'Qual número vem logo antes de 500?',
  ['499', '501', '400', '490'], 499, 'O antecessor de 500 é 499: é 500 menos 1.');
add(2, 4, 'numeros', 'Triplo', 'EF02MA08',
  'O triplo de 12 é...',
  ['36', '15', '24', '30'], 36, 'Triplo é três vezes: 12 + 12 + 12 = 36, ou 3 × 12 = 36.');
add(2, 4, 'algebra', 'Fator desconhecido na multiplicação', 'EF02MA07',
  'Qual número completa ___ × 5 = 20 ?',
  ['4', '5', '15', '10'], 4, '4 × 5 = 20, então o fator que falta é 4.');
add(2, 4, 'geometria', 'Comparação de figuras planas', 'EF02MA15',
  'Um retângulo e um quadrado têm os dois 4 lados. O que diferencia o retângulo do quadrado?',
  ['No retângulo, os lados opostos são iguais, mas ele não tem os 4 lados do mesmo tamanho', 'O retângulo tem 5 lados', 'O quadrado tem cantos arredondados', 'Nada, são a mesma figura'], null, 'No quadrado os 4 lados são iguais; no retângulo só os lados opostos são iguais entre si.');

// ── 3º ano · Base ─────────────────────────────────────────
add(3, 1, 'numeros', 'Multiplicação com números naturais', 'EF03MA07',
  'Uma estante tem 12 prateleiras e em cada uma há 8 livros. Quantos livros há na estante?',
  ['96', '20', '88', '104'], 96, '12 prateleiras com 8 livros cada dão 12 × 8 = 96 livros.');
add(3, 1, 'numeros', 'Divisão exata', 'EF03MA08',
  '84 balas foram repartidas igualmente entre 4 crianças. Quantas balas cada uma recebeu?',
  ['21', '24', '28', '20'], 21, '84 ÷ 4 = 21, pois 4 × 21 = 84: cada criança recebe 21 balas.');
add(3, 1, 'numeros', 'Subtração com números até a ordem de milhar', 'EF03MA06',
  'Um teatro tem 1.250 poltronas e, em uma peça, 876 estão ocupadas. Quantas poltronas estão vazias?',
  ['374', '384', '364', '424'], 374, '1.250 - 876 = 374 poltronas vazias: é o total menos as ocupadas.');
add(3, 1, 'medidas', 'Horas e minutos no relógio', 'EF03MA23',
  'O recreio começou às 9h20 e terminou às 9h50. Quanto tempo durou?',
  ['30 minutos', '50 minutos', '20 minutos', '40 minutos'], 30, '50 - 20 = 30: dentro da mesma hora, o recreio durou 30 minutos.');
add(3, 1, 'geometria', 'Características dos sólidos geométricos', 'EF03MA14',
  'Qual sólido tem todas as faces retangulares?',
  ['Bloco retangular (paralelepípedo)', 'Cilindro', 'Cone', 'Esfera'], null, 'O bloco retangular tem 6 faces retangulares; cilindro, cone e esfera têm superfícies curvas.');
add(3, 1, 'dados', 'Problema com dados de uma tabela', 'EF03MA26',
  'No cardápio da cantina, pão com carne custa R$ 9,00, suco R$ 4,00 e doce R$ 3,00. Quanto custa um lanche com os três?',
  ['R$ 16,00', 'R$ 13,00', 'R$ 12,00', 'R$ 7,00'], 16, '9 + 4 + 3 = 16, então o lanche com os três itens custa R$ 16,00.');
add(3, 1, 'numeros', 'Metade e terça parte no cálculo', 'EF03MA09',
  'A metade de 48 é...',
  ['24', '48', '12', '28'], 24, '48 ÷ 2 = 24: a metade é uma das duas partes iguais.');

// ── 3º ano · Prática ──────────────────────────────────────
add(3, 2, 'numeros', 'Divisão com resto', 'EF03MA08',
  '37 pirulitos foram divididos igualmente entre 5 crianças. Quantos pirulitos sobram?',
  ['2', '7', '5', '32'], 2, '5 × 7 = 35 e 37 - 35 = 2: cada criança fica com 7 e sobram 2 pirulitos.');
add(3, 2, 'numeros', 'Estratégias de cálculo mental', 'EF03MA05',
  '25 × 4 é igual a...',
  ['100', '125', '120', '29'], 100, '25 × 4 = 100: quatro grupos de 25, ou 25 + 25 + 25 + 25.');
add(3, 2, 'medidas', 'Duração de um evento', 'EF03MA22',
  'O show começou às 20h45 e durou 2 horas. A que horas terminou?',
  ['22h45', '22h15', '21h45', '20h45'], null, '20h45 mais 2 horas dá 22h45: só as horas aumentam, os minutos ficam.');
add(3, 2, 'medidas', 'Comparação de áreas na malha', 'EF03MA21',
  'Na malha quadriculada, a figura A ocupa 12 quadradinhos e a figura B ocupa 15. Qual figura tem maior área?',
  ['A figura B', 'A figura A', 'As duas têm a mesma área', 'Não dá para comparar'], null, 'A área é o número de quadradinhos ocupados: 15 é maior que 12, então a figura B tem maior área.');
add(3, 2, 'algebra', 'Termo desconhecido em uma adição', 'EF03MA11',
  'Qual número completa a igualdade 54 + ___ = 90 ?',
  ['36', '46', '44', '34'], 36, '90 - 54 = 36, e 54 + 36 = 90: o número que falta é 36.');
add(3, 2, 'medidas', 'Troco em situações de compra', 'EF03MA24',
  'Com uma nota de R$ 50,00, Diego pagou duas compras de R$ 12,00 e R$ 18,00. Quanto recebeu de troco?',
  ['R$ 20,00', 'R$ 38,00', 'R$ 30,00', 'R$ 12,00'], 20, 'As compras somam 12 + 18 = 30 reais; 50 - 30 = 20, então o troco é R$ 20,00.');
add(3, 2, 'numeros', 'Sequência com regularidade de multiplicar', 'EF03MA10',
  'Mantenha o padrão e descubra o próximo número: 3, 6, 12, 24, ___',
  ['48', '30', '36', '28'], 48, 'Cada número é o dobro do anterior: 24 × 2 = 48.');

// ── 3º ano · Desafio ──────────────────────────────────────
add(3, 3, 'numeros', 'Divisão com resto no contexto', 'EF03MA08',
  'Uma granja embalou 100 ovos em dúzias. Quantas dúzias completas foram formadas?',
  ['8', '9', '10', '12'], 8, '12 × 8 = 96 ovos em 8 dúzias completas; sobram 4 ovos, que não fecham outra dúzia.');
add(3, 3, 'numeros', 'Mistura de multiplicação e subtração', 'EF03MA07',
  'A professora comprou 4 caixas com 12 lápis cada e doou 9 lápis para outra turma. Com quantos lápis ficou?',
  ['39', '48', '57', '30'], 39, '4 caixas de 12 dão 48 lápis; doando 9, ficam 48 - 9 = 39.');
add(3, 3, 'numeros', 'Fração de uma quantidade', 'EF03MA09',
  'Em uma coleção de 36 bolinhas, 1/4 delas são azuis. Quantas bolinhas azuis há na coleção?',
  ['9', '12', '32', '4'], 9, '36 ÷ 4 = 9: um quarto da coleção são 9 bolinhas azuis.');
add(3, 3, 'numeros', 'Sistema de numeração decimal até a milhar', 'EF03MA02',
  'Qual número tem 1 unidade de milhar e 4 unidades?',
  ['1.004', '1.040', '1.400', '4.001'], 1004, '1 milhar vale 1.000 e 4 unidades valem 4; 1.000 + 4 = 1.004, com zero nas centenas e dezenas.');
add(3, 3, 'dados', 'Total a partir de dados de um gráfico', 'EF03MA27',
  'No gráfico das árvores plantadas, a turma A plantou 12, a turma B plantou 15 e a turma C plantou 9. Quantas árvores foram plantadas pelas três turmas?',
  ['36', '27', '21', '3'], 36, '12 + 15 + 9 = 36 árvores: soma-se o que cada turma plantou.');
add(3, 3, 'medidas', 'Intervalo de tempo com minutos', 'EF03MA22',
  'A prova de matemática durou das 13h40 às 15h10. Quanto tempo os alunos tiveram?',
  ['1 hora e 30 minutos', '1 hora e 20 minutos', '1 hora e 10 minutos', '2 horas e 30 minutos'], null, 'De 13h40 a 14h40 passa 1 hora; de 14h40 a 15h10 passam mais 30 minutos.');
add(3, 3, 'medidas', 'Adição de massas', 'EF03MA19',
  'Um caderno pesa 150 g e uma pasta pesa 400 g. Juntos, eles pesam quantos gramas?',
  ['550 g', '650 g', '250 g', '550 kg'], 550, '150 + 400 = 550: as massas se somam e a unidade continua em gramas, 550 g.');

// ── 3º ano · Domínio ──────────────────────────────────────
add(3, 4, 'numeros', 'Uso de parênteses em expressões', 'EF03MA07',
  'Qual é o valor da expressão (12 + 8) × 5 ?',
  ['100', '52', '20', '120'], 100, 'Primeiro o parênteses: 12 + 8 = 20; depois 20 × 5 = 100.');
add(3, 4, 'numeros', 'Divisão exata com divisor de um algarismo', 'EF03MA08',
  '144 ÷ 8 é igual a...',
  ['18', '16', '12', '24'], 18, '8 × 18 = 144, então 144 ÷ 8 = 18.');
add(3, 4, 'numeros', 'Repartição equitativa', 'EF03MA08',
  'Uma fábrica dividiu 450 iogurtes igualmente em caixas de 6 unidades. Quantas caixas foram preenchidas?',
  ['75', '70', '80', '45'], 75, '450 ÷ 6 = 75 caixas, pois 6 × 75 = 450 iogurtes.');
add(3, 4, 'geometria', 'Figuras planas e número de lados', 'EF03MA15',
  'Quantos lados tem um pentágono?',
  ['5', '4', '6', '7'], 5, 'Penta quer dizer cinco: o pentágono é o polígono de 5 lados.');
add(3, 4, 'numeros', 'Subtração com dinheiro', 'EF03MA24',
  'Dona Vera pagou um brinquedo com uma nota de R$ 200,00 e recebeu R$ 113,00 de troco. Quanto custou o brinquedo?',
  ['R$ 87,00', 'R$ 113,00', 'R$ 287,00', 'R$ 97,00'], 87, '200 - 113 = 87: o preço é o valor pago menos o troco, R$ 87,00.');
add(3, 4, 'dados', 'Resultados possíveis de um experimento', 'EF03MA25',
  'Uma roleta tem 4 partes pintadas de cores diferentes. Ao girá-la, quantos resultados diferentes podem aparecer para a cor em que o ponteiro parar?',
  ['4', '1', '2', '8'], 4, 'Cada uma das 4 partes tem uma cor diferente, então há 4 resultados possíveis para a cor.');
add(3, 4, 'numeros', 'Sequência com adições sucessivas', 'EF03MA10',
  'Observe o padrão: 1, 2, 4, 7, 11, ___. Qual número continua a sequência?',
  ['16', '15', '13', '12'], 16, 'As somas aumentam de 1 em 1: +1, +2, +3, +4; depois do 11 soma-se 5 e chega-se a 16.');

// ── 4º ano · Base ─────────────────────────────────────────
add(4, 1, 'numeros', 'Multiplicação com dois algarismos', 'EF04MA06',
  'Um caminhão leva 24 caixas e cada caixa tem 15 garrafas. Quantas garrafas o caminhão leva?',
  ['360', '3.600', '300', '390'], 360, '24 × 15 = 360: são 24 caixas com 15 garrafas em cada uma.');
add(4, 1, 'numeros', 'Divisão exata com divisor de um algarismo', 'EF04MA07',
  '468 lápis foram distribuídos igualmente em 4 caixas. Quantos lápis ficaram em cada caixa?',
  ['117', '116', '121', '112'], 117, '468 ÷ 4 = 117, pois 4 × 117 = 468 lápis repartidos em 4 caixas.');
add(4, 1, 'numeros', 'Frações unitárias', 'EF04MA09',
  'Uma barra de cereal foi cortada em 5 partes iguais e Rui comeu 1 parte. Que fração da barra Rui comeu?',
  ['1/5', '5/1', '1/2', '1/4'], null, 'A barra foi dividida em 5 partes iguais e 1 foi comida: isso é 1 de 5, ou 1/5.');
add(4, 1, 'medidas', 'Perímetro de um retângulo', 'EF04MA20',
  'Um terreno retangular mede 12 m de comprimento e 7 m de largura. Qual é o perímetro desse terreno?',
  ['38 m', '84 m', '19 m', '34 m'], 38, 'Perímetro é a volta toda: 12 + 7 + 12 + 7 = 38 m.');
add(4, 1, 'geometria', 'Ângulos retos e não retos', 'EF04MA18',
  'O canto de uma folha de caderno forma um ângulo...',
  ['reto', 'agudo', 'obtuso', 'raso'], null, 'O canto da folha mede 90°, que é o ângulo reto, como o canto de um quadrado.');
add(4, 1, 'medidas', 'Intervalos de tempo em horas e minutos', 'EF04MA22',
  'A partida começou às 15h40 e terminou às 17h25. Quanto tempo durou?',
  ['1 hora e 45 minutos', '1 hora e 15 minutos', '1 hora e 25 minutos', '2 horas e 15 minutos'], null, 'De 15h40 a 16h40 passa 1 hora; de 16h40 a 17h25 passam 45 minutos.');
add(4, 1, 'medidas', 'Temperatura positiva e negativa', 'EF04MA23',
  'De manhã os termômetros marcavam 8 °C e durante a noite a temperatura caiu 12 °C. Quanto marcou o termômetro?',
  ['-4 °C', '4 °C', '20 °C', '-20 °C'], -4, '8 - 12 = -4: a temperatura caiu 12 graus, passou do zero e ficou em -4 °C.');

// ── 4º ano · Prática ──────────────────────────────────────
add(4, 2, 'numeros', 'Representação decimal e fracionária', 'EF04MA10',
  'Maria comprou 0,5 m de fita. Essa quantidade de fita corresponde a qual fração do metro?',
  ['5/10', '5/100', '1/5', '50/10'], null, '0,5 são cinco décimos do metro, ou seja, 5/10.');
add(4, 2, 'numeros', 'Compra com preço decimal', 'EF04MA25',
  'Um quilo de queijo custa R$ 42,50. Quanto custa comprar 3 quilos desse queijo?',
  ['R$ 127,50', 'R$ 126,50', 'R$ 12,75', 'R$ 45,50'], 127.5, '42,50 × 3 = 127,50: três quilos a R$ 42,50 cada custam R$ 127,50.');
add(4, 2, 'geometria', 'Simetria de reflexão', 'EF04MA19',
  'Qual destas letras de forma tem um eixo de simetria vertical (a dobra que deixa as duas metades iguais)?',
  ['A', 'F', 'G', 'R'], null, 'Dobrando a letra A ao meio na vertical, as duas metades coincidem; F, G e R não têm essa dobra.');
add(4, 2, 'medidas', 'Área pela contagem da malha', 'EF04MA21',
  'Uma figura desenhada na malha quadriculada tem 14 quadradinhos inteiros e 4 metades de quadradinho. Qual é a área dessa figura?',
  ['16 quadradinhos', '18 quadradinhos', '12 quadradinhos', '15 quadradinhos'], 16, '4 metades formam 2 quadradinhos inteiros; 14 + 2 = 16 quadradinhos de área.');
add(4, 2, 'numeros', 'Múltiplos de um número natural', 'EF04MA11',
  'Qual dos números abaixo é múltiplo de 7?',
  ['56', '58', '54', '60'], 56, '7 × 8 = 56, então 56 é múltiplo de 7; 58, 54 e 60 não aparecem na tabuada do 7.');
add(4, 2, 'numeros', 'Sequência de múltiplos', 'EF04MA11',
  'Complete a sequência de múltiplos de 7: 7, 14, 21, 28, ___',
  ['35', '32', '34', '42'], 35, 'São múltiplos de 7, somando 7 a cada passo: 28 + 7 = 35.');
add(4, 2, 'dados', 'Total de respostas em gráfico de colunas', 'EF04MA27',
  'No gráfico de colunas do esporte preferido: futebol 18, vôlei 11, natação 7 e dança 6 votos. Quantos alunos participaram da votação?',
  ['42', '36', '29', '18'], 42, '18 + 11 + 7 + 6 = 42: cada aluno votou uma vez, então soma-se todos os votos.');
add(4, 2, 'numeros', 'Comparação de números decimais', 'EF04MA10',
  'Em uma corrida de 50 m, Léo correu em 8,05 s e Nina em 8,5 s. Quem foi mais rápido?',
  ['Léo, porque 8,05 é menor que 8,5', 'Nina, porque 5 é maior que 05', 'Os dois empataram, pois o 8 é igual', 'Não é possível comparar'], null, '8,5 vale 8,50, e 8,05 é menor que 8,50; na corrida, menor tempo significa mais rápido.');

// ── 4º ano · Desafio ──────────────────────────────────────
add(4, 3, 'algebra', 'Número desconhecido em uma divisão', 'EF04MA15',
  'Qual número completa a igualdade ___ ÷ 8 = 12 ?',
  ['96', '20', '4', '104'], 96, 'A divisão se desfaz multiplicando: 12 × 8 = 96, e 96 ÷ 8 = 12.');
add(4, 3, 'numeros', 'Fração de uma quantidade', 'EF04MA09',
  'Em uma coleção de 60 figurinhas, 3/4 são de jogadores de futebol. Quantas figurinhas são de jogadores?',
  ['45', '15', '20', '50'], 45, '60 ÷ 4 = 15 e 15 × 3 = 45: três quartos de 60 são 45 figurinhas.');
add(4, 3, 'numeros', 'Proporcionalidade direta', 'EF04MA04',
  'Dois cadernos iguais custam R$ 18,00. Quanto custam 6 cadernos nesse mesmo preço?',
  ['R$ 54,00', 'R$ 36,00', 'R$ 72,00', 'R$ 48,00'], 54, 'Cada caderno custa 18 ÷ 2 = 9 reais; 6 cadernos custam 6 × 9 = 54, ou R$ 54,00.');
add(4, 3, 'medidas', 'Transformação de litros em mililitros', 'EF04MA20',
  'Uma garrafa de refrigerante tem 1,5 L. Quantos mililitros há nessa garrafa?',
  ['1.500 mL', '150 mL', '15.000 mL', '15 mL'], 1500, '1 L tem 1.000 mL, então 1,5 L = 1,5 × 1.000 = 1.500 mL.');
add(4, 3, 'numeros', 'Expressão numérica com as quatro operações', 'EF04MA05',
  'Qual é o valor da expressão 40 - 4 × 6 + 5 ?',
  ['21', '19', '41', '29'], 21, 'Primeiro a multiplicação: 4 × 6 = 24; depois 40 - 24 + 5 = 21.');
add(4, 3, 'medidas', 'Variação de temperatura', 'EF04MA23',
  'A temperatura mínima de um dia foi -3 °C e a máxima foi 11 °C. Qual foi a variação de temperatura nesse dia?',
  ['14 °C', '8 °C', '-8 °C', '11 °C'], 14, 'De -3 °C até 0 são 3 graus e de 0 até 11 são mais 11: a variação é 3 + 11 = 14 °C.');
add(4, 3, 'geometria', 'Ângulos em figuras poligonais', 'EF04MA18',
  'Quantos ângulos retos tem um retângulo?',
  ['4', '2', '3', '0'], 4, 'Os 4 cantos do retângulo medem 90° cada um, então ele tem 4 ângulos retos.');

// ── 4º ano · Domínio ──────────────────────────────────────
add(4, 4, 'numeros', 'Multiplicação com número de dois algarismos', 'EF04MA06',
  'Uma editora embalou 234 caixas, cada uma com 12 livros. Quantos livros foram embalados ao todo?',
  ['2.808', '2.340', '4.680', '2.908'], 2808, '234 × 10 = 2.340 e 234 × 2 = 468; somando, 2.340 + 468 = 2.808 livros.');
add(4, 4, 'numeros', 'Divisão com resto e interpretação', 'EF04MA07',
  '250 ovos foram embalados em caixas de 12 unidades. Como ficou a embalagem?',
  ['20 caixas cheias e sobram 10 ovos', '20 caixas cheias e sobram 2 ovos', '21 caixas cheias e não sobra nenhum', '25 caixas cheias e sobram 10 ovos'], null, '12 × 20 = 240 ovos embalados; 250 - 240 = 10 ovos sobram sem encher outra caixa.');
add(4, 4, 'numeros', 'Fração decimal de uma quantidade', 'EF04MA10',
  '3/10 de 250 é igual a...',
  ['75', '25', '150', '225'], 75, '250 ÷ 10 = 25 e 25 × 3 = 75: três décimos de 250 são 75.');
add(4, 4, 'medidas', 'Perímetro e lado do quadrado', 'EF04MA20',
  'Um quadrado tem perímetro de 36 cm. Quanto mede cada lado?',
  ['9 cm', '6 cm', '12 cm', '18 cm'], 9, 'O quadrado tem 4 lados iguais: 36 ÷ 4 = 9 cm em cada lado.');
add(4, 4, 'medidas', 'Tempo decorrido em episódios', 'EF04MA22',
  'Cada episódio de uma série dura 45 minutos. Se Ana começou a assistir 3 episódios seguidos às 19h, a que horas terminou?',
  ['21h15', '20h15', '21h45', '22h00'], null, '3 × 45 = 135 minutos, que são 2 horas e 15 minutos; 19h + 2h15 = 21h15.');
add(4, 4, 'dados', 'Maior chance entre resultados', 'EF04MA26',
  'Uma cartela tem as letras da palavra BANANA escritas, uma em cada ficha. Escolhendo uma ficha sem olhar, qual letra tem maior chance de ser sorteada?',
  ['A', 'B', 'N', 'Todas têm a mesma chance'], null, 'Na palavra BANANA há 3 letras A, 2 N e 1 B; o A aparece mais vezes, então tem maior chance.');
add(4, 4, 'numeros', 'Proporcionalidade em tempo', 'EF04MA04',
  'Uma torneira enche 3 baldes em 12 minutos. Mantendo o mesmo ritmo, quantos baldes ela enche em 1 hora?',
  ['15', '20', '12', '5'], 15, 'Cada balde leva 12 ÷ 3 = 4 minutos; em 60 minutos cabem 60 ÷ 4 = 15 baldes.');

// ── 5º ano · Base ─────────────────────────────────────────
add(5, 1, 'numeros', 'Adição com números decimais', 'EF05MA07',
  'No mercado, um pacote de arroz custou R$ 12,50 e um de feijão R$ 8,75. Quanto se pagou pelos dois?',
  ['R$ 21,25', 'R$ 20,25', 'R$ 21,35', 'R$ 21,15'], 21.25, '12,50 + 8,75 = 21,25: somam-se reais com reais e centavos com centavos, R$ 21,25.');
add(5, 1, 'numeros', 'Frações equivalentes', 'EF05MA04',
  'Qual fração é equivalente a 2/3 ?',
  ['4/6', '3/2', '2/6', '6/3'], null, 'Multiplicando o numerador e o denominador de 2/3 por 2, obtém-se 4/6, a mesma quantidade.');
add(5, 1, 'numeros', 'Porcentagem como quarta parte', 'EF05MA06',
  '25% de 80 é igual a...',
  ['20', '40', '8', '30'], 20, '25% é a quarta parte: 80 ÷ 4 = 20.');
add(5, 1, 'medidas', 'Volume por empilhamento de cubinhos', 'EF05MA21',
  'Uma caixa foi preenchida com camadas de cubinhos de 1 cm³. Cada camada tem 4 fileiras com 2 cubinhos e a caixa tem 3 camadas. Quantos cubinhos cabem na caixa?',
  ['24', '14', '9', '20'], 24, 'Cada camada tem 4 × 2 = 8 cubinhos; com 3 camadas, 8 × 3 = 24 cubinhos.');
add(5, 1, 'geometria', 'Localização no plano por pares ordenados', 'EF05MA15',
  'Em uma malha quadriculada, o ponto A está na posição (3, 5). O que isso significa?',
  ['Está na 3ª coluna e na 5ª linha', 'Está na 5ª coluna e na 3ª linha', 'Está na 3ª coluna e na 3ª linha', 'Está no centro do plano'], null, 'No par ordenado, o primeiro número indica a coluna e o segundo a linha: (3, 5) é coluna 3, linha 5.');
add(5, 1, 'medidas', 'Área do retângulo e sua unidade', 'EF05MA19',
  'Um quarto retangular mede 8 m de comprimento por 5 m de largura. Qual é a área desse quarto?',
  ['40 m²', '26 m', '40 m', '13 m²'], 40, 'Área do retângulo é comprimento × largura: 8 × 5 = 40, e a unidade é m².');
add(5, 1, 'medidas', 'Transformação de km em m', 'EF05MA19',
  'A corrida da escola teve 2,5 km de percurso. Quantos metros foram percorridos?',
  ['2.500 m', '250 m', '25.000 m', '25 m'], 2500, '1 km tem 1.000 m, então 2,5 km = 2,5 × 1.000 = 2.500 m.');

// ── 5º ano · Prática ──────────────────────────────────────
add(5, 2, 'numeros', 'Multiplicação de decimal por número natural', 'EF05MA08',
  '0,8 × 6 é igual a...',
  ['4,8', '48', '0,48', '4,08'], 4.8, '0,8 são 8 décimos; 8 × 6 = 48 décimos, que valem 4,8.');
add(5, 2, 'numeros', 'Adição de frações de mesma denominação', 'EF05MA03',
  '3/8 + 2/8 resulta em...',
  ['5/8', '5/16', '1/8', '6/8'], null, 'Com o mesmo denominador, somam-se só os numeradores: 3 + 2 = 5, e o 8 fica, 5/8.');
add(5, 2, 'numeros', 'Desconto em porcentagem', 'EF05MA06',
  'Um tênis de R$ 90,00 entrou em promoção com 10% de desconto. Quanto passou a custar?',
  ['R$ 81,00', 'R$ 9,00', 'R$ 80,00', 'R$ 100,00'], 81, '10% de 90 é 9; o preço cai para 90 - 9 = 81, ou R$ 81,00.');
add(5, 2, 'geometria', 'Nome dos polígonos pelo número de lados', 'EF05MA17',
  'Como se chama o polígono que tem exatamente 8 lados?',
  ['Octógono', 'Hexágono', 'Heptágono', 'Decágono'], null, 'O polígono de 8 lados se chama octógono; hexágono tem 6, heptágono 7 e decágono 10.');
add(5, 2, 'medidas', 'Tempo decorrido com minutos', 'EF05MA19',
  'O voo saiu às 6h45 e durou 3 horas e 50 minutos. A que horas pousou?',
  ['10h35', '9h35', '10h25', '9h55'], null, '6h45 mais 3h50: 45 + 50 = 95 minutos, que são 1h35; 6h + 3h + 1h35 = 10h35.');
add(5, 2, 'dados', 'Escala em gráfico de colunas', 'EF05MA24',
  'Em um gráfico de colunas, cada quadrado da malha representa 5 alunos. A coluna do futebol tem 6 quadrados. Quantos alunos votaram no futebol?',
  ['30', '11', '6', '25'], 30, 'Cada quadrado vale 5 alunos, então 6 quadrados valem 6 × 5 = 30 alunos.');
add(5, 2, 'numeros', 'Variação de proporcionalidade direta', 'EF05MA12',
  '4 canetas iguais custam R$ 12,00. Quanto custam 10 dessas canetas?',
  ['R$ 30,00', 'R$ 16,00', 'R$ 24,00', 'R$ 40,00'], 30, 'Cada caneta custa 12 ÷ 4 = 3 reais; 10 canetas custam 10 × 3 = 30, ou R$ 30,00.');
add(5, 2, 'algebra', 'Termo desconhecido em uma igualdade', 'EF05MA11',
  'Qual número torna verdadeira a igualdade ___ × 7 = 84 ?',
  ['12', '11', '14', '77'], 12, '84 ÷ 7 = 12, e 12 × 7 = 84: o fator que falta é 12.');

// ── 5º ano · Desafio ──────────────────────────────────────
add(5, 3, 'numeros', 'Fração maior que a unidade', 'EF05MA03',
  'A fração 7/4 pode ser representada como...',
  ['1 inteiro e 3/4', '3 inteiros e 1/4', '1 inteiro e 1/4', '7 inteiros e 4 partes'], null, '7/4 = 4/4 + 3/4: quatro quartos formam 1 inteiro e sobram 3/4.');
add(5, 3, 'numeros', 'Associação entre decimal e fração', 'EF05MA02',
  'O número decimal 0,75 corresponde a qual fração?',
  ['3/4', '75/10', '3/5', '1/4'], null, '0,75 são 75 centésimos, ou 75/100; simplificando por 25, chega-se a 3/4.');
add(5, 3, 'numeros', 'Porcentagem de uma quantidade', 'EF05MA06',
  'Em uma turma de 40 estudantes, 10% participam do time de vôlei. Quantos estudantes são?',
  ['4', '10', '8', '40'], 4, '10% é a décima parte: 40 ÷ 10 = 4 estudantes.');
add(5, 3, 'medidas', 'Volume do paralelepípedo', 'EF05MA21',
  'Uma caixa mede 5 cm de comprimento, 3 cm de largura e 2 cm de altura. Qual é o seu volume?',
  ['30 cm³', '10 cm³', '15 cm³', '30 cm²'], 30, 'Volume é comprimento × largura × altura: 5 × 3 × 2 = 30, em cm³.');
add(5, 3, 'numeros', 'Expressão numérica com as quatro operações', 'EF05MA11',
  'Qual é o valor da expressão 18 ÷ 3 + 4 × 2 ?',
  ['14', '20', '10', '26'], 14, 'Primeiro divisão e multiplicação: 18 ÷ 3 = 6 e 4 × 2 = 8; depois 6 + 8 = 14.');
add(5, 3, 'dados', 'Probabilidade de um resultado', 'EF05MA23',
  'Um baralho de brinquedo tem 8 cartas numeradas de 1 a 8. Sorteando uma carta, qual é a probabilidade de sair um número menor que 4?',
  ['3/8', '4/8', '5/8', '1/8'], null, 'Menores que 4 são 1, 2 e 3: 3 cartas favoráveis em 8 possíveis, ou 3/8.');
add(5, 3, 'numeros', 'Problema de dois passos com decimais', 'EF05MA07',
  'Iara comprou 3 cadernos de R$ 7,50 cada e pagou com uma nota de R$ 50,00. Quanto recebeu de troco?',
  ['R$ 27,50', 'R$ 22,50', 'R$ 42,50', 'R$ 32,50'], 27.5, '3 × 7,50 = 22,50 reais gastos; 50 - 22,50 = 27,50, então o troco é R$ 27,50.');

// ── 5º ano · Domínio ──────────────────────────────────────
add(5, 4, 'dados', 'Leitura de gráfico de linhas', 'EF05MA24',
  'No gráfico de linhas da temperatura do dia, às 8h o termômetro marcava 18 °C e às 14h marcava 27 °C. Quantos graus a temperatura subiu nesse período?',
  ['9 °C', '19 °C', '27 °C', '45 °C'], 9, '27 - 18 = 9: a temperatura subiu 9 °C entre 8h e 14h.');
add(5, 4, 'numeros', 'Fração de uma medida de comprimento', 'EF05MA03',
  '3/5 de 2 km correspondem a quantos metros?',
  ['1.200 m', '600 m', '400 m', '120 m'], 1200, '2 km são 2.000 m; 2.000 ÷ 5 = 400 e 400 × 3 = 1.200 m.');
add(5, 4, 'geometria', 'Ampliação de figuras poligonais', 'EF05MA18',
  'Uma foto retangular mede 4 cm por 6 cm e foi ampliada 3 vezes. Quais passaram a ser as suas medidas?',
  ['12 cm por 18 cm', '8 cm por 12 cm', '4 cm por 18 cm', '12 cm por 6 cm'], null, 'Ampliar 3 vezes multiplica cada medida por 3: 4 × 3 = 12 cm e 6 × 3 = 18 cm.');
add(5, 4, 'numeros', 'Porcentagem e a parte que falta', 'EF05MA06',
  'Carlos já percorreu 75% de uma trilha de 200 m. Quantos metros ainda faltam percorrer?',
  ['50 m', '150 m', '25 m', '140 m'], 50, '75% de 200 é 150 m já percorridos; faltam 200 - 150 = 50 m, os 25% restantes.');
add(5, 4, 'numeros', 'Ordem de números decimais', 'EF05MA05',
  'Entre 0,3, 0,03 e 0,33, qual é o menor número?',
  ['0,03', '0,3', '0,33', 'Os três são iguais'], null, 'Igualando as casas: 0,30, 0,03 e 0,33; 3 centésimos é menor que 30 e que 33 centésimos.');
add(5, 4, 'medidas', 'Volume como contagem de cubinhos', 'EF05MA21',
  'Quantos cubinhos de 1 cm³ cabem em uma caixa que mede 5 cm por 4 cm por 3 cm?',
  ['60', '12', '20', '15'], 60, '5 × 4 × 3 = 60: cada camada tem 20 cubinhos e são 3 camadas.');
add(5, 4, 'medidas', 'Variação de temperatura negativa', 'EF05MA19',
  'Em uma cidade fria, a temperatura era -2 °C de madrugada e subiu até 9 °C à tarde. Quantos graus ela subiu?',
  ['11 °C', '7 °C', '-11 °C', '9 °C'], 11, 'De -2 °C a 0 são 2 graus e de 0 a 9 são 9: 2 + 9 = 11 °C de subida.');
add(5, 4, 'algebra', 'Igualdade com duas operações', 'EF05MA10',
  'Qual número completa a igualdade 5 × ___ + 12 = 47 ?',
  ['7', '35', '9', '6'], 7, '47 - 12 = 35, e 35 ÷ 5 = 7: o número que falta é 7, pois 5 × 7 + 12 = 47.');

// ── Reforço de unidades que o motor ainda não alcança ─────
add(3, 2, 'geometria', 'Sólidos e suas partes', 'EF03MA13',
  'Qual sólido tem uma base redonda e termina em uma ponta só?',
  ['Cone', 'Cilindro', 'Esfera', 'Cubo'], null, 'O cone tem uma base redonda e afina até uma única ponta; o cilindro tem duas bases e a esfera não tem ponta.');
add(3, 2, 'dados', 'Comparação de dados em tabela', 'EF03MA27',
  'Na escolha da cor da camiseta da turma, 8 votos foram para azul, 12 para vermelho e 10 para verde. Qual cor ficou em segundo lugar?',
  ['Verde', 'Vermelho', 'Azul', 'Azul e verde empataram'], null, 'Em ordem: vermelho 12, verde 10 e azul 8; o segundo maior número de votos é o do verde.');
add(4, 1, 'dados', 'Leitura de tabela de pesquisa', 'EF04MA27',
  'Na pesquisa de sabor de sorvete, 14 alunos escolheram chocolate, 9 escolheram morango e 6 escolheram limão. Quantos alunos escolheram morango?',
  ['9', '14', '6', '29'], 9, 'A tabela mostra 9 votos para morango; 14 é chocolate e 6 é limão.');
add(5, 3, 'geometria', 'Elementos dos prismas', 'EF05MA16',
  'Quantas arestas tem um prisma triangular?',
  ['9', '6', '5', '3'], 9, 'São 3 arestas em cada base triangular e 3 ligando as bases: 3 + 3 + 3 = 9 arestas.');

// ── 6º ano · Base ─────────────────────────────────────────
add(6, 1, 'numeros', 'Decimais na reta numérica', 'EF06MA01',
  'Qual dos números está localizado entre 4,6 e 4,7 na reta numérica?',
  ['4,65', '4,75', '4,56', '5,6'], 4.65, '4,6 = 4,60 e 4,7 = 4,70; 4,65 está entre 4,60 e 4,70 na reta.');
add(6, 1, 'numeros', 'Ordem e posição de algarismos', 'EF06MA02',
  'No número 12.486,5, o algarismo 4 ocupa qual ordem?',
  ['centenas', 'dezenas de milhar', 'dezenas', 'unidades de milhar'], null, 'Lendo 12.486 da direita para a esquerda: 6 unidades, 8 dezenas, 4 centenas; o 4 vale 400.');
add(6, 1, 'numeros', 'Problema com duas operações', 'EF06MA03',
  'Uma escola comprou 12 pacotes de papel com 500 folhas cada. No primeiro semestre foram usadas 3.750 folhas. Quantas folhas sobraram?',
  ['2.250', '2.750', '1.250', '9.750'], 2250, '12 × 500 = 6.000 folhas compradas; 6.000 - 3.750 = 2.250 folhas sobraram.');
add(6, 1, 'numeros', 'Números primos e compostos', 'EF06MA05',
  'Qual dos números a seguir é primo?',
  ['29', '33', '21', '39'], 29, '29 só é divisível por 1 e por ele mesmo; 33 = 3 × 11, 21 = 3 × 7 e 39 = 3 × 13.');
add(6, 1, 'numeros', 'Divisibilidade por 2 e por 3', 'EF06MA06',
  'Um número é divisível por 6 quando é divisível por 2 e por 3 ao mesmo tempo. Qual dos números abaixo é divisível por 6?',
  ['54', '50', '45', '62'], 54, '54 é par e 5 + 4 = 9 é divisível por 3, então 54 é divisível por 2 e por 3, logo por 6.');
add(6, 1, 'numeros', 'Frações equivalentes', 'EF06MA07',
  'Qual fração é equivalente a 3/5?',
  ['9/15', '3/10', '5/3', '6/15'], null, 'Multiplicando numerador e denominador de 3/5 por 3, obtém-se 9/15, fração equivalente.');
add(6, 1, 'numeros', 'Fração para decimal', 'EF06MA08',
  'A fração 7/4 escrita na forma decimal é',
  ['1,75', '1,4', '0,75', '7,4'], 1.75, 'Dividindo 7 por 4 obtém-se 1,75, pois 4 × 1,75 = 7.');
add(6, 1, 'numeros', 'Fração de uma quantidade', 'EF06MA09',
  'Em uma turma de 35 alunos, 3/5 chegaram de ônibus. Quantos alunos chegaram de ônibus?',
  ['21', '14', '28', '20'], 21, '35 ÷ 5 = 7 e 7 × 3 = 21 alunos de ônibus.');
add(6, 1, 'medidas', 'Área do retângulo', 'EF06MA24',
  'Um terreno retangular mede 25 m de comprimento por 18 m de largura. Qual é a área desse terreno?',
  ['450 m²', '86 m²', '43 m²', '4.500 m²'], 450, 'Área do retângulo: 25 × 18 = 450, e como as medidas estão em metros, a área é 450 m².');
add(6, 1, 'dados', 'Total de respostas em uma pesquisa', 'EF06MA32',
  'Na escolha do esporte preferido, futebol teve 12 votos, vôlei 9, natação 7 e xadrez 6. Quantos alunos participaram da votação?',
  ['34', '33', '21', '12'], 34, '12 + 9 + 7 + 6 = 34 votos, um por aluno, então 34 alunos participaram.');

// ── 6º ano · Prática ──────────────────────────────────────
add(6, 2, 'numeros', 'Adição e multiplicação com decimais', 'EF06MA11',
  'Um táxi cobra R$ 12,50 de bandeirada mais R$ 2,75 por quilômetro rodado. Quanto pagará quem percorrer 8 km?',
  ['R$ 34,50', 'R$ 122,00', 'R$ 22,00', 'R$ 15,25'], 34.5, '8 km custam 8 × 2,75 = 22,00; somando a bandeirada, 12,50 + 22,00 = R$ 34,50.');
add(6, 2, 'numeros', 'Adição de frações com denominadores diferentes', 'EF06MA10',
  'Quanto é 2/3 + 1/4?',
  ['11/12', '3/7', '3/12', '7/12'], null, 'Com denominador 12: 2/3 = 8/12 e 1/4 = 3/12; 8/12 + 3/12 = 11/12.');
add(6, 2, 'numeros', 'Porcentagem como desconto', 'EF06MA13',
  'Uma camiseta de R$ 90,00 entrou em promoção com 20% de desconto. Quanto é o desconto em reais?',
  ['R$ 18,00', 'R$ 72,00', 'R$ 9,00', 'R$ 20,00'], 18, '20% de 90 é 0,20 × 90 = 18, então o desconto é R$ 18,00.');
add(6, 2, 'geometria', 'Vértices, faces e arestas de prismas', 'EF06MA17',
  'Um prisma com bases triangulares tem, respectivamente, quantas faces, vértices e arestas?',
  ['5, 6 e 9', '3, 6 e 9', '5, 9 e 6', '6, 5 e 8'], null, 'São 2 bases triangulares + 3 faces laterais = 5 faces; 3 + 3 = 6 vértices; 3 + 3 + 3 = 9 arestas.');
add(6, 2, 'geometria', 'Classificação de triângulos quanto aos lados', 'EF06MA19',
  'Um triângulo tem lados medindo 7 cm, 7 cm e 9 cm. Como ele é classificado quanto à medida dos lados?',
  ['Isósceles', 'Equilátero', 'Escaleno', 'Retângulo'], null, 'Dois lados iguais (7 cm e 7 cm) e um diferente (9 cm): essa é a definição de triângulo isósceles.');
add(6, 2, 'medidas', 'Tempo decorrido', 'EF06MA24',
  'Um filme começou às 19h45 e terminou às 21h20. Qual foi a duração do filme?',
  ['1 h 35 min', '1 h 25 min', '2 h 35 min', '1 h 15 min'], null, 'De 19h45 a 20h45 passa 1 h; de 20h45 a 21h20 passam 35 min, total 1 h 35 min.');
add(6, 2, 'numeros', 'Aproximação para múltiplo de 100', 'EF06MA12',
  'O número 387 arredondado para a centena mais próxima é',
  ['400', '380', '390', '300'], 400, '387 está entre 300 e 400; como 87 passa de 50, a centena mais próxima é 400.');
add(6, 2, 'dados', 'Probabilidade em um dado', 'EF06MA30',
  'Um dado com seis faces é lançado uma vez. Qual a probabilidade de sair um número maior que 4?',
  ['1/3', '1/2', '2/3', '1/6'], null, 'Maiores que 4 são 5 e 6: 2 faces em 6, e 2/6 simplificado é 1/3.');
add(6, 2, 'algebra', 'Igualdade com uma operação faltando', 'EF06MA14',
  'Qual número completa a igualdade 48 ÷ ___ = 12 - 4?',
  ['6', '8', '4', '12'], 6, '12 - 4 = 8, e 48 ÷ 8 = 6: o divisor que falta é 6.');
add(6, 2, 'medidas', 'Comprimento em quilômetros', 'EF06MA24',
  'Uma pista de corrida tem 400 m de volta completa. Um atleta correu 4 voltas. Quantos quilômetros ele percorreu?',
  ['1,6 km', '16 km', '1,4 km', '400 km'], 1.6, '4 × 400 = 1.600 m; como 1.000 m = 1 km, 1.600 m = 1,6 km.');

// ── 6º ano · Desafio ──────────────────────────────────────
add(6, 3, 'numeros', 'Problema de razão unitária', 'EF06MA03',
  'Oito máquinas iguais produzem 320 peças por hora. Quantas peças seis dessas máquinas produzem em cinco horas?',
  ['1.200', '1.920', '960', '800'], 1200, 'Cada máquina faz 320 ÷ 8 = 40 peças por hora; 6 máquinas em 5 horas fazem 40 × 6 × 5 = 1.200.');
add(6, 3, 'numeros', 'Fração do que sobra', 'EF06MA09',
  'Davi tinha 240 figurinhas e 3/8 delas eram repetidas. Quantas figurinhas NÃO eram repetidas?',
  ['150', '90', '120', '160'], 150, '3/8 de 240 = 90 repetidas; as que não são repetidas são 240 - 90 = 150.');
add(6, 3, 'numeros', 'Subtração de frações', 'EF06MA10',
  'Quanto é 5/6 - 3/4?',
  ['1/12', '2/12', '2/2', '19/12'], null, 'Com denominador 12: 5/6 = 10/12 e 3/4 = 9/12; 10/12 - 9/12 = 1/12.');
add(6, 3, 'geometria', 'Ângulos suplementares', 'EF06MA27',
  'Dois ângulos são suplementares, ou seja, juntos formam 180°. Se um deles mede 118°, quanto mede o outro?',
  ['62°', '82°', '72°', '242°'], 62, 'Suplementares somam 180°: 180 - 118 = 62°.');
add(6, 3, 'geometria', 'Soma dos ângulos de um triângulo', 'EF06MA19',
  'Em um triângulo, dois ângulos medem 47° e 63°. Quanto mede o terceiro ângulo?',
  ['70°', '110°', '60°', '80°'], 70, 'Os ângulos internos somam 180°: 47 + 63 = 110 e 180 - 110 = 70°.');
add(6, 3, 'medidas', 'Toneladas e quilogramas', 'EF06MA24',
  'Um caminhão descarregou 3,5 t de areia. Quantos quilogramas de areia foram descarregados?',
  ['3.500', '350', '35.000', '3.050'], 3500, '1 t = 1.000 kg, então 3,5 t = 3,5 × 1.000 = 3.500 kg.');
add(6, 3, 'algebra', 'Partilha em partes desiguais', 'EF06MA15',
  'Duas crianças juntas têm 48 bolinhas de gude, e uma delas tem o triplo da outra. Quantas bolinhas tem a que possui mais?',
  ['36', '12', '16', '24'], 36, 'Se uma tem x, a outra tem 3x: x + 3x = 48, então 4x = 48, x = 12 e a maior tem 3 × 12 = 36.');
add(6, 3, 'numeros', 'Ordem crescente com decimais', 'EF06MA01',
  'Qual é a ordem crescente dos números 0,3, 0,03, 0,303 e 0,33?',
  ['0,03 < 0,3 < 0,303 < 0,33', '0,3 < 0,03 < 0,33 < 0,303', '0,33 < 0,303 < 0,3 < 0,03', '0,03 < 0,3 < 0,33 < 0,303'], null, 'Igualando as casas decimais: 0,030 < 0,300 < 0,303 < 0,330.');
add(6, 3, 'dados', 'Fração complementar de uma pesquisa', 'EF06MA32',
  'Em uma pesquisa com 40 alunos, 8 disseram que preferem leitura. Que fração irredutível representa os alunos que NÃO escolheram leitura?',
  ['4/5', '1/5', '8/32', '3/5'], null, '40 - 8 = 32 não escolheram leitura; 32/40 simplificado por 8 dá 4/5.');
add(6, 3, 'medidas', 'Perímetro e área ao ampliar o quadrado', 'EF06MA29',
  'O lado de um quadrado passa de 4 cm para 8 cm. O que acontece com a área desse quadrado?',
  ['Fica 4 vezes maior', 'Fica 2 vezes maior', 'Aumenta 4 cm²', 'Não muda'], null, 'A área era 4 × 4 = 16 cm² e passou a 8 × 8 = 64 cm²; 64 ÷ 16 = 4, então quadruplicou.');

// ── 6º ano · Domínio ──────────────────────────────────────
add(6, 4, 'numeros', 'Expressão com decimais e ordem das operações', 'EF06MA11',
  'Quanto é 2,5 × 4 - 0,6 × 5?',
  ['7', '47', '9,5', '8,5'], 7, '2,5 × 4 = 10 e 0,6 × 5 = 3; depois 10 - 3 = 7.');
add(6, 4, 'numeros', 'Divisão decimal em compra', 'EF06MA11',
  'Um pacote com 12 canetas iguais custa R$ 45,00. Qual é o preço de uma caneta?',
  ['R$ 3,75', 'R$ 4,50', 'R$ 3,50', 'R$ 3,05'], 3.75, '45 ÷ 12 = 3,75: o preço do pacote dividido pelo número de canetas dá R$ 3,75 cada.');
add(6, 4, 'medidas', 'Área do triângulo', 'EF06MA24',
  'Um triângulo tem base de 14 cm e altura de 9 cm. Qual é a sua área?',
  ['63 cm²', '126 cm²', '46 cm²', '23 cm²'], 63, 'Área do triângulo é base × altura ÷ 2: 14 × 9 ÷ 2 = 126 ÷ 2 = 63 cm².');
add(6, 4, 'geometria', 'Relação entre vértices, faces e arestas', 'EF06MA17',
  'Um sólido tem 6 vértices e 5 faces. Sabendo que o número de vértices somado ao número de faces excede o número de arestas em 2, quantas arestas esse sólido tem?',
  ['9', '8', '11', '6'], 9, 'V + F = A + 2, então 6 + 5 = A + 2 e A = 11 - 2 = 9 arestas.');
add(6, 4, 'dados', 'Probabilidade na forma decimal', 'EF06MA30',
  'Um saco tem 4 bolas brancas e 6 bolas pretas. Tirando uma bola sem olhar, qual a probabilidade de ela ser branca, escrita na forma decimal?',
  ['0,4', '0,6', '4,0', '0,24'], 0.4, 'São 4 brancas em 10 bolas: 4/10 = 0,4 na forma decimal.');
add(6, 4, 'algebra', 'Equação com parênteses', 'EF06MA14',
  'Qual número satisfaz a igualdade 3 × (n + 5) = 27?',
  ['4', '9', '14', '22'], 4, '27 ÷ 3 = 9, então n + 5 = 9 e n = 9 - 5 = 4.');
add(6, 4, 'numeros', 'Mínimo múltiplo comum em contexto', 'EF06MA06',
  'Duas luzes piscam a cada 12 segundos e a cada 18 segundos. De quantos em quantos segundos elas piscam juntas?',
  ['36 s', '6 s', '108 s', '24 s'], 36, 'Os múltiplos de 12 são 12, 24, 36... e os de 18 são 18, 36...; o primeiro comum é 36 s.');
add(6, 4, 'medidas', 'Temperatura com variação', 'EF06MA24',
  'Ao amanhecer a temperatura era 4 °C. Durante a manhã subiu 9 °C e à noite caiu 12 °C. Em quantos graus ficou a temperatura da noite?',
  ['1 °C', '17 °C', '-1 °C', '13 °C'], 1, '4 + 9 = 13 °C de manhã; à noite 13 - 12 = 1 °C.');
add(6, 4, 'dados', 'Frequência e porcentagem', 'EF06MA32',
  'Entre 60 pessoas entrevistadas, 24 vão de ônibus, 18 de bicicleta e 12 de carro; as demais vão a pé. Quantas pessoas vão a pé e que porcentagem do total isso representa?',
  ['6 pessoas, que representam 10%', '6 pessoas, que representam 6%', '12 pessoas, que representam 20%', '54 pessoas, que representam 90%'], null, '24 + 18 + 12 = 54; 60 - 54 = 6 a pé, e 6 de 60 é 6/60 = 10%.');
add(6, 4, 'geometria', 'Escala em planta baixa', 'EF06MA21',
  'Na planta de uma casa, cada 1 cm representa 2 m de medida real. Se a sala aparece com 4,5 cm de comprimento, qual é o comprimento real da sala?',
  ['9 m', '8 m', '6,5 m', '4,5 m'], 9, 'Cada centímetro vale 2 m reais: 4,5 × 2 = 9 m de comprimento real.');

// ── 7º ano · Base ─────────────────────────────────────────
add(7, 1, 'numeros', 'Números negativos na reta numérica', 'EF07MA03',
  'Qual dos números está mais próximo do zero na reta numérica?',
  ['-2', '3', '-5', '4'], -2, '-2 está a 2 unidades do zero, menos que 3, 4 e 5, as distâncias dos outros números.');
add(7, 1, 'numeros', 'Adição e subtração com inteiros', 'EF07MA04',
  'Quanto é -8 + 15 - 6?',
  ['1', '-1', '7', '-19'], 1, 'Da esquerda para a direita: -8 + 15 = 7, depois 7 - 6 = 1.');
add(7, 1, 'numeros', 'Máximo divisor comum', 'EF07MA01',
  'Qual é o MDC de 24 e 36?',
  ['12', '6', '72', '4'], 12, 'Divisores de 24: 1, 2, 3, 4, 6, 8, 12, 24; de 36: 1, 2, 3, 4, 6, 9, 12, 18, 36; o maior comum é 12.');
add(7, 1, 'numeros', 'Acréscimo de porcentagem', 'EF07MA02',
  'Um salário de R$ 1.400,00 recebeu um aumento de 8%. Qual passou a ser o salário?',
  ['R$ 1.512,00', 'R$ 1.508,00', 'R$ 1.480,00', 'R$ 1.112,00'], 1512, '8% de 1.400 é 112; 1.400 + 112 = 1.512, ou R$ 1.512,00.');
add(7, 1, 'numeros', 'Comparação de frações', 'EF07MA08',
  'Qual é a maior das frações apresentadas a seguir?',
  ['3/4', '2/3', '5/8', '1/2'], null, 'Em decimais: 3/4 = 0,75; 2/3 ≈ 0,67; 5/8 = 0,625; 1/2 = 0,5; a maior é 3/4.');
add(7, 1, 'medidas', 'Litros e mililitros', 'EF07MA29',
  'Uma garrafa contém 1,75 L de suco. Quantos copos de 250 mL podem ser servidos completamente?',
  ['7', '6', '8', '70'], 7, '1,75 L = 1.750 mL; 1.750 ÷ 250 = 7 copos cheios.');
add(7, 1, 'geometria', 'Ângulos internos do triângulo', 'EF07MA24',
  'Em um triângulo retângulo, um dos ângulos agudos mede 35°. Quanto mede o outro ângulo agudo?',
  ['55°', '65°', '125°', '45°'], 55, 'Os dois agudos somam 90° num triângulo retângulo: 90 - 35 = 55°.');
add(7, 1, 'dados', 'Média aritmética', 'EF07MA35',
  'Ana tirou as notas 7, 9, 6 e 8 em matemática. Qual foi a média dela?',
  ['7,5', '7', '8', '7,2'], 7.5, '(7 + 9 + 6 + 8) ÷ 4 = 30 ÷ 4 = 7,5.');
add(7, 1, 'algebra', 'Ideia de variável', 'EF07MA13',
  'Na sentença d = 60t, que calcula a distância percorrida por um carro, as letras d e t representam',
  ['variáveis, porque podem assumir diferentes valores', 'incógnitas, porque têm um único valor', 'números fixos que nunca mudam', 'o resultado final do cálculo'], null, 'A cada tempo t corresponde uma distância d diferente: as letras mudam de valor, por isso são variáveis.');
add(7, 1, 'geometria', 'Simetria em relação ao eixo x', 'EF07MA20',
  'No plano cartesiano, o simétrico do ponto A(3, -2) em relação ao eixo x é o ponto',
  ["(3, 2)", "(-3, -2)", "(-3, 2)", "(2, 3)"], null, 'Na reflexão pelo eixo x, o x fica igual e o y troca de sinal: (3, -2) vira (3, 2).');

// ── 7º ano · Prática ──────────────────────────────────────
add(7, 2, 'numeros', 'Ordem crescente entre racionais', 'EF07MA10',
  'Qual apresenta os números -3/4, -0,5, 0,2 e 1/3 em ordem crescente?',
  ['-3/4 < -0,5 < 0,2 < 1/3', '-0,5 < -3/4 < 0,2 < 1/3', '0,2 < 1/3 < -0,5 < -3/4', '-3/4 < -0,5 < 1/3 < 0,2'], null, 'Em decimais: -3/4 = -0,75 e 1/3 ≈ 0,33; então -0,75 < -0,5 < 0,2 < 0,33.');
add(7, 2, 'algebra', 'Equação do 1º grau', 'EF07MA18',
  'Qual é o valor de x na equação 5x + 9 = 44?',
  ['7', '10,6', '6,2', '35'], 7, '5x = 44 - 9 = 35, então x = 35 ÷ 5 = 7.');
add(7, 2, 'algebra', 'Razão entre parte e todo', 'EF07MA09',
  'Em um time há 12 titulares e 8 reservas. Qual é a razão entre o número de titulares e o total de jogadores?',
  ['3/5', '3/2', '2/3', '8/20'], null, 'O total é 12 + 8 = 20 jogadores; a razão 12/20 simplificada por 4 é 3/5.');
add(7, 2, 'medidas', 'Volume de bloco retangular', 'EF07MA30',
  'Um tijolo maciço mede 20 cm de comprimento, 10 cm de largura e 5 cm de altura. Qual é o seu volume?',
  ['1.000 cm³', '350 cm³', '100 cm³', '10.000 cm³'], 1000, '20 × 10 × 5 = 1.000, e a unidade de volume é cm³.');
add(7, 2, 'algebra', 'Proporcionalidade inversa', 'EF07MA17',
  'Seis pintores fazem um serviço em 12 dias. Trabalhando no mesmo ritmo, quantos dias nove pintores levam para fazer o mesmo serviço?',
  ['8 dias', '18 dias', '13,5 dias', '3 dias'], 8, 'O serviço vale 6 × 12 = 72 dias de pintor; com 9 pintores, 72 ÷ 9 = 8 dias.');
add(7, 2, 'geometria', 'Ângulos em retas paralelas', 'EF07MA23',
  'Duas retas paralelas são cortadas por uma transversal e formam um ângulo de 65°. Quanto mede o ângulo alterno interno a esse ângulo?',
  ['65°', '115°', '25°', '90°'], 65, 'Ângulos alternos internos entre paralelas são congruentes, então o outro também mede 65°.');
add(7, 2, 'dados', 'Média como ponto de partida', 'EF07MA35',
  'Em quatro arremessos a média de Bia foi 12 m. Nos três primeiros ela marcou 10 m, 14 m e 11 m. Qual foi o quarto arremesso?',
  ['13 m', '12 m', '35 m', '11 m'], 13, 'A soma dos 4 arremessos é 4 × 12 = 48 m; 10 + 14 + 11 = 35, então o quarto foi 48 - 35 = 13 m.');
add(7, 2, 'algebra', 'Lei de formação de uma sequência', 'EF07MA15',
  'A expressão 4n + 2, com n = 1, 2, 3 e 4, gera quatro números. Quais são eles, nessa ordem?',
  ['6, 10, 14 e 18', '4, 8, 12 e 16', '2, 6, 10 e 14', '6, 8, 10 e 12'], null, 'Substituindo n: 4 × 1 + 2 = 6, 4 × 2 + 2 = 10, 4 × 3 + 2 = 14 e 4 × 4 + 2 = 18.');
add(7, 2, 'numeros', 'Multiplicação de frações', 'EF07MA11',
  'Quanto é 2/3 de 3/5?',
  ['2/5', '5/6', '3/10', '1/3'], null, 'Multiplicam-se numeradores e denominadores: (2 × 3)/(3 × 5) = 6/15, que simplificado por 3 é 2/5.');
add(7, 2, 'numeros', 'Porcentagem em tempo de download', 'EF07MA02',
  'Um arquivo baixou 60% do total em 18 minutos, mantendo a mesma velocidade. Quantos minutos ainda faltam para terminar o download?',
  ['12 minutos', '18 minutos', '30 minutos', '20 minutos'], 12, 'Se 60% levam 18 minutos, 10% levam 3 minutos; faltam 40%, ou 4 × 3 = 12 minutos.');

// ── 7º ano · Desafio ──────────────────────────────────────
add(7, 3, 'algebra', 'Equação com incógnita nos dois membros', 'EF07MA18',
  'Resolvendo a equação 7x - 3 = 4x + 12, encontramos x igual a',
  ['5', '3', '9', '15'], 5, '7x - 4x = 12 + 3, então 3x = 15 e x = 5.');
add(7, 3, 'numeros', 'Potências de números negativos', 'EF07MA04',
  'Quanto é (-2)² - (-2)³?',
  ['12', '-4', '-12', '4'], 12, '(-2)² = 4 e (-2)³ = -8; 4 - (-8) = 4 + 8 = 12.');
add(7, 3, 'geometria', 'Ângulo externo de polígono regular', 'EF07MA27',
  'Quanto mede o ângulo externo de um octógono regular?',
  ['45°', '135°', '60°', '90°'], 45, 'A soma dos ângulos externos é 360°; num octógono regular, 360 ÷ 8 = 45° cada.');
add(7, 3, 'medidas', 'Área do losango', 'EF07MA31',
  'Um losango tem diagonais medindo 12 cm e 8 cm. Qual é a sua área?',
  ['48 cm²', '96 cm²', '40 cm²', '20 cm²'], 48, 'Área do losango é o produto das diagonais dividido por 2: 12 × 8 ÷ 2 = 48 cm².');
add(7, 3, 'dados', 'Probabilidade pela frequência', 'EF07MA34',
  'Uma moeda foi lançada 200 vezes e deu cara em 98 delas. Qual é a frequência percentual estimada de cara?',
  ['49%', '98%', '50%', '19%'], 49, '98 ÷ 200 = 0,49, que em porcentagem é 49%.');
add(7, 3, 'algebra', 'Expressões algébricas equivalentes', 'EF07MA16',
  'Qual expressão é equivalente a 4(x + 3)?',
  ['4x + 12', '4x + 3', 'x + 12', '4x + 7'], null, 'Pela distributiva, o 4 multiplica os dois termos: 4 × x + 4 × 3 = 4x + 12.');
add(7, 3, 'geometria', 'Transformações geométricas', 'EF07MA21',
  'Qual transformação desloca uma figura de um lugar para outro sem girá-la e sem espelhá-la?',
  ['Translação', 'Reflexão', 'Rotação', 'Ampliação'], null, 'A translação só desliza a figura, mantendo orientação e tamanho; reflexão espelha e rotação gira.');
add(7, 3, 'numeros', 'Divisão com decimais em problema', 'EF07MA12',
  'Um carro faz 12,5 km com 1 litro de combustível. Quantos litros ele consome para percorrer 237,5 km?',
  ['19 L', '18,5 L', '23,75 L', '29,7 L'], 19, '237,5 ÷ 12,5 = 19: a distância dividida pelo consumo por litro dá 19 L.');
add(7, 3, 'numeros', 'Decréscimo de porcentagem', 'EF07MA02',
  'Um tênis que custava R$ 240,00 entrou em liquidação com 15% de desconto. Por quanto ele passou a custar?',
  ['R$ 204,00', 'R$ 216,00', 'R$ 36,00', 'R$ 225,00'], 204, '15% de 240 é 36; 240 - 36 = 204, então o preço final é R$ 204,00.');
add(7, 3, 'dados', 'Censo e amostra', 'EF07MA36',
  'Para conhecer a altura média dos 1.200 alunos de uma escola, o professor mediu 80 deles. O grupo dos 80 alunos medidos é',
  ['uma amostra', 'um censo', 'a população', 'a mediana'], null, 'A amostra é uma parte da população medida para representá-la; censo seria medir todos os 1.200.');

// ── 7º ano · Domínio ──────────────────────────────────────
add(7, 4, 'algebra', 'Problema resolvido com equação', 'EF07MA18',
  'A soma de dois números é 60 e um deles é o triplo do outro. Qual é o menor dos dois números?',
  ['15', '20', '45', '30'], 15, 'x + 3x = 60, então 4x = 60 e x = 15, o menor; o maior é 45.');
add(7, 4, 'geometria', 'Condição de existência do triângulo', 'EF07MA24',
  'Qual conjunto de medidas a seguir NÃO forma um triângulo?',
  ['3 cm, 7 cm e 12 cm', '5 cm, 5 cm e 6 cm', '4 cm, 5 cm e 6 cm', '8 cm, 9 cm e 10 cm'], null, '3 + 7 = 10, que é menor que 12: a soma dos dois lados menores precisa ser maior que o maior lado.');
add(7, 4, 'medidas', 'Área decomposta', 'EF07MA32',
  'Uma parede retangular mede 4 m por 3 m e tem uma janela de 1,5 m por 1 m. Quantos metros quadrados da parede serão pintados, descontando a janela?',
  ['10,5 m²', '12 m²', '1,5 m²', '11,5 m²'], 10.5, 'Parede: 4 × 3 = 12 m²; janela: 1,5 × 1 = 1,5 m²; pintam-se 12 - 1,5 = 10,5 m².');
add(7, 4, 'algebra', 'Grandezas diretamente proporcionais', 'EF07MA17',
  'Duas grandezas são diretamente proporcionais e y = 12 quando x = 4. Qual é o valor de y quando x = 7?',
  ['21', '16', '28', '9'], 21, 'A constante é y ÷ x = 12 ÷ 4 = 3; para x = 7, y = 3 × 7 = 21.');
add(7, 4, 'dados', 'Média ponderada', 'EF07MA35',
  'Em uma prova, 10 alunos tiraram 7 e 15 alunos tiraram 4. Qual foi a média da turma?',
  ['5,2', '5,5', '4,4', '6,0'], 5.2, '(10 × 7 + 15 × 4) ÷ 25 = (70 + 60) ÷ 25 = 130 ÷ 25 = 5,2.');
add(7, 4, 'numeros', 'Fração imprópria na reta numérica', 'EF07MA10',
  'O número 17/5 está localizado entre quais números inteiros na reta numérica?',
  ['entre 3 e 4', 'entre 2 e 3', 'entre 4 e 5', 'entre 14 e 15'], null, '17 ÷ 5 = 3,4, que fica entre os inteiros 3 e 4 na reta.');
add(7, 4, 'geometria', 'Ampliação no plano cartesiano', 'EF07MA19',
  'Multiplicando por 2 as coordenadas de todos os vértices de um triângulo, o que acontece com a figura?',
  ['Ela é ampliada, com o dobro das dimensões', 'Ela diminui para a metade do tamanho', 'Ela é transladada para a direita', 'Ela gira 90° em torno da origem'], null, 'Multiplicar as coordenadas por 2 dobra todas as distâncias da figura, ampliando-a sem girar nem espelhar.');
add(7, 4, 'algebra', 'Valor numérico de uma fórmula', 'EF07MA13',
  'A fórmula p = 2(b + h) calcula o perímetro de um retângulo. Qual é o perímetro de um retângulo com base 7 cm e altura 4 cm?',
  ['22 cm', '18 cm', '44 cm', '26 cm'], 22, 'p = 2 × (7 + 4) = 2 × 11 = 22 cm.');
add(7, 4, 'medidas', 'Unidades de volume', 'EF07MA30',
  'Quantos centímetros cúbicos há em 1 decímetro cúbico?',
  ['1.000 cm³', '100 cm³', '10 cm³', '1.000.000 cm³'], 1000, '1 dm = 10 cm, então 1 dm³ = 10 × 10 × 10 = 1.000 cm³.');
add(7, 4, 'dados', 'Ângulo central no gráfico de setores', 'EF07MA37',
  'Em um gráfico de setores, a fatia que representa 25% do total tem ângulo central de',
  ['90°', '25°', '45°', '180°'], 90, '25% de 360° é 360 ÷ 4 = 90° de ângulo central.');

// ── 8º ano · Base ─────────────────────────────────────────
add(8, 1, 'numeros', 'Potências de mesma base', 'EF08MA01',
  'Simplificando a divisão 3⁴ ÷ 3², obtemos',
  ['9', '81', '27', '3'], 9, 'Na divisão de mesma base, subtraem-se os expoentes: 3⁴ ÷ 3² = 3² = 9.');
add(8, 1, 'numeros', 'Notação científica', 'EF08MA01',
  'A população de um país é de 45.000.000 de habitantes. Escrita em notação científica, com um número entre 1 e 10 multiplicado por uma potência de 10, essa população é',
  ['4,5 × 10⁷', '45 × 10⁸', '4,5 × 10⁶', '4,5 × 10⁸'], null, 'A vírgula anda 7 casas para a esquerda: 45.000.000 = 4,5 × 10⁷, com 4,5 entre 1 e 10.');
add(8, 1, 'numeros', 'Porcentagem de uma quantidade', 'EF08MA04',
  'De 250 alunos da escola, 18% participaram da olimpíada de matemática. Quantos alunos participaram?',
  ['45', '18', '50', '54'], 45, '0,18 × 250 = 45 alunos participaram.');
add(8, 1, 'numeros', 'Raiz como potência de expoente fracionário', 'EF08MA02',
  'O número 27 elevado ao expoente 1/3 é igual a',
  ['3', '9', '13,5', '81'], 3, 'Expoente 1/3 é a raiz cúbica: 3³ = 27, então 27^(1/3) = 3.');
add(8, 1, 'algebra', 'Valor numérico de expressão algébrica', 'EF08MA06',
  'Se a = 3 e b = -2, qual é o valor de a² - 2ab?',
  ['21', '-3', '9', '15'], 21, 'a² = 9 e -2ab = -2 × 3 × (-2) = +12; 9 + 12 = 21.');
add(8, 1, 'geometria', 'Diagonais do losango', 'EF08MA14',
  'Sobre as diagonais de um losango, é correto afirmar que elas',
  ['se cruzam perpendicularmente, no ponto médio de cada uma', 'são sempre iguais entre si', 'são paralelas uma à outra', 'dividem o losango em dois triângulos escalenos'], null, 'No losango as diagonais são perpendiculares e se cortam ao meio, formando 4 triângulos retângulos iguais.');
add(8, 1, 'medidas', 'Litro e decímetro cúbico', 'EF08MA20',
  'Um reservatório tem capacidade de 2 dm³. Quantos litros cabem nele?',
  ['2 L', '20 L', '0,2 L', '200 L'], 2, '1 dm³ equivale a 1 L, então 2 dm³ = 2 L.');
add(8, 1, 'dados', 'Mediana de uma lista', 'EF08MA25',
  'As idades de cinco amigos são 12, 13, 12, 15 e 18 anos. Qual é a mediana dessas idades?',
  ['13', '12', '15', '14'], 13, 'Em ordem: 12, 12, 13, 15, 18; com 5 valores, a mediana é o do meio, 13.');
add(8, 1, 'algebra', 'Equação linear e reta', 'EF08MA07',
  'A reta que representa a equação y = 2x + 1 corta o eixo y no ponto',
  ["(0, 1)", "(1, 0)", "(2, 1)", "(0, 2)"], null, 'No eixo y, x = 0: y = 2 × 0 + 1 = 1, então o ponto é (0, 1).');
add(8, 1, 'numeros', 'Princípio multiplicativo da contagem', 'EF08MA03',
  'Em uma lanchonete há 3 tipos de pão, 4 tipos de recheio e 2 tipos de bebida. Quantas combinações de um sanduíche com uma bebida são possíveis?',
  ['24', '9', '12', '6'], 24, 'Pelo princípio multiplicativo: 3 × 4 × 2 = 24 combinações.');

// ── 8º ano · Prática ──────────────────────────────────────
add(8, 2, 'algebra', 'Sistema de equações do 1º grau', 'EF08MA08',
  'Se x + y = 12 e x - y = 4, qual é o valor de x?',
  ['8', '6', '4', '16'], 8, 'Somando as equações: 2x = 16, então x = 8 (e y = 4).');
add(8, 2, 'numeros', 'Fração geratriz de dízima', 'EF08MA05',
  'Qual fração irredutível representa a dízima periódica 0,666...?',
  ['2/3', '6/10', '1/6', '1/3'], null, '0,666... = 6/9, que simplificado por 3 dá 2/3.');
add(8, 2, 'medidas', 'Área do trapézio', 'EF08MA19',
  'Um trapézio tem bases de 10 cm e 6 cm e altura de 5 cm. Qual é a sua área?',
  ['40 cm²', '80 cm²', '41 cm²', '32 cm²'], 40, 'Área do trapézio: (10 + 6) × 5 ÷ 2 = 16 × 5 ÷ 2 = 40 cm².');
add(8, 2, 'algebra', 'Grandezas inversamente proporcionais', 'EF08MA13',
  'Com 3 torneiras abertas iguais, um tanque enche em 8 horas. Abrindo as 6 torneiras do mesmo modelo, em quanto tempo o tanque enche?',
  ['4 horas', '16 horas', '6 horas', '2,7 horas'], 4, 'O produto torneiras × tempo é constante: 3 × 8 = 24; com 6 torneiras, 24 ÷ 6 = 4 horas.');
add(8, 2, 'dados', 'Espaço amostral de duas moedas', 'EF08MA22',
  'Lançando duas moedas honestas uma vez, qual é a probabilidade de as duas caírem com a cara para cima?',
  ['1/4', '1/2', '3/4', '1/8'], null, 'Há 4 resultados igualmente prováveis (cara-cara, cara-coroa, coroa-cara, coroa-coroa); só 1 é cara-cara: 1/4.');
add(8, 2, 'medidas', 'Capacidade de uma caixa retangular', 'EF08MA21',
  'Uma caixa em forma de bloco retangular mede 30 cm de comprimento, 20 cm de largura e 15 cm de altura. Quantos litros ela comporta quando cheia?',
  ['9 L', '90 L', '900 L', '9.000 L'], 9, '30 × 20 × 15 = 9.000 cm³; como 1.000 cm³ = 1 L, a caixa comporta 9 L.');
add(8, 2, 'numeros', 'Potência de expoente negativo', 'EF08MA01',
  'Quanto é 2⁻³?',
  ['1/8', '-6', '8', '-1/8'], null, 'Expoente negativo inverte a base: 2⁻³ = 1/2³ = 1/8.');
add(8, 2, 'algebra', 'Equação do tipo ax² = b', 'EF08MA09',
  'Quais são as soluções reais da equação x² = 49?',
  ['x = 7 e x = -7', 'x = 7 apenas', 'x = 49 e x = -49', 'x = -7 apenas'], null, '7² = 49 e (-7)² = 49: as duas raízes reais são 7 e -7.');
add(8, 2, 'geometria', 'Mediatriz de um segmento', 'EF08MA17',
  'A mediatriz de um segmento de reta é a reta que',
  ['passa pelo ponto médio e é perpendicular ao segmento', 'divide o segmento em duas partes desiguais', 'é paralela ao segmento', 'liga as extremidades do segmento'], null, 'A mediatriz é perpendicular ao segmento e passa pelo seu ponto médio; todo ponto dela equidista das extremidades.');
add(8, 2, 'dados', 'Quarta nota a partir da média', 'EF08MA25',
  'Um aluno tem as notas 6,5; 7,0 e 8,5 e quer fechar a média 7,5 no bimestre. Qual nota ele precisa tirar no quarto trabalho?',
  ['8,0', '7,5', '9,0', '2,0'], 8, 'A soma das 4 notas deve ser 4 × 7,5 = 30; 6,5 + 7,0 + 8,5 = 22, então falta 30 - 22 = 8,0.');

// ── 8º ano · Desafio ──────────────────────────────────────
add(8, 3, 'algebra', 'Produto notável: quadrado de uma soma', 'EF08MA06',
  'Desenvolvendo a expressão (x + 4)², obtemos',
  ['x² + 8x + 16', 'x² + 16', 'x² + 4x + 16', 'x² + 8x + 8'], null, 'Quadrado da soma: x² + 2 × x × 4 + 4² = x² + 8x + 16.');
add(8, 3, 'numeros', 'Notação científica com expoente negativo', 'EF08MA01',
  'A espessura de uma lâmina é de 0,00045 m. Em notação científica, esse valor é escrito como',
  ['4,5 × 10⁻⁴', '4,5 × 10⁻⁵', '4,5 × 10⁻³', '4,5 × 10⁴'], null, 'A vírgula anda 4 casas para a direita: 0,00045 = 4,5 × 10⁻⁴.');
add(8, 3, 'medidas', 'Área do círculo', 'EF08MA19',
  'Usando π ≈ 3,14, qual é a área de um círculo de 5 cm de raio?',
  ['78,5 cm²', '31,4 cm²', '157 cm²', '25 cm²'], 78.5, 'A = π × r² = 3,14 × 5² = 3,14 × 25 = 78,5 cm².');
add(8, 3, 'dados', 'Média e mediana diante de valores extremos', 'EF08MA25',
  'Em uma empresa os salários são R$ 1.500, R$ 1.600, R$ 1.700, R$ 1.800 e R$ 12.000. Para descrever o salário típico dos cinco funcionários, o mais adequado é usar',
  ['a mediana, porque a média é puxada pelo salário muito alto', 'a média, porque ela considera todos os valores', 'a moda, porque é o valor que mais aparece', 'a amplitude dos salários'], null, 'O salário de R$ 12.000 puxa a média para cima; a mediana, R$ 1.700, representa melhor o valor típico.');
add(8, 3, 'algebra', 'Reta que representa equação linear', 'EF08MA07',
  'Qual ponto pertence à reta que representa a equação x + 2y = 6?',
  ["(2, 2)", "(2, 4)", "(6, 6)", "(4, 2)"], null, 'Substituindo (2, 2): 2 + 2 × 2 = 6, e a igualdade se cumpre.');
add(8, 3, 'algebra', 'Termo geral de uma sequência', 'EF08MA10',
  'A sequência 5, 9, 13, 17, ... segue uma lei de formação do tipo 4n + k, com n = 1, 2, 3, ... Qual expressão representa o termo geral dessa sequência?',
  ['4n + 1', '5n + 4', '4n - 1', 'n + 4'], null, 'A sequência cresce de 4 em 4; para n = 1, 4 × 1 + 1 = 5, o primeiro termo.');
add(8, 3, 'medidas', 'Área de figura composta', 'EF08MA19',
  'Um canteiro tem o formato de um retângulo de 10 m por 6 m com um triângulo de base 10 m e altura 3 m apoiado sobre ele. Qual é a área total do canteiro?',
  ['75 m²', '60 m²', '90 m²', '45 m²'], 75, 'Retângulo: 10 × 6 = 60 m²; triângulo: 10 × 3 ÷ 2 = 15 m²; total 60 + 15 = 75 m².');
add(8, 3, 'numeros', 'Aumento e desconto sucessivos', 'EF08MA04',
  'Um produto que custava R$ 200,00 sofreu um aumento de 20% e, em seguida, um desconto de 20% na promoção. Qual é o preço final?',
  ['R$ 192,00', 'R$ 200,00', 'R$ 196,00', 'R$ 204,00'], 192, '200 × 1,20 = 240; depois 240 × 0,80 = 192: os percentuais incidem sobre valores diferentes, R$ 192,00.');
add(8, 3, 'medidas', 'Metro cúbico e litro', 'EF08MA20',
  'Um reservatório tem 0,25 m³ de capacidade. Quantos litros cabem nesse reservatório?',
  ['250 L', '25 L', '2.500 L', '2 L'], 250, '1 m³ = 1.000 L, então 0,25 m³ = 0,25 × 1.000 = 250 L.');
add(8, 3, 'dados', 'Frequência relativa em classes', 'EF08MA24',
  'Numa pesquisa com 60 pessoas, a classe "de 20 a 29 anos" reuniu 15 respostas. Qual é a frequência relativa dessa classe?',
  ['25%', '15%', '60%', '35%'], 25, '15 ÷ 60 = 0,25, que em porcentagem é 25%.');

// ── 8º ano · Domínio ──────────────────────────────────────
add(8, 4, 'algebra', 'Sistema de equações no cotidiano', 'EF08MA08',
  'Duas pessoas foram à papelaria: a primeira comprou 2 cadernos e 1 caneta e pagou R$ 22,00; a segunda comprou 1 caderno e 1 caneta e pagou R$ 13,00. Qual é o preço de um caderno?',
  ['R$ 9,00', 'R$ 4,00', 'R$ 11,00', 'R$ 13,00'], 9, 'Subtraindo as compras: (2c + p) - (c + p) = 22 - 13, então c = 9; o caderno custa R$ 9,00.');
add(8, 4, 'algebra', 'Equação do 2º grau do tipo ax² = b', 'EF08MA09',
  'Um tapete quadrado tem 169 cm² de área. Qual é a medida do lado desse tapete?',
  ['13 cm', '84,5 cm', '42,25 cm', '26 cm'], 13, 'O lado é a raiz da área: √169 = 13 cm, pois 13 × 13 = 169.');
add(8, 4, 'numeros', 'Simplificação de raízes', 'EF08MA02',
  'Escrevendo √50 na forma mais simples, obtemos',
  ['5√2', '2√5', '10√5', '25√2'], null, '50 = 25 × 2, então √50 = √25 × √2 = 5√2.');
add(8, 4, 'numeros', 'Contagem com princípio multiplicativo', 'EF08MA03',
  'Uma senha é formada por duas letras escolhidas entre A, B e C (a mesma letra pode se repetir), seguidas de um algarismo escolhido entre 1 e 2. Quantas senhas diferentes é possível criar?',
  ['18', '8', '9', '12'], 18, 'Cada letra tem 3 escolhas e o algarismo 2: 3 × 3 × 2 = 18 senhas.');
add(8, 4, 'medidas', 'Volume em metros cúbicos e litros', 'EF08MA21',
  'Uma cisterna em forma de bloco retangular mede 2 m de comprimento, 1,5 m de largura e 1,2 m de altura. Quantos litros de água ela guarda quando cheia?',
  ['3.600 L', '360 L', '36 L', '300 L'], 3600, '2 × 1,5 × 1,2 = 3,6 m³; como 1 m³ = 1.000 L, são 3.600 L.');
add(8, 4, 'algebra', 'Valor numérico com fração', 'EF08MA06',
  'Quando x = 1/2, qual é o valor da expressão 4x² + 2x?',
  ['2', '1', '3', '1,25'], 2, '4 × (1/2)² + 2 × (1/2) = 4 × 1/4 + 1 = 1 + 1 = 2.');
add(8, 4, 'medidas', 'Altura desconhecida a partir da área', 'EF08MA19',
  'A área de um triângulo é calculada por A = b × h ÷ 2. Um triângulo tem 36 cm² de área e base de 12 cm. Qual é a altura correspondente a essa base?',
  ['6 cm', '3 cm', '12 cm', '216 cm'], 6, 'h = 2 × A ÷ b = 2 × 36 ÷ 12 = 72 ÷ 12 = 6 cm.');
add(8, 4, 'numeros', 'Potência de uma potência', 'EF08MA01',
  'Simplificando (10³)², obtemos',
  ['10⁶', '10⁵', '10⁹', '10⁸'], null, 'Potência de potência multiplica os expoentes: (10³)² = 10⁶, pois 3 × 2 = 6.');
add(8, 4, 'algebra', 'Escala cartográfica', 'EF08MA13',
  'Em um mapa na escala 1:250.000, a distância entre duas cidades é de 4 cm. Qual é a distância real entre elas?',
  ['10 km', '4 km', '25 km', '250 km'], 10, '4 × 250.000 = 1.000.000 cm; dividindo por 100.000, chega-se a 10 km.');
add(8, 4, 'dados', 'Média e soma dos valores', 'EF08MA25',
  'Cinco valores têm média 20. Sabendo que um deles é 45 e que os outros quatro são iguais entre si, qual é o valor de cada um dos quatro?',
  ['13,75', '15', '11', '20'], 13.75, 'A soma é 5 × 20 = 100; tirando 45 sobram 55 para 4 valores iguais: 55 ÷ 4 = 13,75.');

// ── 9º ano · Base ─────────────────────────────────────────
add(9, 1, 'numeros', 'Reconhecimento de irracionais', 'EF09MA02',
  'Qual dos números a seguir é irracional?',
  ['√7', '√16', '0,25', '2/3'], null, '√16 = 4, 0,25 e 2/3 são racionais; √7 não é fração de inteiros e tem decimal infinito não periódico.');
add(9, 1, 'geometria', 'Teorema de Pitágoras', 'EF09MA13',
  'Um triângulo retângulo tem catetos de 6 cm e 8 cm. Quanto mede a hipotenusa?',
  ['10 cm', '14 cm', '48 cm', '12 cm'], 10, '6² + 8² = 36 + 64 = 100, e √100 = 10 cm.');
add(9, 1, 'algebra', 'Percentuais sucessivos', 'EF09MA05',
  'Um produto de R$ 80,00 teve um aumento de 10% e, meses depois, outro aumento de 10%. Qual é o preço final?',
  ['R$ 96,80', 'R$ 96,00', 'R$ 88,00', 'R$ 97,80'], 96.8, '80 × 1,10 = 88 e 88 × 1,10 = 96,80: o segundo aumento incide sobre 88, não sobre 80.');
add(9, 1, 'algebra', 'Função afim: valor da incógnita', 'EF09MA06',
  'Na função f(x) = 3x - 5, para qual valor de x temos f(x) = 7?',
  ['4', '2', '-4', '12'], 4, '3x - 5 = 7, então 3x = 12 e x = 4.');
add(9, 1, 'geometria', 'Ângulos formados por paralelas', 'EF09MA10',
  'Dois ângulos correspondentes formados por retas paralelas cortadas por uma transversal medem 2x e 70°. Qual é o valor de x?',
  ['35', '70', '140', '20'], 35, 'Ângulos correspondentes são iguais: 2x = 70, então x = 35.');
add(9, 1, 'dados', 'Eventos independentes', 'EF09MA20',
  'Lançando duas vezes um dado de seis faces, qual é a probabilidade de sair a face 6 nas duas vezes?',
  ['1/36', '1/6', '1/12', '5/6'], null, 'Eventos independentes: 1/6 × 1/6 = 1/36.');
add(9, 1, 'numeros', 'Multiplicação em notação científica', 'EF09MA04',
  'O produto (2 × 10³) × (4 × 10⁵) é igual a',
  ['8 × 10⁸', '8 × 10¹⁵', '6 × 10⁸', '2 × 10¹⁵'], null, 'Multiplicam-se os coeficientes e somam-se os expoentes: 2 × 4 = 8 e 10³ × 10⁵ = 10⁸.');
add(9, 1, 'medidas', 'Velocidade média', 'EF09MA07',
  'Um ônibus percorreu 270 km em 3 horas, sem paradas. Qual foi a velocidade média do percurso?',
  ['90 km/h', '81 km/h', '30 km/h', '270 km/h'], 90, 'Velocidade média é distância ÷ tempo: 270 ÷ 3 = 90 km/h.');
add(9, 1, 'algebra', 'Fatoração: diferença de quadrados', 'EF09MA09',
  'A expressão x² - 9, escrita em forma fatorada, é',
  ['(x + 3)(x - 3)', '(x - 3)²', '(x + 9)(x - 1)', 'x(x - 9)'], null, 'Diferença de quadrados: x² - 3² = (x + 3)(x - 3).');
add(9, 1, 'geometria', 'Triângulos semelhantes', 'EF09MA12',
  'Dois triângulos são semelhantes. Os lados do primeiro medem 3, 4 e 5 cm, e o lado do segundo que corresponde ao de 3 cm mede 9 cm. Quanto mede o lado do segundo que corresponde ao de 4 cm?',
  ['12 cm', '6 cm', '15 cm', '9 cm'], 12, 'A razão de semelhança é 9 ÷ 3 = 3; o lado correspondente a 4 cm mede 4 × 3 = 12 cm.');

// ── 9º ano · Prática ──────────────────────────────────────
add(9, 2, 'algebra', 'Taxa percentual de variação', 'EF09MA05',
  'O preço de um produto subiu de R$ 250,00 para R$ 300,00. Qual foi o aumento percentual?',
  ['20%', '50%', '16,7%', '25%'], 20, 'O aumento foi 300 - 250 = 50; 50 ÷ 250 = 0,20, ou 20%.');
add(9, 2, 'geometria', 'Pitágoras em situação real', 'EF09MA14',
  'Uma escada de 13 m está encostada em um muro, alcançando 12 m de altura. Qual é a distância, em metros, entre a base da escada e o muro?',
  ['5 m', '1 m', '12,5 m', '6,5 m'], 5, '13² - 12² = 169 - 144 = 25, e √25 = 5 m.');
add(9, 2, 'numeros', 'Potências de expoente fracionário', 'EF09MA03',
  'Quanto é 16^(1/2) + 27^(1/3)?',
  ['7', '8', '10', '13'], 7, '16^(1/2) = √16 = 4 e 27^(1/3) = raiz cúbica de 27 = 3; 4 + 3 = 7.');
add(9, 2, 'algebra', 'Coeficiente angular e crescimento', 'EF09MA06',
  'No gráfico da função y = -2x + 4, o que acontece com os valores de y conforme x aumenta?',
  ['Diminuem, porque o coeficiente angular é negativo', 'Aumentam, porque o coeficiente angular é positivo', 'Permanecem iguais a 4', 'Primeiro aumentam e depois diminuem'], null, 'O coeficiente angular -2 é negativo: a cada aumento de x, y cai 2 unidades.');
add(9, 2, 'dados', 'Escolha do gráfico adequado', 'EF09MA22',
  'Para mostrar como a temperatura variou ao longo de um mesmo dia, registrando a cada hora, o tipo de gráfico mais adequado é o gráfico',
  ['de linhas', 'de setores', 'de colunas separadas', 'de pictogramas'], null, 'O gráfico de linhas mostra a variação contínua de uma grandeza ao longo do tempo, como a temperatura hora a hora.');
add(9, 2, 'geometria', 'Ponto médio de um segmento', 'EF09MA16',
  'Qual é o ponto médio do segmento que tem extremidades em A(2, 3) e B(8, 7)?',
  ["(5, 5)", "(6, 4)", "(10, 10)", "(4, 6)"], null, 'Média das coordenadas: x = (2 + 8) ÷ 2 = 5 e y = (3 + 7) ÷ 2 = 5.');
add(9, 2, 'algebra', 'Fatoração por fator comum', 'EF09MA09',
  'Colocando o fator comum em evidência, a expressão 6a² + 9a fica',
  ['3a(2a + 3)', '3a(2a - 3)', '3a(2a + 9)', '6a(a + 3)'], null, 'O fator comum é 3a: 6a² ÷ 3a = 2a e 9a ÷ 3a = 3, então 3a(2a + 3).');
add(9, 2, 'medidas', 'Densidade demográfica', 'EF09MA07',
  'Uma cidade tem 240.000 habitantes em uma área de 150 km². Qual é a sua densidade demográfica?',
  ['1.600 hab/km²', '160 hab/km²', '36.000 hab/km²', '1.500 hab/km²'], 1600, 'Densidade é habitantes ÷ área: 240.000 ÷ 150 = 1.600 hab/km².');
add(9, 2, 'numeros', 'Estimativa de raiz na reta numérica', 'EF09MA02',
  'O número √30 está localizado entre quais inteiros na reta numérica?',
  ['entre 5 e 6', 'entre 4 e 5', 'entre 6 e 7', 'entre 14 e 15'], null, '5² = 25 e 6² = 36; como 25 < 30 < 36, √30 está entre 5 e 6.');
add(9, 2, 'geometria', 'Ângulo inscrito na circunferência', 'EF09MA11',
  'Um ângulo inscrito em uma circunferência subentende um arco de 100°. Quanto mede esse ângulo inscrito?',
  ['50°', '100°', '200°', '25°'], 50, 'O ângulo inscrito mede metade do arco: 100 ÷ 2 = 50°.');

// ── 9º ano · Desafio ──────────────────────────────────────
add(9, 3, 'algebra', 'Produto notável: quadrado de uma diferença', 'EF09MA09',
  'Desenvolvendo (2x - 5)², obtemos',
  ['4x² - 20x + 25', '4x² - 25', '4x² - 20x - 25', '2x² - 20x + 25'], null, '(2x)² - 2 × 2x × 5 + 5² = 4x² - 20x + 25.');
add(9, 3, 'geometria', 'Pitágoras com hipotenusa conhecida', 'EF09MA13',
  'Um terreno retangular tem um dos lados medindo 15 m e a diagonal medindo 25 m. Qual é a medida do outro lado?',
  ['20 m', '10 m', '40 m', '12 m'], 20, '25² - 15² = 625 - 225 = 400, e √400 = 20 m.');
add(9, 3, 'dados', 'Eventos dependentes sem reposição', 'EF09MA20',
  'Uma urna tem 3 bolas brancas e 2 pretas. Retiram-se duas bolas seguidas, sem repor a primeira. Qual é a probabilidade de as duas serem brancas?',
  ['3/10', '9/25', '2/5', '6/25'], null, '3/5 na primeira e 2/4 na segunda, sem reposição: 3/5 × 2/4 = 6/20 = 3/10.');
add(9, 3, 'medidas', 'Velocidade média com paradas', 'EF09MA07',
  'Um ônibus fez um percurso de 320 km em 4 horas, incluindo 40 minutos de parada. Qual foi a velocidade média apenas nos trechos em movimento?',
  ['96 km/h', '80 km/h', '100 km/h', '88 km/h'], 96, 'Descontando a parada, restam 3 h 20 min = 10/3 h de movimento; 320 ÷ (10/3) = 96 km/h.');
add(9, 3, 'geometria', 'Vistas ortogonais', 'EF09MA17',
  'As três vistas ortogonais usadas no desenho técnico para representar um objeto em três dimensões são',
  ['frontal, superior e lateral', 'frontal, diagonal e central', 'superior, inferior e perpendicular', 'real, reduzida e ampliada'], null, 'O desenho técnico projeta o objeto em três planos perpendiculares: vista de frente, de cima e de lado.');
add(9, 3, 'algebra', 'Modelagem com função afim', 'EF09MA06',
  'Uma corrida de táxi custa R$ 3,50 fixos mais R$ 2,00 por quilômetro rodado. Qual expressão dá o valor V da corrida em função da distância x, em quilômetros?',
  ['V = 2x + 3,50', 'V = 3,50x + 2', 'V = 5,50x', 'V = 2x - 3,50'], null, 'O valor varia 2 reais por km (2x) mais a taxa fixa de 3,50: V = 2x + 3,50.');
add(9, 3, 'numeros', 'Notação científica de números pequenos', 'EF09MA04',
  'A massa de um grão de areia é de 0,0000072 kg. Em notação científica, esse valor é',
  ['7,2 × 10⁻⁶', '7,2 × 10⁻⁵', '7,2 × 10⁻⁷', '7,2 × 10⁶'], null, 'A vírgula anda 6 casas para a direita: 0,0000072 = 7,2 × 10⁻⁶.');
add(9, 3, 'geometria', 'Segmentos entre retas paralelas', 'EF09MA14',
  'Três retas paralelas são cortadas por duas transversais. Em uma delas os segmentos medem 4 cm e 6 cm; na outra, o segmento correspondente a 4 cm mede 8 cm. Quanto mede o segmento correspondente a 6 cm?',
  ['12 cm', '10 cm', '5,3 cm', '9 cm'], 12, 'Os segmentos são proporcionais: 8 ÷ 4 = 2, então o correspondente a 6 cm mede 6 × 2 = 12 cm.');
add(9, 3, 'dados', 'Leitura enganosa de gráficos', 'EF09MA21',
  'Em um gráfico de barras, o eixo vertical começa em 50 em vez de 0. Esse recurso costuma',
  ['exagerar visualmente as diferenças entre os valores', 'manter a leitura fiel dos dados', 'diminuir todas as barras igualmente', 'não alterar a aparência do gráfico'], null, 'Cortar o eixo em 50 amplia visualmente as diferenças entre as barras, distorcendo a comparação.');
add(9, 3, 'medidas', 'Unidades para distâncias enormes', 'EF09MA18',
  'Para expressar a distância entre as estrelas, os astrônomos costumam usar a unidade chamada',
  ['ano-luz', 'quilômetro', 'megâmetro', 'unidade astronômica'], null, 'O ano-luz é a distância que a luz percorre em um ano, unidade adequada às enormes distâncias entre estrelas.');

// ── 9º ano · Domínio ──────────────────────────────────────
add(9, 4, 'algebra', 'Equação do 2º grau por fatoração', 'EF09MA09',
  'As soluções reais da equação x² - 5x + 6 = 0 são',
  ['x = 2 e x = 3', 'x = -2 e x = -3', 'x = 6 apenas', 'x = 1 e x = 6'], null, 'Fatorando: (x - 2)(x - 3) = 0, então x = 2 ou x = 3.');
add(9, 4, 'geometria', 'Pitágoras em caminho mais curto', 'EF09MA13',
  'Um terreno retangular mede 90 m por 120 m. Caminhando pela diagonal em vez de andar pelos dois lados, quantos metros uma pessoa economiza?',
  ['60 m', '150 m', '30 m', '210 m'], 60, 'Diagonal: √(90² + 120²) = √22.500 = 150 m; pelos lados são 90 + 120 = 210 m; economizam-se 60 m.');
add(9, 4, 'dados', 'Soma de faces em dois dados', 'EF09MA20',
  'Lançando dois dados honestos, qual é a probabilidade de a soma das faces ser 7?',
  ['1/6', '1/12', '1/36', '7/36'], null, 'Há 6 somas 7 em 36 resultados (1+6, 2+5, 3+4, 4+3, 5+2, 6+1): 6/36 = 1/6.');
add(9, 4, 'algebra', 'Percentuais sucessivos em salário', 'EF09MA05',
  'Um salário de R$ 2.400,00 recebeu um reajuste de 8% e, um ano depois, outro de 5%. Qual é o valor final do salário?',
  ['R$ 2.721,60', 'R$ 2.712,00', 'R$ 2.700,00', 'R$ 2.592,00'], 2721.6, '2.400 × 1,08 = 2.592 e 2.592 × 1,05 = 2.721,60: cada reajuste incide sobre o valor anterior.');
add(9, 4, 'geometria', 'Razões trigonométricas no triângulo retângulo', 'EF09MA13',
  'Uma rampa forma um ângulo de 30° com o solo e seu ponto mais alto está a 4 m de altura. Usando sen 30° = 0,5, qual é o comprimento da rampa?',
  ['8 m', '6,9 m', '4,6 m', '2 m'], 8, 'sen 30° = altura ÷ rampa, então 0,5 = 4 ÷ L e L = 4 ÷ 0,5 = 8 m.');
add(9, 4, 'algebra', 'Interseção da reta com o eixo x', 'EF09MA06',
  'O gráfico da função y = 3x - 6 cruza o eixo x no ponto',
  ["(2, 0)", "(0, -6)", "(-2, 0)", "(6, 0)"], null, 'No eixo x, y = 0: 3x - 6 = 0, então x = 2 e o ponto é (2, 0).');
add(9, 4, 'numeros', 'Por que √2 é irracional', 'EF09MA01',
  'A diagonal de um quadrado de 1 cm de lado mede √2 cm. Esse número é irracional porque',
  ['não pode ser escrito como fração de dois inteiros e tem infinitas casas decimais não periódicas',
   'tem vírgula na representação decimal',
   'é a raiz quadrada de um número',
   'não existe na reta numérica'], null, 'Irracional é o número que não se escreve como fração de inteiros; √2 tem expansão decimal infinita e não periódica.');
add(9, 4, 'medidas', 'Volume do cilindro', 'EF09MA19',
  'Um cilindro tem 4 cm de raio e 10 cm de altura. Usando π ≈ 3,14, qual é o seu volume?',
  ['502,4 cm³', '200,96 cm³', '125,6 cm³', '50,24 cm³'], 502.4, 'V = π × r² × h = 3,14 × 4² × 10 = 3,14 × 160 = 502,4 cm³.');
add(9, 4, 'geometria', 'Quadrilátero inscrito na circunferência', 'EF09MA11',
  'Em um quadrilátero inscrito em uma circunferência, os ângulos opostos são suplementares. Se um dos ângulos mede 70°, quanto mede o ângulo oposto a ele?',
  ['110°', '70°', '90°', '290°'], 110, 'Ângulos opostos de quadrilátero inscrito somam 180°: 180 - 70 = 110°.');
add(9, 4, 'algebra', 'Grandezas inversamente proporcionais', 'EF09MA08',
  'Viajando a 80 km/h, um percurso é feito em 3 horas. A que velocidade o mesmo percurso seria feito em 2 horas?',
  ['120 km/h', '53 km/h', '60 km/h', '160 km/h'], 120, 'O percurso é 80 × 3 = 240 km; para fazê-lo em 2 h, 240 ÷ 2 = 120 km/h.');

// ── Afirmações de Verdadeiro ou Falso (Fundamental 1) ─────
const AFIRMACOES = [];
let naf = 0;
function af(ano, nv, u, o, bncc, txt, certa, why) {
  AFIRMACOES.push({
    id: 'A' + (++naf), ano: ano, nv: nv, u: u, o: o,
    bncc: [bncc], txt: txt, certa: certa, why: why
  });
}

af(1, 1, 'geometria', 'Figuras planas e seus lados', 'EF01MA14',
  'Um triângulo tem 3 lados.', true, 'Triângulo: figura plana de 3 lados e 3 cantos.');
af(1, 1, 'geometria', 'Sólidos e objetos do cotidiano', 'EF01MA13',
  'Uma bola de futebol tem a forma de uma esfera.', true, 'A esfera é redonda por todos os lados, como a bola.');
af(1, 1, 'medidas', 'Meses do ano', 'EF01MA17',
  'Um ano tem 7 meses.', false, 'Um ano tem 12 meses; 7 é o número de dias da semana.');
af(1, 2, 'numeros', 'Composição de dezenas e unidades', 'EF01MA07',
  '2 dezenas e 5 unidades formam o número 52.', false, '2 dezenas e 5 unidades formam o número 25.');
af(1, 2, 'numeros', 'Igualdades com o mesmo resultado', 'EF01MA07',
  '6 + 4 tem o mesmo resultado que 9 + 1.', true, 'As duas sentenças dão 10.');
af(1, 2, 'dados', 'Eventos impossíveis', 'EF01MA20',
  'Tirar uma bola laranja de uma caixa com só bolas azuis é impossível.', true, 'Sem bola laranja na caixa, não há como tirar uma.');
af(1, 3, 'medidas', 'Dias da semana', 'EF01MA17',
  'Uma semana tem 7 dias.', true, 'São eles: segunda, terça, quarta, quinta, sexta, sábado e domingo.');
af(1, 3, 'geometria', 'Lados do quadrado', 'EF01MA14',
  'Um quadrado tem 4 lados do mesmo tamanho.', true, 'Os 4 lados do quadrado são iguais.');
af(1, 3, 'numeros', 'Ordem na contagem', 'EF01MA05',
  'Na contagem, o número 19 vem antes do número 18.', false, '18 vem antes de 19, porque 18 é menor.');
af(1, 4, 'medidas', 'Leitura de datas', 'EF01MA18',
  'Em uma data como 07/09, o primeiro número indica o dia.', true, 'No Brasil escrevemos dia/mês/ano.');
af(1, 4, 'numeros', 'Comparação de números', 'EF01MA05',
  'O maior número entre 27 e 72 é 72.', true, '72 tem 7 dezenas e 27 tem só 2 dezenas.');
af(1, 4, 'dados', 'Leitura de gráfico de colunas', 'EF01MA21',
  'Em um gráfico de colunas, a coluna mais alta mostra o item que teve mais votos.', true, 'A altura da coluna representa a quantidade.');

af(2, 1, 'numeros', 'Dobro', 'EF02MA08',
  'O dobro de 9 é 18.', true, '9 + 9 = 18.');
af(2, 1, 'medidas', 'Metro e centímetro', 'EF02MA16',
  '1 metro tem 100 centímetros.', true, 'A relação entre metro e centímetro é de 100.');
af(2, 1, 'geometria', 'Faces do cubo', 'EF02MA14',
  'Um cubo tem 6 faces.', true, 'O cubo tem 6 faces quadradas iguais.');
af(2, 2, 'numeros', 'Metade', 'EF02MA08',
  'A metade de 20 é 15.', false, 'A metade de 20 é 10, porque 20 ÷ 2 = 10.');
af(2, 2, 'numeros', 'Propriedade comutativa', 'EF02MA07',
  '5 × 4 tem o mesmo resultado que 4 × 5.', true, 'Trocar a ordem dos fatores não muda o produto: os dois dão 20.');
af(2, 2, 'geometria', 'Lados do retângulo', 'EF02MA15',
  'Um retângulo tem 3 lados.', false, 'Retângulo é um quadrilátero: tem 4 lados.');
af(2, 3, 'medidas', 'Sistema monetário', 'EF02MA20',
  '3 moedas de 50 centavos formam R$ 1,50.', true, '3 × 50 centavos = 150 centavos = R$ 1,50.');
af(2, 3, 'numeros', 'Sequência com regularidade', 'EF02MA09',
  'Na sequência 12, 16, 20, 24, o próximo número é 28.', true, 'A sequência cresce de 4 em 4.');
af(2, 3, 'medidas', 'Duração de eventos', 'EF02MA19',
  'Uma aula de 50 minutos começa às 9h e termina às 9h50.', true, '9h + 50 minutos = 9h50.');
af(2, 4, 'numeros', 'Valor posicional', 'EF02MA04',
  'No número 407, o algarismo 4 vale 400.', true, 'O 4 está na ordem das centenas.');
af(2, 4, 'numeros', 'Multiplicação e adição', 'EF02MA07',
  '4 × 3 é o mesmo que 3 + 3 + 3 + 3.', true, 'Multiplicar é somar parcelas iguais: quatro vezes 3.');
af(2, 4, 'dados', 'Eventos muito prováveis', 'EF02MA21',
  'Em uma urna com 9 bolas brancas e 1 preta, é muito provável tirar uma bola branca.', true, 'A maioria das bolas é branca.');

af(3, 1, 'numeros', 'Divisão exata', 'EF03MA08',
  '24 ÷ 6 = 4.', true, '6 × 4 = 24, então o quociente é 4.');
af(3, 1, 'geometria', 'Sólidos e suas faces', 'EF03MA14',
  'Uma pirâmide de base quadrada tem 5 faces.', true, 'São 4 faces triangulares e 1 face quadrada na base.');
af(3, 1, 'numeros', 'Metade', 'EF03MA09',
  'A metade de 50 é 25.', true, '50 ÷ 2 = 25.');
af(3, 2, 'numeros', 'Cálculo errado comum', 'EF03MA03',
  '7 × 8 = 54.', false, '7 × 8 = 56.');
af(3, 2, 'numeros', 'Composição do número', 'EF03MA02',
  'O número 1.305 tem 3 centenas.', true, 'Lendo da direita para a esquerda, o 3 está na ordem das centenas.');
af(3, 2, 'geometria', 'Elementos das figuras planas', 'EF03MA15',
  'Um triângulo pode ter 4 vértices.', false, 'Todo triângulo tem exatamente 3 vértices.');
af(3, 3, 'medidas', 'Área por comparação', 'EF03MA21',
  'Duas figuras podem ter a mesma área mesmo com formatos diferentes.', true, 'A área é a medida da superfície, não o formato.');
af(3, 3, 'numeros', 'Fração como divisão', 'EF03MA09',
  'A terça parte de 30 é 10.', true, '30 ÷ 3 = 10.');
af(3, 3, 'medidas', 'Relógio analógico', 'EF03MA23',
  'Quando o ponteiro pequeno está no 3 e o grande no 12, o relógio marca 3 horas.', true, 'O ponteiro grande no 12 indica a hora exata.');
af(3, 4, 'algebra', 'Sentenças de igualdade', 'EF03MA11',
  '35 + 15 e 40 + 10 têm o mesmo resultado.', true, 'As duas sentenças dão 50.');
af(3, 4, 'numeros', 'Divisão com resto', 'EF03MA08',
  'Na divisão de 20 por 3, o resto é 2.', true, '3 × 6 = 18 e 20 - 18 = 2.');
af(3, 4, 'dados', 'Chance em experimentos', 'EF03MA25',
  'Ao lançar um dado, é igualmente provável sair 1 ou sair 6.', true, 'Todas as seis faces têm a mesma chance.');

af(4, 1, 'numeros', 'Frações unitárias', 'EF04MA09',
  '1/2 é maior que 1/3.', true, 'Quanto menor o número de partes, maior cada parte.');
af(4, 1, 'geometria', 'Ângulos', 'EF04MA18',
  'Um ângulo de 90° é chamado de ângulo agudo.', false, '90° é ângulo reto; agudo é menor que 90°.');
af(4, 1, 'medidas', 'Perímetro do quadrado', 'EF04MA20',
  'Um quadrado de lado 5 cm tem perímetro de 20 cm.', true, 'Perímetro é a volta toda: 5 + 5 + 5 + 5 = 20.');
af(4, 2, 'numeros', 'Decimais', 'EF04MA10',
  '0,7 é maior que 0,5.', true, '7 décimos são mais que 5 décimos.');
af(4, 2, 'numeros', 'Múltiplos e divisores', 'EF04MA12',
  '56 é divisível por 7.', true, '7 × 8 = 56, então a divisão é exata.');
af(4, 2, 'geometria', 'Simetria de reflexão', 'EF04MA19',
  'A letra E tem um eixo de simetria na horizontal.', true, 'Dobrando ao meio na horizontal, as duas partes coincidem.');
af(4, 3, 'medidas', 'Capacidade', 'EF04MA20',
  'Um litro tem 100 mililitros.', false, 'Um litro tem 1.000 mililitros.');
af(4, 3, 'medidas', 'Temperaturas', 'EF04MA23',
  'A temperatura de -5 °C é mais alta que 3 °C.', false, 'Na escala Celsius, -5 °C está abaixo de 3 °C.');
af(4, 3, 'numeros', 'Propriedades das operações', 'EF04MA05',
  '12 × 25 é o mesmo que 12 × 20 + 12 × 5.', true, 'É a distributiva: 20 + 5 = 25, e o resultado é 300.');
af(4, 4, 'algebra', 'Relação de igualdade', 'EF04MA14',
  'Se 20 + 15 = 35, então 35 - 15 = 20.', true, 'A subtração é a operação inversa da adição.');
af(4, 4, 'numeros', 'Fração decimal', 'EF04MA10',
  '3/10 escrito em forma decimal é 0,3.', true, 'Três décimos correspondem a 0,3.');
af(4, 4, 'dados', 'Pesquisa e gráfico', 'EF04MA28',
  'Em uma pesquisa com 30 alunos, cada aluno votou uma vez. Se 18 votos foram para futebol, 12 alunos votaram em outro esporte.', true, 'Cada aluno deu um voto, então são 30 votos no total: 30 - 18 = 12.');

af(5, 1, 'medidas', 'Perímetro e área', 'EF05MA20',
  'Uma figura com perímetro maior sempre tem área maior.', false, 'Perímetro e área não variam juntos: um retângulo 1 × 9 tem perímetro 20 e área 9, mas um quadrado 4 × 4 tem perímetro 16 e área 16 — perímetro menor e área maior.');
af(5, 1, 'numeros', 'Decimais e zeros à direita', 'EF05MA02',
  '0,5 e 0,50 representam a mesma quantidade.', true, 'Acrescentar zero à direita do último algarismo decimal não muda o valor.');
af(5, 1, 'numeros', 'Porcentagem e fração', 'EF05MA06',
  '1/4 é o mesmo que 25%.', true, '25% é a quarta parte do inteiro.');
af(5, 2, 'geometria', 'Planificações de sólidos', 'EF05MA16',
  'Um cilindro tem duas bases em forma de círculo.', true, 'As duas tampas do cilindro são círculos iguais.');
af(5, 2, 'numeros', 'Comparação de decimais', 'EF05MA05',
  '0,3 é maior que 0,35.', false, '0,3 = 0,30, que é menor que 0,35.');
af(5, 2, 'numeros', 'Porcentagens usuais', 'EF05MA06',
  '50% de um número é a sua metade.', true, '50% é a metade do inteiro: 50 de cada 100.');
af(5, 3, 'geometria', 'Polígonos: lados e vértices', 'EF05MA17',
  'Um pentágono tem 5 vértices.', true, 'Em todo polígono, o número de vértices é igual ao de lados.');
af(5, 3, 'dados', 'Probabilidade em eventos igualmente prováveis', 'EF05MA23',
  'A probabilidade de sair cara ao lançar uma moeda é 1/2.', true, 'São dois resultados possíveis e igualmente prováveis.');
af(5, 3, 'numeros', 'Fração de quantidade', 'EF05MA03',
  '2/3 de 15 é 10.', true, '15 ÷ 3 = 5 e 5 × 2 = 10.');
af(5, 4, 'algebra', 'Propriedade da igualdade', 'EF05MA10',
  'Se 3x = 24, então x = 8.', true, 'Basta dividir os dois lados por 3.');
af(5, 4, 'medidas', 'Unidades de tempo', 'EF05MA19',
  '1 hora e meia corresponde a 90 minutos.', true, '60 + 30 = 90 minutos.');
af(5, 4, 'dados', 'Média e representação de dados', 'EF05MA24',
  'Um gráfico de linhas é mais adequado que um de colunas para mostrar a temperatura ao longo de um dia.', true, 'Linhas mostram a variação de uma grandeza ao longo do tempo.');

// ── Afirmações de Verdadeiro ou Falso (Fundamental 2) ─────
af(6, 1, 'numeros', 'Comparação de decimais', 'EF06MA01',
  '4,5 é maior que 4,05.', true, '4,5 vale o mesmo que 4,50, e 4,50 é maior que 4,05.');
af(6, 1, 'numeros', 'Divisibilidade', 'EF06MA06',
  'O número 91 é divisível por 7.', true, '7 × 13 = 91, então a divisão é exata.');
af(6, 1, 'numeros', 'Números ímpares e primos', 'EF06MA05',
  'Todo número ímpar é primo.', false, '21 é ímpar e não é primo, pois 21 = 3 × 7.');
af(6, 2, 'numeros', 'Frações equivalentes', 'EF06MA07',
  'As frações 4/6 e 2/3 são equivalentes.', true, 'Simplificando 4/6 por 2 chega-se a 2/3.');
af(6, 2, 'numeros', 'Fração de uma quantidade', 'EF06MA09',
  '2/5 de 60 é igual a 24.', true, '60 ÷ 5 = 12 e 12 × 2 = 24.');
af(6, 2, 'geometria', 'Classificação de ângulos', 'EF06MA26',
  'Um ângulo de 120° é agudo.', false, 'Ângulo agudo mede menos de 90°; 120° é um ângulo obtuso.');
af(6, 3, 'geometria', 'Vértices de um prisma', 'EF06MA17',
  'Um prisma quadrangular tem 8 vértices.', true, 'São 4 vértices na base de baixo e 4 na de cima.');
af(6, 3, 'medidas', 'Área e perímetro', 'EF06MA24',
  'Um retângulo de 6 cm por 4 cm tem área igual ao seu perímetro.', false, 'A área é 24 cm² e o perímetro é 20 cm: são grandezas diferentes e não se comparam.');
af(6, 3, 'numeros', 'Comparação de frações', 'EF06MA07',
  '3/4 é maior que 4/5.', false, 'Em decimais, 3/4 = 0,75 e 4/5 = 0,8.');
af(6, 4, 'dados', 'Probabilidade em um dado', 'EF06MA30',
  'A probabilidade de sair a face 6 em um dado é maior que a de sair a face 1.', false, 'Em um dado honesto as seis faces têm a mesma chance.');
af(6, 4, 'numeros', 'Porcentagem', 'EF06MA13',
  '30% de 120 é igual a 36.', true, '10% de 120 é 12; multiplicando por 3, obtemos 36.');
af(6, 4, 'medidas', 'Ampliação do quadrado', 'EF06MA29',
  'Dobrando o lado de um quadrado, a área também dobra.', false, 'A área depende do lado ao quadrado: dobrando o lado, a área fica 4 vezes maior.');

af(7, 1, 'numeros', 'Comparação de negativos', 'EF07MA03',
  '-8 é maior que -3.', false, 'Na reta numérica, -8 está à esquerda de -3, portanto é menor.');
af(7, 1, 'numeros', 'Desconto simples', 'EF07MA02',
  'Um desconto de 25% em R$ 80,00 reduz o preço para R$ 60,00.', true, '25% de 80 é 20, e 80 - 20 = 60.');
af(7, 2, 'algebra', 'Solução de equação', 'EF07MA18',
  'O número 4 é solução da equação 3x + 5 = 17.', true, '3 × 4 + 5 = 12 + 5 = 17.');
af(7, 2, 'geometria', 'Soma dos ângulos do triângulo', 'EF07MA24',
  'Existe um triângulo com ângulos de 50°, 60° e 80°.', false, '50 + 60 + 80 dá 190°, e a soma dos ângulos internos deve ser 180°.');
af(7, 3, 'numeros', 'Fração e forma decimal', 'EF07MA10',
  'A fração 5/8 corresponde ao número decimal 0,625.', true, '5 ÷ 8 = 0,625.');
af(7, 3, 'medidas', 'Volume de bloco retangular', 'EF07MA30',
  'Um bloco de 3 cm × 4 cm × 5 cm tem volume de 60 cm³.', true, 'Multiplicando as três dimensões: 3 × 4 × 5 = 60.');
af(7, 4, 'dados', 'Média aritmética', 'EF07MA35',
  'A média de 4, 8 e 9 é 8.', false, '(4 + 8 + 9) ÷ 3 = 21 ÷ 3 = 7.');
af(7, 4, 'algebra', 'Proporcionalidade inversa', 'EF07MA17',
  'Em grandezas inversamente proporcionais, quando uma dobra, a outra fica pela metade.', true, 'O produto entre as medidas permanece o mesmo.');

af(8, 1, 'numeros', 'Potência de 2', 'EF08MA01',
  '2⁴ é igual a 16.', true, '2 × 2 × 2 × 2 = 16.');
af(8, 1, 'numeros', 'Notação científica', 'EF08MA01',
  'O número 3.200 escrito em notação científica é 3,2 × 10³.', true, 'A vírgula anda três casas para a esquerda.');
af(8, 2, 'algebra', 'Solução de sistema', 'EF08MA08',
  'O par (2, 3) é solução do sistema x + y = 5 e x - y = -1.', true, '2 + 3 = 5 e 2 - 3 = -1: as duas equações são satisfeitas.');
af(8, 2, 'numeros', 'Fração geratriz', 'EF08MA05',
  'A dízima periódica 0,2525... tem fração geratriz 25/99.', true, 'O período tem dois algarismos, então o denominador é 99.');
af(8, 3, 'geometria', 'Retângulo e losango', 'EF08MA14',
  'Todo retângulo é um losango.', false, 'No losango os quatro lados são iguais; no retângulo apenas os lados opostos são.');
af(8, 3, 'dados', 'Mediana de uma lista', 'EF08MA25',
  'Na lista 2, 5, 9, 11 e 40, a mediana é 9.', true, 'A mediana é o valor central da lista ordenada; a média, essa sim, é puxada pelo 40.');
af(8, 4, 'algebra', 'Quadrado de uma soma', 'EF08MA06',
  '(x + 3)² é igual a x² + 9.', false, 'O desenvolvimento correto é x² + 6x + 9.');
af(8, 4, 'medidas', 'Litro e decímetro cúbico', 'EF08MA20',
  'Um litro equivale a 1 dm³.', true, '1 L = 1 dm³ = 1.000 cm³.');

af(9, 1, 'geometria', 'Triângulo retângulo', 'EF09MA13',
  'Um triângulo de lados 5, 12 e 13 é retângulo.', true, '5² + 12² = 25 + 144 = 169, que é 13².');
af(9, 1, 'numeros', 'Número irracional', 'EF09MA02',
  '√2 pode ser escrito como fração de dois números inteiros.', false, '√2 tem infinitas casas decimais não periódicas e não é fração de inteiros.');
af(9, 2, 'algebra', 'Percentuais sucessivos', 'EF09MA05',
  'Um aumento de 10% seguido de outro de 10% equivale a um aumento de 20%.', false, '1,10 × 1,10 = 1,21: o aumento total é de 21%.');
af(9, 2, 'algebra', 'Coeficiente angular', 'EF09MA06',
  'No gráfico de y = -4x + 2, os valores de y diminuem quando x aumenta.', true, 'O coeficiente angular -4 é negativo, então a função é decrescente.');
af(9, 3, 'dados', 'Espaço amostral de duas moedas', 'EF09MA20',
  'Lançar duas moedas e obter duas caras tem probabilidade 1/2.', false, 'O espaço amostral tem 4 resultados e apenas um é cara-cara, então a probabilidade é 1/4.');
af(9, 3, 'geometria', 'Semelhança de triângulos', 'EF09MA12',
  'Dois triângulos com os três ângulos iguais são semelhantes.', true, 'A igualdade dos ângulos correspondentes garante a proporcionalidade dos lados.');
af(9, 4, 'geometria', 'Ângulo inscrito', 'EF09MA11',
  'O ângulo inscrito em uma circunferência é o dobro do ângulo central do mesmo arco.', false, 'O ângulo inscrito mede a metade do ângulo central que subtende o mesmo arco.');
af(9, 4, 'medidas', 'Volume do cilindro e o raio', 'EF09MA19',
  'Dobrando o raio de um cilindro, o volume também dobra.', false, 'O raio entra ao quadrado na fórmula V = πr²h, então o volume quadruplica.');

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BANCO_ITENS: ITEMS, BANCO_AFIRMACOES: AFIRMACOES };
}
root.BANCO_ITENS = ITEMS;
root.BANCO_AFIRMACOES = AFIRMACOES;
})(typeof window !== 'undefined' ? window : globalThis);
