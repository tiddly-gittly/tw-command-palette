import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { cacheSystemTiddlers } from '../utils/configs';
import { IContext } from '../utils/context';
import { createDebounced } from '../utils/debounce';
import { executeAction } from '../utils/executeAction';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

const debounced = createDebounced();

/**
 * This list won't change during wiki use, so we can only fetch it once.
 */
let cachedTiddlers: ITiddlerFields[] = [];
export const plugin = {
  async getSources(parameters) {
    // Routing logic is now centralized in phaseRouter.ts
    if (!parameters.query.trim()) return [];
    const focusedTiddler = $tw.wiki.getTiddlerText('$:/temp/focussedTiddler');
    const variables = {
      currentTiddler: focusedTiddler ?? '',
      commandpaletteinput: parameters.query.slice(1),
      selectedText: (parameters.state.context.selectedText ?? '') as string,
    };
    const { widget } = parameters.state.context as IContext;
    return await debounced([
      {
        sourceId: 'command-action-string',
        async getItems({ query }) {
          if (cachedTiddlers.length === 0 || !cacheSystemTiddlers()) {
            cachedTiddlers = await filterTiddlersAsync(`[all[tiddlers+shadows]tag[$:/tags/Actions]]`, { system: true, exclude: [] });
          }
          // If there are search text, filter each tiddler one by one (so we could filter by rendered caption).
          const realQuery = query.substring(1);

          const temporaryWidget = (parameters.state.context as IContext).widget?.makeFakeWidgetWithVariables(variables);
          // Filter tiddlers based on search query and condition field
          const filteredTiddlers = cachedTiddlers.filter(tiddler => {
            // Check if the tiddler has a condition field
            if (tiddler.condition) {
              // Evaluate the condition using TiddlyWiki's filter mechanism
              const result = $tw.wiki.filterTiddlers(tiddler.condition as string, temporaryWidget);
              // Only show tiddlers where the condition evaluates to a non-empty result
              if (result.length === 0) {
                return false;
              }
            }

            // If no search query or condition passed, include the tiddler
            if (!realQuery.trim()) return true;

            // Otherwise filter by search text
            return $tw.wiki.filterTiddlers(
              `[search[${realQuery}]]`,
              undefined,
              $tw.wiki.makeTiddlerIterator([
                tiddler.title.replace('$:/plugins/', '').replace('linonetwo/commandpalette/', ''),
                renderTextWithCache(tiddler.caption, widget),
                renderTextWithCache(tiddler.description, widget),
              ]),
            ).length > 0;
          });

          return filteredTiddlers;
        },
        getItemUrl({ item }) {
          return item.title;
        },
        onSelect({ item }) {
          executeAction(item, parameters, variables);
        },
        templates: {
          header() {
            // get rendered caption of focused tiddler
            let caption = focusedTiddler ? $tw.wiki.getTiddler(focusedTiddler)?.fields.caption as string | undefined : '';
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
            return createElement('div', {}, `${renderTextWithCache(item.caption, widget, variables)}${description}` || item.title);
          },
        },
      },
    ]);
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
