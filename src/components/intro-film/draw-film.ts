import type P5 from 'p5';
import type { IntroScene } from '@/contracts/intro-film';
import {
  Paint,
  between,
  clamp,
  defaultArtParameters,
  filmPalette as C,
  finishPainting,
  hash,
  random,
  spline,
  type ArtParameters,
  type Point,
} from './paint';
import { paintMachine, paintKnowledge } from './history-paintings';

function landscape(a: Paint, t: number) {
  a.wash();
  a.glow(1040, 270, 600, C.blue, 0.45);
  const c = a.ctx;
  c.save();
  c.translate(Math.sin(t * 0.6) * 9 * a.params.camera, 0);
  a.path('M-60,430 Q230,265 520,360 T1050,330 Q1390,270 1700,415 L1700,950 L-60,950Z', C.blue, 211);
  a.path('M-60,560 Q240,410 480,505 Q790,605 1050,460 Q1420,310 1700,505 L1700,950 L-60,950Z', C.teal, 212);
  a.path('M-60,680 Q240,630 480,700 Q900,750 1180,585 Q1400,505 1700,620 L1700,950 L-60,950Z', C.deep, 213);
  c.restore();
}
function ribbon(a: Paint, points: readonly Point[], color: string, width: number, t = 1, salt = 0) {
  const curve = spline(points, 120);
  a.stroke(curve, color, width, t, salt);
  a.stroke(
    curve.map(([x, y]) => [x, y - width * 0.17] as const),
    C.paper,
    width * 0.12,
    t,
    salt + 8,
  );
}
function page(a: Paint, x: number, y: number, scale: number, tilt: number) {
  const c = a.ctx;
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  c.scale(scale, scale);
  a.path('M-380,-217 L377,-238 L410,250 L-361,265Z', C.shadow, 300);
  a.path(
    'M-395,-240 Q-240,-272 -13,-231 Q190,-265 382,-246 L404,225 Q166,205 4,254 Q-190,223 -373,257Z',
    C.paper,
    301,
  );
  a.path('M-393,-239 Q-213,-265 -14,-230 L3,254 Q-206,211 -372,257Z', '#cdbf9d', 302);
  a.stroke(
    [
      [-14, -230],
      [3, 254],
    ],
    C.ink,
    2.5,
    1,
    303,
  );
  for (let i = 0; i < 8; i++) {
    a.stroke(
      [
        [-354, -164 + i * 47],
        [-40, -163 + i * 47],
      ],
      '#867f6a',
      1.2,
      1,
      310 + i,
    );
    a.stroke(
      [
        [39, -163 + i * 47],
        [350, -178 + i * 47],
      ],
      '#b6a98c',
      1,
      1,
      330 + i,
    );
  }
  c.restore();
}
function hand(a: Paint, x: number, y: number, scale: number, angle: number) {
  const c = a.ctx;
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.scale(scale, scale);
  a.path(
    'M430,228 L130,95 Q94,75 61,77 L-24,91 Q-51,86 -44,69 L20,40 L-62,55 Q-90,48 -74,32 L12,9 L-65,16 Q-84,7 -65,-8 L33,-21 Q43,-60 59,-61 Q83,-55 70,-17 L124,23 L482,90Z',
    C.shadow,
    451,
  );
  a.path(
    'M430,208 L132,79 Q94,59 61,61 L-24,75 Q-51,70 -44,53 L20,24 L-62,39 Q-90,32 -74,16 L12,-7 L-65,0 Q-84,-9 -65,-24 L33,-37 Q43,-76 59,-77 Q83,-71 70,-33 L124,7 L482,74Z',
    C.coral,
    452,
  );
  a.path('M75,-32 L122,9 L424,101 L436,173 L133,59 L74,34 L12,24Z', '#efad78', 453);
  a.polygon(
    [
      [174, 48],
      [446, 102],
      [455, 210],
      [178, 128],
    ],
    C.teal,
    454,
  );
  a.polygon(
    [
      [-78, -52],
      [-61, -64],
      [123, 51],
      [105, 65],
    ],
    C.gold,
    455,
  );
  a.polygon(
    [
      [-78, -52],
      [-96, -77],
      [-61, -64],
    ],
    C.light,
    456,
    0,
  );
  a.polygon(
    [
      [-96, -77],
      [-89, -65],
      [-78, -72],
    ],
    C.ink,
    457,
    0,
  );
  a.stroke(
    [
      [-58, -47],
      [108, 57],
    ],
    C.paper,
    1.5,
    1,
    458,
  );
  c.restore();
}
function opening(a: Paint, t: number, scene: IntroScene) {
  const c = a.ctx;
  a.wash();
  a.glow(1040, 260, 700, C.gold, 0.14);
  const camera = 1 + (-0.04 + 0.18 * between(t, 0, 1)) * a.params.camera;
  c.save();
  c.translate(800, 450);
  c.scale(camera, camera);
  c.translate(-800, -450);
  a.path('M-180,388 L1140,114 L1830,680 L315,1080Z', C.teal, 110);
  a.path('M-180,520 L1100,235 L1830,680 L315,1080Z', C.deep, 111);
  for (let i = 0; i < 22; i++)
    a.stroke(
      [
        [i * 83 - 300, 420],
        [i * 83 + 500, 1040],
      ],
      '#568681',
      1.6,
      1,
      170 + i,
    );
  a.ellipse(806, 596, 650, 150, C.shadow, 112);
  a.ellipse(264, 310, 75, 31, C.shadow, 113);
  a.path('M185,209 Q213,175 286,197 L294,303 Q242,330 185,300Z', C.blue, 114);
  a.ellipse(239, 206, 55, 17, C.paper, 115);
  a.ellipse(239, 206, 44, 11, C.shadow, 116);
  a.stroke(
    spline([
      [230, 163],
      [245, 127],
      [236, 96],
      [250, 62],
    ]),
    C.paper,
    2.5,
    0.78 + Math.sin(t * 4) * 0.17,
    117,
  );
  c.save();
  c.translate(750, 504);
  c.rotate(-0.095);
  a.path('M-478,-268 L462,-272 L498,325 L-450,347Z', C.night, 120);
  a.path(
    'M-494,-300 Q-267,-319 -28,-283 Q182,-335 453,-303 L479,279 Q185,251 -9,314 Q-251,270 -476,317Z',
    C.paper,
    121,
  );
  a.path('M-491,-300 Q-267,-317 -28,-283 L-9,314 Q-250,270 -476,317Z', '#cabc9b', 122);
  a.stroke(
    [
      [-28, -281],
      [-9, 313],
    ],
    '#9b927a',
    3,
    1,
    123,
  );
  for (let i = 0; i < 12; i++)
    a.stroke(
      [
        [-451, -220 + i * 40],
        [-61, -207 + i * 40],
      ],
      '#a49e85',
      1.1,
      1,
      124 + i,
    );
  a.label('A LEARNER’S WORK', 42, -224, 24, C.ink);
  a.text(scene.labels?.[0] ?? '3(x + 2) = 18', 45, -94, 72, C.ink);
  a.text(scene.labels?.[1] ?? '3x + 2 = 18', 52, 42, 72, C.ink);
  a.stroke(
    spline([
      [55, 93],
      [162, 98],
      [294, 91],
      [417, 100],
    ]),
    C.coral,
    4,
    between(t, 0.17, 0.55),
    141,
  );
  a.text('What comes next?', 42, 193, 35, C.ink, 'left', true);
  c.restore();
  const gesture = between(t, 0.12, 0.7);
  hand(a, 1120 + Math.sin(gesture * 3) * 55, 675 - gesture * 72, 0.83, -0.1);
  a.path('M1310,-30 L1550,-30 L1665,200 L1355,201Z', C.shadow, 151);
  a.path('M1380,-20 L1495,-20 L1544,135 L1353,135Z', C.gold, 152);
  c.restore();
  a.text('The next move', 86, 94, 60, C.paper);
  a.label('A QUESTION ABOUT LEARNING', 90, 147, 20, C.sea);
}
function arithmetic(a: Paint, t: number, scene: IntroScene) {
  const c = a.ctx,
    twelve = scene.id === 'window-evidence',
    answer = twelve ? 12 : 13,
    start = twelve ? 7 : 9,
    count = twelve ? 5 : 4;
  landscape(a, t);
  c.save();
  const zoom = 1 + 0.025 * t * a.params.camera;
  c.translate(800, 450);
  c.scale(zoom, zoom);
  c.translate(-800, -450);
  a.path('M-80,910 L-80,672 Q90,610 240,668 L365,769 L431,935Z', C.teal, 501);
  a.path('M1110,940 L1255,665 Q1400,592 1690,656 L1690,940Z', C.teal, 502);
  a.path('M640,380 Q802,270 963,380 L932,468 L661,468Z', C.paper, 503);
  a.path('M660,468 L932,468 L863,536 L752,528Z', C.coral, 504);
  a.glow(800, 323, 230, C.gold, 0.2);
  a.stroke(
    spline(
      [
        [240, 679],
        [335, 575],
        [465, 604],
        [510, 488],
        [676, 432],
      ],
      140,
    ),
    C.gold,
    15,
    0.12 + 0.88 * between(t, 0.03, 0.6),
    515,
  );
  a.stroke(
    spline(
      [
        [1327, 667],
        [1258, 461],
        [1093, 297],
        [1015, 340],
        [930, 426],
      ],
      140,
    ),
    C.coral,
    13,
    0.12 + 0.88 * between(t, 0.35, 0.72),
    516,
  );
  for (let i = 0; i < count; i++) {
    const x = 325 + i * (320 / (count - 1)),
      y = 614 - i * 48;
    a.ellipse(x, y, 53, 16, C.paper, 520 + i);
    a.text(String(start + i + 1), x, y - 34, 38, C.light, 'center');
    if (t > 0.08 + i * 0.085) a.ellipse(x, y, 33, 6, C.gold, 530 + i);
  }
  a.text(String(answer), 800, 385, 140, C.ink, 'center');
  a.text(`${start} + ${count}`, 800, 290, 42, C.paper, 'center');
  a.person(220 + between(t, 0.08, 0.62) * 55, 689, 1.01, 1, t * 2);
  a.person(1350 - between(t, 0.36, 0.74) * 45, 690, 1.01, -1, t * 1.6, C.gold);
  c.restore();
  a.text('Same answer.', 86, 105, 64, C.paper);
  a.text('Different routes.', 86, 175, 48, C.sea, 'left', true);
  a.label(twelve ? 'Count up from 7' : 'Count up from 9', 215, 791, 29, C.paper, 'center');
  a.label('Recall the sum', 1335, 791, 29, C.paper, 'center');
}
function evidence(a: Paint, t: number) {
  landscape(a, t);
  a.glow(600, 500, 560, C.gold, 0.09);
  const c = a.ctx;
  c.save();
  c.translate(-15 * t * a.params.camera, 0);
  page(a, 508, 520, 0.92, -0.09);
  page(a, 1190, 561, 0.68, 0.13);
  c.save();
  c.translate(508, 520);
  c.rotate(-0.09);
  a.text('9 + 4 = 13', 48, -84, 49, C.ink);
  a.text('9 → 10 → 11', 45, 10, 32, C.ink);
  a.text('→ 12 → 13', 47, 62, 32, C.ink);
  c.restore();
  hand(a, 654 + between(t, 0.05, 0.5) * 67, 666, 0.48, -0.28);
  c.save();
  c.translate(1190, 561);
  c.rotate(0.13);
  a.text('6 + 8 = ?', -245, -106, 58, C.ink);
  c.restore();
  ribbon(
    a,
    [
      [100, 810],
      [590, 771],
      [828, 772],
      [1085, 747],
      [1430, 800],
    ],
    C.gold,
    6,
    0.12 + 0.88 * between(t, 0.2, 0.83),
    590,
  );
  c.restore();
  a.text('Find out more.', 86, 112, 68, C.paper);
  a.label('Let the learner explain.', 180, 271, 33, C.light);
  a.label('Then try a new problem alone.', 1140, 245, 29, C.light, 'center');
}
function horizon(a: Paint, t: number, scene: IntroScene) {
  const c = a.ctx;
  a.wash();
  a.glow(1170, 255, 470, C.coral, 0.29);
  a.ellipse(1180, 259, 150, 150, C.gold, 601);
  a.path('M-50,390 Q250,250 490,405 Q690,450 985,298 Q1330,160 1660,390 L1660,950 L-50,950Z', C.blue, 602);
  a.path('M-80,605 Q203,350 480,535 Q699,716 979,432 Q1267,279 1680,499 L1680,950 L-80,950Z', C.teal, 603);
  a.path('M-70,780 Q212,524 563,722 Q810,880 1162,552 Q1398,449 1680,619 L1680,950 L-70,950Z', C.deep, 604);
  c.save();
  const pull = 1 + 0.07 * t * a.params.camera;
  c.translate(900, 420);
  c.scale(pull, pull);
  c.translate(-900, -420);
  a.path(
    'M190,930 Q413,677 686,705 Q932,744 1052,543 Q1105,424 1282,391 Q1414,373 1473,307 L1482,319 Q1433,397 1293,418 Q1134,441 1088,559 Q956,792 698,751 Q451,719 313,930Z',
    C.paper,
    605,
  );
  ribbon(
    a,
    [
      [257, 930],
      [447, 762],
      [698, 727],
      [929, 681],
      [1073, 548],
      [1144, 458],
      [1280, 405],
      [1479, 314],
    ],
    C.gold,
    7,
    0.18 + 0.82 * between(t, 0.08, 0.84),
    606,
  );
  const stops: readonly [number, number, number, string][] = [
    [436, 745, 1.25, '1958'],
    [724, 691, 0.92, '1970'],
    [1014, 537, 0.66, '1980'],
    [1218, 413, 0.43, '?'],
  ];
  for (const [x, y, s, year] of stops) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    a.ellipse(0, 14, 71, 12, C.night, 620);
    a.path('M-45,0 L-41,-159 Q-9,-182 24,-164 L46,-152 L43,0Z', C.teal, 621);
    a.path('M24,-164 L46,-152 L43,0 L18,-6Z', C.shadow, 622);
    a.text(
      scene.id === 'next-year' && (year === '1958' || year === '1970') ? '—' : '?',
      -3,
      -101,
      77,
      C.gold,
      'center',
    );
    if (s > 0.8)
      a.label(
        scene.id === 'next-year' && year !== '1958' && year !== '1970' ? '?' : year,
        -4,
        -205,
        28,
        C.paper,
        'center',
      );
    c.restore();
  }
  const rng = random(a.params.seed + 601);
  for (let i = 0; i < 52; i++) {
    const x = rng() * 1600,
      y = 525 + rng() * 390;
    if (x < 320 || x > 1320) {
      const height = 18 + rng() * 59;
      a.stroke(
        [
          [x, y],
          [x + 8, y - height],
          [x + 14, y - height * 0.7],
        ],
        C.sea,
        1.5,
        1,
        680 + i,
      );
    }
  }
  a.person(222 + 58 * t, 846, 1.16, 1, t * 2);
  c.restore();
  a.text(
    scene.id === 'next-year' ? 'Who decides what happens next?' : 'An archive of possibilities.',
    86,
    98,
    56,
    C.paper,
  );
  a.label('20??', 1450, 236, 33, C.light, 'center');
}
function braidedEvidence(a: Paint, t: number) {
  landscape(a, t);
  const c = a.ctx;
  a.ellipse(380, 384, 99, 99, C.paper, 701);
  a.ellipse(380, 384, 65, 65, C.teal, 702);
  a.ellipse(380 + Math.sin(t) * 8, 383, 29, 44, C.night, 703);
  a.stroke(
    spline([
      [261, 378],
      [302, 335],
      [379, 309],
      [456, 341],
      [500, 378],
    ]),
    C.gold,
    6,
    1,
    704,
  );
  a.path(
    'M659,486 Q680,466 742,468 L779,450 L787,407 Q803,385 819,410 L822,449 L896,433 Q919,439 906,457 L854,475 L926,476 Q949,488 927,501 L848,508 L914,522 Q934,539 910,547 L816,534 Q762,567 719,541 L651,535Z',
    C.coral,
    705,
  );
  a.person(1248, 531, 1, 1, t * 3, C.gold);
  [380, 800, 1248].forEach((x, i) => {
    const points: Point[] = [];
    for (let j = 0; j < 95; j++) {
      const v = j / 94;
      points.push([x + (800 - x) * v + Math.sin(v * Math.PI * 5 + i * 2) * 34 * v, 535 + v * 360]);
    }
    a.stroke(points, [C.gold, C.coral, C.sea][i], 7, 0.35 + 0.65 * between(t, 0.03 + i * 0.1, 0.8), 740 + i);
  });
  a.text('Information becomes a next step.', 86, 108, 62, C.paper);
  a.label('Information', 380, 620, 32, C.paper, 'center');
  a.label('Help', 800, 620, 32, C.paper, 'center');
  a.label('Learner’s next step', 1248, 620, 32, C.paper, 'center');
  c.save();
  c.globalAlpha = between(t, 0.45, 0.9);
  a.glow(800, 864, 130, C.gold, 0.3);
  c.restore();
}
export function drawFilm(
  p: P5,
  scene: IntroScene,
  progress: number,
  parameters: ArtParameters = defaultArtParameters,
) {
  const params = { ...defaultArtParameters, ...parameters },
    t = clamp(progress),
    seed = (params.seed + hash(scene.id)) >>> 0;
  p.randomSeed(seed);
  p.noiseSeed(params.seed);
  const a = new Paint(p, t, { ...params, seed }),
    c = a.ctx;
  c.save();
  c.scale(p.width / 1600, p.height / 900);
  c.clearRect(0, 0, 1600, 900);
  if (scene.id === 'map-boundary') paintKnowledge(a, scene, t);
  else if (scene.id === 'three-comparisons') braidedEvidence(a, t);
  else if (scene.visual === 'workshop') opening(a, t, scene);
  else if (scene.id === 'same-answer' || scene.id === 'window-evidence') arithmetic(a, t, scene);
  else if (scene.visual === 'evidence') evidence(a, t);
  else if (scene.visual === 'machine') paintMachine(a, scene, t);
  else if (scene.visual === 'knowledge') paintKnowledge(a, scene, t);
  else horizon(a, t, scene);
  finishPainting(a);
  c.restore();
}
