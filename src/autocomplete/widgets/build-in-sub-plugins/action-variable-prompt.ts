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
}

function getCheckboxDefault(definition: IActionVariableDefinition) {
  const rawDefault = (definition.defaultValue ?? '').trim().toLowerCase();
  return rawDefault === 'yes' || rawDefault === 'true' || rawDefault === '1';
}

export const plugin = {
  async getSources(parameters) {
    if (checkIsUnderFilter(parameters)) return [];
    const context = parameters.state.context as IContext;
    const prompt = context.actionVariablePrompt;
    const { widget } = context;
    if (!prompt || !widget) return [];
    const renderWidget = typeof widget.makeFakeWidgetWithVariables === 'function' ? widget : undefined;

    const definition = prompt.definitions[prompt.currentIndex];
    if (!definition) return [];
    const query = parameters.query.trim();
    const inputCaption = renderTextWithCache(definition.caption ?? definition.name, renderWidget);
    const inputDescription = renderTextWithCache(definition.description ?? '', renderWidget);

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
      onSelect({ item }) {
        if (item['command-palette-hint'] === 'yes') return;
        if (definition.type === 'checkbox') {
          const selectedValue = (item['command-palette-value'] === 'yes') ? 'yes' : 'no';
          completeCurrentAndContinue(selectedValue);
          return;
        }
        const selectedValue = item['command-palette-value'] ?? query ?? definition.defaultValue ?? '';
        if (selectedValue === '') return;
        completeCurrentAndContinue(selectedValue);
      },
      templates: {
        header() {
          return `${lingo('ActionVariablePrompt/Header')} (${prompt.currentIndex + 1}/${prompt.definitions.length}) - ${inputCaption}`;
        },
        item({ item, createElement }) {
          const hint = item['command-palette-hint'] === 'yes';
          const text = item.title;
          return createElement('div', {
            style: hint ? 'opacity:0.7;' : '',
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