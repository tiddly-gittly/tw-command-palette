import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchSystem, checkIsUnderFilter } from '../utils/checkPrefix';
import { debounced } from '../utils/debounce';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { lingo } from '../utils/lingo';

export const plugin = {
  async getSources(parameters) {
    if (parameters.query.length === 0) return [];
    if (!checkIsSearchSystem(parameters) || checkIsUnderFilter(parameters)) return [];
    return await debounced([
      {
        sourceId: 'system-title',
        async getItems({ query }) {
          if (query === '') return [];
          return await filterTiddlersAsync(`[all[tiddlers+shadows]is[system]search[${query}]]`, true);
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          header() {
            return lingo('SystemTitle');
          },
          item({ item }) {
            if (typeof item.caption === 'string' && item.caption !== '') {
              return `${item.caption} (${item.title})`;
            }
            return item.title;
          },
        },
      },
    ]);
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
