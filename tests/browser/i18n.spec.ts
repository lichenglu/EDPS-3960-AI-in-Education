import { expect, test } from '@playwright/test';
import { completeStudioOpening } from './studio-opening';

test('the Spanish course menu links to the same quest and restores the selected language', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Course weeks' })).toBeVisible();
  const selector = page.locator('header.course-heading').getByRole('button', { name: 'Language' });
  const languages = page.getByRole('group', { name: 'Language' });
  await expect(selector.locator('svg')).toBeVisible();
  await expect(selector).toHaveAttribute('aria-expanded', 'false');
  await selector.press('Enter');
  await expect(languages.getByRole('button', { pressed: true })).toHaveText('English');
  await languages.getByRole('button', { name: 'English' }).press('Escape');
  await expect(selector).toBeFocused();
  await expect(languages).toBeHidden();
  await selector.click();
  await page.getByRole('heading', { name: 'Course weeks' }).click();
  await expect(languages).toBeHidden();
  await selector.click();
  await languages.getByRole('button', { name: 'Español' }).click();
  await expect(selector).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Idioma' })).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('heading', { name: 'Semanas del curso' })).toBeVisible();
  const week = page.getByRole('link', { name: 'Semana 1 · Alfabetización en IA' });
  await expect(week).toHaveAttribute('href', '/quests/w01?lang=es');
  await week.click();
  await expect(page).toHaveURL('/quests/w01?lang=es');
  await expect(page.getByRole('heading', { name: 'Las cinco grandes ideas de la IA' })).toBeVisible();

  await page.goto('/instructor');
  await expect(page.getByRole('heading', { name: 'Panel docente' })).toBeVisible();
  await page.getByLabel('Código de acceso').fill('incorrect-code');
  await page.getByRole('button', { name: 'Conectar', exact: true }).click();
  await expect(page.getByText('No se pudo verificar el código de acceso.')).toBeVisible();
  await page.getByRole('button', { name: 'Usar cuenta docente de prueba' }).click();
  await expect(page.getByRole('heading', { name: 'Progreso del alumnado' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver demostración de la Semana 1' })).toHaveAttribute(
    'href',
    '/quests/w01?preview=instructor&lang=es',
  );
});

test('a narrow iframe keeps Spanish with blocked storage and can switch languages in a lesson', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 820 });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage blocked', 'SecurityError');
      },
    });
  });
  await page.goto('http://127.0.0.1:4199/studio');
  const studio = page.frameLocator('iframe[title="Course"]');
  const globe = studio.getByRole('banner').getByRole('button', { name: 'Language' });
  await expect(studio.locator('.studio-toolbar').getByRole('button', { name: 'Language' })).toBeVisible();
  await globe.click();
  const menu = studio.getByRole('group', { name: 'Language' });
  const bounds = await menu.boundingBox();
  const frameBounds = await page.locator('iframe[title="Course"]').boundingBox();
  if (!bounds || !frameBounds) throw new Error('Missing frame or language menu bounds');
  expect(bounds.x).toBeGreaterThanOrEqual(frameBounds.x);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(frameBounds.x + frameBounds.width + 1);
  await menu.getByRole('button', { name: 'Español' }).click();
  await expect(studio.locator('html')).toHaveAttribute('lang', 'es');
  const frame = page.frames().find((frame) => new URL(frame.url()).pathname === '/quests/w01');
  if (!frame) throw new Error('Missing course frame');
  await frame.evaluate(() => location.reload());
  await expect(studio.getByRole('heading', { name: 'Las cinco grandes ideas de la IA' })).toBeVisible();
  await expect(studio.getByRole('link', { name: 'Abrir la Semana 1 en una pestaña nueva' })).toHaveAttribute(
    'href',
    '/quests/w01?lang=es',
  );
  const howToPlay = studio.getByRole('button', { name: 'Cómo jugar' });
  await expect(howToPlay).toHaveCount(0);
  await completeStudioOpening(studio, 'es');
  await expect(howToPlay).toBeVisible();
  await studio.getByRole('button', { name: 'Siguiente · Mira a tu alrededor' }).click();
  await studio.getByRole('button', { name: 'Siguiente · Abre una estación' }).click();
  await studio.getByRole('button', { name: 'Empieza en «Mesa de sonido»' }).click();
  await studio.getByRole('button', { name: 'Confirmar e iniciar' }).click();
  await expect(studio.getByRole('heading', { name: 'La grabación del grupo con ruido' })).toBeVisible();
  await expect(
    studio.getByText('Los materiales de las lecciones están disponibles en inglés.'),
  ).toBeVisible();
  await expect(
    studio.locator('[lang="en"]').getByRole('heading', { name: 'I Do · How speech becomes text' }),
  ).toBeVisible();
  expect(await studio.locator('html').evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(320);
  await studio.getByRole('button', { name: 'Idioma' }).click();
  await studio.getByRole('group', { name: 'Idioma' }).getByRole('button', { name: 'English' }).click();
  await expect(studio.locator('html')).toHaveAttribute('lang', 'en');
  await expect(studio.getByRole('heading', { name: 'I Do · How speech becomes text' })).toBeVisible();
});
