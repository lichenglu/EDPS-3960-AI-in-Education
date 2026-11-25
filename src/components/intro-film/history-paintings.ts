import type { IntroScene } from '@/contracts/intro-film';
import { between, filmPalette as color, random, spline, type Paint, type Point } from './paint';

const brass = '#a87947';
const oak = '#795033';
const walnut = '#492f2d';
const iron = '#34515a';

function disk(a: Paint, x: number, y: number, r: number, pigment: string) {
  a.ctx.fillStyle = pigment;
  a.ctx.beginPath();
  a.ctx.arc(x, y, r, 0, Math.PI * 2);
  a.ctx.fill();
}

function steelRivet(a: Paint, x: number, y: number, size = 6) {
  disk(a, x, y + 2, size + 2, color.shadow);
  disk(a, x, y, size, '#c3915b');
  a.stroke(
    [
      [x - size * 0.6, y + 1],
      [x + size * 0.6, y - 1],
    ],
    walnut,
    1.6,
    1,
    x,
  );
}

function gear(a: Paint, x: number, y: number, radius: number, teeth: number, phase: number, salt: number) {
  const c = a.ctx;
  c.save();
  c.translate(x, y);
  c.rotate(phase);
  const toothProfile = [0.87, 1, 1, 0.87];
  const points: Point[] = [];
  for (let tooth = 0; tooth < teeth; tooth++) {
    toothProfile.forEach((depth, point) => {
      const angle = ((tooth + point / toothProfile.length) * Math.PI * 2) / teeth;
      points.push([Math.cos(angle) * radius * depth, Math.sin(angle) * radius * depth]);
    });
  }
  a.polygon(points, brass, salt, 0.5);
  disk(a, 0, 0, radius * 0.77, '#c1945b');
  disk(a, 0, 0, radius * 0.67, '#69523e');
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const px = Math.cos(angle) * radius * 0.47;
    const py = Math.sin(angle) * radius * 0.47;
    disk(a, px, py, radius * 0.135, color.shadow);
    disk(a, px - radius * 0.025, py - radius * 0.025, radius * 0.108, '#223842');
  }
  disk(a, 0, 0, radius * 0.24, color.gold);
  disk(a, 0, 0, radius * 0.13, iron);
  a.stroke(
    spline(
      [
        [-radius * 0.53, -radius * 0.59],
        [0, -radius * 0.76],
        [radius * 0.52, -radius * 0.55],
      ],
      15,
    ),
    '#eed199',
    3,
    1,
    salt + 2,
  );
  c.restore();
}

/** Lacquered wood holds a fixed band of type. The moving part only exposes it. */
function machineStage(a: Paint, t: number) {
  a.wash();
  const c = a.ctx;
  const light = c.createLinearGradient(360, -100, 1100, 950);
  light.addColorStop(0, '#264a56');
  light.addColorStop(0.47, '#192f3d');
  light.addColorStop(1, '#0b1829');
  c.fillStyle = light;
  c.fillRect(0, 0, 1600, 900);
  a.glow(820, 350, 650, '#98613c', 0.45);
  c.save();
  c.translate(-30 * a.params.camera * t, 0);
  a.path('M-80,-10H212L184,634L-90,720Z', '#182c3c', 809, 0.7);
  a.path('M1284,-12H1700V677L1381,641Z', '#102436', 810, 0.55);
  a.path('M1259,0L1298,0L1418,661L1390,673Z', '#25434c', 811, 0.55);
  a.path('M-80,656C467,620 901,622 1690,649L1700,960H-80Z', '#192d38', 812, 1.4);
  c.restore();
  const dust = random(a.params.seed + 820);
  const count = Math.round(40 * a.params.detail);
  c.save();
  for (let i = 0; i < count; i++) {
    const x = 290 + dust() * 970 + t * (5 + dust() * 15);
    const y = 80 + dust() * 620 - t * 18;
    c.globalAlpha = 0.07 + dust() * 0.22;
    disk(a, x, y, 0.6 + dust() * 2.2, color.paper);
  }
  c.restore();
}

