import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchSystem, checkIsUnderFilter } from '../utils/checkPrefix';
import { cacheSystemTiddlers } from '../utils/configs';
import { contextActions, contextReducer, IActionVariableDefinition, IContext } from '../utils/context';
import { debounced } from '../utils/debounce';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

function getDynamicField(item: ITiddlerFields, variableName: string, suffix: string) {
  const exactKey = `${variableName}/${suffix}`;
  const compactName = variableName.replace(/\s+/g, '');
  const compactKey = `${compactName}/${suffix}`;
  return (item[exactKey] ?? item[compactKey]) as string | undefined;
}

function parseActionVariableDefinitions(item: ITiddlerFields): IActionVariableDefinition[] {
  const rawList = item['action-variables'];
  if (typeof rawList !== 'string' || rawList.trim() === '') return [];
  const variableNames = $tw.utils.parseStringArray(rawList);
  return variableNames.map((name) => {
    const rawType = (getDynamicField(item, name, 'type') ?? 'text').toLowerCase();
    const type = rawType === 'checkbox'
      ? 'checkbox'
      : rawType === 'select'
        ? 'select'
        : rawType === 'multi-checkbox'
          ? 'multi-checkbox'
          : 'text';
    const rawOptions = getDynamicField(item, name, 'options') ?? '';
    const options = rawOptions.trim() === '' ? undefined : $tw.utils.parseStringArray(rawOptions);
    return {
      name,
      type,
      caption: getDynamicField(item, name, 'caption'),
      description: getDynamicField(item, name, 'description'),
      defaultValue: getDynamicField(item, name, 'default'),
      autocompleteFilter: getDynamicField(item, name, 'autocomplete-filter'),
      options,
    } satisfies IActionVariableDefinition;
  });
}

/**
 * This list won't change during wiki use, so we can only fetch it once.
 */
let cachedTiddlers: ITiddlerFields[] = [];
export const plugin = {
  async getSources(parameters) {
    if (parameters.query.length === 0) return [];
    if (!checkIsSearchSystem(parameters) || checkIsUnderFilter(parameters)) return [];
    const focusedTiddler = $tw.wiki.getTiddlerText('$:/temp/focussedTiddler');
    const variables = {
      currentTiddler: focusedTiddler ?? '',
      commandpaletteinput: parameters.query.slice(1),
      selectedText: (parameters.state.context.selectedText ?? '') as string,
    };
    const { widget } = parameters.state.context as IContext;
    const onSelect = (item: ITiddlerFields) => {
      const actionText = typeof item.text === 'string' ? item.text : '';
      const variableDefinitions = parseActionVariableDefinitions(item);
      if (variableDefinitions.length > 0) {
        const promptState = {
          commandTitle: item.title,
          actionText,
          definitions: variableDefinitions,
          currentIndex: 0,
          values: {},
          baseVariables: variables,
        };
        parameters.setContext(contextReducer(contextActions.openActionVariablePrompt(promptState)));
        parameters.setQuery('');
        void parameters.refresh().catch((error: unknown) => {
          console.error('Error entering action-variable prompt wizard', error);
        });
        if (widget) {
          widget.commandHandled = true;
          widget.commandKeepOpen = true;
        }
        return;
      }
      parameters.setContext(contextReducer({ type: 'EXECUTE_COMMAND' }));
      // Set flag before invokeActionString so onEnter knows the command was
      // handled here and must not dispatch tm-navigate a second time.
      if (widget) {
        widget.commandHandled = true;
        widget.commandKeepOpen = false;
      }
      widget?.invokeActionString(actionText, widget, null, variables);
    };
    return await debounced([
      {
        sourceId: 'actionString',
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
            if (!realQuery) return true;

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
