import type { GetSourcesParams } from '@algolia/autocomplete-core';
import type { ITiddlerFields } from 'tiddlywiki';
import { contextActions, contextReducer, IActionVariableDefinition, IContext } from './context';

function getDynamicField(item: ITiddlerFields, variableName: string, suffix: string) {
  return (item[`${variableName}/${suffix}`] ?? item[`${variableName.replace(/\s+/g, '')}/${suffix}`]) as string | undefined;
}

function parseActionVariableDefinitions(item: ITiddlerFields): IActionVariableDefinition[] {
  const rawList = item['action-variables'];
  if (typeof rawList !== 'string' || rawList.trim() === '') return [];
  return $tw.utils.parseStringArray(rawList).map(name => {
    const rawType = (getDynamicField(item, name, 'type') ?? 'text').toLowerCase();
    const type = rawType === 'checkbox' || rawType === 'select' || rawType === 'multi-checkbox' ? rawType : 'text';
    const rawOptions = getDynamicField(item, name, 'options') ?? '';
    return {
      name,
      type,
      caption: getDynamicField(item, name, 'caption'),
      description: getDynamicField(item, name, 'description'),
      defaultValue: getDynamicField(item, name, 'default'),
      autocompleteFilter: getDynamicField(item, name, 'autocomplete-filter'),
      options: rawOptions.trim() === '' ? undefined : $tw.utils.parseStringArray(rawOptions),
    };
  });
}

export function executeAction(item: ITiddlerFields, parameters: GetSourcesParams<ITiddlerFields>, variables: Record<string, string>) {
  const { widget } = parameters.state.context as IContext;
  const actionText = typeof item.text === 'string' ? item.text : '';
  const definitions = parseActionVariableDefinitions(item);
  if (definitions.length > 0) {
    parameters.setContext(contextReducer(contextActions.openActionVariablePrompt({
      commandTitle: item.title,
      actionText,
      definitions,
      currentIndex: 0,
      values: {},
      baseVariables: variables,
    })));
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
  if (widget) {
    widget.commandHandled = true;
    widget.commandKeepOpen = false;
  }
  widget?.invokeActionString(actionText, widget, null, variables);
}
