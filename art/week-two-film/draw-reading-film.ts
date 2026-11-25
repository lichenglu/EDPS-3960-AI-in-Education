import type P5 from 'p5';
import {
  Paint,
  between,
  clamp,
  defaultArtParameters,
  ease,
  finishPainting,
  lerp,
  random,
  type ArtParameters,
  type Point,
} from '../../src/components/intro-film/paint';

const ink = '#141f31',
  blue = '#294962',
  dusk = '#65848d',
  mist = '#a7b5a6',
  paper = '#eddfbe',
  pale = '#fff0ce',
  gold = '#edbf65',
  rust = '#9b4b3f',
  coral = '#e47a54',
  turquoise = '#79b9a9';
const tau = Math.PI * 2;
type ShotTiming = { duration: number; cues: readonly { start: number; end: number }[] };

/** Advance the depicted action while its phrase is spoken; leave the result visible during the reading hold. */
function cueMotion(
  t: number,
  timing: ShotTiming | undefined,
  cueIndex: number,
  onset: number,
  completion: number,
  untimedStart: number,
  untimedEnd: number,
) {
  const cue = timing?.cues[cueIndex];
  if (!timing || !cue) return between(t, untimedStart, untimedEnd);
  return between(t * timing.duration, lerp(cue.start, cue.end, onset), lerp(cue.start, cue.end, completion));
}