function cabinet(a: Paint, t: number) {
  // Four planes and a heavy plinth give the demonstration a physical stage.
  a.ellipse(850, 794, 523, 65, '#101c2a', 830);
  a.path('M519,646L613,650L584,808L522,812L502,787Z', oak, 831);
  a.path('M1072,628L1159,606L1190,745L1179,793L1114,803Z', walnut, 832);
  a.path('M1129,641L1181,620L1232,749L1180,788Z', '#332d34', 833);
  a.path('M484,632L1185,594L1266,633L1183,676L491,711L461,684Z', walnut, 834, 1.4);
  a.path('M464,683L1182,640L1177,676L492,712L459,695Z', '#b07b4f', 835);
  a.path('M496,325L1167,291L1161,629L502,665L478,641Z', oak, 836, 1.6);
  a.path('M496,325L621,224L1278,204L1167,291Z', '#9d6639', 837, 1.3);
  a.path('M1167,291L1278,204L1267,562L1161,629Z', walnut, 838, 1.35);
  a.path('M550,322L661,249L1226,227L1130,292Z', '#b9804b', 839, 1.45);
  a.path('M505,337L1162,300L1162,339L493,374Z', '#c08a54', 840);
  a.path('M487,605L1163,571V620L502,657L484,637Z', '#a47149', 841);
  a.stroke(
    spline(
      [
        [510, 343],
        [665, 326],
        [905, 316],
        [1142, 304],
      ],
      25,
    ),
    color.gold,
    4.5,
    1,
    842,
  );
  a.stroke(
    spline(
      [
        [522, 638],
        [752, 630],
        [922, 618],
        [1134, 607],
      ],
      21,
    ),
    '#d19a62',
    4,
    1,
    843,
  );

  // The mechanics are visible under the two printed windows.
  a.path('M557,535L1083,504L1102,569L552,609Z', color.shadow, 844, 0.6);
  const c = a.ctx;
  c.save();
  c.clip(new Path2D('M557,535L1083,504L1102,569L552,609Z'));
  a.path('M538,569L1127,520L1134,548L535,595Z', '#467373', 846, 0.9);
  gear(a, 738, 566, 57, 14, t * 1.25, 847);
  gear(a, 834, 552, 47, 12, -t * 1.47, 848);
  gear(a, 913, 551, 39, 10, t * 1.7, 849);
  a.stroke(
    [
      [549, 586],
      [1081, 544],
    ],
    '#f0cd8d',
    4,
    1,
    851,
  );
  c.restore();
  a.stroke(
    [
      [555, 538],
      [1074, 507],
    ],
    '#d5aa68',
    5,
    1,
    850,
  );
  for (const [x, y] of [
    [528, 360],
    [1127, 324],
    [517, 622],
    [1131, 590],
  ])
    steelRivet(a, x, y);
  for (let i = 0; i < 5; i++) {
    const y = 350 + i * 29;
    a.stroke(
      [
        [1207, y],
        [1248, y - 27],
      ],
      '#2d2730',
      8,
      1,
      875 + i,
    );
    a.stroke(
      [
        [1207, y + 5],
        [1249, y - 22],
      ],
      '#835735',
      3,
      1,
      881 + i,
    );
  }
  a.path('M1248,502L1282,491L1296,510L1279,531L1246,537Z', '#254b54', 858);
  a.ellipse(1285, 504, 17, 13, '#d9a763', 859);
}

