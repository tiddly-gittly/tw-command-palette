import { expect, test } from '@playwright/test';
import {
  addTestLayout,
  getCurrentLayoutDisplayName,
  getExpectedLayoutNames,
  layoutResultSelector,
  openCommandPalette,
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

test('shows default layout with dollar sign even without extra layouts', async ({ page }) => {
  await openCommandPalette(page, '$');

  await expect(page.locator(palettePanelSelector)).toContainText('切换布局 - 当前布局: 标准布局');
  await expect(page.locator(layoutResultSelector).first()).toBeVisible();
});

test('shows every existing layout with Chinese names', async ({ page }) => {
  await addTestLayout(page, '$:/tests/Playwright/Layout-A', 'Playwright 临时布局 A');
  await addTestLayout(page, '$:/tests/Playwright/Layout-B', 'Playwright 临时布局 B');

  const expectedNames = await getExpectedLayoutNames(page);
  await openCommandPalette(page, '$');

  await expect(page.locator(palettePanelSelector)).toContainText('切换布局 - 当前布局: 标准布局');
  await expect(page.locator(layoutResultSelector).first()).toBeVisible();
  await expect.poll(async () => {
    return (await page.locator(layoutResultSelector).allInnerTexts())
      .map(text => text.trim())
      .filter(Boolean)
      .sort();
  }).toEqual([...expectedNames].sort());
});

test('selects a layout and updates the current layout label', async ({ page }) => {
  const layoutTitle = '$:/tests/Playwright/Layout-Selected';
  const layoutName = 'Playwright 已切换布局';
  await addTestLayout(page, layoutTitle, layoutName);

  const input = await openCommandPalette(page, '$');
  await typeIntoPalette(input, `$${layoutName}`);

  const layoutItem = page.locator(layoutResultSelector).filter({ hasText: layoutName }).first();
  await expect(layoutItem).toBeVisible();
  await layoutItem.click();

  await expect.poll(() => page.evaluate(() => {
    const wikiWindow = window as unknown as WikiWindow;
    return wikiWindow.$tw.wiki.getTiddlerText('$:/layout', '');
  })).toBe(layoutTitle);

  await expect.poll(() => getCurrentLayoutDisplayName(page)).toBe(layoutName);
});

test('shows every existing layout with half-width yen symbol ¥', async ({ page }) => {
  await addTestLayout(page, '$:/tests/Playwright/Layout-A', 'Playwright 临时布局 A');
  await addTestLayout(page, '$:/tests/Playwright/Layout-B', 'Playwright 临时布局 B');

  const expectedNames = await getExpectedLayoutNames(page);
  await openCommandPalette(page, '¥');

  await expect(page.locator(palettePanelSelector)).toContainText('切换布局 - 当前布局: 标准布局');
  await expect(page.locator(layoutResultSelector).first()).toBeVisible();
  await expect.poll(async () => {
    return (await page.locator(layoutResultSelector).allInnerTexts())
      .map(text => text.trim())
      .filter(Boolean)
      .sort();
  }).toEqual([...expectedNames].sort());
});

test('shows every existing layout with full-width yen symbol ￥', async ({ page }) => {
  await addTestLayout(page, '$:/tests/Playwright/Layout-A', 'Playwright 临时布局 A');
  await addTestLayout(page, '$:/tests/Playwright/Layout-B', 'Playwright 临时布局 B');

  const expectedNames = await getExpectedLayoutNames(page);
  await openCommandPalette(page, '￥');

  await expect(page.locator(palettePanelSelector)).toContainText('切换布局 - 当前布局: 标准布局');
  await expect(page.locator(layoutResultSelector).first()).toBeVisible();
  await expect.poll(async () => {
    return (await page.locator(layoutResultSelector).allInnerTexts())
      .map(text => text.trim())
      .filter(Boolean)
      .sort();
  }).toEqual([...expectedNames].sort());
});

test('does not match default layout for unrelated system queries', async ({ page }) => {
  const input = await openCommandPalette(page, '$');

  await typeIntoPalette(input, '$open');
  await expect(page.locator(layoutResultSelector)).toHaveCount(0);

  await typeIntoPalette(input, '$tool');
  await expect(page.locator(layoutResultSelector)).toHaveCount(0);
});
