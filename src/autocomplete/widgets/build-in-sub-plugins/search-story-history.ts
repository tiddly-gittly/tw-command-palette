import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import uniq from 'lodash/uniq';
import { ITiddlerFields } from 'tiddlywiki';
import { emptyContext, IContext } from '../utils/context';
import { createDebounced } from '../utils/debounce';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

const debounced = createDebounced();

export const plugin = {
  async getSources(parameters) {
    // Routing logic is now centralized in phaseRouter.ts
    const { widget } = parameters.state.context as IContext;
    return await debounced([
      {
        sourceId: 'story-list',
        getItems({ query }) {
          if (!query.trim()) {
            return [];
          }
          const historyDataRaw = $tw.wiki.getTiddlerData<Array<{ title: string }> | undefined>('$:/HistoryList');
          const historyData = historyDataRaw ?? [];
          const historyTitles = uniq([
            ...historyData.reverse().map((x) => x.title),
            ...$tw.wiki.filterTiddlers('[list[$:/StoryList]]'),
          ]);
          const filteredHistoryTitles = $tw.wiki.filterTiddlers(`[search:title[${query}]]`, undefined, $tw.wiki.makeTiddlerIterator(historyTitles));
          const [first, second, ...rest] = filteredHistoryTitles
            .map((title) => $tw.wiki.getTiddler(title)?.fields)
            .filter(Boolean) as ITiddlerFields[];
          // swap first and second, so its easier to switch to second, like using ctrl + tab in vscode
          return [second, first, ...rest].filter(Boolean).slice(0, 20);
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
              parameters.navigator.navigate({ item, itemUrl: item.title, state: { ...state, context: emptyContext } });
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