function windowTrim(a: Paint, x: number, y: number, width: number, height: number, salt: number) {
  a.path(
    `M${x - 14},${y - 10}L${x + width + 10},${y - 21}L${x + width + 14},${y + height + 10}L${x - 14},${y + height + 18}Z`,
    color.shadow,
    salt,
    0.5,
  );
  a.path(
    `M${x - 6},${y - 4}L${x + width + 7},${y - 13}L${x + width + 9},${y + height + 3}L${x - 6},${y + height + 11}Z`,
    brass,
    salt + 1,
    0.6,
  );
  a.path(
    `M${x},${y + 3}L${x + width},${y - 6}L${x + width},${y + height - 2}L${x},${y + height + 6}Z`,
    color.paper,
    salt + 2,
    0.6,
  );
  a.stroke(
    [
      [x + 1, y + 6],
      [x + width - 2, y - 3],
    ],
    '#fff0c3',
    2,
    1,
    salt + 3,
  );
}

function slideCover(a: Paint, t: number) {
  const c = a.ctx;
  c.save();
  c.clip(new Path2D('M866,381L1112,368L1112,502L870,515Z'));
  c.translate(260 * between(t, 0.67, 0.86), 0);
  a.path('M856,382L1112,369L1112,507L860,521Z', '#94754b', 862, 1.15);
  a.path('M861,387L1106,376L1106,397L859,406Z', '#c89c5f', 863, 0.85);
  a.stroke(
    [
      [867, 503],
      [1085, 491],
    ],
    '#432f30',
    5,
    1,
    864,
  );
  a.path('M960,421L991,418L997,443L962,448Z', color.shadow, 865, 0.22);
  a.path('M961,416L988,413L992,439L964,443Z', color.gold, 866, 0.2);
  c.restore();
}

function answerWindow(a: Paint, labels: readonly string[], t: number) {
  const c = a.ctx;
  const nudge = between(t, 0.01, 0.55) * a.params.camera;
  c.save();
  c.translate(800, 450);
  c.scale(1 + nudge * 0.09, 1 + nudge * 0.09);
  c.translate(-800 - 25 * nudge, -450 + 8 * nudge);
  cabinet(a, t);
  windowTrim(a, 565, 387, 252, 109, 855);
  windowTrim(a, 872, 378, 232, 111, 858);
  a.text(labels[0] ?? '7 + 5', 691, 441, 68, color.ink, 'center');
  a.text(labels[2] ?? '12', 989, 432, 78, color.ink, 'center');
  slideCover(a, t);
  a.path('M854,505L1122,490L1122,507L854,523Z', '#a87f4f', 872, 0.7);
  a.stroke(
    [
      [861, 508],
      [1108, 495],
    ],
    '#ebc78a',
    2,
    1,
    873,
  );
  c.restore();

  // The table slip carries the learner's move while the prepared text stays in the cabinet.
  a.path('M127,679L385,642L472,711L199,757Z', '#142735', 882, 0.7);
  a.path('M132,670L382,639L461,703L200,745Z', '#af8860', 883, 0.9);
  a.path('M139,661L385,635L457,697L201,735Z', color.paper, 884, 1.05);
  a.label(labels[1] ?? 'Write an answer', 298, 690, 31, color.ink, 'center');
  a.path('M180,727L460,753L485,744L188,712Z', '#a94b3c', 885, 0.65);
  a.polygon(
    [
      [485, 744],
      [505, 756],
      [460, 753],
    ],
    '#e4c186',
    886,
    0.2,
  );
  a.polygon(
    [
      [496, 750],
      [505, 756],
      [491, 755],
    ],
    color.shadow,
    887,
    0,
  );
}

