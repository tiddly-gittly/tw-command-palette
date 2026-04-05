import { expect, test, type Locator, type Page } from '@playwright/test';

const paletteInputSelector = '.tw-auto-complete-container input';
const palettePanelSelector = '.tw-commandpalette-panel-default';
const paletteItemSelector = `${palettePanelSelector} .aa-Item`;
const layoutResultSelector = '.tw-commandpalette-layout-result';

async function waitForWiki(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => {
    const wikiWindow = window as Window & {
      $tw?: {
        wiki?: unknown;
        rootWidget?: unknown;
      };
    };
    return Boolean(wikiWindow.$tw?.wiki && wikiWindow.$tw?.rootWidget);
  });
}

async function seedBaseState(page: Page) {
  await page.evaluate(() => {
    const wikiWindow = window as Window & { $tw: any };
    wikiWindow.$tw.wiki.setText('$:/language', 'text', undefined, '$:/languages/zh-Hans', { suppressTimestamp: true });
    wikiWindow.$tw.wiki.addTiddler({
      title: 'Playwright Focus Note',
      text: 'This tiddler is used by Playwright tests.',
      tags: ['PlaywrightTag'],
    });
    wikiWindow.$tw.wiki.addTiddler({
      title: '$:/StoryList',
      list: ['Playwright Focus Note'],
    });
    wikiWindow.$tw.wiki.addTiddler({
      title: '$:/temp/focussedTiddler',
      text: 'Playwright Focus Note',
    });
    wikiWindow.$tw.wiki.setText('$:/layout', 'text', undefined, '', { suppressTimestamp: true });
  });
}

async function openCommandPalette(page: Page, prefix = '') {
  await page.evaluate((nextPrefix) => {
    const wikiWindow = window as Window & { $tw: any };
    wikiWindow.$tw.rootWidget.dispatchEvent({
      type: 'open-command-palette',
      paramObject: {
        id: 'default',
        prefix: nextPrefix,
      },
    });
  }, prefix);

  const input = page.locator(paletteInputSelector);
  await expect(input).toBeVisible();
  await input.focus();
  await expect(page.locator(palettePanelSelector)).toBeVisible();
  return input;
}

async function closeCommandPalette(page: Page) {
  const input = page.locator(paletteInputSelector);
  if (await input.count()) {
    await input.press('Escape');
  }
  await expect(page.locator(palettePanelSelector)).toHaveCount(0);
}

async function clickPaletteItem(page: Page, text: string | RegExp) {
  const item = page.locator(`${paletteItemSelector} div`).filter({ hasText: text }).first();
  await expect(item).toBeVisible();
  await item.click();
}

async function getOpenState(page: Page) {
  return page.evaluate(() => {
    const wikiWindow = window as Window & { $tw: any };
    return wikiWindow.$tw.wiki.getTiddlerText('$:/temp/auto-complete-search/default/opened', '');
  });
}

async function getStoryList(page: Page) {
  return page.evaluate(() => {
    const wikiWindow = window as Window & { $tw: any };
    return wikiWindow.$tw.wiki.getTiddlerList('$:/StoryList');
  });
}

async function getDraftCount(page: Page) {
  return page.evaluate(() => {
    const wikiWindow = window as Window & { $tw: any };
    return wikiWindow.$tw.wiki.filterTiddlers('[all[tiddlers]has[draft.of]]').length;
  });
}

async function getDraftTitlesFor(page: Page, title: string) {
  return page.evaluate((draftOfTitle) => {
    const wikiWindow = window as Window & { $tw: any };
    return wikiWindow.$tw.wiki.filterTiddlers('[all[tiddlers]]').filter((candidateTitle: string) => {
      const fields = wikiWindow.$tw.wiki.getTiddler(candidateTitle)?.fields;
      return fields?.['draft.of'] === draftOfTitle;
    });
  }, title);
}

async function getCreatedTiddlerState(page: Page, title: string) {
  return page.evaluate((expectedTitle) => {
    const wikiWindow = window as Window & { $tw: any };
    const storyList = wikiWindow.$tw.wiki.getTiddlerList('$:/StoryList');
    const drafts = wikiWindow.$tw.wiki.filterTiddlers('[all[tiddlers]]').filter((candidateTitle: string) => {
      const fields = wikiWindow.$tw.wiki.getTiddler(candidateTitle)?.fields;
      return fields?.['draft.of'] === expectedTitle;
    });
    return {
      drafts,
      focused: wikiWindow.$tw.wiki.getTiddlerText('$:/temp/focussedTiddler', ''),
      hasRealTiddler: Boolean(wikiWindow.$tw.wiki.getTiddler(expectedTitle)),
      storyList,
    };
  }, title);
}

