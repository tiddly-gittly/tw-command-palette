import { expect, test } from '@playwright/test';
import {
  clickPaletteItem,
  getSelectedSidebarTabTitle,
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

test('finds sidebar tabs by english title and chinese caption', async ({ page }) => {
  const input = await openCommandPalette(page, '$');

  await typeIntoPalette(input, '$Recent');
  await expect(page.locator(palettePanelSelector)).toContainText('最近 - 切换侧边栏标签页');

  await typeIntoPalette(input, '$文件目录');
  await expect(page.locator(palettePanelSelector)).toContainText('文件目录 - 切换侧边栏标签页');
});

test('switches the current sidebar tab from the command palette', async ({ page }) => {
  const input = await openCommandPalette(page, '$');

  await typeIntoPalette(input, '$Recent');
  await clickPaletteItem(page, '最近 - 切换侧边栏标签页');

  await expect.poll(() => getSelectedSidebarTabTitle(page)).toBe('$:/core/ui/SideBar/Recent');
  await expect(page.locator(palettePanelSelector)).toHaveCount(0);
});