import { expect, test } from 'bun:test';
import { weekOne } from '../src/curriculum/week-one';
const page = await Bun.file(new URL('../public/activities/w01.html', import.meta.url)).text();

test('the archived handout introduces four named guides before the story without loading portraits', () => {
  const start = page.indexOf('id="crew"');
  const story = page.indexOf('Tomorrow, Eunseo');
  expect(start).toBeGreaterThan(0);
  expect(start).toBeLessThan(story);
  const introduction = page.slice(start, story);
  for (const name of ['Chenglu', 'Eunseo', 'Yinqi', 'Pip']) {
    expect(introduction).toContain('<h3>' + name + '</h3>');
  }
  expect(introduction).not.toContain('<img');
});

test('claims in Week 1 and the handout cite the same numbered references', () => {
  for (const [stepId, numbers] of Object.entries({
    opening: [1],
    'previous-work': [2, 3, 4],
    'three-perspectives': [5],
    'compare-measures': [6, 7, 8],
    recommendation: [8],
    orientation: [9],
  })) {
    const step = weekOne.find((s) => s.id === stepId)!;
    const article = page.split('id="' + stepId + '"')[1].split('</article>')[0];
    for (const n of numbers) {
      expect([...(step.paragraphs ?? []), step.prompt].join(' ')).toContain('[' + n + ']');
      expect(article).toContain('href="#ref-' + n + '"');
      expect(page).toContain('id="ref-' + n + '"');
    }
  }
});

test('paper and modal use the same bibliographic entries, locators, and links', async () => {
  const { default: references } = await import('../src/curriculum/week-one-references.json');
  for (const ref of references) {
    const entry = page
      .split('id="ref-' + ref.id + '"')[1]
      .split('</li>')[0]
      .replaceAll('&amp;', '&');
    expect(entry).toContain(ref.citation);
    expect(entry).toContain(ref.locator);
    for (const resource of ref.links) expect(entry).toContain(resource.url);
  }
});
