/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsHelp, checkIsUnderFilter } from '../utils/checkPrefix';
import { cacheSystemTiddlers } from '../utils/configs';
import { IContext } from '../utils/context';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

/**
 * This list won't change during wiki use, so we can only fetch it once.
 */
let cachedTiddlers: string[] = [];
export const plugin = {
  getSources(parameters) {
    const { widget } = parameters.state.context as IContext;
    if (!checkIsHelp(parameters) || checkIsUnderFilter(parameters)) return [];
    const onSelect = (item: ITiddlerFields) => {
      parameters.setContext({ noNavigate: true, noClose: true, newQuery: (item['command-palette-prefix'] as string).charAt(0) } satisfies IContext);
    };
    return [
      {
        sourceId: 'help',
        getItems({ query }) {
          if (cachedTiddlers.length === 0 || !cacheSystemTiddlers()) {
            cachedTiddlers = $tw.wiki.filterTiddlers('[all[shadows]tag[$:/tags/CommandPaletteHelp]]');
          }
          return (cachedTiddlers
            .map((title) => $tw.wiki.getTiddler(title)?.fields)
            .filter(Boolean) as ITiddlerFields[])
            .filter((tiddler) =>
              // TODO: add pinyinfuse
              $tw.wiki.filterTiddlers(
                `[search[${query.slice(1)}]]`,
                undefined,
                $tw.wiki.makeTiddlerIterator([
                  tiddler.title.replace('$:/plugins/linonetwo/commandpalette/commands/help/', ''),
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
            return lingo('Help');
          },
          item({ item, createElement }) {
            const description = item.description
              ? ` ${renderTextWithCache(item.description as string, widget)}`
              : '';
            return createElement('div', {
              style: 'display:flex;flex-direction:column;',
              onclick: () => {
                onSelect(item);
              },
            }, [
              createElement('div', { style: 'margin-bottom:0.25em;' }, [
                createElement('em', { style: 'margin-right:0.25em;' }, [item['command-palette-prefix'] as string]),
                renderTextWithCache(item.caption, widget),
              ]),
              createElement('div', { style: 'margin-bottom:0.3em;' }, description),
            ]);
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
