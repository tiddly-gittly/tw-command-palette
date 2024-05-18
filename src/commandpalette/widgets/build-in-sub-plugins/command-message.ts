import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { IContext } from '../utils/context';
import { lingo } from '../utils/lingo';

export const plugin = {
  getSources(parameters) {
    if (parameters.query.length === 0) return [];
    return [
      {
        sourceId: 'message',
        getItems({ query }) {
          if (query === '') return [];
          return $tw.wiki.filterTiddlers(`[all[shadows]tag[$:/tags/CommandPaletteCommand]field:command-palette-type[message]search[${query}]]`)
            .map((title) => $tw.wiki.getTiddler(title)?.fields)
            .filter(Boolean) as ITiddlerFields[];
        },
        getItemUrl({ item }) {
          return item.title;
        },
        onSelect({ item }) {
          parameters.setContext({ noNavigate: true } satisfies IContext);
          const { widget } = parameters.state.context as IContext;
          const focusedTiddler = $tw.wiki.getTiddlerText('$:/temp/focussedTiddler');
          widget?.dispatchEvent?.({
            type: item.text.trim(),
            tiddlerTitle: focusedTiddler,
            // TODO: if need param, into param input mode like vscode does. Or Listen on right arrow key in onActive, and open a side panel to input params
            // param
          });
        },
        templates: {
          header() {
            return lingo('Message');
          },
          item({ item }) {
            if (typeof item.caption === 'string' && item.caption !== '') {
              const { widget } = parameters.state.context as IContext;
              return `${$tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', item.caption, { parentWidget: widget })} (${item.title})`;
            }
            return item.title;
          },
          noResults() {
            return `${lingo('Message')} - ${lingo('NoResult')}`;
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
