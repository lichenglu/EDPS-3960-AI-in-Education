import type P5 from 'p5';

export const filmPalette = {
  night: '#0b1a2a',
  deep: '#112c3c',
  blue: '#28566b',
  teal: '#397c7d',
  sea: '#66a29a',
  paper: '#e5d3ae',
  light: '#f8ead0',
  gold: '#e5b65f',
  coral: '#d96c51',
  red: '#a74742',
  shadow: '#132b36',
  ink: '#203d46',
  dusk: '#6b7d88',
} as const;
export type Point = readonly [number, number];
export type ArtParameters = { seed: number; detail: number; grain: number; camera: number };
export const defaultArtParameters: ArtParameters = { seed: 396002, detail: 1, grain: 0.52, camera: 1 };
export const clamp = (n: number) => Math.min(1, Math.max(0, n));
export const ease = (t: number) => {
  const n = clamp(t);
  return n * n * (3 - 2 * n);
};
export const between = (t: number, a: number, b: number) => ease((t - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function hash(value: string) {
  let n = 2166136261;
  for (let i = 0; i < value.length; i++) n = Math.imul(n ^ value.charCodeAt(i), 16777619);
  return n >>> 0;
}

export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mix(a: string, b: string, t: number) {
  const av = parseInt(a.slice(1), 16),
    bv = parseInt(b.slice(1), 16);
  const rgb = [16, 8, 0].map((shift) => Math.round(lerp((av >> shift) & 255, (bv >> shift) & 255, t)));
  return `rgb(${rgb.join(',')})`;
}

/** Seeded pigment, a fixed 1600x900 stage, and frame-addressable brush marks. */
export class Paint {
  readonly ctx: CanvasRenderingContext2D;
  constructor(
    readonly p: P5,
    readonly time: number,
    readonly params = defaultArtParameters,
  ) {
    this.ctx = p.drawingContext as CanvasRenderingContext2D;
  }

  path(d: string, color: string, salt = 0, texture = 1) {
    const c = this.ctx,
      shape = new Path2D(d),
      rng = random(this.params.seed + salt);
    c.save();
    c.fillStyle = color;
    c.fill(shape);
    c.clip(shape);
    const count = Math.round(52 * this.params.detail * texture);
    for (let i = 0; i < count; i++) {
      const y = rng() * 940 - 20,
        x = rng() * 1800 - 100;
      c.strokeStyle = mix(color, rng() < 0.5 ? '#ffffff' : '#000000', 0.09 + rng() * 0.13);
      c.globalAlpha = 0.13 + rng() * 0.2;
      c.lineWidth = 1 + rng() * 9;
      c.beginPath();
      c.moveTo(x, y);
      c.bezierCurveTo(x + 130, y - 8, x + 450, y + 9, x + 720, y - 1);
      c.stroke();
    }
    c.restore();
  }

  polygon(points: readonly Point[], color: string, salt = 0, texture = 1) {
    this.path('M' + points.map(([x, y]) => `${x},${y}`).join('L') + 'Z', color, salt, texture);
  }

  ellipse(x: number, y: number, rx: number, ry: number, color: string, salt = 0) {
    this.path(`M${x - rx},${y}a${rx},${ry} 0 1,0 ${rx * 2},0a${rx},${ry} 0 1,0 ${-rx * 2},0`, color, salt);
  }

  stroke(points: readonly Point[], color: string, width = 2, progress = 1, salt = 0) {
    if (progress <= 0 || points.length < 2) return;
    const c = this.ctx,
      count = Math.max(1, Math.min(points.length - 1, Math.floor((points.length - 1) * progress)));
    const rng = random(this.params.seed + salt);
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const passes = Math.max(2, Math.ceil(Math.min(8, width * 0.6) * this.params.detail));
    for (let k = 0; k < passes; k++) {
      c.globalAlpha = k === 0 ? 0.65 : 0.12;
      c.strokeStyle = k % 3 ? color : mix(color, '#f8ead0', 0.18);
      c.lineWidth = k === 0 ? width : Math.max(0.6, width / 5);
      const offset = (rng() - 0.5) * width;
      c.beginPath();
      for (let i = 0; i <= count; i++) {
        const [x, y] = points[i];
        const rough = (this.p.noise(i * 0.37, salt * 0.003) - 0.5) * 2 * Math.min(1, width * 0.1);
        if (i === 0) c.moveTo(x + offset, y + rough);
        else c.lineTo(x + offset, y + rough);
      }
      c.stroke();
    }
    c.restore();
  }

  text(
    text: string,
    x: number,
    y: number,
    size = 36,
    color: string = filmPalette.light,
    align: CanvasTextAlign = 'left',
    italic = false,
  ) {
    const c = this.ctx;
    c.save();
    c.fillStyle = color;
    c.textAlign = align;
    c.textBaseline = 'middle';
    c.font = `${italic ? 'italic ' : ''}${size}px Georgia, serif`;
    c.fillText(text, x, y);
    c.restore();
  }

  label(
    text: string,
    x: number,
    y: number,
    size = 21,
    color: string = filmPalette.paper,
    align: CanvasTextAlign = 'left',
  ) {
    const c = this.ctx;
    c.save();
    c.fillStyle = color;
    c.textAlign = align;
    c.textBaseline = 'middle';
    c.font = `500 ${size}px "Atkinson Hyperlegible Next", Arial, sans-serif`;
    c.fillText(text, x, y);
    c.restore();
  }

  wash(color: string = filmPalette.night) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(-100, -100, 1800, 1100);
  }

  glow(x: number, y: number, radius: number, color: string, alpha = 0.3) {
    const c = this.ctx;
    c.save();
    c.globalAlpha = alpha;
    const glow = c.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'transparent');
    c.fillStyle = glow;
    c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    c.restore();
  }

  person(x: number, y: number, scale: number, facing = 1, phase = 0, coat: string = filmPalette.coral) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(scale * facing, scale);
    const bend = Math.sin(phase) * 6;
    this.path('M-12,-174 Q-20,-147 -11,-117 L-33,-46 L-6,-40 L6,-106 L17,-55 L43,-63 L17,-135Z', coat, 91);
    this.path('M-10,-127 L-21,-91 L-65,-67 L-60,-54 L-8,-74 L5,-115Z', filmPalette.gold, 92);
    this.path(`M-20,-52 L-18,-9 L${-37 + bend},34 L${-21 + bend},41 L4,-6 L10,-50Z`, filmPalette.gold, 93);
    this.path(`M8,-55 L24,-7 L${55 - bend},10 L${49 - bend},24 L8,3 L-8,-36Z`, filmPalette.red, 94);
    this.path('M-12,-170 Q-15,-195 5,-204 Q23,-201 27,-181 L20,-160 L2,-153Z', filmPalette.gold, 95);
    this.path('M-15,-179 Q-24,-207 0,-218 Q24,-219 29,-193 L10,-194 L1,-172Z', filmPalette.red, 96);
    this.polygon(
      [
        [21, -183],
        [39, -178],
        [23, -173],
      ],
      filmPalette.paper,
      97,
      0,
    );
    c.restore();
  }
}

