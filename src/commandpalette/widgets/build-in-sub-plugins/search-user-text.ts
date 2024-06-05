import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchUser, checkIsUnderFilter } from '../utils/checkPrefix';
import { debounced } from '../utils/debounce';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { getFieldsAsText } from '../utils/getFieldsAsTitle';
import { lingo } from '../utils/lingo';

export const plugin = {
  async getSources(parameters) {
    if (parameters.query.length === 0) return [];
    if (!checkIsSearchUser(parameters) || checkIsUnderFilter(parameters)) return [];
    return await debounced([
      {
        sourceId: 'text',
        async getItems({ query }) {
          if (query === '') return [];
          const exclusionFilter = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/commandpalette/configs/TitleTextIgnoreFilter', '');
          const filter = `[all[tiddlers]!is[system]] ${exclusionFilter} :filter[has[text]get[text]!compare:string:eq[]]+[search:${getFieldsAsText()}[${query}]]`;
          return await filterTiddlersAsync(filter, false, []);
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
            const textCountAroundHit = 30;
            let contextNearText = '';
            const keywords = state.query.split(' ').filter(Boolean);

            keywords.forEach(keyword => {
              const index = item.text.indexOf(keyword);
              if (index !== -1) {
                const start = Math.max(0, index - textCountAroundHit);
                const end = Math.min(item.text.length, index + keyword.length + textCountAroundHit);
                const prefix = start > 0 ? '...' : '';
                const suffix = end < item.text.length ? '...' : '';
                const beforeMatch = item.text.slice(start, index);
                const matchedText = item.text.slice(index, index + keyword.length);
                const afterMatch = item.text.slice(index + keyword.length, end);

                contextNearText += `${prefix}${beforeMatch}<mark>${matchedText}</mark>${afterMatch}${suffix}`;
              }
            });

            return createElement('div', {
              style: 'display:flex;flex-direction:column;',
              onclick: () => {
                parameters.navigator.navigate({ item, itemUrl: item.title, state });
              },
            }, [
              createElement('div', { style: 'margin-bottom:0.25em;' }, title),
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
