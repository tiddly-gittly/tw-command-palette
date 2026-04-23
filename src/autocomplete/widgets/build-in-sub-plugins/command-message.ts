import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { cacheSystemTiddlers } from '../utils/configs';
import { contextActions, contextReducer, IContext } from '../utils/context';
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
    // Routing logic is now centralized in phaseRouter.ts
    if (parameters.query.length === 0) return [];
    const focusedTiddler = $tw.wiki.getTiddlerText('$:/temp/focussedTiddler');
    const variables = { currentTiddler: focusedTiddler ?? '' };
    const { widget } = parameters.state.context as IContext;
    const onSelect = (item: ITiddlerFields) => {
      const messageType = (item.text as string | undefined)?.trim() ?? '';
      if (!messageType) return;
      const isNewTiddlerCommand = item.title === '$:/plugins/linonetwo/commandpalette/New Tiddler';
      if (isNewTiddlerCommand && messageType === 'tm-new-tiddler') {
        // Enter round-2 title input mode instead of creating immediately.
        parameters.setContext(contextReducer(contextActions.openCreateTiddlerWizard()));
        parameters.setQuery('');
        void parameters.refresh().catch((error: unknown) => {
          console.error('Error entering create-tiddler wizard', error);
        });
        if (widget) {
          widget.commandHandled = true;
          widget.commandKeepOpen = true;
        }
        return;
      }
      parameters.setContext(contextReducer({ type: 'EXECUTE_COMMAND' }));
      // Set flag before dispatchEvent so onEnter (which fires right after via
      // Algolia's navigate callback) knows the command was handled here and
      // must not dispatch tm-navigate to the tiddler URL a second time.
      if (widget) {
        widget.commandHandled = true;
        widget.commandKeepOpen = false;
      }
      widget?.dispatchEvent({
        type: messageType,
        tiddlerTitle: focusedTiddler,
        // TODO: if need param, into param input mode like vscode does. Or Listen on right arrow key in onActive, and open a side panel to input params.
        // param
      });
    };
    return await debounced([
      {
        sourceId: 'command-message',
        async getItems({ query }) {
          if (cachedTiddlers.length === 0 || !cacheSystemTiddlers()) {
            cachedTiddlers = await filterTiddlersAsync(`[all[tiddlers+shadows]tag[$:/tags/Messages]]`, { system: true });
          }
          // If there are search text, filter each tiddler one by one (so we could filter by rendered caption).
          const realQuery = query.substring(1);
          return realQuery
            ? cachedTiddlers
              .filter((tiddler): tiddler is ITiddlerFields => {
                const filter = tiddler['command-palette-filter'] as string | undefined;
                // if no filter, just pass. If user didn't install `$:/plugins/Gk0Wk/focused-tiddler`, also pass.
                if (!filter || !focusedTiddler) return true;
                const passTheFilterOnTiddler = $tw.wiki.filterTiddlers(filter, undefined, $tw.wiki.makeTiddlerIterator([focusedTiddler])).length > 0;
                return passTheFilterOnTiddler;
              })
              .filter(tiddler =>
                // TODO: add pinyinfuse
                $tw.wiki.filterTiddlers(
                  `[search[${realQuery}]]`,
                  undefined,
                  $tw.wiki.makeTiddlerIterator([
                    tiddler.title.replace('$:/plugins/linonetwo/autocomplete/', ''),
                    renderTextWithCache(tiddler.caption, widget),
                    renderTextWithCache(tiddler.description, widget),
                  ]),
                ).length > 0
              )
            : cachedTiddlers;
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
            let caption = focusedTiddler ? $tw.wiki.getTiddler(focusedTiddler)?.fields.caption as string | undefined : '';
            if (caption) {
              caption = `(${renderTextWithCache(caption, widget, variables)})`;
            }
            // show original title + caption
            return `${lingo('Message')} - ${lingo('CurrentTiddler')}: ${focusedTiddler} ${caption}`;
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
