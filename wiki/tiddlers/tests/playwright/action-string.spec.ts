import { expect, test } from '@playwright/test';
import {
  clickPaletteItem,
  getCreatedTiddlerState,
  getDraftCount,
  getDraftTitlesFor,
  getStoryList,
  openCommandPalette,
  paletteInputSelector,
  palettePanelSelector,
  seedBaseState,
  typeIntoPalette,
  waitForWiki,
  WikiWindow,
} from './fixtures';

test.beforeEach(async ({ page }) => {
  await waitForWiki(page);
  await seedBaseState(page);
});

test('executes an action-string command from the application menu', async ({ page }) => {
  const input = await openCommandPalette(page, '$');
  await typeIntoPalette(input, '$高级搜索');

  await clickPaletteItem(page, '高级搜索');

  await expect.poll(() => getStoryList(page)).toContain('$:/AdvancedSearch');
});

test('clicking the core empty-tiddler action only creates one draft', async ({ page }) => {
  const input = await openCommandPalette(page, '$');
  await typeIntoPalette(input, '$empty tiddler');

  await clickPaletteItem(page, 'create a new empty tiddler');

  await expect.poll(() => getDraftCount(page)).toBe(1);
});

test('creates a new tiddler through the command menu wizard', async ({ page }) => {
  const newTitle = `Playwright 新条目 ${Date.now()}`;

  const input = await openCommandPalette(page, '$');
  await typeIntoPalette(input, '$输入标题');
  await clickPaletteItem(page, '创建新条目（输入标题）');

  await expect(page.locator(palettePanelSelector)).toContainText('命令参数');
  await expect(page.locator(palettePanelSelector)).toContainText('条目标题');

  const wizardInput = page.locator(paletteInputSelector);
  await typeIntoPalette(wizardInput, newTitle);
  const createItem = page.locator(palettePanelSelector).getByText(`确认输入: ${newTitle}`, { exact: true });
  await expect(createItem).toBeVisible();
  await createItem.click();

  await expect.poll(async () => {
    const state = await getCreatedTiddlerState(page, newTitle);
    return state.hasRealTiddler
      || state.drafts.length > 0
      || state.storyList.some((item: string) => item.includes(newTitle))
      || state.focused.includes(newTitle);
  }).toBe(true);

  await expect(page.locator(palettePanelSelector)).toHaveCount(0);
});

test('adds a tag through action-string autocomplete variable prompt', async ({ page }) => {
  const focusedTitle = `Playwright Fresh Note ${Date.now()}`;
  const newTag = `PlaywrightTag${Date.now()}`;
  const leakingTiddlerTitle = `Playwright Prompt Leak Candidate ${Date.now()}`;

  await page.evaluate(({ nextFocusedTitle, tagToAdd, leakingTitle }) => {
    const wikiWindow = window as unknown as WikiWindow;
    wikiWindow.$tw.wiki.addTiddler({
      title: nextFocusedTitle,
      text: 'This focused tiddler is used to verify action-variable prompt behavior.',
      tags: [],
    });
    wikiWindow.$tw.wiki.addTiddler({
      title: leakingTitle,
      text: `This text would leak into generic search results for ${tagToAdd} if prompt isolation breaks.`,
      tags: [tagToAdd],
    });
    wikiWindow.$tw.wiki.addTiddler({
      title: '$:/StoryList',
      list: [nextFocusedTitle],
    });
    wikiWindow.$tw.wiki.addTiddler({
      title: '$:/temp/focussedTiddler',
      text: nextFocusedTitle,
    });
  }, { nextFocusedTitle: focusedTitle, tagToAdd: newTag, leakingTitle: leakingTiddlerTitle });

  const input = await openCommandPalette(page, '$');
  await typeIntoPalette(input, '$添加标签到当前条目');
  await clickPaletteItem(page, '添加标签到当前条目');

  await expect(page.locator(palettePanelSelector)).toContainText('新标签');

  const wizardInput = page.locator(paletteInputSelector);
  await typeIntoPalette(wizardInput, newTag);
  await expect(page.locator(palettePanelSelector)).not.toContainText(leakingTiddlerTitle);
  await clickPaletteItem(page, newTag);

  await expect.poll(() => page.evaluate(() => {
    const wikiWindow = window as unknown as WikiWindow;
    const focused = wikiWindow.$tw.wiki.getTiddlerText('$:/temp/focussedTiddler', '');
    const tags = wikiWindow.$tw.wiki.getTiddler(focused)?.fields.tags || [];
    return tags;
  })).toContain(newTag);

  await expect(page.locator(palettePanelSelector)).toHaveCount(0);
});

