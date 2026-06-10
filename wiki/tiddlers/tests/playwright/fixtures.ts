import { expect, type Locator, type Page } from '@playwright/test';

export const paletteInputSelector = '.tw-auto-complete-container input';
export const palettePanelSelector = '.tw-commandpalette-panel-default';
export const paletteItemSelector = `${palettePanelSelector} .aa-Item`;
export const layoutResultSelector = '.tw-commandpalette-layout-result';

export type WikiWindow = Window & { $tw: any };
export type MaybeWikiWindow = Window & {
  $tw?: {
    wiki?: unknown;
    rootWidget?: unknown;
  };
};

export async function waitForWiki(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => {
    const wikiWindow = window as unknown as MaybeWikiWindow;
    return Boolean(wikiWindow.$tw?.wiki && wikiWindow.$tw?.rootWidget);
  });
}

export async function seedBaseState(page: Page) {
  await page.evaluate(() => {
    const wikiWindow = window as unknown as WikiWindow;
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

export async function openCommandPalette(page: Page, prefix = '') {
  await page.evaluate((nextPrefix) => {
    const wikiWindow = window as unknown as WikiWindow;
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

export async function closeCommandPalette(page: Page) {
  const input = page.locator(paletteInputSelector);
  if (await input.count()) {
    await input.press('Escape');
  }
  await expect(page.locator(palettePanelSelector)).toHaveCount(0);
}

export async function clickPaletteItem(page: Page, text: string | RegExp) {
  await expect(page.locator(palettePanelSelector)).toContainText(text);
  const item = page.locator(paletteItemSelector).filter({ hasText: text }).first();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect(item).toBeVisible();
    try {
      await item.click();
      return;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('detached from the DOM') || attempt === 2) {
        throw error;
      }
    }
  }
}

export async function typeIntoPalette(input: Locator, suffix: string) {
  await input.press('Control+A');
  await input.fill('');
  await input.fill(suffix);
}

export async function getOpenState(page: Page) {
  return page.evaluate(() => {
    const wikiWindow = window as unknown as WikiWindow;
    return wikiWindow.$tw.wiki.getTiddlerText('$:/temp/auto-complete-search/default/opened', '');
  });
}

export async function getStoryList(page: Page) {
  return page.evaluate(() => {
    const wikiWindow = window as unknown as WikiWindow;
    return wikiWindow.$tw.wiki.getTiddlerList('$:/StoryList');
  });
}

export async function getDraftCount(page: Page) {
  return page.evaluate(() => {
    const wikiWindow = window as unknown as WikiWindow;
    return wikiWindow.$tw.wiki.filterTiddlers('[all[tiddlers]has[draft.of]]').length;
  });
}

export async function getDraftTitlesFor(page: Page, title: string) {
  return page.evaluate((draftOfTitle) => {
    const wikiWindow = window as unknown as WikiWindow;
    return wikiWindow.$tw.wiki.filterTiddlers('[all[tiddlers]]').filter((candidateTitle: string) => {
      const fields = wikiWindow.$tw.wiki.getTiddler(candidateTitle)?.fields;
      return fields?.['draft.of'] === draftOfTitle;
    });
  }, title);
}

export async function getCreatedTiddlerState(page: Page, title: string) {
  return page.evaluate((expectedTitle) => {
    const wikiWindow = window as unknown as WikiWindow;
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

export async function addTestLayout(page: Page, title: string, name: string) {
  await page.evaluate(({ layoutTitle, layoutName }) => {
    const wikiWindow = window as unknown as WikiWindow;
    wikiWindow.$tw.wiki.addTiddler({
      title: layoutTitle,
      tags: ['$:/tags/Layout'],
      name: layoutName,
      description: 'Playwright temporary layout',
      text: '<$transclude tiddler="$:/core/ui/PageTemplate" mode="inline"/>',
    });
  }, { layoutTitle: title, layoutName: name });
}

export async function getExpectedLayoutNames(page: Page) {
  return page.evaluate(() => {
    const wikiWindow = window as unknown as WikiWindow;
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

export async function getCurrentLayoutDisplayName(page: Page) {
  return page.evaluate(() => {
    const wikiWindow = window as unknown as WikiWindow;
    const currentLayoutTitle = wikiWindow.$tw.wiki.getTiddlerText('$:/layout', '');
    const rawName = wikiWindow.$tw.wiki.getTiddler(currentLayoutTitle)?.fields.name;
    if (typeof rawName === 'string' && rawName.length > 0) {
      return wikiWindow.$tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', `\\import [[$:/core/macros/lingo]]\n\n${rawName}`);
    }
    return wikiWindow.$tw.wiki.getTiddlerText('$:/language/PageTemplate/Name', currentLayoutTitle || '$:/core/ui/PageTemplate');
  });
}

export async function getSelectedSidebarTabTitle(page: Page) {
  return page.evaluate(() => {
    const selectedButton = document.querySelector<HTMLButtonElement>('.tc-sidebar-lists .tc-tab-buttons button.tc-tab-selected');
    if (selectedButton?.dataset.tabTitle) {
      return selectedButton.dataset.tabTitle;
    }

    const wikiWindow = window as unknown as WikiWindow;
    const stateTitle = wikiWindow.$tw.wiki.filterTiddlers('[all[tiddlers+shadows]prefix[$:/state/tab/sidebar--]]')[0];
    if (stateTitle) {
      return wikiWindow.$tw.wiki.getTiddlerText(stateTitle, '');
    }

    return wikiWindow.$tw.wiki.getTiddlerText('$:/config/DefaultSidebarTab', '');
  });
}
