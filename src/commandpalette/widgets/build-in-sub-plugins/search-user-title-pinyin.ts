import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { getFieldsAsTitle } from '../utils/getFieldsAsTitle';
import { lingo } from '../utils/lingo';

export const plugin = {
  getSources(parameters) {
    if (
      // check `pinyinfuse` operator is installed
      $tw.wiki.getTiddler('$:/plugins/linonetwo/pinyin-fuzzy-search/pinyin-fuzzy-search.js') === undefined ||
      // don't search pinyin if already includes CJK
      ($tw.utils.containsChinese as (text: string) => boolean)?.(parameters.query)
    ) {
      return [];
    }
    if (parameters.query.length === 0) return [];
    return [
      {
        sourceId: 'title-pinyin',
        getItems({ query }) {
          if (query === '') return [];
          return $tw.wiki.filterTiddlers(`[all[tiddlers]!is[system]pinyinfuse:${getFieldsAsTitle()}[${query}]]`)
            .map((title) => $tw.wiki.getTiddler(title)?.fields)
            .filter(Boolean) as ITiddlerFields[];
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          header() {
            return lingo('UserTitlePinyin');
          },
          item({ item }) {
            if (typeof item.caption === 'string' && item.caption !== '') {
              return `${item.caption} (${item.title})`;
            }
            return item.title;
          },
          noResults() {
            return lingo('NoResult');
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
