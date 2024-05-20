/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsCommand } from '../utils/checkPrefix';
import { IContext } from '../utils/context';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

export const plugin = {
  getSources(parameters) {
    if (parameters.query.length === 0) return [];
    if (!checkIsCommand(parameters)) return [];
    const focusedTiddler = $tw.wiki.getTiddlerText('$:/temp/focussedTiddler');
    const variables = { currentTiddler: focusedTiddler ?? '' };
    const { widget } = parameters.state.context as IContext;
    return [
      {
        sourceId: 'message',
        getItems({ query }) {
          if (query === '') return [];
          return $tw.wiki.filterTiddlers(`[all[tiddlers+shadows]tag[$:/tags/CommandPaletteCommand]field:command-palette-type[message]]`)
            .map((title) => $tw.wiki.getTiddler(title)?.fields)
            .filter((tiddler): tiddler is ITiddlerFields => {
              if (tiddler === undefined) return false;
              const filter = tiddler['command-palette-filter'] as string | undefined;
              // if no filter, just pass. If user didn't install `$:/plugins/Gk0Wk/focused-tiddler`, also pass.
              if (!filter || !focusedTiddler) return true;
              const passTheFilterOnTiddler = $tw.wiki.filterTiddlers(filter, undefined, $tw.wiki.makeTiddlerIterator([focusedTiddler])).length > 0;
              return passTheFilterOnTiddler;
            })
            .filter(tiddler =>
              // TODO: add pinyinfuse
              $tw.wiki.filterTiddlers(
                `[search[${query.slice(1)}]]`,
                undefined,
                $tw.wiki.makeTiddlerIterator([
                  tiddler.title.replace('$:/plugins/linonetwo/commandpalette/', ''),
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
          widget?.dispatchEvent?.({
            type: item.text.trim(),
            tiddlerTitle: focusedTiddler,
            // TODO: if need param, into param input mode like vscode does. Or Listen on right arrow key in onActive, and open a side panel to input params.
            // param
          });
        },
        templates: {
          header() {
            // get rendered caption of focused tiddler
            let caption = focusedTiddler ? $tw.wiki.getTiddler(focusedTiddler)?.fields?.caption as string | undefined : '';
            if (caption) {
              caption = `(${renderTextWithCache(caption, widget, variables)})`;
            }
            // show original title + caption
            return `${lingo('Message')} - ${lingo('CurrentTiddler')}: ${focusedTiddler} ${caption}`;
          },
          item({ item }) {
            if (typeof item.caption === 'string' && item.caption !== '') {
              const description = item.description
                ? ` (${renderTextWithCache(item.description as string, widget, variables)})`
                : '';
              return `${renderTextWithCache(item.caption, widget, variables)}${description}`;
            }
            return item.title;
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
