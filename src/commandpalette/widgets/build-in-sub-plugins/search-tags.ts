import type { AutocompletePlugin, GetSources } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearch } from '../utils/checkPrefix';
import { IContext } from '../utils/context';
import { lingo } from '../utils/lingo';

export const plugin = {
  getSources(parameters) {
    if (parameters.query.length === 0) return [];
    if (!checkIsSearch(parameters)) return [];
    const sources: ReturnType<GetSources<ITiddlerFields>> = [
      {
        // suggest tags for user to search
        sourceId: 'tag-autocomplete',
        getItems({ query }) {
          if (query === '') return [];
          // similar to $:/core/Filters/AllTags
          return $tw.wiki.filterTiddlers(`[tags[]search[${query}]]`)
            .map((title) => $tw.wiki.getTiddler(title)?.fields)
            .filter(Boolean) as ITiddlerFields[];
        },
        getItemUrl({ item }) {
          return item.title;
        },
        onSelect({ item }) {
          parameters.setContext({ newQuery: `#${item.title}`, noClose: true } satisfies IContext);
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
        },
      },
    ];
    // only search tiddler tagged with this tag when query prefix with `#`
    // may have multiple tags like `#tag 1#tag2`, tag can have space
    if (parameters.query.startsWith('#')) {
      sources.push({
        sourceId: 'tag',
        getItems({ query }) {
          const tags = query.split('#').filter(Boolean);
          if (tags.length === 0) return [];
          return $tw.wiki.filterTiddlers(`[all[tiddlers]!is[system]${tags.map(tag => `tag[${tag}]`).join('')}]`)
            .map((title) => $tw.wiki.getTiddler(title)?.fields)
            .filter(Boolean) as ITiddlerFields[];
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          header() {
            return lingo('Tagging');
          },
          item({ item }) {
            if (typeof item.caption === 'string' && item.caption !== '') {
              return `${item.caption} (${item.title})`;
            }
            return item.title;
          },
        },
      });
    }
    return sources;
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
