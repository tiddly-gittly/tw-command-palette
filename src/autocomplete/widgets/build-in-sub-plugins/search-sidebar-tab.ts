import type { AutocompleteState } from '@algolia/autocomplete-core';
import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { IContext } from '../utils/context';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

function getSidebarTabTitles() {
  const domTitles = Array.from(document.querySelectorAll<HTMLButtonElement>('.tc-sidebar-lists .tc-tab-buttons button[data-tab-title]'))
    .map((button) => button.dataset.tabTitle)
    .filter((title): title is string => typeof title === 'string' && title.length > 0);

  if (domTitles.length > 0) {
    return domTitles;
  }

  return $tw.wiki.filterTiddlers('[all[tiddlers+shadows]tag[$:/tags/SideBar]!has[draft.of]]');
}

function getSidebarTabs() {
  return getSidebarTabTitles()
    .map((title) => $tw.wiki.getTiddler(title)?.fields)
    .filter((fields): fields is ITiddlerFields => Boolean(fields));
}

function getCurrentSidebarTabTitle() {
  const selectedButtonTitle = document.querySelector<HTMLButtonElement>('.tc-sidebar-lists .tc-tab-buttons button.tc-tab-selected')?.dataset.tabTitle;
  if (selectedButtonTitle) {
    return selectedButtonTitle;
  }

  const currentStateTitle = $tw.wiki.filterTiddlers('[all[tiddlers+shadows]prefix[$:/state/tab/sidebar--]]')[0];
  if (currentStateTitle) {
    return $tw.wiki.getTiddlerText(currentStateTitle, '');
  }

  return $tw.wiki.getTiddlerText('$:/config/DefaultSidebarTab', '');
}

function getSidebarTabButton(tabTitle: string) {
  const escapedTitle = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(tabTitle)
    : tabTitle.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return document.querySelector<HTMLButtonElement>(`.tc-sidebar-lists .tc-tab-buttons button[data-tab-title="${escapedTitle}"]`);
}

function switchSidebarTab(tabTitle: string) {
  const button = getSidebarTabButton(tabTitle);
  if (button) {
    button.click();
    return true;
  }

  const stateTitle = $tw.wiki.filterTiddlers('[all[tiddlers+shadows]prefix[$:/state/tab/sidebar--]]')[0];
  if (stateTitle) {
    $tw.wiki.setText(stateTitle, 'text', undefined, tabTitle, { suppressTimestamp: true });
    return true;
  }

  return false;
}

function getSidebarTabCaption(tab: ITiddlerFields, widget: IContext['widget']) {
  return renderTextWithCache(tab.caption, widget).trim();
}

function getSidebarTabDisplayText(tab: ITiddlerFields, widget: IContext['widget']) {
  const caption = getSidebarTabCaption(tab, widget);
  if (caption && caption !== tab.title) {
    return `${caption} - ${lingo('SidebarTab')} (${tab.title})`;
  }
  return `${tab.title} - ${lingo('SidebarTab')}`;
}

export const plugin = {
  getSources(parameters) {
    if (parameters.query.length === 0) return [];
    const { widget } = parameters.state.context as IContext;
    const onSelect = (item: ITiddlerFields, state: AutocompleteState<ITiddlerFields>, isClick: boolean) => {
      if (widget) {
        widget.commandHandled = true;
        widget.commandKeepOpen = false;
      }

      const switched = switchSidebarTab(item.title);
      if (!switched) {
        console.warn(`Unable to switch sidebar tab ${item.title}`);
      }

      if (isClick) {
        parameters.navigator.navigate({ item, itemUrl: item.title, state });
      }
    };

    return [
      {
        sourceId: 'search-sidebar-tab',
        getItems({ query }) {
          const realQuery = query.substring(1);
          const tabs = getSidebarTabs();
          if (realQuery === '') {
            return tabs;
          }

          return tabs.filter((tab) =>
            $tw.wiki.filterTiddlers(
              `[search[${realQuery}]]`,
              undefined,
              $tw.wiki.makeTiddlerIterator([
                tab.title,
                tab.title.replace('$:/', '').replaceAll('/', ' '),
                getSidebarTabCaption(tab, widget),
              ]),
            ).length > 0
          );
        },
        getItemUrl({ item }) {
          return item.title;
        },
        onSelect({ item, state }) {
          onSelect(item, state, false);
        },
        templates: {
          header() {
            const currentSidebarTabTitle = getCurrentSidebarTabTitle();
            const currentSidebarTab = currentSidebarTabTitle ? $tw.wiki.getTiddler(currentSidebarTabTitle)?.fields : undefined;
            const currentLabel = currentSidebarTab
              ? getSidebarTabCaption(currentSidebarTab, widget) || currentSidebarTab.title
              : currentSidebarTabTitle;
            return `${lingo('SidebarTab')} - ${lingo('CurrentSidebarTab')}: ${currentLabel}`;
          },
          item({ item, createElement, state }) {
            const onclick = () => {
              onSelect(item, state, true);
            };

            return createElement(
              'div',
              {
                onclick,
                onTap: onclick,
              },
              getSidebarTabDisplayText(item, widget),
            );
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
