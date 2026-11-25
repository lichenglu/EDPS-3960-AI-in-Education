import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { weekTwoIntroFilm as film } from '../src/curriculum/week-02/intro-films';

const directory = resolve('data/narration-chpc/week-two-script');
const source = await readFile('src/curriculum/week-02/intro-films.ts');
const clips = film.scenes.flatMap((scene) =>
  scene.lines.map((text, index) => ({
    id: `w02-${scene.id}-${String(index + 1).padStart(2, '0')}`,
    text,
    language_id: 'en',
  })),
);
await mkdir(directory, { recursive: true, mode: 0o700 });
await writeFile(
  resolve(directory, 'narration.jsonl'),
  clips.map((clip) => JSON.stringify(clip)).join('\n') + '\n',
  { mode: 0o600 },
);
await writeFile(
  resolve(directory, 'script-snapshot.json'),
  JSON.stringify(
    {
      title: film.title,
      source: 'src/curriculum/week-02/intro-films.ts',
      source_sha256: createHash('sha256').update(source).digest('hex'),
      clip_count: clips.length,
      clips: clips.map(({ id, text }) => ({
        id,
        text,
        text_sha256: createHash('sha256').update(text).digest('hex'),
      })),
    },
    null,
    2,
  ) + '\n',
  { mode: 0o600 },
);
console.log(`Exported ${clips.length} narration lines for “${film.title}” to ${directory}`);