type Context = CanvasRenderingContext2D;
function shape(c: Context, path: string, color: string) {
  c.fillStyle = color;
  c.fill(new Path2D(path));
}
function line(c: Context, path: string, color: string, width = 2) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.stroke(new Path2D(path));
}
function circle(c: Context, x: number, y: number, r: number, color: string) {
  c.beginPath();
  c.arc(x, y, r, 0, tau);
  c.fillStyle = color;
  c.fill();
}
function rect(c: Context, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
}
function grad(c: Context, y: number, end: number, colors: string[]) {
  const g = c.createLinearGradient(0, y, 0, end);
  colors.forEach((v, i) => g.addColorStop(i / (colors.length - 1), v));
  return g;
}
function inWorld(c: Context, draw: () => void) {
  c.save();
  draw();
  c.restore();
}
function zoom(a: Paint, strength: number, focusX: number, focusY: number) {
  const z = 1 + strength * a.params.camera,
    c = a.ctx;
  c.translate(focusX, focusY);
  c.scale(z, z);
  c.translate(-focusX, -focusY);
}
// Engraved hatch marks stay attached to the surfaces; pigment and rain have independent clocks.
function hatch(a: Paint, path: string, seed: number, count: number, color: string, diagonal = -0.28) {
  const c = a.ctx,
    rng = random(a.params.seed + seed);
  inWorld(c, () => {
    c.clip(new Path2D(path));
    c.strokeStyle = color;
    c.lineWidth = 1.4;
    c.beginPath();
    for (let i = 0; i < count * a.params.detail; i++) {
      const x = rng() * 2000 - 180,
        y = rng() * 1100 - 70,
        w = 12 + rng() * 100;
      c.moveTo(x, y);
      c.quadraticCurveTo(x + w * 0.53, y + diagonal * w * 0.4 - 3, x + w, y + diagonal * w);
    }
    c.stroke();
  });
}
function ridge(
  a: Paint,
  y: number,
  h: number,
  frequency: number,
  offset: number,
  color: string,
  phase: number,
) {
  const c = a.ctx;
  c.beginPath();
  c.moveTo(-100, 1100);
  for (let x = -100; x <= 1700; x += 8) {
    const u = (x + offset) * frequency;
    c.lineTo(
      x,
      y +
        h * (0.5 * Math.sin(u + phase) + 0.25 * Math.sin(2.07 * u - 1.2) + 0.1 * Math.sin(4.14 * u + phase)),
    );
  }
  c.lineTo(1700, 1100);
  c.closePath();
  c.fillStyle = color;
  c.fill();
}
function rain(a: Paint, t: number, amount: number) {
  const c = a.ctx,
    rng = random(a.params.seed + 137);
  c.strokeStyle = '#c7ddcc99';
  c.lineWidth = 1.9;
  c.beginPath();
  for (let i = 0; i < amount * a.params.detail; i++) {
    const speed = 0.65 + rng() * 0.8,
      y = ((rng() * 1110 + t * speed * 1100) % 1110) - 80;
    const x = ((rng() * 1900 - y * 0.29 + 1900) % 1900) - 60,
      s = 7 + speed * 13;
    c.moveTo(x, y);
    c.lineTo(x - s * 0.31, y + s);
  }
  c.stroke();
}
function rainyHills(a: Paint, t: number) {
  const c = a.ctx;
  c.fillStyle = grad(c, -30, 800, ['#9eaeb1', '#c3cdb5', '#efc38d']);
  c.fillRect(-160, -150, 1960, 1200);
  ridge(a, 345, 100, 0.004, t * 23, '#789597', 0.5);
  ridge(a, 428, 140, 0.005, t * 53, '#537679', 0.12);
  ridge(a, 515, 112, 0.006, t * 107, '#385963', 0.8);
  const rng = random(a.params.seed + 89);
  for (let i = 0; i < 76 * a.params.detail; i++) {
    const x = ((rng() * 2000 + t * 60) % 2000) - 150,
      y = 550 + Math.sin((x - t * 16) * 0.006) * 42,
      h = 27 + rng() * 136;
    shape(
      c,
      `M${x},${y - h}l${-h * 0.2},${h * 0.62}l${h * 0.12},${-h * 0.06}l${-h * 0.2},${h * 0.43}h${h * 0.54}l${-h * 0.16},${-h * 0.43}l${h * 0.07},${h * 0.05}Z`,
      '#355762',
    );
  }
  rain(a, t, 225);
}
function flood(a: Paint, t: number, timing?: ShotTiming) {
  const c = a.ctx;
  zoom(a, 0.14 * ease(t), 835, 635);
  c.fillStyle = grad(c, 0, 680, ['#d0ab84', '#e1bf90', '#b78e70']);
  c.fillRect(-150, -100, 1900, 1100);
  hatch(a, 'M0 0H1600V635H0Z', 2, 1400, '#865f5225', -0.34);
  // The narrow glass looks out onto a patch of moving weather.
  inWorld(c, () => {
    c.clip(new Path2D('M8 0 H387 V482 L8 492Z'));
    rainyHills(a, t * 2.8);
  });
  rect(c, 0, 0, 18, 505, ink);
  rect(c, 184, -10, 15, 505, blue);
  rect(c, 0, 226, 390, 14, blue);
  shape(c, 'M0 474 L396 459 V489 L0 509Z', ink);
  shape(c, 'M0 514L420 493L345 533L0 568Z', '#a47b65');
  // Recessed, nicked door and a sliver of daylight under its sill.
  shape(c, 'M520 -15 L1185 -15 L1172 612L511 636Z', '#674f49');
  shape(c, 'M540 -20 L1153 -20 L1140 603L537 626Z', '#23394c');
  shape(c, 'M568 -20 L1132 -20 L1121 599L565 616Z', '#3d6474');
  shape(c, 'M606 19H826L824 337L602 344ZM855 16H1096L1085 328L852 337Z', '#294856');
  shape(c, 'M622 34H810L808 320L620 328ZM873 31H1078L1070 313L870 317Z', '#4d7480');
  shape(c, 'M602 370L1085 353L1080 550L600 563Z', '#2b4957');
  shape(c, 'M618 384L1068 369L1063 532L618 546Z', '#507582');
  hatch(a, 'M568 -20H1132L1121 599L565 616Z', 18, 1200, '#e0dcb738', -1.1);
  circle(c, 1040, 327, 19, '#223440');
  circle(c, 1038, 324, 13, gold);
  circle(c, 1035, 320, 4, pale);
  shape(c, 'M0 658L1600 596V930H0Z', '#846659');
  for (let i = 0; i < 15; i++) {
    const x = -1530 + i * 320;
    line(c, `M${802 + (x - 802) * 0.21} 615 L${x} 1010`, '#634f4c', 3);
  }
  hatch(a, 'M0 660L1600 596V930H0Z', 44, 800, '#e1bb8a49', -0.06);
  shape(c, 'M-50 792L305 687L618 720L466 940H-50Z', '#8a4541');
  for (let i = 0; i < 10; i++) line(c, `M${-75 + i * 40} 886l194 -162`, '#c58a6266', 3.6);
  shape(c, 'M560 612L1125 593L1125 603L564 624Z', '#d1d4a7');
  // A wet edge branches and advances onto the boards as a single connected pool.
  const grow = 0.07 + 0.93 * cueMotion(t, timing, 1, 0, 1, 0, 1),
    cy = 605,
    cx = 811;
  inWorld(c, () => {
    c.translate(cx, cy);
    c.scale(0.42 + 0.58 * grow, 0.075 + 0.925 * grow);
    const bank =
      'M-242 -7 Q-116 -20 160 -13 Q221 -11 300 11 Q359 22 283 46 Q244 58 319 71 Q424 91 465 123 Q509 142 375 145 Q267 147 335 190 Q393 225 263 225 Q177 226 164 235 Q130 263 20 250 Q-62 231 -96 240 Q-182 263 -235 235 Q-263 218 -205 193 Q-164 173 -265 182 Q-441 187 -459 155 Q-476 128 -353 121 Q-215 113 -265 94 Q-293 84 -370 91 Q-432 94 -433 77 Q-432 64 -329 54 Q-228 41 -268 26 Q-340 9 -242 -7Z';
    shape(c, bank, '#396f78');
    c.clip(new Path2D(bank));
    c.fillStyle = grad(c, 0, 272, ['#86b0a8', '#507e85', '#325c70']);
    c.fillRect(-550, -20, 1100, 300);
    const rng = random(a.params.seed + 723);
    for (let i = 0; i < 95 * a.params.detail; i++) {
      const x = rng() * 1150 - 575,
        y = rng() * 280 - 6,
        w = 16 + rng() * 100;
      line(
        c,
        `M${x + 9 * Math.sin(t * 11 + y)} ${y}q${w * 0.5} ${4 * Math.sin(t * 13 + x)} ${w} -2`,
        i % 4 ? '#bed8bf6b' : '#f5d79bba',
        1.2 + rng() * 2.5,
      );
    }
  });
}
function walker(
  a: Paint,
  x: number,
  y: number,
  s: number,
  t: number,
  older: boolean,
  hand: number,
  coated: boolean,
) {
  const c = a.ctx,
    gait = Math.sin(t),
    swing = Math.cos(t),
    skin = older ? '#a56548' : '#c1865a';
  inWorld(c, () => {
    c.translate(x, y - Math.abs(swing) * 5 * s);
    c.scale(s, s);
    c.rotate(0.05);
    const jacket = older ? '#d8a65b' : coated ? coral : '#87a699';
    // The heel and toe trade places; the trailing hem answers the stride half a beat later.
    for (const side of [-1, 1]) {
      const bend = side * gait,
        kneeX = 13 + 36 * bend,
        kneeY = -42 - 8 * Math.max(0, bend);
      const toe = 8 + 62 * bend,
        fy = -2 - 23 * Math.max(0, -side * swing);
      const path = `M${-7 + side * 7} -100Q${kneeX - 14} ${kneeY - 16} ${kneeX} ${kneeY}L${toe} ${fy}`;
      line(c, path, side < 0 ? '#2e3c4d' : '#484d58', 16);
      shape(c, `M${toe - 7} ${fy - 5}q12 -4 20 3l11 5q-5 7 -36 3Z`, ink);
    }
    const hem = -33 - 7 * Math.sin(t + 0.7);
    shape(
      c,
      `M-8 -191Q17 -197 23 -177L28 -141Q35 -110 43 -96Q11 -84 ${hem} -96Q-21 -132 -25 -151Q-26 -173 -8 -191Z`,
      jacket,
    );
    shape(c, `M-13 -177Q-21 -138 ${hem} -96l17 4q14 -46 14 -78Z`, older ? '#9e734d' : rust);
    line(c, 'M7 -178Q17 -140 20 -103', older ? '#f4ce80' : '#f2a077', 2.3);
    for (let i = 0; i < 3; i++) circle(c, 13 + i * 2, -159 + i * 17, 2.1, ink);
    shape(c, 'M-8 -184l-2 -18 20 -5 2 22 -8 13Z', skin);
    shape(
      c,
      'M-20 -223Q-16 -247 3 -246Q22 -247 28 -231L29 -221L36 -215L28 -212Q29 -190 14 -191Q-2 -191 -12 -203Z',
      skin,
    );
    shape(
      c,
      older
        ? 'M-24 -216Q-28 -248 -1 -252Q25 -253 29 -232Q15 -234 6 -240Q-1 -223 -9 -219L-9 -198L-24 -201Q-33 -215 -42 -203Q-37 -223 -24 -216Z'
        : 'M-22 -217Q-26 -247 -4 -250Q17 -254 29 -237L22 -231L13 -235L2 -227L-8 -225L-11 -211Z',
      ink,
    );
    circle(c, 22, -221, 1.6, ink);
    const endX = lerp(19 + swing * 39, 65, hand),
      endY = lerp(-130 - Math.max(swing, 0) * 20, -192, hand);
    line(c, `M8 -172Q${5 + endX * 0.42} ${endY + 25} ${endX} ${endY}`, jacket, 16);
    line(c, `M${endX} ${endY}l10 -4`, skin, 9);
    if (older) {
      const tail = -60 - 14 * Math.sin(t);
      shape(
        c,
        `M-10 -190Q-28 -192 -31 -182Q-47 -173 ${tail} -185Q-56 -168 -33 -173L-8 -183L9 -184L10 -193Z`,
        coral,
      );
    }
  });
}
function coat(c: Context, x: number, y: number, angle: number, s: number) {
  inWorld(c, () => {
    c.translate(x, y);
    c.rotate(angle);
    c.scale(s, s);
    shape(
      c,
      'M-20 6Q-14 -8 0 -7Q13 -9 20 5L34 22L49 60L37 69L21 40L26 102Q0 110 -30 99L-17 40L-34 69L-47 61L-33 24Z',
      coral,
    );
    shape(c, 'M-5 3L-14 17L-2 26L8 13L14 18L19 6L9 -2Z', '#ab4f43');
    line(c, 'M0 20L-2 98', '#9b4b3f', 2.7);
    for (let i = 0; i < 3; i++) circle(c, 3, 39 + i * 16, 2.1, ink);
  });
}
function escape(a: Paint, t: number, timing?: ShotTiming) {
  const c = a.ctx;
  const travel = cueMotion(t, timing, 0, 0.45, 1, 0.21, 0.95),
    roomShift = -82 * travel * a.params.camera;
  zoom(a, 0.055 * (1 - ease(t)), 650, 440);
  c.translate(roomShift, 0);
  rainyHills(a, t * 3.7);
  shape(c, 'M0 -50H1055L1052 662L0 725Z', '#c4a27e');
  hatch(a, 'M0 -50H1055V665L0 725Z', 177, 900, '#78584f31');
  shape(c, 'M0 -10H458L497 635L0 693Z', '#735a58');
  shape(c, 'M0 694L1029 634L1740 720L1820 960H-100Z', '#8e6958');
  hatch(a, 'M0 694L1029 634L1740 720L1820 960H-100Z', 666, 800, '#f1c18e44', -0.04);
  for (let i = 0; i < 12; i++) line(c, `M${-30 + i * 112} 647l${-300 + i * 64} 278`, '#644b48', 2.2);
  shape(c, 'M1014 -20H1069V645L1017 652Z', '#524b47');
  shape(c, 'M1059 0L1316 71V587L1062 645Z', '#345b66');
  shape(c, 'M1090 54L1283 104V326L1091 311ZM1092 354L1283 359V556L1093 592Z', '#456f74');
  hatch(a, 'M1060 0L1316 75V585L1060 647Z', 133, 1500, '#c8c9a955', -1.24);
  circle(c, 1257, 338, 9, gold);
  shape(c, 'M1060 646L1320 589L1720 684L1353 755Z', '#ccbd99');
  shape(c, 'M1065 646L1354 754L940 895L575 905Z', '#dab48655');
  shape(c, 'M506 299L823 290L824 314L506 326Z', '#674d44');
  for (const x of [540, 622, 700, 779]) {
    line(c, `M${x} 313q0 20 14 10l4 -8`, ink, 5);
    circle(c, x, 310, 3, gold);
  }
  const pickup = cueMotion(t, timing, 0, 0.01, 0.4, 0.035, 0.27);
  const bigX = lerp(556, 1379, travel),
    smallX = lerp(397, 1232, travel);
  const firstPose = 1 - cueMotion(t, timing, 0, 0.28, 0.48, 0.15, 0.36),
    bigY = lerp(722, 665, travel),
    smallY = lerp(735, 678, travel);
  walker(a, smallX, smallY, 1.18, travel * 30 - 1.6, false, 0, pickup > 0.98);
  walker(a, bigX, bigY, 1.78, travel * 31, true, firstPose, false);
  if (pickup < 0.98)
    coat(
      c,
      lerp(704, bigX - 48, pickup),
      lerp(324, bigY - 254, pickup),
      -0.13 + 0.3 * pickup,
      1.27 - 0.17 * pickup,
    );
  // Rain beyond the open door occludes the figures as they reach the outside.
  inWorld(c, () => {
    c.clip(new Path2D('M1319 0H1820V690L1319 591Z'));
    rain(a, t * 3.7, 115);
  });
}
function table(a: Paint, t: number) {
  const c = a.ctx;
  c.fillStyle = grad(c, -10, 900, ['#375a61', '#2b4653', '#152735']);
  c.fillRect(-130, -80, 1900, 1100);
  const rng = random(a.params.seed + 820);
  for (let i = 0; i < 380 * a.params.detail; i++) {
    const x = rng() * 1650 - 15,
      y = rng() * 1000 - 30,
      w = 18 + rng() * 155;
    line(
      c,
      `M${x} ${y}q${w * 0.45} 2 ${w} ${w * 0.08}`,
      i % 4 ? '#abc2ab20' : '#15293866',
      0.8 + rng() * 2.5,
    );
  }
  a.glow(460 + t * 77, 345, 590, '#f3c78b', 0.12);
}
/** The facing page is a paper theatre. Its roof, window, and trees stand up from the fold. */
function orientation(a: Paint, t: number, timing?: ShotTiming) {
  const c = a.ctx;
  table(a, t);
  zoom(a, 0.035 * ease(t), 1030, 470);
  const open = between(t * (timing?.duration ?? 12), 0, 1.8);
  c.translate(774, 0);
  c.scale(0.73 + 0.27 * open, 1);
  c.translate(-774, 0);
  const left = 'M62 150Q435 61 774 142L769 723Q430 648 80 744Z';
  const right = 'M774 142Q1132 57 1530 126L1512 735Q1125 670 769 723Z';
  shape(c, 'M45 162Q409 69 771 148Q1142 49 1546 123L1540 761Q1156 699 768 754Q426 686 61 781Z', ink);
  shape(c, 'M62 165Q414 72 772 151Q1150 59 1530 141L1519 749Q1144 683 770 738Q446 669 69 760Z', '#bd9b75');
  shape(c, left, '#edddba');
  shape(c, right, '#f5e5c4');
  hatch(a, left, 2129, 840, '#957f572a', -0.12);
  inWorld(c, () => {
    c.clip(new Path2D(left));
    const spine = c.createLinearGradient(660, 0, 780, 0);
    spine.addColorStop(0, '#b8996700');
    spine.addColorStop(1, '#97774c87');
    c.fillStyle = spine;
    c.fillRect(660, 55, 123, 700);
  });
  for (let j = 0; j < 3; j++)
    line(
      c,
      `M79 ${746 + j * 4}Q431 ${651 + j * 4} 768 ${724 + j * 4}Q1126 ${672 + j * 4} 1514 ${736 + j * 4}`,
      '#8f785e',
      1.4,
    );
  line(c, 'M774 145Q765 452 769 723', '#a68a62', 3.4);
  // Keep the teaching context in view until the instructor introduces the worked example.
  const storyCue = Math.max(0, (timing?.cues.length ?? 2) - 1);
  const turn = cueMotion(t, timing, storyCue, 0, 0.45, 0.64, 0.76);
  inWorld(c, () => {
    c.globalAlpha = 1 - between(turn, 0.03, 0.46);
    a.label('I Do', 137, 231, 61, '#39585b');
    a.text('History of AI', 129, 373, 91, ink);
    a.text('in education', 129, 481, 91, ink);
  });
  inWorld(c, () => {
    c.globalAlpha = between(turn, 0.5, 0.92);
    a.label('The story Sam reads', 137, 231, 53, '#39585b');
    a.text('Water under', 129, 379, 100, ink);
    a.text('the door', 130, 487, 101, ink);
  });
  // The title's waterline travels to the gutter as the illustration comes into relief.
  ribbon(c, cubic([142, 576], [258, 551], [359, 608], [508, 568]), between(t, 0, 0.28), rust, 5);
  a.glow(1280, 312, 282, gold, 0.16);
  const picture = 'M816 184Q1143 109 1487 162L1473 653Q1145 596 819 658Z';
  const rise = 0.14 + 0.86 * cueMotion(t, timing, storyCue, 0.2, 0.96, 0.69, 0.9);
  inWorld(c, () => {
    c.clip(new Path2D(picture));
    c.translate(797, 151);
    c.scale(0.455, 0.59);
    rainyHills(a, 0.38 + t * 1.7);
    ridge(a, 608, 60, 0.004, 45 * t, '#5c7976', 0.45);
    ridge(a, 688, 90, 0.006, 90 * t, '#334f59', 0.96);
    // Thin flows of reflected gold travel downstream, pointing towards the house.
    shape(c, 'M-30 830Q262 703 648 769T1650 696V990H-40Z', '#6e9b97');
    for (let j = 0; j < 22; j++) {
      const y = 780 + (j % 5) * 17;
      const x = ((j * 157 + t * (64 + j * 2)) % 1700) - 80;
      line(c, `M${x} ${y + 13 * Math.sin(j + t)}q41 -6 87 -1`, j % 3 ? '#c4cbb077' : '#edce94aa', 2.7);
    }
  });
  const base = 558;
  inWorld(c, () => {
    c.translate(1159, base);
    // Oblong shadows shorten as the cut paper rises from its hinge.
    shape(c, `M-151 0l209 19 162 ${-21 - 22 * (1 - rise)} -177 -18Z`, '#284d566b');
    c.scale(1, rise);
    shape(c, 'M-143 0v-151l94 -92 107 75v172Z', '#e5c58e');
    shape(c, 'M58 4v-172l122 -27v183Z', '#b48266');
    shape(c, 'M-169 -148l113 -116 135 91 -21 23 -110 -76 -96 93Z', '#34475a');
    shape(c, 'M-56 -264l131 -31 130 93 -126 29Z', '#b86148');
    hatch(a, 'M-56 -264l131 -31 130 93 -126 29Z', 2110, 3400, '#ebac6b77', -0.28);
    shape(c, 'M106 -272v-61l31 -6v77Z', rust);
    shape(c, 'M137 -339l16 8v64l-16 5Z', '#794f46');
    rect(c, -97, -118, 57, 57, '#436573');
    rect(c, -91, -112, 45, 44, '#eebd72');
    rect(c, -71, -113, 4, 47, '#6c756f');
    rect(c, -92, -92, 47, 4, '#6c756f');
    shape(c, 'M-12 0v-108l41 4V1Z', '#315360');
    circle(c, 19, -53, 3.2, gold);
    shape(c, 'M105 -127l48 -10v58l-48 9Z', '#4b6063');
    shape(c, 'M110 -120l37 -8v43l-37 7Z', '#e2b477');
    line(c, 'M-141 -1L58 4L178 -12', '#797057', 3);
  });
  // A printed leaf lifts from the gutter and briefly shows its unprinted reverse.
  // The underlying spread contains the story that the instructor will reason through.
  if (turn < 1) {
    inWorld(c, () => {
      const xScale = Math.cos(Math.PI * turn);
      c.translate(774, 0);
      c.scale(xScale, 1);
      c.translate(-774, -52 * Math.sin(Math.PI * turn));
      shape(c, right, xScale > 0 ? '#eee0bf' : '#e2cda7');
      if (xScale > 0) firstIllustration(a, t, picture, timing);
      if (xScale < 0) {
        const amount = between(turn, 0.75, 1);
        c.globalAlpha = amount;
        c.translate(774, 0);
        c.scale(-1, 1);
        c.translate(-774, 0);
        a.label('The story Sam reads', 137, 231, 53, '#39585b');
        a.text('Water under', 129, 379, 100, ink);
        a.text('the door', 130, 487, 101, ink);
      }
    });
  }
  if (turn === 1) line(c, picture, '#c0a57c', 2);
  shape(c, 'M1428 689l17 3 -4 103 -11 -12 -10 8Z', rust);
}

