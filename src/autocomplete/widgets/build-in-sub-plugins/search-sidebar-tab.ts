import type { AutocompleteState } from '@algolia/autocomplete-core';
import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { cacheSystemTiddlers } from '../utils/configs';
import { IContext } from '../utils/context';
import { createDebounced } from '../utils/debounce';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

const debounced = createDebounced();

/**
 * This list won't change during wiki use, so we can only fetch it once.
 */
let cachedTiddlers: ITiddlerFields[] = [];

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
  async getSources(parameters) {
    if (!parameters.query.trim()) return [];
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

    return await debounced([
      {
        sourceId: 'search-sidebar-tab',
        async getItems({ query }) {
          if (cachedTiddlers.length === 0 || !cacheSystemTiddlers()) {
            cachedTiddlers = await filterTiddlersAsync(`[all[tiddlers+shadows]tag[$:/tags/SideBar]!has[draft.of]]`, {
              system: true,
              exclude: [],
            });
          }

          const realQuery = query.substring(1);
          if (!realQuery) return cachedTiddlers;

          return cachedTiddlers.filter((tab) =>
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
    ]);
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;

function switchSidebarTab(tabTitle: string) {
  const escapedTitle = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(tabTitle)
    : tabTitle.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const button = document.querySelector<HTMLButtonElement>(`.tc-sidebar-lists .tc-tab-buttons button[data-tab-title="${escapedTitle}"]`);
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
