/* =========================================================
   CANDY MATH — mascote.js
   O Juba Candy desenhado, e a roupa que veste ele.

   Até aqui o mascote era um ícone de patinha dentro de um círculo, e
   "vestir" um item era pendurar outro ícone em cima. Não havia bicho
   nenhum, então não havia onde a roupa caber. Este arquivo desenha o
   personagem em SVG e desenha cada peça do catálogo no lugar do corpo
   onde ela realmente fica.

   Como as coordenadas funcionam
   -----------------------------
   Tudo é desenhado no mesmo sistema de coordenadas (viewBox 0 0 220 300).
   Nenhuma peça recebe transform de posicionamento: o chapéu já nasce em
   cima da cabeça, o sapato já nasce no pé. É isso que impede a roupa de
   desalinhar quando o mascote muda de tamanho — o desenho inteiro escala
   junto, e não camada por camada.

   Ordem de desenho (de trás para frente):
     sombra · cauda · capa/asas · cabelo de trás · corpo · calçado ·
     roupa · bandana · cabeça · cabelo da frente · chapéu · rosto · extra

   A bandana azul vem depois da roupa de propósito: ela é a marca do
   personagem e fica por cima de qualquer camiseta, como um lenço no
   pescoço fica por cima do casaco.

   API
   ---
   CM_MASCOTE.svg(equip, { corte: 'inteiro' | 'busto', titulo: '...' })
   CM_MASCOTE.assinatura(equip)  → chave de cache; muda quando a roupa muda
   ========================================================= */
(function (root) {
'use strict';

// ── Paleta do bicho ──────────────────────────────────────
// Tirada do desenho de referência: pelagem âmbar, mancha marrom, barriga
// creme e o lenço azul. As roupas usam a paleta da confeitaria (style.css).
const PELO       = '#F7A928';
const PELO_ALTO  = '#FFC85C';
const PELO_BAIXO = '#E08A16';
const MANCHA     = '#7A4A22';
const MANCHA_ESC = '#54301A';
const CREME      = '#FCEBCB';
const TINTA      = '#3B2412';
const BANDANA    = '#2F7FD4';
const BANDANA_ES = '#1F5FA8';
const NARIZ      = '#8C4A3C';
const LINGUA     = '#E8737D';
const ORELHA     = '#F2A3A3';
const TRACO      = 3.2;

// ── Primitivas de desenho ────────────────────────────────
function p(d, cor, extra) {
  return '<path d="' + d + '" fill="' + cor + '" stroke="' + TINTA +
    '" stroke-width="' + TRACO + '" stroke-linejoin="round" stroke-linecap="round"' +
    (extra || '') + '/>';
}
function semFio(d, cor, extra) {
  return '<path d="' + d + '" fill="' + cor + '"' + (extra || '') + '/>';
}
function fio(d, cor, largura) {
  return '<path d="' + d + '" fill="none" stroke="' + cor + '" stroke-width="' +
    (largura || TRACO) + '" stroke-linecap="round" stroke-linejoin="round"/>';
}
function c(cx, cy, r, cor, extra) {
  return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + cor +
    '" stroke="' + TINTA + '" stroke-width="' + TRACO + '"' + (extra || '') + '/>';
}
function bola(cx, cy, r, cor) {
  return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + cor + '"/>';
}
function e(cx, cy, rx, ry, cor, extra) {
  return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry +
    '" fill="' + cor + '" stroke="' + TINTA + '" stroke-width="' + TRACO + '"' + (extra || '') + '/>';
}
function oval(cx, cy, rx, ry, cor) {
  return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + cor + '"/>';
}
function q(x, y, l, a, raio, cor, extra) {
  return '<rect x="' + x + '" y="' + y + '" width="' + l + '" height="' + a +
    '" rx="' + raio + '" fill="' + cor + '" stroke="' + TINTA + '" stroke-width="' +
    TRACO + '"' + (extra || '') + '/>';
}
function barra(x, y, l, a, raio, cor) {
  return '<rect x="' + x + '" y="' + y + '" width="' + l + '" height="' + a +
    '" rx="' + raio + '" fill="' + cor + '"/>';
}
// Espelha um desenho em torno do eixo do corpo (x = 110).
function espelho(desenho) {
  return '<g transform="translate(220 0) scale(-1 1)">' + desenho + '</g>';
}
// Mancha irregular: um blob só, repetido em escala. Sem sorteio — o mesmo
// equipamento devolve sempre o mesmo bicho, quadro a quadro.
const MANCHA_D = 'M -5 -3 q 3 -4 7 -2 q 4 2 4 5 q 0 4 -4 4 q -6 1 -6 -1 q -2 -3 -1 -6 z';
function mancha(cx, cy, r, cor) {
  return '<path d="' + MANCHA_D + '" transform="translate(' + cx + ' ' + cy +
    ') scale(' + (r / 5.5).toFixed(3) + ')" fill="' + (cor || MANCHA) + '"/>';
}
function estrela(cx, cy, r, cor, extra) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const raio = i % 2 ? r * 0.44 : r;
    const ang = -Math.PI / 2 + i * Math.PI / 5;
    d += (i ? 'L' : 'M') + (cx + Math.cos(ang) * raio).toFixed(1) + ' ' +
      (cy + Math.sin(ang) * raio).toFixed(1) + ' ';
  }
  return p(d + 'Z', cor, extra);
}
function coracao(cx, cy, r, cor, extra) {
  const k = r / 10;
  return p('M ' + cx + ' ' + (cy + 8 * k) +
    ' q ' + (-11 * k) + ' ' + (-7 * k) + ' ' + (-8 * k) + ' ' + (-12 * k) +
    ' q ' + (2 * k) + ' ' + (-5 * k) + ' ' + (8 * k) + ' ' + (-1 * k) +
    ' q ' + (6 * k) + ' ' + (-4 * k) + ' ' + (8 * k) + ' ' + (1 * k) +
    ' q ' + (3 * k) + ' ' + (5 * k) + ' ' + (-8 * k) + ' ' + (12 * k) + ' z', cor, extra);
}

// ── O corpo ──────────────────────────────────────────────
const SOMBRA = oval(110, 292, 60, 7, 'rgba(59,36,18,0.14)');

const CAUDA =
  p('M 142 210 Q 178 220 188 198 Q 196 178 180 168 Q 172 164 168 172 Q 178 182 172 194 Q 164 208 140 200 Z', PELO) +
  mancha(178, 178, 6, MANCHA_ESC) + mancha(166, 200, 5, MANCHA);

const PERNAS =
  p('M 88 232 L 84 270 Q 84 280 96 280 L 104 280 Q 113 280 112 270 L 110 232 Z', PELO) +
  p('M 132 232 L 136 270 Q 136 280 124 280 L 116 280 Q 107 280 108 270 L 110 232 Z', PELO) +
  mancha(94, 250, 4.5) + mancha(126, 250, 4.5) +
  e(94, 282, 17, 9, CREME) + e(126, 282, 17, 9, CREME) +
  fio('M 88 279 L 88 285 M 94 279 L 94 286 M 100 279 L 100 285', TINTA, 1.8) +
  fio('M 120 279 L 120 285 M 126 279 L 126 286 M 132 279 L 132 285', TINTA, 1.8);