/** The same learner meets a teacher, then a computer, as the instructor poses the historical question. */
function firstIllustration(a: Paint, t: number, panel: string, timing?: ShotTiming) {
  const c = a.ctx;
  const computer = cueMotion(t, timing, 1, 0.04, 0.36, 0.25, 0.34);
  inWorld(c, () => {
    c.clip(new Path2D(panel));
    c.fillStyle = grad(c, 120, 700, ['#9db4ad', '#738a87', '#41646b']);
    c.fillRect(795, 105, 735, 595);
    // Afternoon light moves across the wall behind the desk.
    shape(c, `M${882 + 58 * t} 119h193l-167 475H748Z`, '#d4ceb080');
    shape(c, 'M779 553Q1003 511 1180 502L1521 473V720H772Z', '#926d52');
    line(c, 'M770 578Q1102 511 1530 494', '#bb9972', 9);
    if (computer < 1)
      inWorld(c, () => {
        c.globalAlpha = 1 - computer;
        // An adult at the opposite side of the desk leans toward the reader.
        shape(
          c,
          'M1223 476Q1204 435 1220 392Q1237 352 1295 351Q1354 351 1382 403L1423 486L1315 504Z',
          '#3e6370',
        );
        shape(
          c,
          'M1249 297Q1226 277 1237 247Q1245 215 1275 206Q1316 193 1339 223Q1357 254 1340 286L1327 311L1314 318L1315 351L1282 367L1256 349L1261 318Z',
          '#b98058',
        );
        shape(
          c,
          'M1234 260Q1223 242 1238 213Q1256 181 1298 184Q1339 183 1351 218Q1364 253 1341 285L1332 301L1321 292L1321 249Q1281 248 1268 222Q1259 248 1234 260Z',
          '#58473e',
        );
        circle(c, 1246, 266, 3.5, ink);
        const gesture = 8 * Math.sin(t * Math.PI * 3);
        shape(c, `M1244 369Q1265 388 1251 423L1229 463L1171 ${451 + gesture}l-2 -15 42 -1Z`, '#678690');
        shape(c, `M1174 ${438 + gesture}l-21 -13 -26 -2 -9 6 18 5 -21 1 2 7 28 8 29 5Z`, '#bd8a65');
        shape(c, 'M1067 498l96 -12 49 15 -99 20Z', '#efdbad');
        line(c, 'M1091 502l64 -8', '#a48668', 3);
      });
    const reply = cueMotion(t, timing, 1, 0.35, 0.92, 0.37, 0.56);
    if (computer > 0)
      inWorld(c, () => {
        c.globalAlpha = computer;
        // Display, stand and keyboard form one perspective drawing on the far side of the desk.
        shape(c, 'M1119 243L1404 222L1409 436L1127 471Z', '#213542');
        shape(c, 'M1134 258L1389 238L1393 416L1141 448Z', '#ead9ad');
        shape(c, 'M1245 445l45 -6v40l51 2v11l-139 12v-12l43 -9Z', '#344b54');
        shape(c, 'M1086 512L1286 490l37 26 -213 34Z', '#324853');
        for (let i = 0; i < 3; i++) line(c, `M${1106 + i * 6} ${517 + i * 8}l176 -22`, '#788583', 3);
        line(c, 'M1160 290l125 -12', '#6a827b', 7);
        line(c, 'M1161 314l181 -18', '#96a398', 6);
        line(c, `M1168 368l${reply * 105} ${reply * -12}`, rust, 9);
        if (reply < 1) rect(c, 1168 + reply * 105, 350 - reply * 12, 3, 23, '#3d585d');
      });
    // The sleeve, writing hand and coral collar keep the reader visible at phone size.
    const tap = 4 * Math.sin(14 * Math.PI * t) * (1 - reply);
    shape(c, 'M853 654Q840 537 878 481Q900 456 937 453Q985 455 1008 493L1034 606L1018 669Z', '#bc664f');
    shape(
      c,
      `M971 486Q993 479 1014 507L1035 ${537 + tap}L1099 ${518 + tap}L1112 ${535 + tap}L1030 ${563 + tap}Q1017 562 1003 549Z`,
      '#e18462',
    );
    shape(c, `M1092 ${520 + tap}l22 -13 24 5 9 7 -18 1 -18 14 -12 1Z`, '#c18d68');
    shape(
      c,
      'M900 412Q881 382 905 348Q930 316 967 332Q998 345 992 384L982 418Q975 435 955 440L955 455L929 470L907 456L914 439Z',
      '#b77c57',
    );
    shape(
      c,
      'M899 421Q880 412 878 382Q877 350 901 324Q931 295 968 310Q993 318 1003 344L1001 360Q984 359 966 349Q954 380 930 385L926 419L915 438Z',
      '#23384a',
    );
    circle(c, 984, 378, 3.4, ink);
    hatch(a, panel, 2356, 270, '#dfe0bc25');
  });
  line(c, panel, '#b19774', 2);
  inWorld(c, () => {
    c.globalAlpha = 1 - between(computer, 0, 0.5);
    a.label('Sam and the teacher', 1148, 660, 44, ink, 'center');
    c.globalAlpha = between(computer, 0.5, 1);
    a.label('Sam and the computer', 1148, 660, 44, ink, 'center');
  });
}

