import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { lingo } from '../utils/lingo';

export const plugin = {
  getSources() {
    // check `pinyinfuse` operator is installed
    if ($tw.wiki.getTiddler('$:/plugins/linonetwo/pinyin-fuzzy-search/pinyin-fuzzy-search.js') === undefined) {
      return [];
    }
    const fieldsAsTitle = ['title', 'caption'].join(',');
    return [
      {
        sourceId: 'title-pinyin',
        getItems({ query }) {
          return $tw.wiki.filterTiddlers(`[all[tiddlers]!is[system]pinyinfuse:${fieldsAsTitle}[${query}]]`)
            .map((title) => $tw.wiki.getTiddler(title)?.fields)
            .filter(Boolean) as ITiddlerFields[];
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          item({ item }) {
            if (typeof item.caption === 'string' && item.caption !== '') {
              return `${item.caption} (${item.title})`;
            }
            return item.title;
          },
          noResults() {
            return `${lingo('UserTitlePinyin')} - ${lingo('NoResult')}`;
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
