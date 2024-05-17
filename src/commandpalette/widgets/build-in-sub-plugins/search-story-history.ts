import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import uniq from 'lodash/uniq';
import { ITiddlerFields } from 'tiddlywiki';
import { lingo } from '../utils/lingo';

export const plugin = {
  getSources() {
    return [
      {
        sourceId: 'story-history',
        getItems({ query }) {
          const historyData = $tw.wiki.getTiddlerData<Array<{ title: string }>>('$:/HistoryList') ?? [];
          const historyTitles = uniq([
            ...historyData.reverse().map((x) => x.title),
            ...$tw.wiki.filterTiddlers('[list[$:/StoryList]]'),
          ]);
          // DEBUG: console historyTitles
          console.log(`historyTitles`, historyTitles);
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
          return [second, first, ...rest];
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
            return `${lingo('StoryHistory')} - ${lingo('NoResult')}`;
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;