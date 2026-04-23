import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { applyIgnoreFilterToTag } from '../utils/configs';
import { contextActions, contextReducer, IContext } from '../utils/context';
import { debounced } from '../utils/debounce';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { lingo } from '../utils/lingo';

export const plugin = {
  async getSources(parameters) {
    // Routing logic is now centralized in phaseRouter.ts
    if (parameters.query.length === 0) return [];
    const onSelect = (item: ITiddlerFields) => {
      (parameters.state.context as IContext).addHistoryItem?.(parameters.query);
      const filter = `[[${item.title}]] [tag[${item.title}]]`;
      parameters.setContext(contextReducer(contextActions.selectTag(filter, applyIgnoreFilterToTag())));
    };
    return await debounced([{
      // suggest tags for user to search
      sourceId: 'tags',
      async getItems({ query }) {
        // similar to $:/core/Filters/AllTags
        const filterToOpen = `[tags[]search[${query.slice(1)}]]`;
        parameters.setContext({ filterToOpen });
        return await filterTiddlersAsync(filterToOpen, { system: true });
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
          const onclick = () => {
            onSelect(item);
            parameters.setQuery('');
            void parameters.refresh().catch((error: unknown) => {
              console.error('Error in search-tags refresh', error);
            });
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
        noResults() {
          return lingo('NoResult');
        },
      },
    }]);
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
