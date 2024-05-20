import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchTags } from '../utils/checkPrefix';
import { IContext } from '../utils/context';
import { lingo } from '../utils/lingo';

export const plugin = {
  getSources(parameters) {
    if (parameters.query.length === 0) return [];
    if (!checkIsSearchTags(parameters)) {
      return [];
    }
    return [{
      // suggest tags for user to search
      sourceId: 'tags',
      getItems({ query }) {
        // similar to $:/core/Filters/AllTags
        return $tw.wiki.filterTiddlers(`[tags[]search[${query.slice(1)}]]`)
          .map((title) => $tw.wiki.getTiddler(title)?.fields)
          .filter(Boolean) as ITiddlerFields[];
      },
      getItemUrl({ item }) {
        return item.title;
      },
      onSelect({ item }) {
        const filter = `[tag[${item.title}]]`;
        parameters.setContext({ newQuery: '', noClose: true, noNavigate: true, filter } satisfies IContext);
      },
      templates: {
        header() {
          return lingo('Tags');
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
    }];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
