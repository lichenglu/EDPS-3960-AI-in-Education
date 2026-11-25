import { afterEach, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TextEntry } from '../src/components/TextEntry';

const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
  else Reflect.deleteProperty(globalThis, 'sessionStorage');
});

function fakeStorage() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  Object.defineProperty(globalThis, 'sessionStorage', { value: storage, configurable: true });
  return storage;
}

function field(initial: string, draftKey: string, readOnly = false) {
  return renderToStaticMarkup(
    createElement(TextEntry, {
      label: 'My note',
      button: 'Save',
      initial,
      draftKey,
      disabled: readOnly,
      readOnly,
      onSubmit() {},
    }),
  );
}

test('the live input resumes its own draft against the same confirmed value; review renders only the confirmed value', () => {
  fakeStorage().setItem('learner.field', JSON.stringify({ base: 'My first note', text: 'Still drafting' }));
  expect(field('My first note', 'learner.field')).toContain('>Still drafting</textarea>');
  expect(field('My first note', 'another.field')).toContain('>My first note</textarea>');
  expect(field('My first note', 'learner.field', true)).toContain('>My first note</textarea>');
});

test('a newer confirmed value replaces the older draft and an explicitly cleared draft stays empty', () => {
  const store = fakeStorage();
  store.setItem('field', JSON.stringify({ base: 'Old reply', text: 'Abandoned edit' }));
  expect(field('Confirmed elsewhere', 'field')).toContain('>Confirmed elsewhere</textarea>');
  store.setItem('field', JSON.stringify({ base: 'My note', text: '' }));
  expect(field('My note', 'field')).not.toContain('>My note</textarea>');
});

test('a blocked storage getter still allows the server response to render', () => {
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    get() {
      throw Error('Storage blocked');
    },
  });
  expect(field('Saved on the server', 'field')).toContain('>Saved on the server</textarea>');
});

test('plain-text first attempts from the previous release still restore and a sealed conflict can populate a separate revision', () => {
  const store = fakeStorage();
  store.setItem('recommendation', 'My unsent recommendation.');
  function render(key: string, base: string, firstDraftKey?: string) {
    return renderToStaticMarkup(
      createElement(TextEntry, {
        initial: base,
        draftKey: key,
        firstDraftKey,
        legacyDraft: !firstDraftKey,
        label: 'Your recommendation',
        button: 'File',
        disabled: false,
        onSubmit() {},
      }),
    );
  }
  expect(render('recommendation', '')).toContain('>My unsent recommendation.</textarea>');
  expect(
    render('recommendation.revision', 'First attempt filed in another tab.', 'recommendation'),
  ).toContain('>My unsent recommendation.</textarea>');
  store.setItem(
    'recommendation.revision',
    JSON.stringify({ base: 'First attempt filed in another tab.', text: 'My newer revision.' }),
  );
  expect(
    render('recommendation.revision', 'First attempt filed in another tab.', 'recommendation'),
  ).toContain('>My newer revision.</textarea>');
});