function preparedBand(a: Paint, labels: readonly string[], t: number) {
  const c = a.ctx;
  const travel = between(t, 0.07, 0.76);
  c.save();
  c.translate(800, 500);
  c.scale(1 + a.params.camera * travel * 0.085, 1 + a.params.camera * travel * 0.085);
  c.translate(-800, -500 - 12 * travel * a.params.camera);
  a.glow(771, 464, 625, '#a87b43', 0.37);
  a.path('M-63,588L407,411L1349,511L1651,709L1471,867L168,830Z', '#253d43', 893, 1.2);
  a.path('M129,626L398,436L1110,487L1461,695L1354,794L197,792Z', '#213139', 894, 1.3);
  a.stroke(
    spline(
      [
        [33, 630],
        [289, 597],
        [738, 647],
        [1405, 728],
      ],
      30,
    ),
    '#4b7474',
    17,
    1,
    895,
  );
  gear(a, 477, 596, 157, 20, travel * 1.1, 896);
  gear(a, 718, 624, 103, 14, -travel * 1.65, 898);
  gear(a, 894, 595, 87, 12, travel * 1.96, 900);
  a.path(
    'M-64,237Q355,225 712,267Q1112,310 1660,209L1641,459Q1196,486 857,481Q390,434 -87,475Z',
    '#6f543b',
    902,
    1,
  );
  a.path(
    'M-45,217Q369,206 724,249Q1132,288 1654,195L1644,438Q1193,464 853,460Q376,416 -70,455Z',
    color.paper,
    903,
    1.5,
  );
  a.path(
    'M-39,381Q414,367 842,414Q1227,437 1639,402L1645,434Q1180,462 853,460Q374,416 -68,452Z',
    '#c7a97b',
    904,
    0.7,
  );
  a.stroke(
    spline(
      [
        [1, 248],
        [467, 241],
        [851, 285],
        [1224, 263],
        [1587, 221],
      ],
      60,
    ),
    '#efe0b5',
    6,
    1,
    905,
  );
  a.stroke(
    spline(
      [
        [0, 365],
        [449, 347],
        [834, 385],
        [1240, 384],
        [1590, 340],
      ],
      75,
    ),
    '#ac8a5f',
    4,
    1,
    906,
  );
  c.save();
  c.translate(travel * 66 - 30, 0);
  a.text(labels[0] ?? 'Prepared question', 364, 305, 58, color.ink, 'center');
  a.text(labels[1] ?? 'Expected answer', 1097, 330, 58, color.ink, 'center');
  c.restore();
  c.restore();
}

export function paintMachine(a: Paint, scene: IntroScene, t: number) {
  machineStage(a, t);
  if (scene.id === 'prepared-feedback') preparedBand(a, scene.labels ?? [], t);
  else answerWindow(a, scene.labels ?? [], t);
}

