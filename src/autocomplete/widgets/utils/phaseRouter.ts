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

  // Ctrl+Tab cycle-history mode shows only story history, no other features.
  if (context.cycleHistoryMode) {
    return new Set(['story-history']);
  }

  // Under-filter phase - only show filtered results
  if (phase === 'under-filter' || context.filter) {
    return new Set(['filter']);
  }

  // Empty query - show help, recent searches and story history.
  if (query === '') {
    return new Set(['help', 'recent-searches', 'story-history']);
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
      'search-sidebar-tab',
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

  // Ctrl+Tab cycle-history mode is a dedicated phase.
  if (context.cycleHistoryMode) {
    return 'cycle-history';
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
