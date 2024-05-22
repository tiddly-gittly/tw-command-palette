/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchSystem, checkIsUnderFilter } from '../utils/checkPrefix';
import { IContext } from '../utils/context';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

export const plugin = {
  getSources(parameters) {
    if (parameters.query.length === 0) return [];
    if (!checkIsSearchSystem(parameters) || checkIsUnderFilter(parameters)) return [];
    const focusedTiddler = $tw.wiki.getTiddlerText('$:/temp/focussedTiddler');
    const variables = { currentTiddler: focusedTiddler ?? '', commandpaletteinput: parameters.query.slice(1) };
    const { widget } = parameters.state.context as IContext;
    return [
      {
        sourceId: 'actionString',
        async getItems({ query }) {
          if (query === '') return [];
          return (await filterTiddlersAsync(`[all[tiddlers+shadows]tag[$:/tags/Actions]]`, true, []))
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
          parameters.setContext({ noNavigate: true } satisfies IContext);
          // this calls `invokeActions` under the hood
          widget?.invokeActionString(item.text, widget, null, variables);
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
          item({ item }) {
            const description = item.description
              ? ` (${renderTextWithCache(item.description as string, widget, variables)})`
              : '';
            return `${renderTextWithCache(item.caption, widget, variables)}${description}` || item.title;
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
