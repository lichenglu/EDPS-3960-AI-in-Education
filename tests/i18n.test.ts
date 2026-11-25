import { expect, test } from 'bun:test';
import { en, es, readLocale, localizedHref, formatMessage, translate } from '../src/lib/i18n/messages';

test('English and Spanish catalogs have the same keys and interpolation fields', () => {
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    const tokens = (value: string) => Array.from(value.matchAll(/\{\w+\}/g), (match) => match[0]).sort();
    expect(tokens(es[key])).toEqual(tokens(en[key]));
  }
  expect(translate('es', 'week', { number: 1 })).toBe('Semana 1');
  expect(formatMessage('{value}', { value: '{name}', name: 'replaced' })).toBe('{name}');
});

test('locale links preserve the route and work when storage is blocked', () => {
  expect(
    readLocale('?lang=es', () => {
      throw new Error('Blocked');
    }),
  ).toBe('es');
  expect(readLocale('?lang=fr', () => 'es')).toBe('es');
  expect(
    readLocale('', () => {
      throw new Error('Blocked');
    }),
  ).toBe('en');
  expect(readLocale('?lang=en', () => 'es')).toBe('en');
  expect(localizedHref('/quests/w01?preview=instructor#main', 'es')).toBe(
    '/quests/w01?preview=instructor&lang=es#main',
  );
  expect(localizedHref('/quests/w01?lang=es&view=text', 'en')).toBe('/quests/w01?view=text');
  expect(localizedHref('https://example.org/a', 'es')).toBe('https://example.org/a');
});
