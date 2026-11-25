import { readFile, writeFile } from 'node:fs/promises';

import timings from '../art/week-two-film/edit-timings.json';
const duration = timings.reduce((sum, shot) => sum + shot.frames, 0) / 24;
const template = await readFile('art/week-two-film/vendor/algorithmic-art/templates/viewer.html', 'utf8');
const result = await Bun.build({
  entrypoints: ['art/week-two-film/viewer-entry.ts'],
  target: 'browser',
  format: 'iife',
  minify: true,
});
if (!result.success) throw new AggregateError(result.logs, 'Film art build failed');
const code = await result.outputs[0].text();
const p5 = await readFile('node_modules/p5/lib/p5.min.js', 'utf8');
const parameter = (name: string, id: string, min: number, max: number, step: number, value: number) =>
  `<div class="control-group"><label for="${id}">${name}</label><div class="slider-container"><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" oninput="updateParam('${id}',this.value)"><span class="value-display" id="${id}-value">${value}</span></div></div>`;
let html = template
  .replace('<title>Generative Art Viewer</title>', '<title>Water under the door · Film atelier</title>')
  .replace(
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js"></script>',
    () => '<script>' + p5.replaceAll('</script', '<\\/script') + '</script>',
  )
  .replace('TITLE - EDIT', 'Water under the door')
  .replace(
    'SUBHEADER - EDIT',
    'Three tutoring designs respond to Sam’s answer about Mara and the rising water.',
  )
  .replace('value="12345"', 'value="396002"');
const parameterStart = html.indexOf('                <!-- Particle Count -->');
const parameterEnd = html.indexOf('            <!-- Actions Section');
html =
  html.slice(0, parameterStart) +
  parameter('Film time', 'time', 0, duration, 0.1, 0) +
  parameter('Brush detail', 'detail', 0.35, 1.5, 0.05, 1) +
  parameter('Pigment grain', 'grain', 0, 1, 0.05, 0.52) +
  parameter('Camera travel', 'camera', 0, 1.5, 0.1, 1) +
  '<button class="button secondary" id="play-art" onclick="togglePlayback()">Play film</button></div>\n' +
  html.slice(parameterEnd);
html = html
  .replace(
    '<button class="button" onclick="resetParameters()">Reset</button>',
    '<button class="button" onclick="resetParameters()">Reset</button><button class="button secondary" onclick="regenerate()">Regenerate</button>',
  )
  .replace(
    '            </div>\n        </div>\n\n        <!-- Main Canvas Area -->',
    '                <button class="button tertiary" onclick="exportImage()">Download PNG</button>\n            </div>\n        </div>\n\n        <!-- Main Canvas Area -->',
  );
const script = html.lastIndexOf('    <script>');
html =
  html.slice(0, script) + '<script>' + code.replaceAll('</script', '<\\/script') + '</script></body></html>';
await writeFile('art/week-two-film/viewer.html', html);
console.log('Built the standalone film atelier in art/week-two-film/viewer.html');