function pageEdge(c: Context, side: 'left' | 'right') {
  const sheet =
    side === 'left'
      ? 'M99 129Q463 78 795 155L784 717Q500 637 119 685Z'
      : 'M795 155Q1093 70 1472 125L1463 682Q1129 642 784 717Z';
  const top =
    side === 'left'
      ? 'M98 113Q460 62 795 142L784 691Q472 614 113 663Z'
      : 'M795 142Q1106 53 1475 112L1463 662Q1125 614 784 691Z';
  shape(c, sheet, '#bc9e79');
  shape(c, top, side === 'left' ? '#e7d3ab' : '#f3e2ba');
  line(c, side === 'left' ? 'M117 671Q458 621 781 699' : 'M789 700Q1114 632 1464 672', '#977c62', 2.4);
}
function writing(a: Paint, t: number, timing?: ShotTiming) {
  const c = a.ctx;
  table(a, t);
  zoom(a, 0.055 + 0.055 * t, 1005, 390);
  inWorld(c, () => {
    c.translate(0, 52);
    c.rotate(-0.025);
    shape(c, 'M76 123Q472 64 789 135Q1137 37 1497 107L1506 696Q1090 651 791 743Q492 655 94 720Z', '#0e2532');
    pageEdge(c, 'left');
    pageEdge(c, 'right');
    // A miniature relief print on the facing page anchors the notebook in the same storm.
    const vignette = 'M174 172Q428 126 687 185L688 412Q436 351 177 408Z';
    inWorld(c, () => {
      c.clip(new Path2D(vignette));
      c.translate(180, 158);
      c.scale(0.35, 0.39);
      rainyHills(a, t);
      shape(c, 'M230 487V280L420 157L597 282V489Z', '#64625c');
      shape(c, 'M190 299L419 139L638 294L610 304L420 178L217 310Z', ink);
      rect(c, 395, 347, 55, 142, blue);
      rect(c, 287, 329, 65, 70, gold);
    });
    a.label('Teacher asks', 189, 431, 43, '#39585b');
    a.text('Why was Mara', 189, 488, 57, ink);
    a.text('in a hurry?', 189, 557, 57, ink);
    a.label('Sam writes', 877, 226, 43, '#39585b');
    for (let j = 0; j < 4; j++) line(c, `M859 ${291 + j * 71}q236 -43 518 -10`, '#bbaa8a99', 1.7);
    const chars = 'The house was flooding.',
      n = Math.floor(lerp(0, chars.length + 0.99, cueMotion(t, timing, 0, 0.33, 1, 0.13, 0.78)));
    const first = chars.slice(0, Math.min(n, 13)),
      second = chars.slice(14, n);
    a.text(first, 877, 324, 60, ink, 'left', true);
    a.text(second, 879, 407, 60, ink, 'left', true);
    c.font = 'italic 60px Georgia, serif';
    const penX = 879 + c.measureText(n > 13 ? second : first).width + 8,
      penY = n > 13 ? 424 : 340;
    // Lower the shaft for the second line, then park the pencil in the empty outer margin.
    const wordsEnd = timing?.cues[0].end ?? 4.7;
    const lift = between(t * (timing?.duration ?? 6), wordsEnd, wordsEnd + 0.48);
    const penAngle = n > 13 ? 0.95 : 0.3;
    pencil(c, lerp(penX, 1355, lift), lerp(penY, 534, lift), lerp(penAngle, -0.36, lift), 0.9);
  });
}
function pencil(c: Context, x: number, y: number, angle: number, s: number) {
  inWorld(c, () => {
    c.translate(x, y);
    c.rotate(angle);
    c.scale(s, s);
    shape(c, 'M0 0L7 -26L155 -218L169 -207L19 -15Z', '#e4af57');
    shape(c, 'M12 -23L162 -214L167 -210L18 -18Z', '#a2603f');
    shape(c, 'M0 0L7 -26L20 -16Z', '#d6c198');
    shape(c, 'M0 0L3 -10L8 -6Z', ink);
    shape(c, 'M151 -215L164 -231Q168 -235 173 -230l5 5q4 4 0 8l-12 13Z', '#ce775d');
    line(c, 'M150 -210L162 -200', '#e1d7b9', 8);
  });
}
function gear(c: Context, x: number, y: number, r: number, rotation: number, n: number) {
  inWorld(c, () => {
    c.translate(x, y);
    c.rotate(rotation);
    c.beginPath();
    for (let k = 0; k < n * 4; k++) {
      const theta = (tau * k) / (n * 4),
        rr = k % 4 === 0 || k % 4 === 3 ? 0.86 * r : r;
      const px = Math.cos(theta) * rr,
        py = Math.sin(theta) * rr;
      if (k) c.lineTo(px, py);
      else c.moveTo(px, py);
    }
    c.closePath();
    c.fillStyle = '#b18d56';
    c.fill();
    circle(c, 0, 0, r * 0.72, '#3b4850');
    for (let k = 0; k < 5; k++) {
      c.rotate(tau / 5);
      shape(c, `M-7 0l-6 ${-r * 0.73}h23L8 0Z`, '#ad8652');
    }
    circle(c, 0, 0, r * 0.27, '#dfb669');
    circle(c, 0, 0, r * 0.09, ink);
  });
}
function shutter(a: Paint, t: number, timing?: ShotTiming) {
  const c = a.ctx;
  table(a, t);
  zoom(a, 0.025 + 0.09 * t, 795, 477);
  shape(c, 'M92 177L1392 114L1538 225L1460 766L171 799L74 720Z', '#111e2a');
  shape(c, 'M91 161L1384 101L1519 205L1425 733L158 775L74 700Z', '#8a684e');
  shape(c, 'M106 164L1380 122L1478 211L1398 708L174 755L95 685Z', '#314855');
  hatch(a, 'M106 164L1380 122L1478 211L1398 708L174 755L95 685Z', 504, 1900, '#adb2a63d', -0.77);
  for (const [x, y] of [
    [137, 192],
    [1349, 149],
    [221, 719],
    [1358, 672],
    [1431, 222],
  ]) {
    circle(c, x, y, 10, '#be9c66');
    line(c, `M${x - 4} ${y + 5}l8 -10`, ink, 2);
  }
  gear(c, 1353, 335, 88, 1.8 * t, 24);
  gear(c, 1287, 465, 64, -2.4 * t, 19);
  gear(c, 1381, 559, 72, 2.1 * t, 21);
  shape(c, 'M271 182L1238 158L1225 361L260 391Z', '#142933');
  shape(c, 'M289 200L1210 175L1199 343L284 369Z', '#ead8af');
  a.label('Sam’s answer', 321, 236, 42, '#46403b');
  a.text('The house was flooding.', 324, 301, 62, ink, 'left', true);
  const box = 'M230 444L1222 414L1208 625L224 658Z';
  shape(c, box, '#182936');
  inWorld(c, () => {
    c.clip(new Path2D(box));
    shape(c, 'M246 453L1212 428L1197 616L238 643Z', '#f0dfb8');
    a.label('Prepared answer', 283, 499, 42, '#46403b');
    a.text('Floodwater was coming inside.', 280, 561, 57, ink);
    const u = cueMotion(t, timing, 0, 0.38, 0.95, 0.2, 0.58),
      dx = 1008 * u;
    inWorld(c, () => {
      c.translate(dx, 0);
      shape(c, 'M217 434L1235 400L1227 643L203 672Z', '#819995');
      for (let j = 0; j < 24; j++)
        line(c, `M${170 + j * 49} 438l-14 232`, j % 3 ? '#b3bdab' : '#577575', 1.6);
      shape(c, 'M280 504L396 501L393 551L277 554Z', '#526368');
      shape(c, 'M293 514L389 511L387 529L291 532Z', gold);
    });
  });
  line(c, 'M232 431L1229 402M226 669L1205 640', '#b69d74', 5);
  for (let i = 0; i < 11; i++) line(c, `M${297 + i * 50} 704l29 -1`, '#9a927966', 3);
}
function ribbon(c: Context, points: Point[], t: number, color: string, weight: number) {
  const n = Math.max(1, Math.min(points.length - 1, Math.round(clamp(t) * (points.length - 1))));
  c.beginPath();
  c.moveTo(...points[0]);
  for (let j = 1; j <= n; j++) c.lineTo(...points[j]);
  c.strokeStyle = color;
  c.lineWidth = weight;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.stroke();
}
function cubic(p0: Point, p1: Point, p2: Point, p3: Point): Point[] {
  return Array.from({ length: 101 }, (_, i) => {
    const u = i / 100,
      v = 1 - u;
    return [
      v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
      v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1],
    ];
  });
}
function model(a: Paint, t: number, timing?: ShotTiming) {
  const c = a.ctx;
  table(a, t);
  zoom(a, 0.02 + 0.08 * t, 865, 430);
  // A continuous punched tape physically carries each observed entry to a different part of the sheet.
  shape(c, 'M-120 256Q295 70 652 181Q1065 371 1712 70V675Q1180 899 718 617Q348 458 -107 758Z', '#172e3d');
  shape(c, 'M-120 226Q295 40 652 151Q1065 341 1712 40V640Q1180 864 718 582Q348 423 -107 723Z', paper);
  const rng = random(a.params.seed + 1770);
  for (let i = 0; i < 60; i++) {
    const x = ((i * 37 + t * 72) % 1776) - 80;
    const y = 203 - 86 * Math.sin(x / 244) - x * 0.018;
    circle(c, x, y, 4 + rng() * 1.5, '#475b60');
  }
  const points = cubic([435, 390], [633, 148], [590, 720], [919, 483]),
    travel = cueMotion(t, timing, 0, 0.04, 1, 0.03, 0.72);
  ribbon(c, points, 1, '#998a6d55', 4);
  for (let j = 0; j < 13; j++) {
    const p = points[Math.floor((j / 12) * 100)];
    if (travel > j / 12) {
      circle(c, p[0], p[1], j % 4 === 0 ? 9 : 4, j % 4 === 0 ? rust : '#b08c67');
    }
  }
  ribbon(c, points, travel, rust, 4.5);
  const tip = points[Math.round(travel * 100)];
  circle(c, ...tip, 8, gold);
  a.label('Sam’s answer', 104, 253, 43, '#46403b');
  a.text('“The house', 103, 319, 53, ink, 'left', true);
  a.text('was flooding.”', 103, 383, 53, ink, 'left', true);
  inWorld(c, () => {
    c.globalAlpha = cueMotion(t, timing, 1, 0.31, 0.43, 0.47, 0.57);
    a.label('Tutor asks', 942, 332, 43, '#46403b');
    a.text('Which words', 941, 404, 59, ink);
    a.text('were your clue?', 941, 477, 59, ink);
  });
  pencil(c, lerp(1500, 1205, between(t, 0.67, 0.99)), lerp(721, 671, between(t, 0.67, 0.99)), 0.02, 0.74);
}
function clue(a: Paint, t: number, timing?: ShotTiming) {
  const c = a.ctx;
  table(a, t);
  zoom(a, 0.08 * t, 746, 401);
  inWorld(c, () => {
    c.translate(0, 10);
    c.rotate(-0.024);
    shape(c, 'M98 148Q631 37 1440 122L1477 730Q733 638 128 783Z', '#ad9576');
    shape(c, 'M91 131Q656 21 1454 104L1472 709Q714 620 109 761Z', '#f2e3bf');
    hatch(a, 'M91 131Q656 21 1454 104L1472 709Q714 620 109 761Z', 757, 950, '#8d725517', -0.18);
    // A tiny coastal engraving provides a consistent visual landmark as we return to the story.
    for (let i = 0; i < 5; i++) line(c, `M216 ${243 + i * 4}q78 -23 161 -13t158 -18`, '#63878b80', 1.7);
    shape(c, 'M258 229l61 -73 72 62Z', '#6e8484');
    shape(c, 'M332 233l79 -87 69 81Z', '#4d7178');
    shape(c, 'M395 164l17 -18 15 20 -14 -7 -10 7Z', '#e1d8b8');
    const x = 215,
      y = 369,
      size = 69,
      sentence = 'Water crept under the door.';
    a.text(sentence, x, y, size, ink);
    a.text('Mara grabbed her brother’s coat', x, 461, 57, '#526266');
    a.text('and hurried him outside.', x, 538, 57, '#526266');
    c.font = `${size}px Georgia, serif`;
    const length = c.measureText(sentence).width;
    const u = cueMotion(t, timing, 0, 0.22, 0.98, 0.13, 0.52),
      endX = x + length * u;
    if (u > 0) line(c, `M${x} ${y + 48}Q${x + (endX - x) * 0.5} ${y + 55} ${endX} ${y + 44}`, '#a95740', 7);
    const lift = cueMotion(t, timing, 1, 0, 0.35, 0.65, 0.94);
    pencil(c, endX + 12 * lift, y + 44 - 47 * lift, 0.11 - 0.11 * lift, 0.87);
  });
}
function conversation(a: Paint, t: number, timing?: ShotTiming) {
  const c = a.ctx;
  c.fillStyle = grad(c, 0, 900, ['#193b4a', '#294e5c', '#172e3e']);
  c.fillRect(-100, -60, 1800, 1050);
  const drift = t * 40 * a.params.camera;
  for (let i = 0; i < 5; i++)
    ridge(
      a,
      351 + i * 80,
      64 + i * 11,
      0.004,
      drift * (1 + i * 0.25),
      ['#395c66', '#446a70', '#3a626a', '#315660', '#243f50'][i],
      i * 0.63,
    );
  const top = cubic([-50, 361], [344, 235], [617, 484], [810, 339]),
    flow = cubic([810, 339], [1050, 81], [539, 741], [1501, 631]);
  ribbon(c, top, 1, '#a5b6a06b', 2);
  for (let j = 0; j < 17 * a.params.detail; j++) {
    const u = (t * 1.2 + j / 17) % 1,
      p = top[Math.round(u * 100)];
    circle(c, ...p, j % 5 ? 2 : 4, '#b5d0b4');
  }
  a.text('“Water crept under the door.”', 119, 198, 63, pale, 'left', true);
  const u = cueMotion(t, timing, 0, 0.06, 0.99, 0.02, 0.53);
  ribbon(c, flow, u, gold, 4);
  const point = flow[Math.round(u * 100)];
  circle(c, ...point, 8, gold);
  inWorld(c, () => {
    c.globalAlpha = cueMotion(t, timing, 1, 0, 0.1, 0.52, 0.58);
    shape(c, 'M82 270Q563 241 1088 266L1075 468Q561 457 84 482Z', '#182f40');
    a.label('Tutor asks', 126, 304, 43, gold);
    a.text('Why would water on the floor', 126, 370, 58, pale);
    a.text('make Mara hurry?', 126, 437, 58, pale);
  });
  inWorld(c, () => {
    const reply = cueMotion(t, timing, 2, 0, 0.18, 0.69, 0.75);
    c.globalAlpha = reply;
    c.translate(0, 17 * (1 - reply));
    shape(c, 'M470 493Q946 471 1491 490L1484 700Q940 681 474 700Z', paper);
    a.label('Sam explains', 520, 528, 43, '#39585b');
    a.text('They had to get out', 520, 591, 58, ink, 'left', true);
    a.text('before the water rose.', 520, 655, 58, ink, 'left', true);
  });
  rain(a, t * 2.7, 62);
}
function archive(a: Paint, t: number, timing?: ShotTiming) {
  const c = a.ctx;
  const travel = ease(t),
    slide = cueMotion(t, timing, 0, 0.01, 0.76, 0.04, 0.58),
    close = cueMotion(t, timing, 1, 0.01, 0.95, 0.5, 0.88);
  c.fillStyle = grad(c, 0, 930, ['#101b2a', '#253749', '#322f36']);
  c.fillRect(-160, -130, 1920, 1180);
  const scale = lerp(2.0, 1, travel * a.params.camera);
  inWorld(c, () => {
    c.translate(803, 430);
    c.scale(scale, scale);
    c.translate(-803, -430);
    const wood = '#3c4249',
      brass = '#bf9760';
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 5; col++) {
        const x = -138 + col * 378,
          y = -108 + row * 220;
        if (row === 2 && col === 2) continue;
        shape(c, `M${x} ${y}h352v198h-352Z`, wood);
        rect(c, x + 6, y + 9, 338, 183, row % 2 ? '#2d4050' : '#344859');
        line(c, `M${x + 8} ${y + 189}h331M${x + 11} ${y + 13}h330`, '#62605a', 2);
        rect(c, x + 115, y + 67, 127, 41, '#7f725d');
        rect(c, x + 120, y + 72, 117, 30, '#263341');
        line(c, `M${x + 145} ${y + 128}q28 18 61 -1`, '#9c825f', 6);
      }
    const x = 618,
      y = 332;
    rect(c, x, y, 352, 198, '#111d29');
    rect(c, x + 10, y + 11, 332, 178, '#1a2832');
    // The illustrated sheet disappears behind the lip before the brass pull comes flush.
    const depth = 70 * (1 - close);
    shape(
      c,
      `M${x + 12} ${y + 93}L${x - 30} ${y + 151 + depth}L${x + 348} ${y + 151 + depth}L${x + 332} ${y + 96}Z`,
      '#766d5b',
    );
    inWorld(c, () => {
      c.clip(new Path2D(`M${x - 45} ${y - 180}h445v${330 + depth}h-445Z`));
      c.translate(lerp(525, 659, slide), lerp(298, 513, slide));
      c.rotate(-0.12 + slide * 0.19);
      const f = 1 - slide * 0.34;
      c.scale(f, f);
      shape(c, 'M0 -71Q160 -96 325 -62L319 52Q150 37 0 72Z', paper);
      for (let j = 0; j < 4; j++) line(c, `M25 ${-40 + j * 18}q82 -13 ${192 - j * 13} -1`, '#89918a', 2);
      line(c, 'M24 -13q74 -11 136 -3', rust, 5);
    });
    const faceY = y + 45 + depth;
    shape(
      c,
      `M${x - 17 * (1 - close)} ${faceY}L${x + 354} ${faceY - 1}L${x + 351} ${y + 196 + depth}L${x - 17 * (1 - close)} ${y + 197 + depth}Z`,
      '#3b5260',
    );
    rect(c, x + 15, faceY + 9, 320, 4, '#718181');
    const cy = faceY + 51;
    rect(c, x + 108, cy - 21, 133, 43, brass);
    rect(c, x + 113, cy - 16, 123, 32, '#343f48');
    for (const xx of [x + 113, x + 236]) circle(c, xx, cy, 2.7, pale);
    line(c, `M${x + 139} ${cy + 43}q30 20 64 0`, brass, 7);
    a.glow(801, 440, 270, gold, 0.125 + 0.1 * close);
  });
  const rng = random(a.params.seed + 8401);
  for (let i = 0; i < 42 * a.params.detail; i++) {
    const u = rng(),
      x = (rng() * 1620 + t * (6 + u * 43)) % 1620,
      y = (rng() * 940 - 20 - t * (16 + u * 27) + 940) % 940;
    circle(c, x, y, 0.7 + u * 1.7, '#dfbf8e77');
  }
}
type MarginNote = {
  cue: number;
  onset: number;
  origin: Point;
  target: Point;
};
// Leaders end beside the evidence. The entire lower fifth stays free for the selectable captions.
const marginNotes: Record<string, MarginNote> = {
  answer: { cue: 1, onset: 0, origin: [1320, 110], target: [1220, 310] },
  shutter: { cue: 1, onset: 0, origin: [1340, 114], target: [1242, 495] },
  model: { cue: 0, onset: 0.6, origin: [645, 110], target: [620, 375] },
  clue: { cue: 0, onset: 0.67, origin: [1255, 111], target: [1115, 369] },
  conversation: { cue: 2, onset: 0, origin: [1420, 120], target: [1445, 508] },
};

