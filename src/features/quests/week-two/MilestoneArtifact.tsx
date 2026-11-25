import { useEffect, useRef } from 'react';
import type { WeekTwoMilestoneId } from '@/curriculum/week-02/lesson';
import './milestone-artifact.css';

type Context = CanvasRenderingContext2D;
type Point = readonly [number, number];
type Scene = (pen: Context, time: number) => void;

const width = 720;
const height = 208;
const brass = '#eac48d';
const mint = '#a1ead7';
const faint = '#537a77';
const ink = '#112e35';
const duration = 2250;

function progress(time: number, start: number, end: number) {
  const value = Math.max(0, Math.min(1, (time - start) / (end - start)));
  return value * value * (3 - 2 * value);
}

function plate(
  pen: Context,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string | CanvasGradient,
  border = faint,
) {
  pen.beginPath();
  pen.roundRect(x, y, w, h, 5);
  pen.fillStyle = fill;
  pen.fill();
  pen.strokeStyle = border;
  pen.lineWidth = 1;
  pen.stroke();
}

function line(pen: Context, start: Point, end: Point, color: string, fraction = 1, weight = 1.6) {
  pen.strokeStyle = color;
  pen.lineWidth = weight;
  pen.beginPath();
  pen.moveTo(...start);
  pen.lineTo(start[0] + (end[0] - start[0]) * fraction, start[1] + (end[1] - start[1]) * fraction);
  pen.stroke();
}

function dot(pen: Context, [x, y]: Point, radius: number, fill: string) {
  pen.beginPath();
  pen.arc(x, y, radius, 0, Math.PI * 2);
  pen.fillStyle = fill;
  pen.fill();
}

function mark(pen: Context, value: string, x: number, y: number, color: string, size = 24) {
  pen.font = '500 ' + size + 'px ui-monospace, monospace';
  pen.fillStyle = color;
  pen.textAlign = 'center';
  pen.textBaseline = 'middle';
  pen.fillText(value, x, y);
}

function trace(pen: Context, start: Point, end: Point, fraction: number, color: string) {
  line(pen, start, end, faint);
  if (fraction === 0) return;
  pen.save();
  pen.shadowColor = color;
  pen.shadowBlur = 9;
  line(pen, start, end, color, fraction, 2);
  dot(pen, [start[0] + (end[0] - start[0]) * fraction, start[1] + (end[1] - start[1]) * fraction], 3, color);
  pen.restore();
}

function device(pen: Context, time: number) {
  const slide = progress(time, 0.15, 0.76);
  const metal = pen.createLinearGradient(0, 44, 0, 169);
  metal.addColorStop(0, '#375154');
  metal.addColorStop(0.49, '#243c40');
  metal.addColorStop(1, '#142227');
  plate(pen, 150, 43, 420, 124, metal, '#997e59');
  plate(pen, 169, 57, 382, 96, '#17272a', '#191a17');
  plate(pen, 185, 65, 158, 80, '#d3b794', '#a08764');
  plate(pen, 352, 65, 183, 80, '#e1c598', '#a08764');
  mark(pen, 'Lima', 266, 108, '#392d23');
  mark(pen, 'LIMA', 444, 108, '#392d23');
  pen.save();
  pen.beginPath();
  pen.rect(352, 65, 183, 80);
  pen.clip();
  const offset = 183 * slide;
  plate(pen, 352 + offset, 65, 183, 80, metal, brass);
  for (let x = 359; x < 533; x += 7) {
    line(pen, [x + offset, 70], [x + offset, 142], x % 2 ? '#314d51' : '#263639', 1, 0.9);
  }
  plate(pen, 363 + offset, 94, 27, 22, '#b59a71', '#7a654e');
  pen.restore();
  for (const x of [160, 560]) {
    for (const y of [52, 158]) {
      dot(pen, [x, y], 3.8, '#9d845d');
      line(pen, [x - 2, y + 1], [x + 2, y - 1], '#282725', 1, 0.9);
    }
  }
}

