import { expect, test } from '@playwright/test';
import { openCommandPalette, paletteItemSelector, palettePanelSelector, seedBaseState, typeIntoPalette, waitForWiki, WikiWindow } from './fixtures';

test.beforeEach(async ({ page }) => {
  await waitForWiki(page);
  await seedBaseState(page);
});

test('TitleAlias "title caption alias" finds tiddler by title even if caption differs', async ({ page }) => {
  await page.evaluate(() => {
    const wikiWindow = window as unknown as WikiWindow;
    wikiWindow.$tw.wiki.setText(
      '$:/plugins/linonetwo/autocomplete/configs/TitleAlias',
      'text',
      undefined,
      'title caption alias',
      { suppressTimestamp: true },
    );
    wikiWindow.$tw.wiki.addTiddler({
      title: 'IndexNote',
      caption: 'A different caption',
      alias: 'AnotherAlias',
      text: '',
      type: 'text/vnd.tiddlywiki',
      tags: [],
    });
  });

  const input = await openCommandPalette(page);
  await typeIntoPalette(input, 'IndexNote');

  await expect(page.locator(palettePanelSelector)).toContainText('IndexNote');
  const item = page.locator(paletteItemSelector).filter({ hasText: 'IndexNote' }).first();
  await expect(item).toBeVisible();
});

test('TitleAlias "title caption alias" finds tiddler by caption', async ({ page }) => {
  await page.evaluate(() => {
    const wikiWindow = window as unknown as WikiWindow;
    wikiWindow.$tw.wiki.setText(
      '$:/plugins/linonetwo/autocomplete/configs/TitleAlias',
      'text',
      undefined,
      'title caption alias',
      { suppressTimestamp: true },
    );
    wikiWindow.$tw.wiki.addTiddler({
      title: 'CaptionNote',
      caption: 'UniqueCaptionValue',
      text: '',
      type: 'text/vnd.tiddlywiki',
      tags: [],
    });
  });

  const input = await openCommandPalette(page);
  await typeIntoPalette(input, 'UniqueCaptionValue');

  await expect(page.locator(palettePanelSelector)).toContainText('CaptionNote');
  const item = page.locator(paletteItemSelector).filter({ hasText: 'CaptionNote' }).first();
  await expect(item).toBeVisible();
});

test('TitleAlias "title caption alias" finds tiddler by alias', async ({ page }) => {
  await page.evaluate(() => {
    const wikiWindow = window as unknown as WikiWindow;
    wikiWindow.$tw.wiki.setText(
      '$:/plugins/linonetwo/autocomplete/configs/TitleAlias',
      'text',
      undefined,
      'title caption alias',
      { suppressTimestamp: true },
    );
    wikiWindow.$tw.wiki.addTiddler({
      title: 'AliasNote',
      alias: 'UniqueAliasValue',
      text: '',
      type: 'text/vnd.tiddlywiki',
      tags: [],
    });
  });

  const input = await openCommandPalette(page);
  await typeIntoPalette(input, 'UniqueAliasValue');

  await expect(page.locator(palettePanelSelector)).toContainText('AliasNote');
  const item = page.locator(paletteItemSelector).filter({ hasText: 'AliasNote' }).first();
  await expect(item).toBeVisible();
});
