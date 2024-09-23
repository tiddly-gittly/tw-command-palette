/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchSystem, checkIsUnderFilter } from '../utils/checkPrefix';
import { cacheSystemTiddlers } from '../utils/configs';
import { IContext } from '../utils/context';
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
    const focusedTiddler = $tw.wiki.getTiddlerText('$:/temp/focussedTiddler');
    const variables = { currentTiddler: focusedTiddler ?? '', commandpaletteinput: parameters.query.slice(1) };
    const { widget } = parameters.state.context as IContext;
    const onSelect = (item: ITiddlerFields) => {
      parameters.setContext({ noNavigate: true } satisfies IContext);
      // this calls `invokeActions` under the hood
      widget?.invokeActionString(item.text, widget, null, variables);
    };
    return await debounced([
      {
        sourceId: 'actionString',
        async getItems({ query }) {
          if (query === '') return [];
          if (cachedTiddlers.length === 0 || !cacheSystemTiddlers()) {
            cachedTiddlers = await filterTiddlersAsync(`[all[tiddlers+shadows]tag[$:/tags/Actions]]`, { system: true, exclude: [] });
          }
          return cachedTiddlers
            .filter(tiddler =>
              // TODO: add pinyinfuse
              $tw.wiki.filterTiddlers(
                `[search[${query.slice(1)}]]`,
                undefined,
                $tw.wiki.makeTiddlerIterator([
                  tiddler.title.replace('$:/plugins/', '').replace('linonetwo/commandpalette/', ''),
                  renderTextWithCache(tiddler.caption, widget),
                  renderTextWithCache(tiddler.description, widget),
                ]),
              ).length > 0
            );
        },
        getItemUrl({ item }) {
          return item.title;
        },
        onSelect({ item }) {
          onSelect(item);
        },
        templates: {
          header() {
            // get rendered caption of focused tiddler
            let caption = focusedTiddler ? $tw.wiki.getTiddler(focusedTiddler)?.fields?.caption as string | undefined : '';
            if (caption) {
              caption = `(${renderTextWithCache(caption, widget, variables)})`;
            }
            // show original title + caption
            return `${lingo('ActionString')} - ${lingo('CurrentTiddler')}: ${focusedTiddler} ${caption}`;
          },
          item({ item, createElement }) {
            const description = item.description
              ? ` (${renderTextWithCache(item.description as string, widget, variables)})`
              : '';
            const onclick = () => {
              onSelect(item);
            };
            return createElement('div', {
              onclick,
              onTap: onclick,
            }, `${renderTextWithCache(item.caption, widget, variables)}${description}` || item.title);
          },
        },
      },
    ]);
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
