import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { titleTextExclusionFilter } from '../utils/configs';
import { contextActions, contextReducer } from '../utils/context';
import { createDebounced } from '../utils/debounce';

const debounced = createDebounced();
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { getFieldsAsText, getFieldsAsTitle } from '../utils/getFieldsAsTitle';
import { lingo } from '../utils/lingo';

export const plugin = {
  async getSources(parameters) {
    // Routing logic is now centralized in phaseRouter.ts
    if (parameters.query.length === 0) return [];
    const { textFields, fieldsAsText } = getFieldsAsText();
    const { titleFields } = getFieldsAsTitle();
    return await debounced([
      {
        sourceId: 'text',
        async getItems({ query }) {
          if (!query.trim()) return [];
          const filter = `[all[tiddlers]!is[system]] ${titleTextExclusionFilter()} +[search:${fieldsAsText}[${query}]]`;
          const result = await filterTiddlersAsync(filter, { system: false, exclude: [] });
          return result;
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          header() {
            return lingo('UserText');
          },
          item({ item, createElement, state }) {
            const titles = titleFields.map(field => item[field]).filter((item): item is string => typeof item === 'string' && item !== '').map((item, index) =>
              index === 0 ? item : `(${item})`
            ).join(' ');
            const textCountAroundHit = 30;
            let contextNearText = '';
            const keywords = state.query.split(' ').filter(Boolean);
            const itemText = textFields.map(field => item[field]).filter(Boolean).join(' ');
            keywords.forEach(keyword => {
              const index = itemText.indexOf(keyword);
              if (index !== -1) {
                const start = Math.max(0, index - textCountAroundHit);
                const end = Math.min(itemText.length, index + keyword.length + textCountAroundHit);
                const prefix = start > 0 ? '...' : '';
                const suffix = end < itemText.length ? '...' : '';
                const beforeMatch = itemText.slice(start, index);
                const matchedText = itemText.slice(index, index + keyword.length);
                const afterMatch = itemText.slice(index + keyword.length, end);

                contextNearText += `${prefix}${beforeMatch}<mark>${matchedText}</mark>${afterMatch}${suffix}`;
              }
            });

            const onclick = () => {
              parameters.navigator.navigate({ item, itemUrl: item.title, state: { ...state, context: contextReducer(contextActions.clearTransient()) } });
            };
            return createElement('div', {
              style: 'display:flex;flex-direction:column;',
              onclick,
              onTap: onclick,
            }, [
              createElement('div', { style: 'margin-bottom:0.25em;' }, titles),
              createElement('div', {}, [
                createElement('small', { innerHTML: contextNearText }),
              ]),
            ]);
          },
        },
      },
    ]);
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
