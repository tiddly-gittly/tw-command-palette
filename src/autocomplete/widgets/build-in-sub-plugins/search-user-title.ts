import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { titleTextExclusionFilter } from '../utils/configs';
import { contextActions, contextReducer } from '../utils/context';
import { createDebounced } from '../utils/debounce';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { buildTitleFieldFilter, getFieldsAsTitle } from '../utils/getFieldsAsTitle';
import { lingo } from '../utils/lingo';

const debounced = createDebounced();

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
          if (!query.trim()) return [];
          const filterToOpen = buildTitleFieldFilter({
            baseFilter: '[all[tiddlers]!is[system]]',
            query,
            operator: 'search',
            fieldsAsTitleOnly,
            fieldsAsCaption,
            exclusionFilter: titleTextExclusionFilter(),
          });
          parameters.setContext({ filterToOpen });
          const result = filterToOpen === '' ? [] : await filterTiddlersAsync(filterToOpen, {});
          return result;
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
              // Reset transient context flags in case search-recent left noNavigate behind.
              parameters.navigator.navigate({ item, itemUrl: item.title, state: { ...state, context: contextReducer(contextActions.clearTransient()) } });
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