// A deliberately generalized north-up outline keeps the places anchored to land.
const coast: readonly Point[] = [
  [-77.4, 8.7],
  [-75.4, 10],
  [-72.2, 11.9],
  [-69.8, 11.7],
  [-66, 10.6],
  [-62.5, 10.8],
  [-60.8, 9.5],
  [-59.9, 8.5],
  [-57.1, 6.5],
  [-54.3, 5.8],
  [-51.5, 4.1],
  [-50, 2.3],
  [-48, 0.4],
  [-44.1, -1.7],
  [-41.6, -2.5],
  [-38.5, -3.8],
  [-35.2, -5.5],
  [-34.8, -8.2],
  [-36.2, -10.8],
  [-38.3, -12.9],
  [-39.1, -16.5],
  [-39.7, -19.3],
  [-41, -22],
  [-43.4, -23.1],
  [-46.2, -24],
  [-48.4, -26],
  [-48.5, -28.7],
  [-50.9, -31.3],
  [-53.3, -33.7],
  [-55, -34.9],
  [-57.3, -35.2],
  [-56.7, -36.8],
  [-58.2, -39],
  [-61.7, -39],
  [-62.1, -40.7],
  [-64.9, -41.1],
  [-65.1, -43.1],
  [-66, -44.9],
  [-68, -46.7],
  [-67.9, -48.4],
  [-69.1, -51.9],
  [-68.7, -52.9],
  [-66.9, -53.6],
  [-67.3, -54.7],
  [-69.1, -55.2],
  [-71.7, -54.3],
  [-74.9, -52.1],
  [-75.1, -50.1],
  [-75.5, -47.7],
  [-75.7, -46],
  [-74.6, -43.5],
  [-73.8, -41.4],
  [-73.2, -40],
  [-73.5, -37.9],
  [-72.5, -34.8],
  [-71.8, -32.8],
  [-71.5, -30.1],
  [-71.4, -28.4],
  [-70.7, -26.4],
  [-70.5, -24.5],
  [-70.2, -22.1],
  [-70.4, -20],
  [-70.4, -18.1],
  [-72.1, -17.4],
  [-73.4, -16.5],
  [-74.8, -15.6],
  [-76.1, -14.5],
  [-77.1, -12.1],
  [-77.6, -10.2],
  [-79, -8.5],
  [-79.4, -6.7],
  [-81, -6],
  [-81.2, -4.6],
  [-80.5, -3.4],
  [-80.3, -2.1],
  [-80.6, -1.1],
  [-80.5, 0.9],
  [-79, 1.8],
  [-78, 2.8],
  [-77.2, 4.1],
  [-77.4, 6],
];
const peru: readonly Point[] = [
  [-81.2, -4.7],
  [-80.5, -4],
  [-80, -3.8],
  [-78.6, -5],
  [-77.9, -4],
  [-77.1, -3],
  [-75.5, -1.6],
  [-75.2, -0.4],
  [-73.8, -1.5],
  [-72.2, -2.6],
  [-70, -4.2],
  [-71.8, -4.5],
  [-73, -6.2],
  [-73.2, -8.4],
  [-71.5, -9.7],
  [-70.6, -11],
  [-69.5, -11],
  [-68.8, -12.1],
  [-69.8, -15.6],
  [-69, -17.2],
  [-70.4, -18.3],
  [-72.1, -17.3],
  [-73.7, -16.3],
  [-75.7, -15],
  [-77.2, -12.1],
  [-79.1, -8.4],
  [-81.1, -6.1],
];

const project = ([lon, lat]: Point): Point => [235 + (lon + 82) * 15.2, 101 + (13 - lat) * 10.25];
const land = coast.map(project);
const peruLand = peru.map(project);
const landPath = 'M' + land.map(([x, y]) => `${x},${y}`).join('L') + 'Z';
const outline: Point[] = [...land, land[0]];
const lima = project([-77.04, -12.05]);
const quito = project([-78.47, -0.18]);

function ocean(a: Paint, t: number) {
  a.wash();
  a.glow(640, 349, 770, '#29566e', 0.77);
  a.path('M-85,476Q250,374 481,483T1042,492Q1326,420 1692,550V1000H-90Z', '#142d40', 923, 1.55);
  const c = a.ctx;
  c.save();
  c.globalAlpha = 0.22;
  c.translate(-t * a.params.camera * 21, -t * 6);
  for (let row = 0; row < 10; row++) {
    const y = 180 + row * 66;
    const wave = spline(
      [
        [-45, y + 24],
        [357, y - 15],
        [790, y + 35],
        [1210, y + 4],
        [1650, y - 24],
      ],
      31,
    );
    a.stroke(wave, row % 3 === 0 ? '#4c7f8b' : '#2e5668', row % 3 === 0 ? 4 : 2, 1, 924 + row);
  }
  c.restore();
}

