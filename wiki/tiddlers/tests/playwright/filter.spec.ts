import { expect, test } from '@playwright/test';
import {
  clickPaletteItem,
  openCommandPalette,
  palettePanelSelector,
  seedBaseState,
  typeIntoPalette,
  waitForWiki,
} from './fixtures';

test.beforeEach(async ({ page }) => {
  await waitForWiki(page);
  await seedBaseState(page);
});

test('searches within a built-in filter result set', async ({ page }) => {
  const title = `Playwright 未打标签 ${Date.now()}`;

  await page.evaluate((untaggedTitle) => {
    const wikiWindow = window as unknown as { $tw: any };
    wikiWindow.$tw.wiki.addTiddler({
      title: untaggedTitle,
      text: 'This is an untagged tiddler used by Playwright.',
      tags: [],
    });
  }, title);

  const input = await openCommandPalette(page, '[');
  await typeIntoPalette(input, '[未打标签');
  await clickPaletteItem(page, '未打标签');

  await expect(page.locator(palettePanelSelector)).toContainText(title);
});
