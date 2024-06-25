import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchTags } from '../utils/checkPrefix';
import { applyIgnoreFilterToTag } from '../utils/configs';
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
    const onSelect = (item: ITiddlerFields) => {
      const filter = `[[${item.title}]] [tag[${item.title}]]`;
      parameters.setContext({ newQuery: '', noClose: true, noNavigate: true, filter, applyExclusion: applyIgnoreFilterToTag() } satisfies IContext);
    };
    return await debounced([{
      // suggest tags for user to search
      sourceId: 'tags',
      async getItems({ query }) {
        // similar to $:/core/Filters/AllTags
        return await filterTiddlersAsync(`[tags[]search[${query.slice(1)}]]`, { system: true });
      },
      getItemUrl({ item }) {
        return item.title;
      },
      onSelect({ item }) {
        onSelect(item);
      },
      templates: {
        header() {
          return lingo('Tags');
        },
        item({ item, createElement }) {
          if (typeof item.caption === 'string' && item.caption !== '') {
            return createElement('div', {
              onclick: () => {
                onSelect(item);
              },
            }, `${item.caption} (${item.title})`);
          }
          return createElement('div', {
            onclick: () => {
              onSelect(item);
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
