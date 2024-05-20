import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import uniq from 'lodash/uniq';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearch } from '../utils/checkPrefix';
import { IContext } from '../utils/context';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

export const plugin = {
  getSources(parameters) {
    const { widget } = parameters.state.context as IContext;
    if (!checkIsSearch(parameters)) return [];
    return [
      {
        sourceId: 'story-history',
        getItems({ query }) {
          const historyData = $tw.wiki.getTiddlerData<Array<{ title: string }>>('$:/HistoryList') ?? [];
          const historyTitles = uniq([
            ...historyData.reverse().map((x) => x.title),
            ...$tw.wiki.filterTiddlers('[list[$:/StoryList]]'),
          ]);
          let filteredHistoryTitles: string[] = [];
          if ($tw.wiki.getTiddler('$:/plugins/linonetwo/pinyin-fuzzy-search/pinyin-fuzzy-search.js') === undefined) {
            filteredHistoryTitles = $tw.wiki.filterTiddlers(`[search:title[${query}]]`, undefined, $tw.wiki.makeTiddlerIterator(historyTitles));
          } else {
            filteredHistoryTitles = $tw.wiki.filterTiddlers(`[pinyinfuse[${query}]]`, undefined, $tw.wiki.makeTiddlerIterator(historyTitles));
          }
          const [first, second, ...rest] = filteredHistoryTitles
            .map((title) => $tw.wiki.getTiddler(title)?.fields)
            .filter(Boolean) as ITiddlerFields[];
          // swap first and second, so its easier to switch to second, like using ctrl + tab in vscode
          return [second, first, ...rest].filter(Boolean);
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          header() {
            return lingo('StoryHistory');
          },
          item({ item }) {
            if (typeof item.caption === 'string' && item.caption !== '') {
              return `${renderTextWithCache(item.caption, widget)} (${item.title})`;
            }
            return item.title;
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