const BRACOS =
  p('M 78 156 Q 60 166 57 194 L 55 214 Q 54 230 68 230 Q 81 230 81 215 L 83 188 Z', PELO) +
  p('M 142 156 Q 160 166 163 194 L 165 214 Q 166 230 152 230 Q 139 230 139 215 L 137 188 Z', PELO) +
  mancha(66, 186, 5) + mancha(154, 186, 5) +
  oval(67, 222, 9, 6, CREME) + oval(153, 222, 9, 6, CREME);

const TRONCO =
  p('M 80 148 Q 72 152 72 170 L 74 226 Q 74 240 90 240 L 130 240 Q 146 240 146 226 L 148 170 Q 148 152 140 148 Z', PELO) +
  oval(110, 198, 25, 35, CREME) +
  mancha(82, 172, 5) + mancha(138, 172, 5) + mancha(84, 214, 4.5) + mancha(136, 214, 4.5);

const CORPO = PERNAS + TRONCO + BRACOS;

const BANDANA_DESENHO =
  p('M 76 146 Q 110 162 144 146 L 141 164 Q 110 178 79 164 Z', BANDANA) +
  p('M 88 168 L 132 168 L 110 198 Z', BANDANA) +
  semFio('M 110 168 L 132 168 L 110 198 Z', BANDANA_ES) +
  fio('M 110 168 L 110 198', BANDANA_ES, 2) +
  p('M 78 148 L 60 140 L 64 156 L 54 164 L 78 164 Z', BANDANA) +
  fio('M 66 150 L 74 156', BANDANA_ES, 2);

const CABECA =
  // orelhas
  c(70, 50, 21, PELO) + c(150, 50, 21, PELO) +
  bola(70, 53, 11, ORELHA) + bola(150, 53, 11, ORELHA) +
  // crânio
  e(110, 94, 57, 52, PELO) +
  oval(110, 74, 44, 26, PELO_ALTO) +
  mancha(86, 62, 6) + mancha(110, 55, 5.5) + mancha(134, 62, 6) +
  mancha(66, 86, 5) + mancha(154, 86, 5) +
  mancha(74, 112, 4.5) + mancha(146, 112, 4.5) +
  mancha(97, 74, 4) + mancha(123, 74, 4) +
  // focinho
  semFio('M 74 112 Q 74 142 110 142 Q 146 142 146 112 Q 146 99 128 99 Q 117 99 110 108 Q 103 99 92 99 Q 74 99 74 112 Z', CREME) +
  // olhos
  e(89, 90, 12, 13, '#FFFFFF') + e(131, 90, 12, 13, '#FFFFFF') +
  bola(91, 92, 7.5, TINTA) + bola(129, 92, 7.5, TINTA) +
  bola(94, 88, 2.8, '#FFFFFF') + bola(132, 88, 2.8, '#FFFFFF') +
  // nariz e boca
  semFio('M 100 106 Q 110 100 120 106 Q 120 116 110 121 Q 100 116 100 106 Z', NARIZ) +
  fio('M 110 121 L 110 127', TINTA, 2.6) +
  semFio('M 96 127 Q 110 145 124 127 Q 110 133 96 127 Z', NARIZ) +
  semFio('M 104 133 Q 110 141 116 133 Q 110 137 104 133 Z', LINGUA) +
  fio('M 96 127 Q 110 145 124 127', TINTA, 2.4) +
  // bigodes
  fio('M 78 118 L 62 114 M 78 124 L 62 126 M 142 118 L 158 114 M 142 124 L 158 126', TINTA, 1.6);

// ── Chapéus ──────────────────────────────────────────────
const CHAPEUS = {
  hat_crown: function () {
    return p('M 82 46 L 86 18 L 98 32 L 110 10 L 122 32 L 134 18 L 138 46 Z', '#FFD93D') +
      q(80, 42, 60, 12, 4, '#EFC02E') +
      bola(110, 26, 3.6, '#FF6B9D') + bola(88, 36, 3, '#4ECDC4') + bola(132, 36, 3, '#9B5DE5');
  },
  hat_party: function () {
    return p('M 110 -8 L 134 46 L 86 46 Z', '#FF6B9D') +
      semFio('M 101 16 L 119 16 L 123 26 L 97 26 Z', '#FFD93D') +
      semFio('M 93 36 L 127 36 L 131 44 L 89 44 Z', '#4ECDC4') +
      fio('M 110 -8 L 134 46 L 86 46 Z', TINTA, TRACO) +
      c(110, -10, 7, '#FFD93D');
  },
  hat_chef: function () {
    return p('M 80 46 L 80 34 Q 66 32 66 20 Q 66 8 80 8 Q 86 -2 100 -2 Q 112 -2 118 6 Q 134 2 140 14 Q 148 22 142 32 L 140 46 Z', '#FFFFFF') +
      q(78, 38, 64, 15, 5, '#F4F1EA') +
      fio('M 96 14 L 96 32 M 110 10 L 110 32 M 124 14 L 124 32', '#DCD5C8', 2.4);
  },
  hat_cowboy: function () {
    return e(110, 46, 58, 13, '#C98A3E') +
      p('M 84 46 Q 86 12 110 12 Q 134 12 136 46 Z', '#E0A458') +
      q(84, 34, 52, 10, 4, '#8A5A2B') +
      fio('M 96 18 Q 110 24 124 18', '#C98A3E', 2.4);
  },
  hat_hero: function () {
    // A aba para em y = 74: o olho começa em 77. Capacete que desce sobre
    // o olho deixa o mascote sem expressão.
    return p('M 58 66 Q 58 16 110 16 Q 162 16 162 66 Z', '#9B5DE5') +
      q(58, 62, 104, 12, 5, '#7B3FD1') +
      semFio('M 84 30 Q 100 22 112 26 L 106 38 Q 94 36 86 42 Z', '#C9A6F2') +
      estrela(110, 46, 11, '#FFD93D');
  },
  hat_santa: function () {
    return p('M 78 40 Q 84 4 118 2 Q 152 0 160 22 Q 150 28 138 24 Q 118 20 106 40 Z', '#3DBBFF') +
      semFio('M 96 22 Q 118 12 140 16 L 138 24 Q 118 20 106 34 Z', '#8FD9FF') +
      fio('M 78 40 Q 84 4 118 2 Q 152 0 160 22', TINTA, TRACO) +
      c(162, 24, 9, '#FFFFFF') +
      q(72, 36, 76, 15, 7, '#FFFFFF');
  },
  hat_cap: function () {
    return p('M 148 48 Q 182 48 186 62 Q 168 68 148 60 Z', '#E03A48') +
      p('M 66 50 Q 66 16 110 16 Q 154 16 154 50 Z', '#FF4757') +
      semFio('M 88 22 Q 104 16 118 20 Q 108 30 100 46 L 84 46 Q 84 32 88 22 Z', '#FFFFFF') +
      fio('M 66 50 Q 66 16 110 16 Q 154 16 154 50', TINTA, TRACO) +
      q(64, 46, 92, 11, 5, '#FFFFFF') +
      c(110, 16, 5, '#FFD93D');
  },
};

