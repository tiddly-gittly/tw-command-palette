import { GetSourcesParams } from '@algolia/autocomplete-core';
import { ITiddlerFields } from 'tiddlywiki';
import { IContext, Phase } from './context';

const systemPrefixes = ($tw.wiki.getTiddler('$:/plugins/linonetwo/autocomplete/commands/help/System')?.fields['command-palette-prefix'] as string | undefined)
  ?.split(' ').filter(Boolean);
const filterPrefix = $tw.wiki.getTiddler('$:/plugins/linonetwo/autocomplete/commands/help/Filter')?.fields['command-palette-prefix'] as string | undefined;
const tagsPrefix = $tw.wiki.getTiddler('$:/plugins/linonetwo/autocomplete/commands/help/Tags')?.fields['command-palette-prefix'] as string | undefined;
const helpPrefix = $tw.wiki.getTiddler('$:/plugins/linonetwo/autocomplete/commands/help/Help')?.fields['command-palette-prefix'] as string | undefined;

/**
 * Compute which sources should be active based on current UI mode (phase), query, and context.
 *
 * This is the SINGLE SOURCE OF TRUTH for routing logic.
 * When adding a new UI mode, only modify this function - no need to touch individual plugins.
 *
 * @returns Set of sourceIds that should display results
 */
export function computeActiveSourceIds(
  phase: Phase,
  query: string,
  context: IContext,
): Set<string> {
  // Modal prompts have highest priority - block all other sources
  if (context.createTiddlerPending) {
    return new Set(['create-tiddler']);
  }

  if (context.actionVariablePrompt) {
    return new Set(['action-variable-prompt']);
  }

  // Under-filter phase - only show filtered results
  if (phase === 'under-filter' || context.filter) {
    return new Set(['filter']);
  }

  // Empty query - show help and recent searches
  if (query === '') {
    return new Set(['help', 'story-history', 'story-list']);
  }

  const firstChar = query[0];

  // Filter selection phase
  if (phase === 'filter-select' || firstChar === filterPrefix) {
    return new Set(['filter-select']);
  }

  // Tag search phase
  if (phase === 'tag-search' || firstChar === tagsPrefix) {
    return new Set(['tags']);
  }

  // Help mode
  if (phase === 'help' || firstChar === helpPrefix) {
    return new Set(['help']);
  }

  // System command search
  if (systemPrefixes?.includes(firstChar)) {
    return new Set([
      'command-message',
      'command-action-string',
      'search-config',
      'search-layout',
      'search-system-title',
    ]);
  }

  // Normal user search (default)
  return new Set([
    'title',
    'text',
    'story-history',
  ]);
}

/**
 * Automatically compute the current UI mode (phase) based on query and context.
 * Called in onStateChange to keep phase in sync with state.
 *
 * @returns The computed phase
 */
export function computePhase(
  query: string,
  context: IContext,
): Phase {
  // Modal prompts
  if (context.createTiddlerPending || context.actionVariablePrompt) {
    return 'command';
  }

  // Under filter
  if (context.filter) {
    return 'under-filter';
  }

  if (query === '') {
    return 'idle';
  }

  const firstChar = query[0];

  if (firstChar === filterPrefix) {
    return 'filter-select';
  }

  if (firstChar === tagsPrefix) {
    return 'tag-search';
  }

  if (firstChar === helpPrefix) {
    return 'help';
  }

  return 'normal';
}

/**
 * Legacy compatibility: check if a modal prompt is active.
 * Kept for backward compatibility during migration.
 *
 * @deprecated Use computePhase() and check for 'command' phase instead
 */
export function checkIsModalPromptActive(parameters: GetSourcesParams<ITiddlerFields>) {
  const context = parameters.state.context as IContext;
  return Boolean(context.createTiddlerPending || context.actionVariablePrompt);
}

/**
 * Legacy compatibility: check if under filter.
 * Kept for backward compatibility during migration.
 *
 * @deprecated Use computePhase() and check for 'under-filter' phase instead
 */
export function checkIsUnderFilter(parameters: GetSourcesParams<ITiddlerFields>) {
  return Boolean((parameters.state.context as IContext).filter);
}
