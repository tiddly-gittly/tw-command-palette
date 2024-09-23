import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchSystem, checkIsUnderFilter } from '../utils/checkPrefix';
import { searchSystemTitle } from '../utils/configs';
import { debounced } from '../utils/debounce';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { lingo } from '../utils/lingo';

export const plugin = {
  async getSources(parameters) {
    if (parameters.query.length === 0) return [];
    if (!searchSystemTitle() || !checkIsSearchSystem(parameters) || checkIsUnderFilter(parameters)) return [];
    return await debounced([
      {
        sourceId: 'system-title',
        async getItems({ query }) {
          if (query === '') return [];
          const result = await filterTiddlersAsync(`[all[tiddlers+shadows]is[system]search[${query.substring(1)}]]`, { system: true });
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
              parameters.navigator.navigate({ item, itemUrl: item.title, state });
            };
            if (typeof item.caption === 'string' && item.caption !== '') {
              return createElement('div', {
                onclick,
                ontouchend: onclick,
              }, `${item.caption} (${item.title})`);
            }
            return createElement('div', {
              onclick,
              ontouchend: onclick,
            }, item.title);
          },
        },
      },
    ]);
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
