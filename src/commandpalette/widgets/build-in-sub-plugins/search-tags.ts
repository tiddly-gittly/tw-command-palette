import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchTags } from '../utils/checkPrefix';
import { IContext } from '../utils/context';
import { debounced } from '../utils/debounce';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { lingo } from '../utils/lingo';

export const plugin = {
  async getSources(parameters) {
    if (parameters.query.length === 0) return [];
    if (!checkIsSearchTags(parameters)) {
      return [];
    }
    return await debounced([{
      // suggest tags for user to search
      sourceId: 'tags',
      async getItems({ query }) {
        // similar to $:/core/Filters/AllTags
        return await filterTiddlersAsync(`[tags[]search[${query.slice(1)}]]`, true);
      },
      getItemUrl({ item }) {
        return item.title;
      },
      onSelect({ item }) {
        const filter = `[[${item.title}]] [tag[${item.title}]]`;
        parameters.setContext({ newQuery: '', noClose: true, noNavigate: true, filter } satisfies IContext);
      },
      templates: {
        header() {
          return lingo('Tags');
        },
        item({ item, createElement, state }) {
          if (typeof item.caption === 'string' && item.caption !== '') {
            return createElement('div', {
              onclick: () => {
                parameters.navigator.navigate({ item, itemUrl: item.title, state });
              },
            }, `${item.caption} (${item.title})`);
          }
          return createElement('div', {
            onclick: () => {
              parameters.navigator.navigate({ item, itemUrl: item.title, state });
            },
          }, item.title);
        },
        noResults() {
          return lingo('NoResult');
        },
      },
    }]);
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
