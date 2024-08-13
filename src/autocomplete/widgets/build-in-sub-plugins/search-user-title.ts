import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchUser, checkIsUnderFilter } from '../utils/checkPrefix';
import { titleTextExclusionFilter } from '../utils/configs';
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
          const filterToOpen = `[all[tiddlers]!is[system]] ${titleTextExclusionFilter()} +[search:${getFieldsAsTitle()}[${query}]]`;
          parameters.setContext({ filterToOpen });
          return await filterTiddlersAsync(filterToOpen, {});
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          header() {
            return lingo('UserTitle');
          },
          item({ item, createElement, state }) {
            if (typeof item.caption === 'string' && item.caption !== '') {
              const onclick = () => {
                parameters.navigator.navigate({ item, itemUrl: item.title, state });
              };
              return createElement('div', {
                onclick,
              }, `${item.caption} (${item.title})`);
            }
            return createElement('div', {
              onclick,
            }, item.title);
          },
        },
      },
    ]);
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
