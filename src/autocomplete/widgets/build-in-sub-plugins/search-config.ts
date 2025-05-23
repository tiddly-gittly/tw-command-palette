/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchSystem, checkIsUnderFilter } from '../utils/checkPrefix';
import { cacheSystemTiddlers } from '../utils/configs';
import { emptyContext, IContext } from '../utils/context';
import { debounced } from '../utils/debounce';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

/**
 * This list won't change during wiki use, so we can only fetch it once.
 */
let cachedTiddlers: ITiddlerFields[] = [];
export const plugin = {
  async getSources(parameters) {
    if (parameters.query.length === 0) return [];
    if (!checkIsSearchSystem(parameters) || checkIsUnderFilter(parameters)) return [];
    const { widget } = parameters.state.context as IContext;
    return await debounced([
      {
        sourceId: 'config',
        async getItems({ query }) {
          if (cachedTiddlers.length === 0 || !cacheSystemTiddlers()) {
            cachedTiddlers = await filterTiddlersAsync(`[all[shadows]tag[$:/tags/ControlPanel/SettingsTab]]`, { system: true });
          }
          const realQuery = query.substring(1);
          return realQuery ? cachedTiddlers
            .filter((tiddler): tiddler is ITiddlerFields => {
              // TODO: add pinyinfuse
              return $tw.wiki.filterTiddlers(
                `[search[${realQuery}]]`,
                undefined,
                // note that `tiddler.text` is undefined on TidGi desktop, but it is OK to not search its text
                $tw.wiki.makeTiddlerIterator([renderTextWithCache(tiddler.caption, widget), tiddler.text, tiddler.title.replace('$:/plugins/', '')]),
              ).length > 0;
            }) : cachedTiddlers;
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          header() {
            return lingo('Config');
          },
          item({ item, createElement, state }) {
            const onclick = () => {
              parameters.navigator.navigate({ item, itemUrl: item.title, state: { ...state, context: emptyContext } });
            };
            if (typeof item.caption === 'string' && item.caption !== '') {
              return createElement('div', {
                onclick,
                onTap: onclick,
              }, renderTextWithCache(item.caption, widget));
            }
            return createElement('div', {
              onclick,
              onTap: onclick,
            }, item.title);
          },
        },
      },
    ]);
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