// ── Máscaras (rosto, não cabeça) ─────────────────────────
// Ficaram no slot `hat` no catálogo antigo e cobriam os olhos de cima do
// chapéu. Aqui têm slot próprio: a máscara veste o rosto, o chapéu veste
// a cabeça, e os dois podem coexistir sem brigar pelo mesmo lugar.
function furoDeOlho(cx) {
  return 'M ' + (cx - 13) + ' 90 a 13 13 0 1 0 26 0 a 13 13 0 1 0 -26 0 Z ';
}
const MASCARAS = {
  hat_mascara: function () {
    return p('M 66 80 Q 110 66 154 80 Q 156 102 138 105 Q 122 107 110 98 Q 98 107 82 105 Q 64 102 66 80 Z ' +
      furoDeOlho(89) + furoDeOlho(131), '#3DBBFF', ' fill-rule="evenodd"') +
      fio('M 74 78 Q 110 68 146 78', '#8FD9FF', 2.6);
  },
  hat_rosto: function () {
    return p('M 148 70 Q 168 46 176 24 Q 156 34 146 60 Z', '#FFD93D') +
      p('M 62 80 Q 110 66 158 80 Q 158 102 138 106 Q 120 109 110 98 Q 100 109 82 106 Q 62 102 62 80 Z ' +
      furoDeOlho(89) + furoDeOlho(131), '#FF4757', ' fill-rule="evenodd"') +
      bola(110, 78, 3.4, '#FFD93D') +
      fio('M 70 86 Q 76 82 82 86 M 138 86 Q 144 82 150 86', '#FFD93D', 2.2);
  },
};

// ── Óculos ───────────────────────────────────────────────
// Todos apoiados no focinho, na altura dos olhos (y = 90). A lente é
// translúcida de propósito: óculos que tapam o olho inteiro viram olho
// de estrela, e o bicho perde a cara. O aro é opaco, o vidro não.
const VIDRO = ' fill-opacity="0.45"';
function armacao(cor) {
  return fio('M 104 88 Q 110 83 116 88', cor || TINTA, 3) +
    fio('M 74 86 L 60 82 M 146 86 L 160 82', cor || TINTA, 2.6);
}
const OCULOS = {
  glass_star: function () {
    return estrela(89, 90, 18, '#FFD93D', VIDRO) + estrela(131, 90, 18, '#FFD93D', VIDRO) + armacao('#EFC02E');
  },
  glass_heart: function () {
    return coracao(89, 90, 17, '#FF6B9D', VIDRO) + coracao(131, 90, 17, '#FF6B9D', VIDRO) + armacao('#FF4D8F');
  },
  glass_sun: function () {
    return p('M 78 102 L 100 102 L 89 120 Z', '#E0A458') + p('M 120 102 L 142 102 L 131 120 Z', '#E0A458') +
      c(89, 88, 15, '#4ECDC4', VIDRO) + c(131, 88, 15, '#9FD9FF', VIDRO) + armacao('#2FA79E');
  },
  glass_rain: function () {
    return fio('M 72 78 Q 110 44 148 78', '#FF4757', 5) +
      fio('M 78 78 Q 110 52 142 78', '#FFD93D', 5) +
      fio('M 84 78 Q 110 60 136 78', '#6BCB77', 5) +
      c(89, 94, 13, '#9B5DE5', VIDRO) + c(131, 94, 13, '#3DBBFF', VIDRO) +
      armacao('#9B5DE5');
  },
  glass_donut: function () {
    return p('M 89 73 a 17 17 0 1 0 0.1 0 Z M 89 84 a 6 6 0 1 1 -0.1 0 Z', '#FF9A3C', ' fill-rule="evenodd" fill-opacity="0.72"') +
      p('M 131 73 a 17 17 0 1 0 0.1 0 Z M 131 84 a 6 6 0 1 1 -0.1 0 Z', '#FF6B9D', ' fill-rule="evenodd" fill-opacity="0.72"') +
      fio('M 79 81 L 83 79 M 95 77 L 99 79 M 121 81 L 125 79 M 137 77 L 141 79', '#FFFFFF', 2.2) +
      armacao('#C9761E');
  },
  glass_choco: function () {
    return p('M 89 74 Q 104 84 104 94 Q 104 106 89 106 Q 74 106 74 94 Q 74 84 89 74 Z', '#7B4B2A', VIDRO) +
      p('M 131 74 Q 146 84 146 94 Q 146 106 131 106 Q 116 106 116 94 Q 116 84 131 74 Z', '#7B4B2A', VIDRO) +
      semFio('M 82 104 Q 84 116 88 116 Q 92 116 90 104 Z', '#7B4B2A') +
      semFio('M 126 104 Q 128 114 132 114 Q 136 114 134 104 Z', '#7B4B2A') +
      armacao('#5A3418');
  },
  glass_floss: function () {
    return p('M 74 94 Q 68 94 68 87 Q 68 80 76 80 Q 78 72 88 72 Q 98 72 101 80 Q 108 82 106 90 Q 104 96 96 96 Z', '#FF6B9D', VIDRO) +
      p('M 116 94 Q 110 94 110 87 Q 110 80 118 80 Q 120 72 130 72 Q 140 72 143 80 Q 150 82 148 90 Q 146 96 138 96 Z', '#FF6B9D', VIDRO) +
      armacao('#FF4D8F');
  },
  glass_lolly: function () {
    return c(89, 90, 16, '#6BCB77', VIDRO) + c(131, 90, 16, '#6BCB77', VIDRO) +
      fio('M 89 90 q 6 -2 6 -8 q 0 -8 -9 -8 q -11 0 -11 12 q 0 13 14 13', '#FFFFFF', 2.6) +
      fio('M 131 90 q 6 -2 6 -8 q 0 -8 -9 -8 q -11 0 -11 12 q 0 13 14 13', '#FFFFFF', 2.6) +
      armacao('#3E9B4C');
  },
};

// ── Perucas ──────────────────────────────────────────────
// Cada penteado tem parte de trás (cai sobre os ombros) e da frente
// (cobre a testa). Sem a divisão, o cabelo comprido passava por cima do
// rosto ou ficava atrás da cabeça inteira.
const PERUCAS = {
  wig_franja: {
    tras: '',
    frente: function () {
      return p('M 58 70 Q 60 34 110 32 Q 160 34 162 70 Q 150 54 138 64 Q 126 50 110 62 Q 94 50 82 64 Q 70 54 58 70 Z', '#7B4B2A') +
        fio('M 86 42 L 84 62 M 110 38 L 110 60 M 134 42 L 136 62', '#5A3418', 2.2);
    },
  },
  wig_curta: {
    tras: '',
    frente: function () {
      return p('M 56 76 Q 52 40 76 30 Q 84 14 110 16 Q 136 14 144 30 Q 168 40 164 76 Q 156 62 146 68 Q 138 52 126 60 Q 116 46 104 58 Q 92 48 84 64 Q 70 58 56 76 Z', '#3A2A4D') +
        fio('M 78 40 q 8 -6 14 2 M 108 32 q 8 -6 14 2 M 136 42 q 8 -6 14 2', '#5C4675', 2.4);
    },
  },
  wig_longa: {
    tras: function () {
      const lado = p('M 56 66 Q 40 130 50 196 Q 62 210 76 198 Q 62 136 70 72 Z', '#FF9A3C') +
        fio('M 56 100 Q 50 140 56 180', '#E0761E', 2.4);
      return lado + espelho(lado);
    },
    frente: function () {
      return p('M 56 74 Q 58 32 110 30 Q 162 32 164 74 Q 152 56 138 66 Q 124 50 110 60 Q 96 50 82 66 Q 68 56 56 74 Z', '#FF9A3C') +
        fio('M 90 40 Q 86 54 88 64 M 130 40 Q 134 54 132 64', '#E0761E', 2.2);
    },
  },
  wig_coque: {
    tras: function () { return c(110, 12, 19, '#9B5DE5') + fio('M 98 6 q 12 8 24 0', '#7B3FD1', 2.4); },
    frente: function () {
      return p('M 58 72 Q 60 34 110 32 Q 160 34 162 72 Q 150 50 110 48 Q 70 50 58 72 Z', '#9B5DE5') +
        fio('M 76 52 Q 110 40 144 52', '#7B3FD1', 2.4) +
        q(96, 26, 28, 9, 4, '#FF6B9D');
    },
  },
  wig_trancas: {
    tras: function () {
      const lado = p('M 62 74 Q 50 106 52 148 Q 52 164 62 164 Q 72 164 72 148 Q 70 108 76 78 Z', '#8C4A2F') +
        fio('M 53 96 L 71 104 M 52 116 L 71 124 M 52 136 L 71 144', '#5E2E1B', 2.4) +
        q(50, 156, 24, 10, 5, '#FF6B9D');
      return lado + espelho(lado);
    },
    frente: function () {
      return p('M 58 70 Q 60 32 110 30 Q 160 32 162 70 Q 148 52 110 50 Q 72 52 58 70 Z', '#8C4A2F') +
        fio('M 110 32 L 110 52', '#5E2E1B', 2.4);
    },
  },
  wig_cavalinho: {
    tras: function () {
      return p('M 132 30 Q 176 18 186 52 Q 194 84 172 96 Q 160 102 156 92 Q 174 82 172 60 Q 168 36 134 44 Z', '#FF6B9D') +
        fio('M 160 40 Q 178 52 174 76', '#E0447A', 2.4);
    },
    frente: function () {
      return p('M 58 72 Q 60 34 110 32 Q 160 34 162 72 Q 148 52 110 50 Q 72 52 58 72 Z', '#FF6B9D') +
        q(122, 24, 22, 11, 5, '#FFD93D') +
        fio('M 78 54 Q 110 42 142 54', '#E0447A', 2.4);
    },
  },
};

