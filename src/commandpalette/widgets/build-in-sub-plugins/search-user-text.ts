import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchUser, checkIsUnderFilter } from '../utils/checkPrefix';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { getFieldsAsText } from '../utils/getFieldsAsTitle';
import { lingo } from '../utils/lingo';

export const plugin = {
  getSources(parameters) {
    if (parameters.query.length === 0) return [];
    if (!checkIsSearchUser(parameters) || checkIsUnderFilter(parameters)) return [];
    return [
      {
        sourceId: 'text',
        async getItems({ query }) {
          if (query === '') return [];
          const filter = `[all[tiddlers]!is[system]]:filter[has[text]get[text]!compare:string:eq[]]+[search:${getFieldsAsText()}[${query}]]`;
          return await filterTiddlersAsync(filter, []);
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          header() {
            return lingo('UserText');
          },
          item({ item, createElement, state }) {
            const title = typeof item.caption === 'string' && item.caption !== '' ? `${item.caption} (${item.title})` : item.title;
            const match = item.text.match(state.query);
            const textCountAroundHit = 30;
            let contextNearText = '';
            if (match !== null) {
              const start = Math.max(0, (match.index ?? 0) - textCountAroundHit);
              const end = Math.min(item.text.length, (match.index ?? 0) + match[0].length + textCountAroundHit);
              const prefix = start > 0 ? '...' : '';
              const suffix = end < item.text.length ? '...' : '';
              const beforeMatch = item.text.slice(start, match.index ?? 0);
              const matchedText = match[0];
              const afterMatch = item.text.slice((match.index ?? 0) + matchedText.length, end);

              contextNearText = `${prefix}${beforeMatch}<mark>${matchedText}</mark>${afterMatch}${suffix}`;
            }

            return createElement('div', {
              style: 'display:flex;flex-direction:column;',
            }, [
              createElement('div', { style: 'margin-bottom:0.25em;' }, title),
              createElement('div', {}, [
                createElement('small', { innerHTML: contextNearText }),
              ]),
            ]);
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
