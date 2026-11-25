import type { Page } from '@playwright/test';
import { openingDialogue } from '../../src/curriculum/week-one';

export async function startInvestigation(page: Page, currentLine = 1) {
  const dialogue = page.getByRole('region', { name: 'Scene dialogue' });
  for (let line = currentLine; line < openingDialogue.length; line++) {
    await dialogue.getByRole('button', { name: 'Next line', exact: true }).click();
  }
  await dialogue.getByRole('button', { name: 'Start the investigation' }).click();
}