// ── Roupas ───────────────────────────────────────────────
// Formas base: camiseta (manga curta), vestido (saia rodada), calça e
// capa. As fantasias partem delas e acrescentam o que as distingue.
const MOLDE_CAMISETA = 'M 78 150 L 92 146 Q 110 158 128 146 L 142 150 L 152 178 L 138 184 L 140 238 Q 110 246 80 238 L 82 184 L 68 178 Z';
const MOLDE_VESTIDO  = 'M 78 150 L 92 146 Q 110 158 128 146 L 142 150 L 152 178 L 138 184 L 156 254 Q 110 268 64 254 L 82 184 L 68 178 Z';
const MOLDE_LONGO    = 'M 78 150 L 92 146 Q 110 158 128 146 L 142 150 L 152 178 L 138 184 L 166 276 Q 110 290 54 276 L 82 184 L 68 178 Z';
const MOLDE_CALCA    = 'M 80 212 L 140 212 L 142 270 L 116 270 L 110 238 L 104 270 L 78 270 Z';

function camiseta(cor, detalhe) { return p(MOLDE_CAMISETA, cor) + (detalhe || ''); }
function vestido(cor, detalhe)  { return p(MOLDE_VESTIDO, cor) + (detalhe || ''); }
function gola(cor) { return fio('M 92 148 Q 110 160 128 148', cor, 3); }

const ROUPAS = {
  out_apron: function () {
    return camiseta('#F4F1EA') +
      p('M 92 160 L 128 160 L 134 238 Q 110 246 86 238 Z', '#FF6B9D') +
      fio('M 96 160 L 104 148 M 124 160 L 116 148', '#FF6B9D', 4) +
      q(98, 196, 24, 20, 4, '#FFD3E4') +
      bola(104, 186, 3, '#FFD93D') + bola(116, 186, 3, '#4ECDC4');
  },
  out_cape: function () {
    return camiseta('#9B5DE5') + estrela(110, 196, 14, '#FFD93D') + gola('#7B3FD1');
  },
  out_tuxedo: function () {
    return camiseta('#3A2A4D') +
      p('M 96 150 L 110 176 L 124 150 L 118 240 L 102 240 Z', '#FFFFFF') +
      p('M 96 150 L 110 176 L 92 196 L 84 156 Z', '#241A2F') +
      p('M 124 150 L 110 176 L 128 196 L 136 156 Z', '#241A2F') +
      p('M 100 158 L 110 164 L 120 158 L 120 170 L 110 164 L 100 170 Z', '#FF4757') +
      bola(110, 208, 3, '#FFD93D') + bola(110, 224, 3, '#FFD93D');
  },
  out_wizard: function () {
    return p(MOLDE_LONGO, '#9B5DE5') +
      semFio('M 110 150 L 128 146 L 142 150 L 152 178 L 138 184 L 148 260 L 110 268 Z', '#7B3FD1') +
      fio('M 110 152 L 110 272', '#5E2CA8', 2.6) +
      estrela(92, 196, 9, '#FFD93D') + estrela(130, 224, 8, '#FFD93D') +
      estrela(84, 248, 7, '#FFD93D') +
      q(78, 206, 64, 10, 4, '#FFD93D');
  },
  shirt_mais: function () {
    return camiseta('#FF4757') + gola('#D62F3E') +
      fio('M 96 190 L 116 190 M 106 180 L 106 200', '#FFFFFF', 5) +
      fio('M 100 218 L 120 218', '#FFD93D', 5);
  },
  shirt_mult: function () {
    return camiseta('#3DBBFF') + gola('#1E8FD1') +
      fio('M 96 182 L 114 200 M 114 182 L 96 200', '#FFFFFF', 5) +
      fio('M 104 218 L 124 218', '#FFD93D', 4) +
      bola(114, 210, 3, '#FFD93D') + bola(114, 226, 3, '#FFD93D');
  },
  shirt_igual: function () {
    return camiseta('#6BCB77') + gola('#3E9B4C') +
      fio('M 94 188 L 126 188 M 94 204 L 126 204', '#FFFFFF', 6);
  },
  shirt_pct: function () {
    return camiseta('#FF9A3C') + gola('#D9761E') +
      fio('M 96 214 L 124 180', '#FFFFFF', 5) +
      '<circle cx="98" cy="184" r="7" fill="none" stroke="#FFFFFF" stroke-width="4"/>' +
      '<circle cx="122" cy="212" r="7" fill="none" stroke="#FFFFFF" stroke-width="4"/>';
  },
  pants_confe: function () {
    return p(MOLDE_CALCA, '#FF6B9D') + q(78, 206, 64, 12, 4, '#E0447A') +
      bola(92, 234, 4, '#FFD93D') + bola(100, 252, 3.4, '#4ECDC4') +
      bola(128, 234, 4, '#6BCB77') + bola(122, 254, 3.4, '#3DBBFF');
  },
  pants_tabua: function () {
    return p(MOLDE_CALCA, '#9B5DE5') + q(78, 206, 64, 12, 4, '#7B3FD1') +
      fio('M 86 224 L 106 224 M 86 236 L 106 236 M 86 248 L 106 248 M 86 260 L 104 260', '#FFD93D', 2.4) +
      fio('M 114 224 L 134 224 M 114 236 L 134 236 M 114 248 L 134 248 M 116 260 L 134 260', '#FFD93D', 2.4);
  },
  vest_doce: function () {
    return camiseta('#F4F1EA') +
      p('M 80 150 L 96 148 L 110 178 L 124 148 L 140 150 L 142 238 Q 110 246 78 238 Z', '#FF4757') +
      semFio('M 96 148 L 110 178 L 124 148 L 118 152 L 110 168 L 102 152 Z', '#F4F1EA') +
      fio('M 110 178 L 110 240', '#D62F3E', 2.6) +
      bola(110, 196, 3, '#FFD93D') + bola(110, 214, 3, '#FFD93D');
  },
  dress_mor:  function () { return vestido('#FF4757', '#FFF'); },
  dress_uva:  function () { return vestido('#9B5DE5'); },
  dress_lima: function () { return vestido('#6BCB77'); },
  dress_azul: function () { return vestido('#3DBBFF'); },
  dress_mel:  function () { return vestido('#6BCB77'); },
};
// Detalhes que diferenciam os vestidos de fruta — sem eles os cinco eram
// o mesmo desenho pintado de outra cor.
ROUPAS.dress_mor = function () {
  return vestido('#FF4757') + gola('#D62F3E') +
    bola(96, 214, 3, '#FFD93D') + bola(112, 226, 3, '#FFD93D') + bola(128, 210, 3, '#FFD93D') +
    bola(88, 238, 3, '#FFD93D') + bola(124, 242, 3, '#FFD93D') +
    p('M 100 148 Q 110 140 120 148 Q 110 154 100 148 Z', '#6BCB77');
};
ROUPAS.dress_uva = function () {
  return vestido('#9B5DE5') + gola('#7B3FD1') +
    bola(98, 212, 5, '#C9A6F2') + bola(110, 222, 5, '#C9A6F2') + bola(122, 212, 5, '#C9A6F2') +
    bola(104, 234, 5, '#C9A6F2') + bola(116, 234, 5, '#C9A6F2') +
    fio('M 110 200 L 110 190', '#6BCB77', 3);
};
ROUPAS.dress_lima = function () {
  return vestido('#6BCB77') + gola('#3E9B4C') +
    fio('M 110 206 L 110 240 M 94 214 L 126 232 M 126 214 L 94 232', '#EAFFF0', 3) +
    '<circle cx="110" cy="223" r="17" fill="none" stroke="#EAFFF0" stroke-width="3"/>';
};
ROUPAS.dress_azul = function () {
  return vestido('#3DBBFF') + gola('#1E8FD1') +
    bola(96, 216, 4.5, '#1E5FA8') + bola(114, 226, 4.5, '#1E5FA8') +
    bola(126, 210, 4.5, '#1E5FA8') + bola(88, 240, 4.5, '#1E5FA8') +
    bola(122, 244, 4.5, '#1E5FA8');
};
ROUPAS.dress_mel = function () {
  return vestido('#6BCB77') + gola('#3E9B4C') +
    semFio('M 74 232 Q 110 244 146 232 L 152 252 Q 110 264 68 252 Z', '#FF4757') +
    fio('M 74 232 Q 110 244 146 232', TINTA, 2.4) +
    bola(90, 246, 2.6, TINTA) + bola(110, 250, 2.6, TINTA) + bola(130, 246, 2.6, TINTA);
};