function network(pen: Context, time: number, causal: boolean) {
  const nodes = causal
    ? [
        { center: [191, 100] as Point, title: 'Algae' },
        { center: [360, 100] as Point, title: 'Food' },
        { center: [529, 100] as Point, title: 'Fish' },
      ]
    : [
        { center: [158, 100] as Point, title: 'Lima' },
        { center: [328, 70] as Point, title: 'Peru' },
        { center: [523, 100] as Point, title: 'S. America' },
        { center: [328, 144] as Point, title: 'Ecuador' },
      ];
  trace(pen, nodes[0].center, nodes[1].center, progress(time, 0.07, 0.45), brass);
  trace(pen, nodes[1].center, nodes[2].center, progress(time, 0.43, 0.83), mint);
  if (nodes[3]) line(pen, nodes[3].center, nodes[2].center, faint);
  for (const [
    index,
    {
      center: [x, y],
      title,
    },
  ] of nodes.entries()) {
    const emphasis = index === 0 || time > index * 0.28;
    const w = title.length * 12 + 20;
    plate(pen, x - w / 2, y - 20, w, 40, ink, emphasis ? (index === 0 ? brass : mint) : faint);
    mark(pen, title, x, y + 1, emphasis ? '#e9f7ed' : '#9fbfbb', 20);
  }
}

function turtle(pen: Context, time: number) {
  for (let x = 230; x <= 490; x += 26) line(pen, [x, 35], [x, 165], '#31585c', 1, 1);
  for (let y = 35; y <= 165; y += 26) line(pen, [230, y], [490, y], '#31585c', 1, 1);
  const across = progress(time, 0.08, 0.45);
  const up = progress(time, 0.49, 0.9);
  const [start, turn, finish] = [
    [308, 139],
    [360, 139],
    [360, 87],
  ] as const;
  trace(pen, start, turn, across, mint);
  trace(pen, turn, finish, up, mint);
  pen.save();
  pen.translate(308 + across * 52, 139 - up * 52);
  pen.rotate((-Math.PI / 2) * progress(time, 0.43, 0.55));
  pen.beginPath();
  pen.moveTo(11, 0);
  pen.lineTo(-8, 8);
  pen.lineTo(-4, 0);
  pen.lineTo(-8, -8);
  pen.closePath();
  pen.fillStyle = brass;
  pen.fill();
  pen.restore();
}

function routes(pen: Context, time: number, adaptive: boolean) {
  const pair = [
    { from: [260, 70] as Point, end: [450, 64] as Point, color: mint },
    { from: [260, 135] as Point, end: [450, 141] as Point, color: brass },
  ];
  for (const [index, { from, end, color }] of pair.entries()) {
    const origin: Point = adaptive ? from : [254, 103];
    const joint: Point = [343, end[1]];
    trace(pen, origin, joint, progress(time, 0.08 + index * 0.13, 0.47 + index * 0.14), color);
    trace(pen, joint, end, progress(time, 0.4 + index * 0.13, 0.78 + index * 0.13), color);
    const cardHeight = adaptive && index === 1 ? 48 : 39;
    plate(pen, end[0], end[1] - cardHeight / 2, 90, cardHeight, '#204149', color);
    for (let row = 0; row < (adaptive && index === 1 ? 3 : 2); row++) {
      const y = end[1] - cardHeight / 2 + 12 + row * 10;
      line(pen, [end[0] + 12, y], [end[0] + 73 - row * 12, y], color, 1, 1);
    }
  }
  if (adaptive) {
    for (const [
      index,
      {
        from: [x, y],
        color,
      },
    ] of pair.entries()) {
      plate(pen, x - 61, y - 17, 61, 34, ink, color);
      mark(pen, index === 0 ? 'A' : 'B', x - 30, y + 1, color, 22);
    }
  } else {
    plate(pen, 161, 82, 108, 43, ink, brass);
    mark(pen, '3(x + 2)', 215, 103, '#e9f7ed', 20);
  }
}

