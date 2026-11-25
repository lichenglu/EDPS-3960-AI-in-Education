import { expect, test } from '@playwright/test';

test('each week links to a printable page and published handouts work without signing in', async ({
  page,
}) => {
  await page.goto('/');
  const printLinks = page.getByRole('link', { name: /^Printable version for Week \d+$/ });
  await expect(printLinks).toHaveCount(15);
  for (let week = 1; week <= 15; week++) {
    await expect(printLinks.nth(week - 1)).toHaveAttribute(
      'href',
      '/quests/w' + String(week).padStart(2, '0') + '/print',
    );
  }

  await printLinks.first().click();
  await expect(page.getByRole('heading', { name: 'Week 1 · AI literacy' })).toBeVisible();
  for (const idea of [
    'Perception',
    'Representation & Reasoning',
    'Learning',
    'Natural Interaction',
    'Societal Impact',
  ]) {
    await expect(page.getByRole('heading', { level: 2, name: idea })).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'You Do · Optional check' })).toHaveCount(5);
  await expect(page.getByText('What you hear on replay')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Drift Bottle' })).toBeVisible();
  await expect(page.getByLabel('Access code')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(0);
  const printButton = page.getByRole('button', { name: 'Print or save as PDF' });
  await page.evaluate(() => {
    window.print = () => document.body.setAttribute('data-print-requested', 'true');
  });
  await printButton.click();
  await expect(page.locator('body')).toHaveAttribute('data-print-requested', 'true');

  await page.emulateMedia({ media: 'print' });
  await expect(printButton).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Week 1 · AI literacy' })).toBeVisible();
  expect(
    await page.evaluate(() =>
      Array.from(document.styleSheets).some((sheet) =>
        Array.from(sheet.cssRules).some(
          (rule) => rule instanceof CSSPageRule && rule.style.getPropertyValue('margin') === '0.6in',
        ),
      ),
    ),
  ).toBe(true);
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );

  await page.goto('/quests/w05/print?lang=es');
  await expect(page.getByRole('button', { name: 'Imprimir o guardar como PDF' })).toBeVisible();
  await expect(page.getByText('Los materiales de las lecciones están disponibles en inglés.')).toBeVisible();
  for (const name of ['I Do', 'We Do', 'You Do', 'Practice notes']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Success criteria' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit first attempt' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Abrir la semana en línea' })).toHaveAttribute(
    'href',
    '/quests/w05?lang=es',
  );

  await page.goto('/quests/w02/print?lang=en');
  await expect(page.getByRole('heading', { name: 'Syllabus summary' })).toBeVisible();
  await expect(page.getByText('This week’s activity handout is in development.')).toBeVisible();
});