// ── Conjuntos: fantasia inteira ──────────────────────────
const CONJUNTOS = {
  look_aracnideo: function () {
    return p(MOLDE_CAMISETA, '#FF4757') +
      semFio('M 82 184 L 138 184 L 140 238 Q 110 246 80 238 Z', '#1E5FA8') +
      fio('M 110 152 L 110 184 M 88 158 L 110 176 M 132 158 L 110 176 M 84 176 L 136 176', '#8C1F2A', 2) +
      fio('M 96 162 Q 110 172 124 162 M 92 172 Q 110 184 128 172', '#8C1F2A', 1.8) +
      p('M 104 190 L 116 190 L 120 202 L 110 214 L 100 202 Z', TINTA);
  },
  look_armadura: function () {
    return p(MOLDE_CAMISETA, '#FF4757') +
      q(78, 150, 64, 26, 8, '#FF9A3C') +
      semFio('M 82 184 L 138 184 L 140 238 Q 110 246 80 238 Z', '#E03A48') +
      q(84, 200, 52, 14, 6, '#FFD93D') +
      c(110, 186, 11, '#9FD9FF') + bola(110, 186, 5, '#FFFFFF') +
      fio('M 86 224 L 134 224', '#FF9A3C', 3);
  },
  look_colosso: function () {
    return p(MOLDE_CAMISETA, '#6BCB77') +
      semFio('M 82 184 L 138 184 L 140 238 Q 110 246 80 238 Z', '#4EA85C') +
      fio('M 96 160 Q 110 172 124 160', '#3E9B4C', 3) +
      p(MOLDE_CALCA, '#9B5DE5') +
      semFio('M 78 258 L 104 258 L 104 270 L 78 270 Z', PELO) +
      semFio('M 116 258 L 142 258 L 142 270 L 116 270 Z', PELO) +
      fio('M 78 258 L 104 258 M 116 258 L 142 258', TINTA, 2.4);
  },
  look_motoqueiro: function () {
    return p(MOLDE_CAMISETA, '#3A2A4D') +
      p('M 96 150 L 110 174 L 92 192 L 82 156 Z', '#241A2F') +
      p('M 124 150 L 110 174 L 128 192 L 138 156 Z', '#241A2F') +
      fio('M 110 174 L 116 240', '#C9C4D4', 3) +
      q(78, 224, 64, 12, 4, '#241A2F') +
      q(102, 226, 16, 8, 3, '#FFD93D') +
      fio('M 86 196 L 96 196', '#C9C4D4', 2.6);
  },
  look_xerife: function () {
    return camiseta('#F4F1EA') +
      p('M 80 150 L 98 148 L 110 176 L 122 148 L 140 150 L 142 238 Q 110 246 78 238 Z', '#D9A05B') +
      semFio('M 98 148 L 110 176 L 122 148 L 116 152 L 110 166 L 104 152 Z', '#F4F1EA') +
      estrela(94, 190, 11, '#FFD93D') +
      q(78, 222, 64, 13, 4, '#8A5A2B') + q(102, 224, 18, 9, 3, '#FFD93D');
  },
  look_ninja: function () {
    return p(MOLDE_CAMISETA, '#241A2F') +
      semFio('M 82 184 L 138 184 L 140 238 Q 110 246 80 238 Z', '#1A1222') +
      fio('M 92 150 L 110 178 L 128 150', '#4A3A5C', 3) +
      q(78, 208, 64, 14, 4, '#FF4757') +
      estrela(110, 215, 9, '#FFD93D');
  },
  look_neve: function () {
    return p(MOLDE_LONGO, '#9FD9FF') +
      semFio('M 110 150 L 128 146 L 142 150 L 152 178 L 138 184 L 166 276 L 110 284 Z', '#7FC4F2') +
      fio('M 110 152 L 110 280', '#5AA8DC', 2.4) +
      fio('M 92 200 L 92 220 M 82 210 L 102 210 M 85 203 L 99 217 M 99 203 L 85 217', '#FFFFFF', 2.6) +
      fio('M 128 240 L 128 258 M 119 249 L 137 249', '#FFFFFF', 2.4) +
      q(88, 176, 44, 10, 5, '#FFFFFF');
  },
  look_baile: function () {
    return p(MOLDE_LONGO, '#3DBBFF') +
      semFio('M 110 150 L 128 146 L 142 150 L 152 178 L 138 184 L 166 276 L 110 284 Z', '#2A9FE0') +
      q(84, 178, 52, 12, 6, '#FFD93D') +
      fio('M 70 264 Q 110 276 150 264', '#FFFFFF', 3) +
      fio('M 62 276 Q 110 290 158 276', '#FFFFFF', 3) +
      bola(96, 220, 3, '#FFFFFF') + bola(126, 240, 3, '#FFFFFF') + bola(104, 258, 3, '#FFFFFF');
  },
  look_rosa: function () {
    return p(MOLDE_LONGO, '#FFD93D') +
      semFio('M 110 150 L 128 146 L 142 150 L 152 178 L 138 184 L 166 276 L 110 284 Z', '#EFC02E') +
      q(84, 178, 52, 12, 6, '#6BCB77') +
      c(110, 214, 11, '#FF4757') + fio('M 110 214 q 6 -3 6 -8 q -8 -2 -10 6', '#D62F3E', 2) +
      fio('M 110 225 L 110 244', '#3E9B4C', 3) +
      p('M 110 236 Q 124 232 126 242 Q 114 246 110 236 Z', '#6BCB77');
  },
  look_gata: function () {
    return vestido('#4ECDC4') + gola('#2FA79E') +
      q(84, 180, 52, 11, 5, '#FFFFFF') +
      p('M 96 152 L 110 162 L 124 152 L 124 170 L 110 162 L 96 170 Z', '#FF6B9D') +
      bola(110, 162, 4, '#FFD93D') +
      fio('M 72 246 Q 110 258 148 246', '#FFFFFF', 3);
  },
  look_boneca: function () {
    return p(MOLDE_VESTIDO, '#FF6B9D') +
      semFio('M 74 226 Q 110 240 146 226 L 156 254 Q 110 268 64 254 Z', '#FFD3E4') +
      fio('M 74 226 Q 110 240 146 226', TINTA, 2.4) +
      p('M 96 158 L 124 158 L 128 214 Q 110 222 92 214 Z', '#FFFFFF') +
      fio('M 100 158 L 104 148 M 120 158 L 116 148', '#FFFFFF', 3.4) +
      q(86, 180, 48, 10, 5, '#FF4757') +
      bola(94, 238, 3, '#FFD93D') + bola(110, 244, 3, '#FFD93D') + bola(126, 238, 3, '#FFD93D');
  },
  look_fada: function () {
    return vestido('#C9A6F2') + gola('#9B5DE5') +
      semFio('M 70 240 Q 110 254 150 240 L 156 254 Q 110 268 64 254 Z', '#EADEFA') +
      fio('M 70 240 Q 110 254 150 240', TINTA, 2.4) +
      estrela(96, 190, 8, '#FFD93D') + estrela(124, 208, 7, '#FFD93D') +
      estrela(88, 226, 6, '#FFFFFF');
  },
  look_cupcake: function () {
    return p('M 78 150 L 92 146 Q 110 158 128 146 L 142 150 L 150 190 Q 110 202 70 190 Z', '#FF6B9D') +
      semFio('M 70 190 Q 82 178 94 190 Q 106 178 118 190 Q 130 178 142 190 Q 148 182 150 190 Q 110 202 70 190 Z', '#FFD3E4') +
      p('M 72 196 L 148 196 L 156 256 Q 110 268 64 256 Z', '#E0A458') +
      fio('M 88 198 L 82 258 M 110 200 L 110 264 M 132 198 L 138 258', '#B5732F', 2.6) +
      c(110, 146, 8, '#FF4757') + fio('M 110 138 Q 114 128 122 128', '#3E9B4C', 2.6);
  },
  look_sorvete: function () {
    return camiseta('#F4F1EA') +
      c(94, 162, 13, '#FF6B9D') + c(126, 162, 13, '#9FD9FF') + c(110, 152, 13, '#FFD93D') +
      p('M 74 190 L 146 190 L 154 256 Q 110 268 66 256 Z', '#E0A458') +
      fio('M 78 200 L 150 232 M 78 220 L 146 252 M 142 200 L 74 232 M 146 220 L 78 252', '#B5732F', 2.2);
  },
  look_chocolate: function () {
    return p(MOLDE_CAMISETA, '#7B4B2A') +
      semFio('M 78 150 L 92 146 Q 110 158 128 146 L 142 150 L 150 176 Q 138 190 126 176 Q 114 192 102 176 Q 90 190 78 176 Z', '#F4F1EA') +
      fio('M 78 176 Q 90 190 102 176 Q 114 192 126 176 Q 138 190 150 176', TINTA, 2.4) +
      q(84, 206, 52, 14, 6, '#5A3418') +
      bola(96, 196, 3.4, '#F4F1EA') + bola(124, 198, 3.4, '#F4F1EA');
  },
  look_bala: function () {
    return p('M 76 168 Q 110 152 144 168 Q 156 200 144 232 Q 110 248 76 232 Q 64 200 76 168 Z', '#FF4757') +
      semFio('M 84 176 Q 100 166 112 172 Q 100 184 92 204 Q 82 196 84 176 Z', '#FF8A94') +
      p('M 76 176 L 54 164 L 60 186 L 52 202 L 76 196 Z', '#FFD93D') +
      p('M 144 176 L 166 164 L 160 186 L 168 202 L 144 196 Z', '#FFD93D') +
      fio('M 96 214 Q 110 222 124 214', '#FFFFFF', 2.6);
  },
};

