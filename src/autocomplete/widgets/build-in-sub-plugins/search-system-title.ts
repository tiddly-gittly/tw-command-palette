import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { searchSystemTitle } from '../utils/configs';
import { emptyContext } from '../utils/context';
import { createDebounced } from '../utils/debounce';

const debounced = createDebounced();
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { lingo } from '../utils/lingo';

export const plugin = {
  async getSources(parameters) {
    // Routing logic is now centralized in phaseRouter.ts
    if (parameters.query.length === 0) return [];
    if (!searchSystemTitle()) return [];
    return await debounced([
      {
        sourceId: 'search-system-title',
        async getItems({ query }) {
          const realQuery = query.substring(1);
          if (!realQuery.trim()) return [];
          const filterToOpen = `[all[tiddlers+shadows]is[system]search[${realQuery}]]`;
          parameters.setContext({ filterToOpen });
          const result = await filterTiddlersAsync(filterToOpen, { system: true });
          return result;
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          header() {
            return lingo('SystemTitle');
          },
          item({ item, createElement, state }) {
            const onclick = () => {
              parameters.navigator.navigate({ item, itemUrl: item.title, state: { ...state, context: emptyContext } });
            };
            if (typeof item.caption === 'string' && item.caption !== '') {
              return createElement('div', {
                onclick,
                onTap: onclick,
              }, `${item.caption} (${item.title})`);
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