function paintedMap(a: Paint, focus: 'peru' | 'places' | 'boundary', t: number) {
  const c = a.ctx;
  c.save();
  c.translate(-11 * t * a.params.camera, 3 * t);
  a.path(landPath, '#507779', 940, 1.2);
  c.save();
  c.clip(new Path2D(landPath));
  a.path('M300,100L822,130L1013,414L639,485L483,412L257,347Z', '#4e837a', 942, 1.7);
  a.path('M258,153Q472,251 379,369Q467,456 489,584L625,872L517,891L252,738L205,337Z', '#3d686e', 943, 1.15);
  a.path('M472,408Q621,351 957,414L879,604L606,761L491,713L498,581Z', '#5f8581', 944, 1.45);
  const hatching = random(a.params.seed + 946);
  const lines = Math.round(95 * a.params.detail);
  c.lineCap = 'round';
  for (let i = 0; i < lines; i++) {
    const x = 170 + hatching() * 790;
    const y = 116 + hatching() * 705;
    const length = 20 + hatching() * 130;
    c.strokeStyle = i % 5 === 0 ? '#e3b888' : '#234954';
    c.globalAlpha = 0.08 + hatching() * 0.2;
    c.lineWidth = 0.8 + hatching() * 5;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + length * 0.5, y - length * 0.12, x + length, y - length * 0.4);
    c.stroke();
  }
  c.globalAlpha = 1;
  if (focus !== 'places') a.polygon(peruLand, '#ca975c', 948, 1.3);
  c.restore();
  a.stroke(outline, '#a4b4a0', 3.2, 1, 949);
  if (focus !== 'places') a.stroke([...peruLand, peruLand[0]], color.gold, 4.1, 1, 950);
  a.glow(lima[0], lima[1], 65, color.gold, 0.32);
  disk(a, lima[0], lima[1], 11, '#142839');
  disk(a, lima[0], lima[1], 7.2, color.gold);
  if (focus === 'places') {
    a.glow(quito[0], quito[1], 60, color.coral, 0.35);
    disk(a, quito[0], quito[1], 11, '#142839');
    disk(a, quito[0], quito[1], 7, color.coral);
  }
  c.restore();
}

const capitalLink = spline(
  [
    [996, 207],
    [1019, 257],
    [1076, 308],
    [1018, 364],
    [987, 410],
  ],
  70,
);
const continentLink = spline(
  [
    [987, 410],
    [967, 462],
    [1036, 514],
    [1107, 550],
    [1086, 611],
  ],
  70,
);

function factTrace(a: Paint, points: Point[], progress: number, salt: number) {
  a.stroke(points, '#4f7b80', 4.5, 1, salt);
  if (progress <= 0) return;
  a.stroke(points, color.gold, 6, progress, salt + 1);
  const tip = points[Math.round((points.length - 1) * progress)];
  a.glow(tip[0], tip[1], 46, color.gold, 0.51);
  disk(a, tip[0], tip[1], 4, '#f3d695');
  const c = a.ctx;
  c.save();
  c.globalAlpha = 0.67;
  for (let i = 0; i < 6; i++) {
    const sample =
      points[Math.max(0, Math.round((points.length - 1) * Math.max(0, progress - (i + 1) * 0.026)))];
    disk(
      a,
      sample[0] + Math.sin(i * 27 + salt) * (i + 2),
      sample[1] - i * 2,
      Math.max(0.75, 2.6 - i * 0.25),
      color.gold,
    );
  }
  c.restore();
}

function factNode(a: Paint, point: Point, reached: boolean) {
  const [x, y] = point;
  if (reached) a.glow(x, y, 55, color.gold, 0.36);
  disk(a, x, y, 13, '#163146');
  disk(a, x, y, 7, reached ? color.gold : '#79aaa0');
  disk(a, x - 1, y - 2, 2, '#faeac1');
}

function constellation(a: Paint, labels: readonly string[], t: number, follow: boolean) {
  const first = between(t, follow ? 0.09 : 0.035, follow ? 0.43 : 0.31);
  const second = between(t, follow ? 0.47 : 0.33, follow ? 0.82 : 0.64);
  factTrace(a, capitalLink, first, 965);
  factTrace(a, continentLink, second, 968);
  factNode(a, capitalLink[0], true);
  factNode(a, capitalLink[capitalLink.length - 1], first > 0.98);
  factNode(a, continentLink[continentLink.length - 1], second > 0.98);
  a.text(labels[0] ?? 'Lima', 1045, 210, 72, color.light);
  a.text(labels[1] ?? 'Peru', 1034, 412, 72, color.light);
  const continent = labels[2] ?? 'South America';
  if (continent === 'South America') {
    a.text('South', 1126, 612, 77, color.light);
    a.text('America', 1126, 681, 77, color.light);
  } else {
    a.text(continent, 1126, 618, 61, color.light);
  }
  a.label('capital of', 1118, 315, 34, color.paper);
  a.label('in', 1084, 505, 34, color.paper);
}