// ── Calçados ─────────────────────────────────────────────
// O pé do mascote está em y 273..291, centrado em x 94 e x 126. Todo
// calçado é desenhado para esse par e repetido por espelhamento.
function parCalcados(desenho) { return desenho + espelho(desenho); }
function salto(cor, corSola) {
  return parCalcados(
    p('M 78 270 Q 84 262 96 262 Q 110 262 112 276 L 112 284 Q 112 288 104 288 L 82 288 Q 76 288 76 282 Z', cor) +
    p('M 86 288 L 96 288 L 94 298 L 88 298 Z', corSola) +
    fio('M 80 274 Q 94 268 108 274', corSola, 2.4));
}
function tenis(cor, corSola, cadarco) {
  return parCalcados(
    p('M 76 266 L 108 266 L 112 282 Q 112 288 104 288 L 80 288 Q 74 288 74 280 Z', cor) +
    q(72, 282, 42, 9, 4, corSola) +
    fio('M 84 270 L 96 274 M 84 276 L 96 280', cadarco, 2.2));
}
function croc(cor, corSola) {
  return parCalcados(
    p('M 74 268 Q 74 262 84 262 L 106 262 Q 114 264 114 276 L 114 282 Q 114 288 106 288 L 80 288 Q 74 288 74 282 Z', cor) +
    q(72, 282, 44, 8, 4, corSola) +
    bola(84, 272, 2.6, corSola) + bola(94, 270, 2.6, corSola) + bola(104, 272, 2.6, corSola) +
    fio('M 76 266 Q 88 258 100 264', cor, 3.4));
}
function botina(cor, corSola, cano) {
  return parCalcados(
    p('M 78 ' + cano + ' L 108 ' + cano + ' L 112 282 Q 112 288 104 288 L 80 288 Q 74 288 74 280 Z', cor) +
    q(72, 282, 42, 9, 4, corSola) +
    fio('M 80 ' + (cano + 6) + ' L 106 ' + (cano + 6), corSola, 2.4));
}
const CALCADOS = {
  shoe_heel_morango:    function () { return salto('#FF4757', '#D62F3E'); },
  shoe_heel_uva:        function () { return salto('#9B5DE5', '#7B3FD1'); },
  shoe_heel_menta:      function () { return salto('#4ECDC4', '#2FA79E'); },
  shoe_heel_caramelo:   function () { return salto('#FF9A3C', '#D9761E'); },
  shoe_social_branco:   function () { return tenis('#FFFFFF', '#DCD5C8', '#B9B2A6'); },
  shoe_social_biscoito: function () { return tenis('#D9A05B', '#B5732F', '#8A5A2B'); },
  shoe_social_cacau:    function () { return tenis('#3A2A4D', '#241A2F', '#C9A6F2'); },
  shoe_croc_branca:     function () { return croc('#FFF7FB', '#E4DCE2'); },
  shoe_croc_lilas:      function () { return croc('#C9A6F2', '#9B5DE5'); },
  shoe_croc_azul:       function () { return croc('#9FD9FF', '#3DBBFF'); },
  shoe_croc_preta:      function () { return croc('#241A2F', '#4A3A5C'); },
  shoe_croc_rosa:       function () { return croc('#FF6B9D', '#E0447A'); },
  shoe_botina_baunilha: function () { return botina('#F3D9B5', '#D9A05B', 258); },
  shoe_botina_caramelo: function () { return botina('#B5732F', '#8A5A2B', 258); },
  shoe_bota_goma:       function () { return botina('#FF4757', '#D62F3E', 238); },
  shoe_bota_princesa:   function () {
    return botina('#3DBBFF', '#1E8FD1', 238) +
      bola(88, 250, 2.6, '#FFFFFF') + bola(100, 262, 2.6, '#FFFFFF') +
      bola(132, 250, 2.6, '#FFFFFF') + bola(120, 262, 2.6, '#FFFFFF') +
      estrela(94, 244, 5, '#FFD93D') + estrela(126, 244, 5, '#FFD93D');
  },
};

