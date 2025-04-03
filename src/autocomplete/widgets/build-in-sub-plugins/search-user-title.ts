import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchUser, checkIsUnderFilter } from '../utils/checkPrefix';
import { titleTextExclusionFilter } from '../utils/configs';
import { debounced } from '../utils/debounce';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { getFieldsAsTitle } from '../utils/getFieldsAsTitle';
import { lingo } from '../utils/lingo';
import { emptyContext } from '../utils/context';

export const plugin = {
  async getSources(parameters) {
    if (parameters.query.length === 0) return [];
    if (!checkIsSearchUser(parameters) || checkIsUnderFilter(parameters)) return [];
    const { fieldsAsTitle, titleFields } = getFieldsAsTitle();
    return await debounced([
      {
        sourceId: 'title',
        async getItems({ query }) {
          if (query === '') return [];
          const filterToOpen = `[all[tiddlers]!is[system]] ${titleTextExclusionFilter()} +[search:${fieldsAsTitle}[${query}]]`;
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
            const onclick = () => {
              // Assign emptyContext in case of search-recent's content not cleared by clearContext() in widget.ts so there is `noNavigate` that prevents navigate.
              parameters.navigator.navigate({ item, itemUrl: item.title, state: { ...state, context: emptyContext } });
            };
            const titles = titleFields.map(field => item[field]).filter((item): item is string => typeof item === 'string' && item !== '').map((item, index) =>
              index === 0 ? item : `(${item})`
            ).join(' ');
            return createElement('div', {
              onclick,
              onTap: onclick,
            }, titles);
          },
        },
      },
    ]);
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