test('edits a specific tiddler through action-string variable prompt', async ({ page }) => {
  const targetTitle = `Playwright Edit Target ${Date.now()}`;

  await page.evaluate((tiddlerTitle) => {
    const wikiWindow = window as unknown as WikiWindow;
    wikiWindow.$tw.wiki.addTiddler({
      title: tiddlerTitle,
      text: 'This tiddler will be edited via command palette parameter.',
      tags: [],
    });
    wikiWindow.$tw.wiki.addTiddler({
      title: '$:/StoryList',
      list: [tiddlerTitle],
    });
    wikiWindow.$tw.wiki.addTiddler({
      title: '$:/temp/focussedTiddler',
      text: tiddlerTitle,
    });
  }, targetTitle);

  const input = await openCommandPalette(page, '$');
  await typeIntoPalette(input, '$编辑条目');
  await clickPaletteItem(page, '编辑');

  await expect(page.locator(palettePanelSelector)).toContainText('要编辑的条目');

  const wizardInput = page.locator(paletteInputSelector);
  await typeIntoPalette(wizardInput, targetTitle);
  await clickPaletteItem(page, `确认输入: ${targetTitle}`);

  await expect.poll(() => getDraftCount(page)).toBe(1);
  await expect.poll(() => getDraftTitlesFor(page, targetTitle)).toHaveLength(1);
});

test('deletes a specific tiddler through action-string variable prompt', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());

  const targetTitle = `Playwright Delete Target ${Date.now()}`;

  await page.evaluate((tiddlerTitle) => {
    const wikiWindow = window as unknown as WikiWindow;
    wikiWindow.$tw.wiki.addTiddler({
      title: tiddlerTitle,
      text: 'This tiddler will be deleted via command palette parameter.',
      tags: [],
    });
    wikiWindow.$tw.wiki.addTiddler({
      title: '$:/StoryList',
      list: [tiddlerTitle],
    });
    wikiWindow.$tw.wiki.addTiddler({
      title: '$:/temp/focussedTiddler',
      text: tiddlerTitle,
    });
  }, targetTitle);

  const input = await openCommandPalette(page, '$');
  await typeIntoPalette(input, '$删除条目');
  await clickPaletteItem(page, '删除');

  await expect(page.locator(palettePanelSelector)).toContainText('要删除的条目');

  const wizardInput = page.locator(paletteInputSelector);
  await typeIntoPalette(wizardInput, targetTitle);
  await clickPaletteItem(page, `确认输入: ${targetTitle}`);

  await expect.poll(() => page.evaluate((expectedTitle) => {
    const wikiWindow = window as unknown as WikiWindow;
    return Boolean(wikiWindow.$tw.wiki.getTiddler(expectedTitle));
  }, targetTitle)).toBe(false);
});

test('clones a tiddler through action-string variable prompt', async ({ page }) => {
  const sourceTitle = `Playwright Clone Source ${Date.now()}`;

  await page.evaluate((tiddlerTitle) => {
    const wikiWindow = window as unknown as WikiWindow;
    wikiWindow.$tw.wiki.addTiddler({
      title: tiddlerTitle,
      text: 'This tiddler will be cloned via command palette parameter.',
      tags: ['PlaywrightCloneTag'],
    });
    wikiWindow.$tw.wiki.addTiddler({
      title: '$:/StoryList',
      list: [tiddlerTitle],
    });
    wikiWindow.$tw.wiki.addTiddler({
      title: '$:/temp/focussedTiddler',
      text: tiddlerTitle,
    });
  }, sourceTitle);

  const input = await openCommandPalette(page, '$');
  await typeIntoPalette(input, '$克隆条目');
  await clickPaletteItem(page, '复制');

  await expect(page.locator(palettePanelSelector)).toContainText('模板条目');

  const wizardInput = page.locator(paletteInputSelector);
  await typeIntoPalette(wizardInput, sourceTitle);
  await clickPaletteItem(page, `确认输入: ${sourceTitle}`);

  await expect.poll(() => getDraftCount(page)).toBeGreaterThanOrEqual(1);
});