function travelQuestion(a: Paint, labels: readonly string[], t: number) {
  const c = a.ctx;
  const lift = between(t, 0.03, 0.49);
  c.save();
  c.globalAlpha = 0.34 + lift * 0.66;
  const dx = -11 * t * a.params.camera;
  const dy = 3 * t;
  const labelX = 193 + dx;
  const limaLabelY = lima[1] + 39 + dy;
  const quitoLabelY = quito[1] - 20 + dy;
  a.label(labels[0] ?? 'Lima', labelX, limaLabelY, 58, color.light, 'right');
  a.label(labels[1] ?? 'Quito', labelX, quitoLabelY, 58, color.light, 'right');
  a.stroke(
    [
      [labelX + 23, limaLabelY],
      [lima[0] + dx - 18, lima[1] + dy + 6],
    ],
    '#b5a375',
    2.7,
    1,
    971,
  );
  a.stroke(
    [
      [labelX + 23, quitoLabelY],
      [quito[0] + dx - 18, quito[1] + dy - 2],
    ],
    '#ad7e7a',
    2.7,
    1,
    972,
  );
  a.text(labels[2] ?? 'Travel time?', 1038, 381 - (1 - lift) * 24, 80, color.light);
  c.restore();
}

function chartBoundary(a: Paint, scene: IntroScene, t: number) {
  const c = a.ctx;
  const move = between(t, 0.12, 0.68);
  const x = 968 + 18 * (1 - move);
  // The torn opening is empty. No line supplies a route the map does not contain.
  c.save();
  c.translate(x, 0);
  a.path('M0,197L561,214L539,615L421,623L365,580L268,618L199,569L110,592L2,556Z', '#385660', 973, 1.25);
  a.path(
    'M24,226L531,244L515,464L449,435L392,479L317,435L220,463L158,430L87,466L22,438Z',
    '#648985',
    974,
    1.2,
  );
  a.stroke(
    [
      [23, 438],
      [87, 466],
      [158, 430],
      [220, 463],
      [317, 435],
      [392, 479],
      [449, 435],
      [515, 464],
    ],
    '#abc1ac',
    3.6,
    1,
    975,
  );
  a.label(scene.labels?.[0] ?? 'Facts available', 269, 342, 46, color.light, 'center');
  a.label(scene.labels?.[1] ?? 'More evidence needed', 263, 532, 36, color.paper, 'center');
  c.restore();
  const linked = spline(
    [
      [lima[0], lima[1]],
      [210, 307],
      [247, 248],
      [358, 273],
      [400, 346],
    ],
    42,
  );
  const membership = spline(
    [
      [400, 346],
      [487, 284],
      [593, 301],
      [689, 358],
    ],
    42,
  );
  c.save();
  c.translate(-11 * t * a.params.camera, 3 * t);
  factTrace(a, linked, between(t, 0.015, 0.45), 976);
  factTrace(a, membership, between(t, 0.23, 0.65), 979);
  factNode(a, [400, 346], true);
  factNode(a, [689, 358], t > 0.65);
  c.restore();
  a.label('Fact links', 122, 160, 41, color.light);
}

export function paintKnowledge(a: Paint, scene: IntroScene, t: number) {
  ocean(a, t);
  if (scene.id === 'take-turns') {
    paintedMap(a, 'places', t);
    travelQuestion(a, scene.labels ?? [], t);
  } else if (scene.id === 'map-boundary') {
    paintedMap(a, 'boundary', t);
    chartBoundary(a, scene, t);
  } else {
    paintedMap(a, 'peru', t);
    constellation(a, scene.labels ?? [], t, scene.id === 'follow-links');
  }
}
