import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import uniq from 'lodash/uniq';
import { ITiddlerFields } from 'tiddlywiki';
import { contextActions, contextReducer, IContext } from '../utils/context';
import { createDebounced } from '../utils/debounce';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';
import { sanitizeFilterQuery } from '../utils/sanitizeFilterQuery';

const debounced = createDebounced();

function getStoryHistoryItems(titles: string[]) {
  const [first, second, ...rest] = titles
    .map((title) => $tw.wiki.getTiddler(title)?.fields)
    .filter(Boolean) as ITiddlerFields[];
  // swap first and second, so its easier to switch to second, like using ctrl + tab in vscode
  return [second, first, ...rest].filter(Boolean).slice(0, 20);
}

export const plugin = {
  async getSources(parameters) {
    // Routing logic is now centralized in phaseRouter.ts
    const { widget } = parameters.state.context as IContext;
    return await debounced([
      {
        sourceId: 'story-history',
        getItems({ query, state }) {
          const context = state.context as IContext;
          const historyDataRaw = $tw.wiki.getTiddlerData<Array<{ title: string }> | undefined>('$:/HistoryList');
          const historyData = historyDataRaw ?? [];
          const historyTitles = uniq([
            ...historyData.reverse().map((x) => x.title),
            ...$tw.wiki.filterTiddlers('[list[$:/StoryList]]'),
          ]);
          if (!query.trim()) {
            // In Ctrl+Tab cycle-history mode we want the full story list even with no query.
            // In normal empty-query mode this source stays hidden to avoid clutter.
            return context.cycleHistoryMode ? getStoryHistoryItems(historyTitles) : [];
          }
          const filteredHistoryTitles = $tw.wiki.filterTiddlers(`[search:title[${sanitizeFilterQuery(query)}]]`, undefined, $tw.wiki.makeTiddlerIterator(historyTitles));
          return getStoryHistoryItems(filteredHistoryTitles);
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          header() {
            return lingo('StoryHistory');
          },
          item({ item, createElement, state }) {
            const onclick = () => {
              parameters.navigator.navigate({ item, itemUrl: item.title, state: { ...state, context: contextReducer(contextActions.clearTransient()) } });
            };
            if (typeof item.caption === 'string' && item.caption !== '') {
              return createElement('div', {
                onclick,
                onTap: onclick,
              }, `${renderTextWithCache(item.caption, widget)} (${item.title})`);
            }
            return createElement('div', {
              onclick,
              onTap: onclick,
            }, item.title);
          },
        },
      },
    ]);
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
