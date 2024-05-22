import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchUser, checkIsUnderFilter } from '../utils/checkPrefix';
import { debounced } from '../utils/debounce';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { getFieldsAsTitle } from '../utils/getFieldsAsTitle';
import { lingo } from '../utils/lingo';

export const plugin = {
  async getSources(parameters) {
    if (!checkIsSearchUser(parameters) || checkIsUnderFilter(parameters)) return [];
    if (
      // check `pinyinfuse` operator is installed
      $tw.wiki.getTiddler('$:/plugins/linonetwo/pinyin-fuzzy-search/pinyin-fuzzy-search.js') === undefined ||
      // don't search pinyin if already includes CJK
      ($tw.utils.containsChinese as (text: string) => boolean)?.(parameters.query)
    ) {
      return [];
    }
    if (parameters.query.length === 0) return [];
    return await debounced([
      {
        sourceId: 'title-pinyin',
        async getItems({ query }) {
          if (query === '') return [];
          return await filterTiddlersAsync(`[all[tiddlers]!is[system]pinyinfuse:${getFieldsAsTitle()}[${query}]]`);
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
        },
      },
    ]);
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