function dialogue(pen: Context, time: number) {
  const turns = [
    { x: 175, y: 43, color: mint, start: 0.04, end: 0.4, lengths: [155, 104] },
    { x: 308, y: 113, color: brass, start: 0.4, end: 0.88, lengths: [121, 168] },
  ];
  for (const { x, y, color, start, end, lengths } of turns) {
    const reveal = progress(time, start, end);
    pen.save();
    pen.globalAlpha = Math.min(reveal * 4, 1);
    pen.translate(0, 10 * (1 - reveal));
    plate(pen, x, y, 239, 49, '#163841', color);
    pen.beginPath();
    pen.moveTo(x + 21, y + 49);
    pen.lineTo(x + 21, y + 57);
    pen.lineTo(x + 35, y + 49);
    pen.fillStyle = '#163841';
    pen.fill();
    pen.stroke();
    for (const [index, length] of lengths.entries()) {
      const baseline = y + 17 + index * 15;
      line(pen, [x + 18, baseline], [x + 18 + length, baseline], color, reveal, 2.8);
    }
    if (y > 100) mark(pen, '?', x + 216, y + 25, brass, 26);
    pen.restore();
  }
}

function study(pen: Context, time: number) {
  mark(pen, 'Practice', 222, 41, brass, 22);
  mark(pen, 'Exam', 498, 41, mint, 22);
  for (const [index, color] of [brass, '#83d3c4', '#b8c6bb'].entries()) {
    const y = 76 + index * 36;
    const across = progress(time, 0.11 + index * 0.11, 0.71 + index * 0.11);
    trace(pen, [262, y], [458, y], across, color);
    plate(pen, 183, y - 12, 79, 24, ink, color);
    plate(pen, 458, y - 12, 79, 24, ink);
    mark(pen, ['GPT-4', 'AI tutor', 'No AI'][index], 222, y, color, 16);
    mark(pen, 'No AI', 498, y, '#c9d8d2', 17);
  }
}

const scenes: Record<WeekTwoMilestoneId, Scene> = {
  '1958': device,
  '1970': (pen, time) => network(pen, time, false),
  '1980': turtle,
  '1995': (pen, time) => routes(pen, time, false),
  '2008': (pen, time) => network(pen, time, true),
  '2019': (pen, time) => routes(pen, time, true),
  '2022': dialogue,
  '2025': study,
};

export function MilestoneArtifact({ year, animate }: { year: WeekTwoMilestoneId; animate: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const surface = canvas.current;
    const pen = surface?.getContext('2d');
    if (!surface || !pen) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let time = animate && !motion.matches ? 0 : 1;
    let animation = 0;

    function draw() {
      if (!surface || !pen || !surface.clientWidth) return;
      const density = Math.min(2, window.devicePixelRatio || 1);
      const pixelsWide = Math.round(surface.clientWidth * density);
      const pixelsHigh = Math.round(surface.clientHeight * density);
      if (surface.width !== pixelsWide || surface.height !== pixelsHigh) {
        surface.width = pixelsWide;
        surface.height = pixelsHigh;
      }
      pen.resetTransform();
      pen.clearRect(0, 0, pixelsWide, pixelsHigh);
      const scale = Math.min(pixelsWide / 485, pixelsHigh / height);
      pen.setTransform(
        scale,
        0,
        0,
        scale,
        (pixelsWide - width * scale) / 2,
        (pixelsHigh - height * scale) / 2,
      );
      pen.lineCap = 'round';
      scenes[year](pen, time);
    }

    function finish() {
      visibility.disconnect();
      window.cancelAnimationFrame(animation);
      time = 1;
      draw();
    }

    const visibility = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio < 0.25) return;
        visibility.disconnect();
        const start = performance.now();
        function frame(now: number) {
          time = Math.max(0, Math.min(1, (now - start) / duration));
          draw();
          if (time < 1) animation = window.requestAnimationFrame(frame);
        }
        animation = window.requestAnimationFrame(frame);
      },
      { threshold: 0.25 },
    );

    const resize = new ResizeObserver(draw);
    resize.observe(surface);
    motion.addEventListener('change', finish);
    if (time === 0) visibility.observe(surface);
    draw();
    return () => {
      visibility.disconnect();
      window.cancelAnimationFrame(animation);
      motion.removeEventListener('change', finish);
      resize.disconnect();
    };
  }, [year, animate]);

  return (
    <div className="w02-artifact" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
