/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearch, checkIsUnderFilter } from '../utils/checkPrefix';
import { IContext } from '../utils/context';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

export const plugin = {
  getSources(parameters) {
    if (parameters.query.length === 0) return [];
    if (!checkIsSearch(parameters) || checkIsUnderFilter(parameters)) return [];
    const { widget } = parameters.state.context as IContext;
    return [
      {
        sourceId: 'config',
        getItems({ query }) {
          if (query === '') return [];
          return $tw.wiki.filterTiddlers(`[all[shadows]tag[$:/tags/ControlPanel/SettingsTab]]`)
            .map((title) => $tw.wiki.getTiddler(title)?.fields)
            .filter((tiddler): tiddler is ITiddlerFields => {
              if (tiddler === undefined) return false;
              // TODO: add pinyinfuse
              return $tw.wiki.filterTiddlers(
                `[search[${query}]]`,
                undefined,
                $tw.wiki.makeTiddlerIterator([renderTextWithCache(tiddler.caption, widget), tiddler.text]),
              ).length > 0;
            });
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          header() {
            return lingo('Config');
          },
          item({ item }) {
            if (typeof item.caption === 'string' && item.caption !== '') {
              return renderTextWithCache(item.caption, widget);
            }
            return item.title;
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
