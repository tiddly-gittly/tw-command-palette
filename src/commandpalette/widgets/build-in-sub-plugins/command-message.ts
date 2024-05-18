/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { IContext } from '../utils/context';
import { lingo } from '../utils/lingo';

export const plugin = {
  getSources(parameters) {
    if (parameters.query.length === 0) return [];
    const focusedTiddler = $tw.wiki.getTiddlerText('$:/temp/focussedTiddler');
    return [
      {
        sourceId: 'message',
        getItems({ query }) {
          if (query === '') return [];
          return $tw.wiki.filterTiddlers(`[all[shadows]tag[$:/tags/CommandPaletteCommand]field:command-palette-type[message]search[${query}]]`)
            .map((title) => $tw.wiki.getTiddler(title)?.fields)
            .filter((tiddler): tiddler is ITiddlerFields => {
              if (tiddler === undefined) return false;
              const filter = tiddler['command-palette-filter'] as string | undefined;
              // if no filter, just pass. If user didn't install `$:/plugins/Gk0Wk/focused-tiddler`, also pass.
              if (!filter || !focusedTiddler) return true;
              return $tw.wiki.filterTiddlers(filter, undefined, $tw.wiki.makeTiddlerIterator([focusedTiddler])).length > 0;
            });
        },
        getItemUrl({ item }) {
          return item.title;
        },
        onSelect({ item }) {
          parameters.setContext({ noNavigate: true } satisfies IContext);
          const { widget } = parameters.state.context as IContext;
          widget?.dispatchEvent?.({
            type: item.text.trim(),
            tiddlerTitle: focusedTiddler,
            // TODO: if need param, into param input mode like vscode does. Or Listen on right arrow key in onActive, and open a side panel to input params
            // param
          });
        },
        templates: {
          header() {
            return `${lingo('Message')} (${lingo('CurrentTiddler')}: ${focusedTiddler})`;
          },
          item({ item }) {
            if (typeof item.caption === 'string' && item.caption !== '') {
              const { widget } = parameters.state.context as IContext;
              return `${$tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', item.caption, { parentWidget: widget })} (${item.title})`;
            }
            return item.title;
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