function annotate(a: Paint, id: string, text: string, t: number, timing?: ShotTiming) {
  const note = marginNotes[id];
  if (!note || !text) return;
  const datum = timing?.cues[note.cue];
  const now = t * (timing?.duration ?? 9);
  const start = datum ? lerp(datum.start, datum.end, note.onset) : 3.8;
  if (now <= start) return;
  const c = a.ctx;
  const [ox, oy] = note.origin;
  const [tx, ty] = note.target;
  const leader = between(now, start, start + 0.44);
  const endX = lerp(ox, tx, leader),
    endY = lerp(oy, ty, leader);
  inWorld(c, () => {
    const size = 59;
    c.font = `600 ${size}px Arial, sans-serif`;
    const width = Math.ceil(c.measureText(text).width) + 58;
    const x = clampWithin(ox - width * 0.65, 45, 1555 - width);
    const y = oy - 81;
    c.globalAlpha = between(now, start, start + 0.28);
    // A fine light edge under the ink keeps the pointer readable over either paper or wood.
    const stem = `M${ox} ${oy - 6}Q${ox} ${lerp(oy, endY, 0.36)} ${endX} ${endY}`;
    line(c, stem, '#f2d394', 8);
    line(c, stem, '#203846', 3.4);
    circle(c, endX, endY, 11, '#19303e');
    circle(c, endX, endY, 6.4, gold);
    rect(c, x + 3, y + 6, width, 81, '#182b3d70');
    shape(
      c,
      `M${x} ${y + 2}Q${x + width * 0.5} ${y - 2} ${x + width} ${y + 1}l-3 77Q${x + width * 0.62} ${y + 85} ${x + 1} ${y + 81}Z`,
      '#172f40',
    );
    rect(c, x + 1, y + 2, 7, 75, gold);
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillStyle = pale;
    c.fillText(text, x + 30, y + 43);
  });
}
function clampWithin(value: number, low: number, high: number) {
  return Math.max(low, Math.min(high, value));
}

const shots: Record<string, (a: Paint, t: number, timing?: ShotTiming) => void> = {
  orientation,
  flood,
  escape,
  answer: writing,
  shutter,
  model,
  clue,
  conversation,
  archive,
};
/** The seed fixes pigment and surface marks, while the cut's clock drives the physical action. */
export function drawFilm(
  p: P5,
  scene: { id: string; annotation?: string },
  progress: number,
  parameters: ArtParameters = defaultArtParameters,
  timing?: ShotTiming,
) {
  const t = clamp(progress),
    c = p.drawingContext as CanvasRenderingContext2D;
  p.randomSeed(parameters.seed);
  p.noiseSeed(parameters.seed);
  c.save();
  c.setTransform(p.width / 1600, 0, 0, p.height / 900, 0, 0);
  const a = new Paint(p, t, parameters);
  inWorld(c, () => (shots[scene.id] ?? flood)(a, t, timing));
  finishPainting(a);
  if (scene.annotation) annotate(a, scene.id, scene.annotation, t, timing);
  c.restore();
}
