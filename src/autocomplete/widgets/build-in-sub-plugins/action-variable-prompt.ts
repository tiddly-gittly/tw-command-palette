import { AutocompleteState } from '@algolia/autocomplete-core';
import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsUnderFilter } from '../utils/checkPrefix';
import { contextActions, contextReducer, IActionVariableDefinition, IContext } from '../utils/context';
import { debounced } from '../utils/debounce';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

interface IActionVariablePromptItem extends ITiddlerFields {
  'command-palette-value'?: string;
  'command-palette-hint'?: 'yes';
  'command-palette-action'?: 'toggle-option' | 'confirm-multi';
}

function getCheckboxDefault(definition: IActionVariableDefinition) {
  const rawDefault = (definition.defaultValue ?? '').trim().toLowerCase();
  return rawDefault === 'yes' || rawDefault === 'true' || rawDefault === '1';
}

function stringifyList(values: string[]) {
  return $tw.utils.stringifyList(values);
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getDefinitionOptions(
  definition: IActionVariableDefinition,
  prompt: IContext['actionVariablePrompt'],
  widget: IContext['widget'],
): string[] {
  const staticOptions = definition.options ?? [];
  if (!definition.autocompleteFilter || !prompt || !widget) {
    return uniqueSorted(staticOptions);
  }
  const filterVariables = { ...prompt.baseVariables, ...prompt.values };
  const temporaryWidget = typeof widget.makeFakeWidgetWithVariables === 'function'
    ? widget.makeFakeWidgetWithVariables(filterVariables) ?? undefined
    : undefined;
  let dynamicOptions: string[] = [];
  try {
    dynamicOptions = $tw.wiki.filterTiddlers(definition.autocompleteFilter, temporaryWidget);
  } catch {
    dynamicOptions = [];
  }
  return uniqueSorted([...staticOptions, ...dynamicOptions]);
}

function filterByQuery(options: string[], query: string) {
  if (query === '') return options;
  const lower = query.toLowerCase();
  return options.filter(option => option.toLowerCase().includes(lower));
}

export const plugin = {
  async getSources(parameters) {
    if (checkIsUnderFilter(parameters)) return [];
    const context = parameters.state.context as IContext;
    const prompt = context.actionVariablePrompt;
    const { widget } = context;
    if (!prompt || !widget) return [];
    const renderWithFallback = (text: string) => {
      try {
        return renderTextWithCache(text, widget);
      } catch {
        return text;
      }
    };

    const definition = prompt.definitions[prompt.currentIndex];
    if (!definition) return [];
    const query = parameters.query.trim();
    const inputCaption = renderWithFallback(definition.caption ?? definition.name);
    const inputDescription = renderWithFallback(definition.description ?? '');
    const definitionOptions = getDefinitionOptions(definition, prompt, widget);

    const completeCurrentAndContinue = (value: string) => {
      const nextValues = { ...prompt.values, [definition.name]: value };
      if (prompt.currentIndex < prompt.definitions.length - 1) {
        parameters.setContext(contextReducer(contextActions.updateActionVariablePrompt({
          ...prompt,
          values: nextValues,
          currentIndex: prompt.currentIndex + 1,
        })));
        parameters.setQuery('');
        void parameters.refresh().catch((error: unknown) => {
          console.error('Error refreshing action-variable prompt wizard', error);
        });
        widget.commandHandled = true;
        widget.commandKeepOpen = true;
        return;
      }
      const mergedVariables = { ...prompt.baseVariables, ...nextValues };
      parameters.setContext(contextReducer(contextActions.finishActionVariablePrompt()));
      widget.commandHandled = true;
      widget.commandKeepOpen = false;
      widget.invokeActionString(prompt.actionText, widget, null, mergedVariables);
    };

    const onSelect = (item: IActionVariablePromptItem, state?: AutocompleteState<ITiddlerFields>, isClick = false) => {
      if (item['command-palette-hint'] === 'yes') return;
      if (definition.type === 'checkbox') {
        const selectedValue = (item['command-palette-value'] === 'yes') ? 'yes' : 'no';
        completeCurrentAndContinue(selectedValue);
        if (isClick && state) {
          parameters.navigator.navigate({ item, itemUrl: item.title, state });
        }
        return;
      }
      if (definition.type === 'select') {
        const selectedValue = item['command-palette-value'] ?? '';
        if (selectedValue === '') return;
        completeCurrentAndContinue(selectedValue);
        if (isClick && state) {
          parameters.navigator.navigate({ item, itemUrl: item.title, state });
        }
        return;
      }
      if (definition.type === 'multi-checkbox') {
        const selected = $tw.utils.parseStringArray(prompt.values[definition.name] ?? '');
        const action = item['command-palette-action'];
        if (action === 'toggle-option') {
          const option = item['command-palette-value'] ?? '';
          if (option === '') return;
          const next = selected.includes(option) ? selected.filter(value => value !== option) : [...selected, option];
          parameters.setContext(contextReducer(contextActions.updateActionVariablePrompt({
            ...prompt,
            values: {
              ...prompt.values,
              [definition.name]: stringifyList(next),
            },
          })));
          parameters.setQuery(query);
          void parameters.refresh().catch((error: unknown) => {
            console.error('Error refreshing action-variable multi-checkbox prompt', error);
          });
          widget.commandHandled = true;
          widget.commandKeepOpen = true;
          if (isClick && state) {
            parameters.navigator.navigate({ item, itemUrl: item.title, state });
          }
          return;
        }
        if (action === 'confirm-multi') {
          completeCurrentAndContinue(stringifyList(selected));
          if (isClick && state) {
            parameters.navigator.navigate({ item, itemUrl: item.title, state });
          }
          return;
        }
        return;
      }
      const selectedValue = item['command-palette-value'] ?? query ?? definition.defaultValue ?? '';
      if (selectedValue === '') return;
      completeCurrentAndContinue(selectedValue);
      if (isClick && state) {
        parameters.navigator.navigate({ item, itemUrl: item.title, state });
      }
    };

    return await debounced([{
      sourceId: 'action-variable-prompt',
      getItems() {
        if (definition.type === 'checkbox') {
          const defaultChecked = getCheckboxDefault(definition);
          const yesLabel = `${lingo('ActionVariablePrompt/CheckboxYes')}${defaultChecked ? ' (default)' : ''}`;
          const noLabel = `${lingo('ActionVariablePrompt/CheckboxNo')}${defaultChecked ? '' : ' (default)'}`;
          return [
            {
              title: yesLabel,
              text: yesLabel,
              type: 'text/vnd.tiddlywiki',
              tags: [],
              'command-palette-value': 'yes',
            } satisfies IActionVariablePromptItem,
            {
              title: noLabel,
              text: noLabel,
              type: 'text/vnd.tiddlywiki',
              tags: [],
              'command-palette-value': 'no',
            } satisfies IActionVariablePromptItem,
          ];
        }

        if (definition.type === 'select') {
          return filterByQuery(definitionOptions, query).map(option => ({
            title: option,
            text: option,
            type: 'text/vnd.tiddlywiki',
            tags: [],
            'command-palette-value': option,
          } satisfies IActionVariablePromptItem));
        }

        if (definition.type === 'multi-checkbox') {
          const selected = $tw.utils.parseStringArray(prompt.values[definition.name] ?? '');
          const filteredOptions = filterByQuery(definitionOptions, query);
          const optionItems = filteredOptions.map(option => {
            const checked = selected.includes(option);
            return {
              title: `${checked ? '[x]' : '[ ]'} ${option}`,
              text: option,
              type: 'text/vnd.tiddlywiki',
              tags: [],
              'command-palette-value': option,
              'command-palette-action': 'toggle-option',
            } satisfies IActionVariablePromptItem;
          });
          const confirmItem = {
            title: `${lingo('ActionVariablePrompt/ConfirmSelection')} (${selected.length})`,
            text: '',
            type: 'text/vnd.tiddlywiki',
            tags: [],
            'command-palette-action': 'confirm-multi',
          } satisfies IActionVariablePromptItem;
          return [...optionItems, confirmItem];
        }

        const autocompleteItems = filterByQuery(definitionOptions, query).map(option => ({
          title: option,
          text: option,
          type: 'text/vnd.tiddlywiki',
          tags: [],
          'command-palette-value': option,
        } satisfies IActionVariablePromptItem));

        if (autocompleteItems.length > 0) {
          return autocompleteItems;
        }

        if (query !== '') {
          return [{
            title: `${lingo('ActionVariablePrompt/ConfirmText')}: ${query}`,
            text: '',
            type: 'text/vnd.tiddlywiki',
            tags: [],
            'command-palette-value': query,
          } satisfies IActionVariablePromptItem];
        }

        if (definition.defaultValue && definition.defaultValue !== '') {
          return [{
            title: `${lingo('ActionVariablePrompt/UseDefault')}: ${definition.defaultValue}`,
            text: '',
            type: 'text/vnd.tiddlywiki',
            tags: [],
            'command-palette-value': definition.defaultValue,
          } satisfies IActionVariablePromptItem];
        }

        return [{
          title: lingo('ActionVariablePrompt/TypeToConfirm'),
          text: '',
          type: 'text/vnd.tiddlywiki',
          tags: [],
          'command-palette-hint': 'yes',
        } satisfies IActionVariablePromptItem];
      },
      getItemUrl({ item }) {
        return item.title;
      },
      onSelect({ item, state }) {
        onSelect(item, state, false);
      },
      templates: {
        header() {
          return `${lingo('ActionVariablePrompt/Header')} (${prompt.currentIndex + 1}/${prompt.definitions.length}) - ${inputCaption}`;
        },
        item({ item, createElement, state }) {
          const hint = item['command-palette-hint'] === 'yes';
          const text = item.title;
          return createElement('div', {
            style: hint ? 'opacity:0.7;' : '',
            onclick: () => {
              onSelect(item, state, true);
            },
            onTap: () => {
              onSelect(item, state, true);
            },
          }, text);
        },
        footer() {
          if (inputDescription === '') return '';
          return inputDescription;
        },
      },
    }]);
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;