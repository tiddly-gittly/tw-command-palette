import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchUser, checkIsUnderFilter } from '../utils/checkPrefix';
import { debounced } from '../utils/debounce';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { getFieldsAsTitle } from '../utils/getFieldsAsTitle';
import { lingo } from '../utils/lingo';

export const plugin = {
  async getSources(parameters) {
    if (parameters.query.length === 0) return [];
    if (!checkIsSearchUser(parameters) || checkIsUnderFilter(parameters)) return [];
    return await debounced([
      {
        sourceId: 'title',
        async getItems({ query }) {
          if (query === '') return [];
          return await filterTiddlersAsync(`[all[tiddlers]!is[system]search:${getFieldsAsTitle()}[${query}]]`);
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          header() {
            return lingo('UserTitle');
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
