/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { IContext } from '../utils/context';
import { lingo } from '../utils/lingo';

export const plugin = {
  getSources(parameters) {
    if (parameters.query.length === 0) return [];
    const focusedTiddler = $tw.wiki.getTiddlerText('$:/temp/focussedTiddler');
    const variables = { currentTiddler: focusedTiddler ?? '' };
    const { widget } = parameters.state.context as IContext;
    return [
      {
        sourceId: 'message',
        getItems({ query }) {
          if (query === '') return [];
          // TODO: wikify caption with cache, and search caption with chinese or pinyin
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
          widget?.dispatchEvent?.({
            type: item.text.trim(),
            tiddlerTitle: focusedTiddler,
            // TODO: if need param, into param input mode like vscode does. Or Listen on right arrow key in onActive, and open a side panel to input params
            // param
          });
        },
        templates: {
          header() {
            // get rendered caption of focused tiddler
            let caption = focusedTiddler ? $tw.wiki.getTiddler(focusedTiddler)?.fields?.caption as string | undefined : '';
            if (caption) {
              caption = `(${$tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', caption, { parentWidget: widget, variables })})`;
            }
            // show original title + caption
            return `${lingo('Message')} - ${lingo('CurrentTiddler')}: ${focusedTiddler} ${caption}`;
          },
          item({ item }) {
            if (typeof item.caption === 'string' && item.caption !== '') {
              const description = item.description
                ? ` (${$tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', item.description as string, { parentWidget: widget, variables })})`
                : '';
              return `${$tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', item.caption, { parentWidget: widget, variables })}${description}`;
            }
            return item.title;
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