export function spline(points: readonly Point[], samples = 100): Point[] {
  const result: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * (points.length - 1),
      index = Math.min(points.length - 2, Math.floor(t)),
      f = t - index;
    const a = points[Math.max(0, index - 1)],
      b = points[index],
      c = points[index + 1],
      d = points[Math.min(points.length - 1, index + 2)];
    result.push([
      0.5 *
        (2 * b[0] +
          (-a[0] + c[0]) * f +
          (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * f * f +
          (-a[0] + 3 * b[0] - 3 * c[0] + d[0]) * f * f * f),
      0.5 *
        (2 * b[1] +
          (-a[1] + c[1]) * f +
          (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * f * f +
          (-a[1] + 3 * b[1] - 3 * c[1] + d[1]) * f * f * f),
    ]);
  }
  return result;
}

const textures = new Map<number, HTMLCanvasElement>();
export function finishPainting(paint: Paint) {
  const c = paint.ctx,
    key = paint.params.seed;
  let tile = textures.get(key);
  if (!tile) {
    tile = document.createElement('canvas');
    tile.width = 512;
    tile.height = 512;
    const t = tile.getContext('2d')!,
      image = t.createImageData(512, 512),
      rng = random(key);
    for (let i = 0; i < image.data.length; i += 4) {
      const value = Math.round(110 + rng() * 75);
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
    t.putImageData(image, 0, 0);
    if (textures.size > 5) textures.clear();
    textures.set(key, tile);
  }
  c.save();
  c.globalCompositeOperation = 'soft-light';
  c.globalAlpha = paint.params.grain;
  c.fillStyle = c.createPattern(tile, 'repeat')!;
  c.fillRect(0, 0, 1600, 900);
  c.restore();
  const shade = c.createRadialGradient(800, 430, 260, 800, 450, 1050);
  shade.addColorStop(0, 'transparent');
  shade.addColorStop(1, '#02091290');
  c.fillStyle = shade;
  c.fillRect(0, 0, 1600, 900);
}
