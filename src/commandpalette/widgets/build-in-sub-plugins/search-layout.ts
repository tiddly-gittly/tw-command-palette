/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { IContext } from '../utils/context';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

export const plugin = {
  getSources(parameters) {
    if (parameters.query.length === 0) return [];
    const { widget } = parameters.state.context as IContext;
    return [
      {
        sourceId: 'layout',
        getItems({ query }) {
          if (query === '') return [];
          return $tw.wiki.filterTiddlers(`[all[shadows]tag[$:/tags/Layout]]`)
            .map((title) => $tw.wiki.getTiddler(title)?.fields)
            .filter((tiddler): tiddler is ITiddlerFields => {
              if (tiddler === undefined) return false;
              // TODO: add pinyinfuse
              return $tw.wiki.filterTiddlers(
                `[search[${query}]]`,
                undefined,
                $tw.wiki.makeTiddlerIterator([renderTextWithCache(tiddler.name, widget), renderTextWithCache(tiddler.description, widget)]),
              ).length > 0;
            });
        },
        getItemUrl({ item }) {
          return item.title;
        },
        onSelect({ item }) {
          parameters.setContext({ noNavigate: true } satisfies IContext);
          $tw.wiki.setText('$:/layout', 'text', undefined, item.title, { suppressTimestamp: true });
        },
        templates: {
          header() {
            const currentLayoutTitle = $tw.wiki.getTiddlerText('$:/layout');
            const currentLayoutName = currentLayoutTitle
              ? renderTextWithCache($tw.wiki.getTiddlerText(currentLayoutTitle), widget)
              : $tw.wiki.getTiddlerText('$:/language/PageTemplate/Name');
            return `${lingo('Layout')} - ${lingo('CurrentLayout')}: ${currentLayoutName}`;
          },
          item({ item }) {
            if (typeof item.name === 'string' && item.name !== '') {
              const description = renderTextWithCache(item.description, widget);
              return `${renderTextWithCache(item.name, widget)}${description ? ` - ${description}` : ''}`;
            }
            return item.title;
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