async function addTestLayout(page: Page, title: string, name: string) {
  await page.evaluate(({ layoutTitle, layoutName }) => {
    const wikiWindow = window as Window & { $tw: any };
    wikiWindow.$tw.wiki.addTiddler({
      title: layoutTitle,
      tags: ['$:/tags/Layout'],
      name: layoutName,
      description: 'Playwright temporary layout',
      text: '<$transclude tiddler="$:/core/ui/PageTemplate" mode="inline"/>',
    });
  }, { layoutTitle: title, layoutName: name });
}

async function getExpectedLayoutNames(page: Page) {
  return page.evaluate(() => {
    const wikiWindow = window as Window & { $tw: any };
    const titles = wikiWindow.$tw.wiki.filterTiddlers('[all[tiddlers+shadows]tag[$:/tags/Layout]] [[$:/core/ui/PageTemplate]] +[!is[draft]sort[name]]');
    return titles.map((title: string) => {
      const fields = wikiWindow.$tw.wiki.getTiddler(title)?.fields;
      const rawName = fields?.name;
      const rawDescription = fields?.description;
      if (typeof rawName === 'string' && rawName.length > 0) {
        const name = wikiWindow.$tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', `\\import [[$:/core/macros/lingo]]\n\n${rawName}`);
        if (typeof rawDescription === 'string' && rawDescription.length > 0) {
          const description = wikiWindow.$tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', `\\import [[$:/core/macros/lingo]]\n\n${rawDescription}`);
          return `${name} - ${description}`;
        }
        return name;
      }
      return wikiWindow.$tw.wiki.getTiddlerText('$:/language/PageTemplate/Name', title);
    });
  });
}

async function getCurrentLayoutDisplayName(page: Page) {
  return page.evaluate(() => {
    const wikiWindow = window as Window & { $tw: any };
    const currentLayoutTitle = wikiWindow.$tw.wiki.getTiddlerText('$:/layout', '');
    const rawName = wikiWindow.$tw.wiki.getTiddler(currentLayoutTitle)?.fields.name;
    if (typeof rawName === 'string' && rawName.length > 0) {
      return wikiWindow.$tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', `\\import [[$:/core/macros/lingo]]\n\n${rawName}`);
    }
    return wikiWindow.$tw.wiki.getTiddlerText('$:/language/PageTemplate/Name', currentLayoutTitle || '$:/core/ui/PageTemplate');
  });
}

async function typeIntoPalette(input: Locator, suffix: string) {
  await input.press('Control+A');
  await input.fill('');
  await input.type(suffix);
}

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

test('shows every existing layout with Chinese names', async ({ page }) => {
  await addTestLayout(page, '$:/tests/Playwright/Layout-A', 'Playwright 临时布局 A');
  await addTestLayout(page, '$:/tests/Playwright/Layout-B', 'Playwright 临时布局 B');

  const expectedNames = await getExpectedLayoutNames(page);
  await openCommandPalette(page, '$');

  await expect(page.locator(palettePanelSelector)).toContainText('切换布局 - 当前布局: 标准布局');
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
    const wikiWindow = window as Window & { $tw: any };
    return wikiWindow.$tw.wiki.getTiddlerText('$:/layout', '');
  })).toBe(layoutTitle);

  await expect.poll(() => getCurrentLayoutDisplayName(page)).toBe(layoutName);
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
      || state.storyList.some(item => item.includes(newTitle))
      || state.focused.includes(newTitle);
  }).toBe(true);
});

test('searches within a built-in filter result set', async ({ page }) => {
  const title = `Playwright 未打标签 ${Date.now()}`;

  await page.evaluate((untaggedTitle) => {
    const wikiWindow = window as Window & { $tw: any };
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

test('adds a tag through action-string autocomplete variable prompt', async ({ page }) => {
  const newTag = `PlaywrightTag${Date.now()}`;

  const input = await openCommandPalette(page, '$');
  await typeIntoPalette(input, '$添加标签到当前条目');
  await clickPaletteItem(page, '添加标签到当前条目');

  await expect(page.locator(palettePanelSelector)).toContainText('新标签');

  const wizardInput = page.locator(paletteInputSelector);
  await typeIntoPalette(wizardInput, newTag);
  await clickPaletteItem(page, newTag);

  await expect.poll(() => page.evaluate(() => {
    const wikiWindow = window as Window & { $tw: any };
    const focused = wikiWindow.$tw.wiki.getTiddlerText('$:/temp/focussedTiddler', '');
    const tags = wikiWindow.$tw.wiki.getTiddler(focused)?.fields.tags || [];
    return tags;
  })).toContain(newTag);
});