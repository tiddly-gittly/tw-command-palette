import type { GetSourcesParams } from '@algolia/autocomplete-core';
import type { AutocompleteSource } from '@algolia/autocomplete-js';
import type { ITiddlerFields } from 'tiddlywiki';
import { plugin as promptPlugin } from '../build-in-sub-plugins/action-variable-prompt';
import { contextActions, contextReducer, IAutocompleteWidget, IContext } from './context';
import { debounceDuration, debouncePromise } from './debounce';
import { executeAction } from './executeAction';

export function searchScopedEntries(widget: IAutocompleteWidget, query: string): ITiddlerFields[] {
  if (query.trim() === '') return [];
  const queryWidget = widget.makeFakeWidgetWithVariables({ commandpaletteinput: query.trim() });
  const candidates = widget.getAttribute('candidateFilter', '[all[tiddlers]!is[system]]');
  const limit = widget.getAttribute('limit', '30');
  const filter = `${candidates} :filter[search:title,caption,alias,text<commandpaletteinput>] +[sort[]limit[${limit}]]`;
  return widget.wiki.filterTiddlers(filter, queryWidget).map(title => widget.wiki.getTiddler(title)!.fields);
}

export function createScopedSources(widget: IAutocompleteWidget) {
  const search = debouncePromise((query: string) => searchScopedEntries(widget, query), debounceDuration);
  return async (parameters: GetSourcesParams<ITiddlerFields>): Promise<Array<AutocompleteSource<ITiddlerFields>>> => {
    const context = parameters.state.context as IContext;
    if (context.actionVariablePrompt) return await promptPlugin.getSources(parameters);
    const variables = {
      currentTiddler: widget.getVariable('currentTiddler', { defaultValue: '' }),
      commandpaletteinput: parameters.query,
      selectedText: context.selectedText ?? '',
    };
    const queryWidget = widget.makeFakeWidgetWithVariables(variables);
    const renderText = (text: unknown) => widget.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', String(text), { parentWidget: widget, variables });
    return [
      {
        sourceId: 'scoped-actions',
        getItems: () =>
          widget.wiki.filterTiddlers(widget.getAttribute('actionFilter', ''), queryWidget)
            .map(title => widget.wiki.getTiddler(title)!.fields)
            .filter(item => !item.condition || widget.wiki.filterTiddlers(item.condition as string, queryWidget).length > 0),
        getItemUrl: ({ item }) => item.title,
        onSelect: ({ item, event, state }) => {
          executeAction(item, parameters, variables);
          if ((event as Event).type === 'click') parameters.navigator.navigate({ item, itemUrl: item.title, state });
        },
        templates: {
          item: ({ item, createElement }) =>
            createElement(
              'div',
              { className: 'tw-autocomplete-action' },
              renderText(item.caption ?? item.title),
              item.description ? ` (${renderText(item.description)})` : '',
            ),
        },
      },
      {
        sourceId: 'scoped-results',
        getItems: ({ query }) => query.trim() === '' ? [] : search(query),
        getItemUrl: ({ item }) => item.title,
        onSelect: () => {
          widget.commandHandled = false;
        },
        templates: {
          item: ({ item, createElement, state }) =>
            createElement('div', {
              className: 'tw-autocomplete-result',
              onclick: () => {
                widget.commandHandled = false;
                parameters.navigator.navigate({ item, itemUrl: item.title, state: { ...state, context: contextReducer(contextActions.clearTransient()) } });
              },
            }, item.title),
        },
      },
    ];
  };
}
