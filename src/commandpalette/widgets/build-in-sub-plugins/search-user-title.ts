import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';

export const plugin = {
  getSources() {
    const fieldsAsTitle = ['title', 'caption'].join(',');
    return [
      {
        sourceId: 'title',
        getItems({ query }) {
          return $tw.wiki.filterTiddlers(`[all[tiddlers]!is[system]search:${fieldsAsTitle}[${query}]]`)
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
            return 'No results.';
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
