import { expect, test } from '@playwright/test';
import { seedBaseState, waitForWiki } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.route(
    '**/recipes/default/tiddlers/**',
    route => route.request().method() === 'PUT' ? route.fulfill({ status: 204, headers: { etag: '"default/test/1:scoped"' } }) : route.continue(),
  );
  await waitForWiki(page);
  await seedBaseState(page);
  await page.evaluate(() => {
    $tw.wiki.addTiddler({ title: 'Scoped matching title', tags: ['Scoped A'], alias: 'literal ] " query' });
    $tw.wiki.addTiddler({ title: 'Scoped matching second', tags: ['Scoped A'], text: 'literal ] " query' });
    $tw.wiki.addTiddler({ title: 'Scoped external', tags: ['Scoped B'], text: 'literal ] " query' });
    $tw.wiki.addTiddler({
      title: '$:/Scoped action',
      caption: 'Create <<commandpaletteinput>>',
      text: '<$action-createtiddler $basetitle=<<commandpaletteinput>> tags="[[Scoped A]]"><$action-navigate $to=<<createTiddler-title>> /></$action-createtiddler>',
    });
    $tw.wiki.addTiddler({
      title: 'Scoped search fixture',
      text:
        '<$let scopeTag="Scoped A"><$auto-complete-search id="scoped-a" mode="search" candidateFilter="[tag<scopeTag>]" actionFilter="[[$:/Scoped action]]" placeholder="Scoped input" autoFocus="no" openOnFocus="yes" detachedMediaQuery="none" limit="1" /></$let>',
    });
    $tw.wiki.addTiddler({ title: '$:/StoryList', list: ['Scoped search fixture'] });
  });
});

test('scopes literal queries, limits results and executes WikiText actions', async ({ page }) => {
  const input = page.getByPlaceholder('Scoped input');
  await input.focus();
  await expect(page.locator('.tw-autocomplete-action')).toHaveText('Create ');
  await expect(page.locator('.tw-autocomplete-result')).toHaveCount(0);
  await input.fill('literal ] " query');
  await expect(page.locator('.tw-autocomplete-result')).toHaveCount(1);
  await expect(page.locator('.tw-autocomplete-result')).toHaveText('Scoped matching second');
  await input.fill('Scoped created');
  await expect(page.locator('.tw-autocomplete-action')).toHaveText('Create Scoped created');
  await page.locator('.tw-autocomplete-action').click();
  await expect.poll(() => page.evaluate(() => $tw.wiki.getTiddler('Scoped created')?.fields.tags)).toEqual(['Scoped A']);
  await input.fill('Scoped matching title');
  await expect(page.locator('.tw-autocomplete-result')).toHaveText('Scoped matching title');
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect.poll(() => page.evaluate(() => $tw.wiki.getTiddlerList('$:/StoryList')[0])).toBe('Scoped matching title');
});

test('supports keyboard actions and updates candidate content while open', async ({ page }) => {
  const input = page.getByPlaceholder('Scoped input');
  await input.fill('Keyboard scoped');
  await expect(page.locator('.tw-autocomplete-action')).toHaveText('Create Keyboard scoped');
  await input.press('Enter');
  await expect.poll(() => page.evaluate(() => $tw.wiki.tiddlerExists('Keyboard scoped'))).toBe(true);
  await input.fill('Live entry');
  await page.evaluate(() => {
    $tw.wiki.addTiddler({ title: 'Live entry', tags: ['Scoped A'] });
  });
  await expect(page.locator('.tw-autocomplete-result')).toHaveText('Live entry');
});

test('refreshes a translated placeholder and preserves the query', async ({ page }) => {
  await page.evaluate(() => {
    $tw.wiki.addTiddler({ title: '$:/Scoped placeholder', text: 'Search entries' });
    $tw.wiki.setText(
      'Scoped search fixture',
      'text',
      undefined,
      '<$auto-complete-search id="scoped-a" mode="search" candidateFilter="[tag[Scoped A]]" placeholder={{$:/Scoped placeholder}} autoFocus="no" openOnFocus="yes" detachedMediaQuery="none" />',
    );
  });
  const input = page.locator('.tw-auto-complete-container input');
  await input.fill('matching');
  await page.evaluate(() => {
    $tw.wiki.setText('$:/Scoped placeholder', 'text', undefined, '搜索条目');
  });
  await expect(input).toHaveAttribute('placeholder', '搜索条目');
  await expect(input).toHaveValue('matching');
  await expect(input).toBeFocused();
});

test('runs prompted WikiText actions within scoped search', async ({ page }) => {
  await page.evaluate(() => {
    $tw.wiki.addTiddler({
      title: '$:/Scoped action',
      caption: 'Set scoped value',
      'action-variables': 'value',
      'value/caption': 'Scoped value',
      text: '<$action-setfield $tiddler="Scoped prompt result" text=<<value>> />',
    });
  });
  const input = page.getByPlaceholder('Scoped input');
  await input.focus();
  await page.locator('.tw-autocomplete-action').click();
  await expect(page.locator('.tw-commandpalette-panel-scoped-a')).toContainText('Scoped value');
  await input.fill('Prompted value');
  await expect(page.getByRole('option', { name: '确认输入: Prompted value' })).toBeVisible();
  await input.press('Enter');
  await expect.poll(() => page.evaluate(() => $tw.wiki.getTiddlerText('Scoped prompt result'))).toBe('Prompted value');
});

test('keeps multiple search instances independent', async ({ page }) => {
  await page.evaluate(() => {
    $tw.wiki.setText('$:/Scoped action', 'caption', undefined, 'Create in <<scopeTag>>: <<commandpaletteinput>>');
    $tw.wiki.setText(
      'Scoped search fixture',
      'text',
      undefined,
      '<$let scopeTag="Scoped A"><$auto-complete-search id="scoped-a" mode="search" candidateFilter="[tag<scopeTag>]" actionFilter="[[$:/Scoped action]]" placeholder="First" autoFocus="no" openOnFocus="yes" detachedMediaQuery="none" /></$let>\n\n<$let scopeTag="Scoped B"><$auto-complete-search id="scoped-b" mode="search" candidateFilter="[tag<scopeTag>]" actionFilter="[[$:/Scoped action]]" placeholder="Second" autoFocus="no" openOnFocus="yes" detachedMediaQuery="none" /></$let>',
    );
  });
  await page.getByPlaceholder('First').fill('literal');
  await expect(page.locator('.tw-commandpalette-panel-scoped-a .tw-autocomplete-result')).toHaveCount(2);
  await expect(page.locator('.tw-commandpalette-panel-scoped-a .tw-autocomplete-action')).toHaveText('Create in Scoped A: literal');
  await page.getByPlaceholder('Second').fill('literal');
  await expect(page.locator('.tw-commandpalette-panel-scoped-b .tw-autocomplete-result')).toHaveText('Scoped external');
  await expect(page.locator('.tw-commandpalette-panel-scoped-b .tw-autocomplete-action')).toHaveText('Create in Scoped B: literal');
  await expect(page.getByPlaceholder('First')).toHaveValue('literal');
});

test('keeps default palette routing available alongside scoped search', async ({ page }) => {
  await page.evaluate(() => {
    $tw.rootWidget.dispatchEvent({ type: 'open-command-palette', paramObject: { id: 'default', prefix: '$' } });
  });
  const input = page.locator('#default-input');
  await input.fill('$高级搜索');
  await expect(page.locator('.tw-commandpalette-panel-default')).toContainText('高级搜索');
});
