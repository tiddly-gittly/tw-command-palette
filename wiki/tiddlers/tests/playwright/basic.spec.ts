import { expect, test } from '@playwright/test';
import {
  closeCommandPalette,
  getOpenState,
  openCommandPalette,
  palettePanelSelector,
  seedBaseState,
  waitForWiki,
} from './fixtures';

test.beforeEach(async ({ page }) => {
  await waitForWiki(page);
  await seedBaseState(page);
});

test('opens and closes the command palette', async ({ page }) => {
  await openCommandPalette(page);
  await expect.poll(() => getOpenState(page)).toBe('yes');

  await closeCommandPalette(page);
  await expect.poll(() => getOpenState(page)).toBe('');
});

test('shows Chinese help items in help mode', async ({ page }) => {
  await openCommandPalette(page, '?');

  await expect(page.locator(palettePanelSelector)).toContainText('命令菜单用法');
  await expect(page.locator(palettePanelSelector)).toContainText('系统条目');
  await expect(page.locator(palettePanelSelector)).toContainText('筛选器');
  await expect(page.locator(palettePanelSelector)).toContainText('用户条目');
});
