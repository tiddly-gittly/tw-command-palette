import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchUser, checkIsUnderFilter } from '../utils/checkPrefix';
import { titleTextExclusionFilter } from '../utils/configs';
import { emptyContext } from '../utils/context';
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
      ($tw.utils.containsChinese as (text: string) => boolean)(parameters.query)
    ) {
      return [];
    }
    if (parameters.query.length === 0) return [];
    const { fieldsAsTitle, titleFields } = getFieldsAsTitle();
    return await debounced([
      {
        sourceId: 'title-pinyin',
        async getItems({ query }) {
          if (query === '') return [];
          const filterToOpen = `[all[tiddlers]!is[system]] ${titleTextExclusionFilter()} +[pinyinfuse:${fieldsAsTitle}[${query}]]`;
          parameters.setContext({ filterToOpen });
          return await filterTiddlersAsync(filterToOpen, {});
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          header() {
            return lingo('UserTitlePinyin');
          },
          item({ item, createElement, state }) {
            const onclick = () => {
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