// ── Extras ───────────────────────────────────────────────
// Cada extra tem lugar próprio: o laço vai na orelha, a asa nas costas,
// o resto na mão direita (a da direita de quem olha, em x 153).
const MAO = { x: 153, y: 224 };
const EXTRAS = {
  acc_cookie: function () {
    return c(MAO.x + 8, MAO.y - 4, 14, '#D9A05B') +
      bola(MAO.x + 3, MAO.y - 8, 2.8, '#5A3418') + bola(MAO.x + 12, MAO.y - 2, 2.8, '#5A3418') +
      bola(MAO.x + 6, MAO.y + 3, 2.8, '#5A3418') + bola(MAO.x + 14, MAO.y - 10, 2.4, '#5A3418');
  },
  acc_candy: function () {
    return fio('M ' + (MAO.x + 10) + ' ' + (MAO.y + 8) + ' L ' + (MAO.x + 10) + ' ' + (MAO.y - 18) +
      ' q 0 -12 12 -12 q 12 0 12 12', '#FFFFFF', 9) +
      fio('M ' + (MAO.x + 10) + ' ' + (MAO.y + 4) + ' L ' + (MAO.x + 10) + ' ' + (MAO.y - 4), '#FF4757', 9) +
      fio('M ' + (MAO.x + 11) + ' ' + (MAO.y - 14) + ' q 2 -8 10 -8', '#FF4757', 4.5) +
      fio('M ' + (MAO.x + 30) + ' ' + (MAO.y - 22) + ' q 4 2 4 6', '#FF4757', 4.5);
  },
  acc_bow: function () {
    return p('M 62 34 L 44 22 L 44 46 Z', '#FF6B9D') +
      p('M 62 34 L 80 22 L 80 46 Z', '#FF6B9D') +
      c(62, 34, 7, '#FF4757') +
      fio('M 50 28 L 54 34 M 74 28 L 70 34', '#E0447A', 2);
  },
  acc_flower: function () {
    const x = MAO.x + 10, y = MAO.y - 10;
    return fio('M ' + x + ' ' + y + ' L ' + x + ' ' + (MAO.y + 10), '#3E9B4C', 3) +
      bola(x - 6, y - 6, 6, '#6BCB77') + bola(x + 6, y - 6, 6, '#6BCB77') +
      bola(x - 6, y + 6, 6, '#6BCB77') + bola(x + 6, y + 6, 6, '#6BCB77') +
      fio('M ' + (x - 12) + ' ' + y + ' L ' + (x + 12) + ' ' + y + ' M ' + x + ' ' + (y - 12) + ' L ' + x + ' ' + (y + 12), '#3E9B4C', 1.6);
  },
  acc_star: function () {
    return fio('M ' + (MAO.x + 4) + ' ' + (MAO.y + 10) + ' L ' + (MAO.x + 22) + ' ' + (MAO.y - 20), '#9B5DE5', 5) +
      estrela(MAO.x + 26, MAO.y - 26, 13, '#FFD93D') +
      bola(MAO.x + 42, MAO.y - 36, 2.6, '#FFD93D') + bola(MAO.x + 12, MAO.y - 40, 2.2, '#FF6B9D');
  },
  acc_fire: function () {
    const x = MAO.x + 10, y = MAO.y - 8;
    return p('M ' + x + ' ' + (y - 30) + ' q 14 12 10 24 q -2 12 -12 12 q -12 0 -12 -12 q 0 -10 8 -16 q 0 8 4 8 q 4 -6 2 -16 z', '#FF9A3C') +
      semFio('M ' + x + ' ' + (y - 12) + ' q 7 6 5 12 q -1 7 -6 7 q -6 0 -6 -7 q 0 -6 7 -12 z', '#FFD93D');
  },
  acc_asa: function () {
    const asa = p('M 78 168 Q 40 140 30 176 Q 22 208 52 216 Q 70 218 78 200 Z', '#9FD9FF', ' opacity="0.92"') +
      fio('M 44 172 Q 52 190 66 198', '#3DBBFF', 2.2);
    return asa + espelho(asa);
  },
  acc_rel: function () {
    return fio('M ' + (MAO.x + 2) + ' ' + (MAO.y - 6) + ' q 10 6 12 16', '#9B5DE5', 2.4) +
      c(MAO.x + 16, MAO.y + 16, 13, '#FFD93D') +
      bola(MAO.x + 16, MAO.y + 16, 9, '#FFF7FB') +
      fio('M ' + (MAO.x + 16) + ' ' + (MAO.y + 16) + ' L ' + (MAO.x + 16) + ' ' + (MAO.y + 10) +
        ' M ' + (MAO.x + 16) + ' ' + (MAO.y + 16) + ' L ' + (MAO.x + 21) + ' ' + (MAO.y + 18), TINTA, 1.8) +
      q(MAO.x + 13, MAO.y + 1, 6, 5, 2, '#9B5DE5');
  },
};

// Capa e asa ficam atrás do corpo: são as duas peças que o bicho veste
// por baixo de si mesmo.
const ATRAS = {
  out_cape: function () {
    return p('M 78 150 Q 110 166 142 150 L 170 250 Q 110 268 50 250 Z', '#9B5DE5') +
      semFio('M 110 162 L 142 150 L 170 250 L 110 262 Z', '#7B3FD1') +
      fio('M 110 164 L 110 262', '#5E2CA8', 2.4);
  },
  acc_asa: EXTRAS.acc_asa,
  look_fada: function () {
    const asa = p('M 80 170 Q 46 132 34 168 Q 26 200 56 212 Q 74 214 80 196 Z', '#EADEFA', ' opacity="0.9"') +
      fio('M 48 164 Q 56 186 70 196', '#C9A6F2', 2.2);
    return asa + espelho(asa);
  },
  look_neve: function () {
    return p('M 80 152 Q 110 166 140 152 L 164 254 Q 110 268 56 254 Z', '#9FD9FF', ' opacity="0.55"');
  },
};

