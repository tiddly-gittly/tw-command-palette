import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { titleTextExclusionFilter } from '../utils/configs';
import { emptyContext } from '../utils/context';
import { debounced } from '../utils/debounce';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { buildTitleFieldFilter, getFieldsAsTitle } from '../utils/getFieldsAsTitle';
import { lingo } from '../utils/lingo';

export const plugin = {
  async getSources(parameters) {
    // Routing logic is now centralized in phaseRouter.ts
    // This source will only be called when appropriate
    if (parameters.query.length === 0) return [];
    const { fieldsAsTitleOnly, fieldsAsCaption, titleFields } = getFieldsAsTitle();
    return await debounced([
      {
        sourceId: 'title',
        async getItems({ query }) {
          if (query === '') return [];
          const filterToOpen = buildTitleFieldFilter({
            baseFilter: '[all[tiddlers]!is[system]]',
            query,
            operator: 'search',
            fieldsAsTitleOnly,
            fieldsAsCaption,
            exclusionFilter: titleTextExclusionFilter(),
          });
          parameters.setContext({ filterToOpen });
          return filterToOpen === '' ? [] : await filterTiddlersAsync(filterToOpen, {});
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
