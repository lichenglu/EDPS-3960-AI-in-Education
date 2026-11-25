import type { Page } from '@playwright/test';
import { weekOneManifest } from '../../src/curriculum/week-01/manifest';

const labels = {
  en: ['Begin the story', 'Continue story', 'Learn the controls'],
  es: ['Comenzar la historia', 'Continuar la historia', 'Aprender los controles'],
};

export async function completeStudioOpening(
  view: Pick<Page, 'getByRole'>,
  locale: keyof typeof labels = 'en',
  currentScene?: number,
) {
  const [begin, next, finish] = labels[locale];
  if (currentScene === undefined) await view.getByRole('button', { name: begin, exact: true }).click();
  for (let scene = currentScene ?? 0; scene < weekOneManifest.opening.length - 1; scene++) {
    await view.getByRole('button', { name: next, exact: true }).click();
  }
  await view.getByRole('button', { name: finish, exact: true }).click();
}