// ── Montagem ─────────────────────────────────────────────
const POR_SLOT = {
  hat: CHAPEUS, mask: MASCARAS, glasses: OCULOS,
  outfit: Object.assign({}, ROUPAS, CONJUNTOS),
  shoes: CALCADOS, accessory: EXTRAS,
};

function desenhoDe(slot, id) {
  if (!id) return '';
  const tabela = POR_SLOT[slot];
  const fn = tabela && tabela[id];
  return fn ? fn() : '';
}

const SLOTS = ['hat', 'wig', 'mask', 'glasses', 'outfit', 'shoes', 'accessory'];

function assinatura(equip) {
  const e = equip || {};
  return SLOTS.map(function (s) { return e[s] || '-'; }).join('|');
}

// A moldura começa acima de y = 0: chapéu de festa, gorro de confeiteiro e
// coque passam da linha do topo da cabeça e seriam cortados sem essa folga.
const VISTAS = {
  inteiro: { caixa: '0 -22 220 322' },
  busto:   { caixa: '24 -22 172 200' },
  // Só a cabeça, com o que estiver nela. É o tamanho de um avatar de fala:
  // desenhar o corpo inteiro para mostrar 28 px seria peso sem motivo.
  rosto:   { caixa: '44 18 136 138' },
};

const cache = {};

function svg(equip, opcoes) {
  const o = opcoes || {};
  const corte = VISTAS[o.corte] ? o.corte : 'inteiro';
  const e = equip || {};
  const chave = corte + '#' + assinatura(e) + '#' + (o.titulo || '');
  if (cache[chave]) return cache[chave];

  const peruca = e.wig ? PERUCAS[e.wig] : null;
  const cabeca =
    (peruca && peruca.tras ? peruca.tras() : '') +
    CABECA +
    (peruca && peruca.frente ? peruca.frente() : '') +
    desenhoDe('hat', e.hat) +
    desenhoDe('mask', e.mask) +
    desenhoDe('glasses', e.glasses);

  let corpo;
  let caixa = VISTAS[corte].caixa;
  if (corte === 'rosto') {
    corpo = cabeca;
    // Sem nada na cabeça, o recorte fecha no rosto: num avatar de 40 px o
    // espaço vazio acima das orelhas virava uma cabeça minúscula. Com chapéu
    // ou peruca, abre para cima e para os lados — o coque passa do topo da
    // cabeça e o cavalinho vai até x = 188.
    caixa = (e.hat || e.wig) ? '32 -22 160 176' : '44 18 136 138';
  } else {
    const atras = (ATRAS[e.outfit] ? ATRAS[e.outfit]() : '') +
                  (ATRAS[e.accessory] ? ATRAS[e.accessory]() : '');
    // Asa é peça de costas e não se repete na frente.
    const extraFrente = e.accessory === 'acc_asa' ? '' : desenhoDe('accessory', e.accessory);
    corpo =
      SOMBRA + CAUDA + atras +
      (peruca && peruca.tras ? peruca.tras() : '') +
      CORPO +
      desenhoDe('shoes', e.shoes) +
      desenhoDe('outfit', e.outfit) +
      BANDANA_DESENHO +
      cabeca +
      extraFrente;
  }

  const titulo = String(o.titulo || 'Juba Candy, o mascote do Candy Math')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const saida = '<svg class="mascote-svg" viewBox="' + caixa +
    '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + titulo +
    '" preserveAspectRatio="xMidYMid meet"><title>' + titulo + '</title>' + corpo + '</svg>';

  // O cache guarda só as combinações mais recentes: vestir e tirar peça
  // não pode virar uma lista sem fim de strings na memória.
  const chaves = Object.keys(cache);
  if (chaves.length > 24) delete cache[chaves[0]];
  cache[chave] = saida;
  return saida;
}

// ── A peça sozinha, para a vitrine ───────────────────────
// No card da loja o que interessa é a peça, não o bicho: 79 mascotes
// quase iguais lado a lado não deixam ver o que se está escolhendo, e
// custariam seiscentos mil caracteres de desenho numa aba só. Aqui vai
// apenas a peça, recortada na janela do seu slot. O mascote vestido
// aparece no palco, grande, ao lado.
const JANELA = {
  hat:       '50 -26 148 124',
  wig:       '30 -14 160 234',
  mask:      '54 16 132 104',
  glasses:   '52 60 116 70',
  outfit:    '22 128 176 168',
  shoes:     '62 230 96 76',
  accessory: '140 176 64 84',
};
// Três extras não moram na mão: o laço é na orelha, a asa é nas costas e
// o relógio pendura abaixo da pata.
const JANELA_PECA = {
  acc_bow: '36 14 52 40',
  acc_asa: '18 134 184 90',
  acc_rel: '148 210 42 50',
};

// A janela declarada é larga de propósito: cabe a peça mais larga do slot.
// O preço disso é uma coroa estreita nadando no meio do prato. Quando há
// navegador, a medida real do desenho substitui a janela — uma vez por
// peça, guardada. Sem navegador (os testes de Node) fica a janela larga,
// que nunca corta nada.
const caixaMedida = {};
let medidor = null;

function medirCaixa(id, desenho, reserva) {
  if (caixaMedida[id]) return caixaMedida[id];
  if (typeof document === 'undefined' || !document.createElementNS || !document.body) return reserva;
  try {
    if (!medidor) {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('aria-hidden', 'true');
      s.setAttribute('style', 'position:absolute;left:-9999px;top:0;width:8px;height:8px;overflow:hidden');
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      s.appendChild(g);
      document.body.appendChild(s);
      medidor = g;
    }
    medidor.innerHTML = desenho;
    const b = medidor.getBBox();
    if (!b || !b.width || !b.height) return reserva;
    // getBBox não conta o traço, e o traço mais grosso do projeto tem 9 de
    // largura: a folga cobre metade dele mais um respiro.
    const folga = 6 + Math.max(b.width, b.height) * 0.04;
    const caixa = (b.x - folga).toFixed(1) + ' ' + (b.y - folga).toFixed(1) + ' ' +
      (b.width + folga * 2).toFixed(1) + ' ' + (b.height + folga * 2).toFixed(1);
    medidor.innerHTML = '';
    caixaMedida[id] = caixa;
    return caixa;
  } catch (e) {
    return reserva;
  }
}

function peca(slot, id) {
  if (!id || !JANELA[slot]) return '';
  let desenho;
  if (slot === 'wig') {
    const w = PERUCAS[id];
    if (!w) return '';
    desenho = (w.tras ? w.tras() : '') + (w.frente ? w.frente() : '');
  } else {
    desenho = desenhoDe(slot, id);
    if (!desenho) return '';
    // Capa e asa têm metade do desenho atrás do corpo; na vitrine a peça
    // aparece inteira, e não pode aparecer duas vezes.
    if (ATRAS[id] && id !== 'acc_asa') desenho = ATRAS[id]() + desenho;
  }
  const caixa = medirCaixa(id, desenho, JANELA_PECA[id] || JANELA[slot]);
  return '<svg class="peca-svg" viewBox="' + caixa +
    '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"' +
    ' preserveAspectRatio="xMidYMid meet">' + desenho + '</svg>';
}

root.CM_MASCOTE = {
  svg: svg,
  peca: peca,
  assinatura: assinatura,
  slots: SLOTS,
  temPeca: function (slot, id) {
    if (slot === 'wig') return !!(id && PERUCAS[id]);
    return !!(id && POR_SLOT[slot] && POR_SLOT[slot][id]);
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = root.CM_MASCOTE;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));