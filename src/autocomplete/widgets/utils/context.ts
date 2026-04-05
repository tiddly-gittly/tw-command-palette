import type { Widget } from 'tiddlywiki';

/**
 * Explicit phase to track which stage of the command palette flow we are in.
 */
export type Phase = 'idle' | 'normal' | 'filter-select' | 'under-filter' | 'tag-search' | 'command';

export type ActionVariableInputType = 'text' | 'checkbox';

export interface IActionVariableDefinition {
  name: string;
  type: ActionVariableInputType;
  caption?: string;
  description?: string;
  defaultValue?: string;
}

export interface IActionVariablePromptState {
  commandTitle: string;
  actionText: string;
  definitions: IActionVariableDefinition[];
  currentIndex: number;
  values: Record<string, string>;
  baseVariables: Record<string, string>;
}

/**
 * The AutoCompleteSearchWidget instance exposed through context.
 * Extends the base TW Widget with command-palette-specific fields.
 */
export interface IAutocompleteWidget extends Widget {
  /**
   * Set to true by command source plugins (command-message, command-action-string)
   * before executing a command, so that onEnter knows to skip tm-navigate.
   * Necessary because Algolia's navigator.navigate() receives a state *snapshot*
   * and does not see setContext updates made in onSelect.
   */
  commandHandled: boolean;
  /** Keep panel open for the next round when commandHandled is consumed in onEnter. */
  commandKeepOpen?: boolean;
}

export interface IContext {
  // ── Stable deps (set once at widget init, never cleared by CLEAR_SESSION) ──
  /** Add a history item to the autocomplete-plugin-recent-searches. */
  addHistoryItem?: (text: string) => void;
  /** The host AutoCompleteSearchWidget instance. */
  widget?: IAutocompleteWidget;
  /** User selection before command palette is opened. (Auto focus will remove selection, so we preserve it for later use) */
  selectedText?: string;

  // ── Session state (managed via contextReducer + dispatch) ──
  /** Explicit phase of the current flow. */
  phase?: Phase;
  /** Apply the `TitleTextIgnoreFilter` to the filter. */
  applyExclusion?: boolean;
  /** Search under results of this filter. */
  filter?: string;
  /** Undefined means true. If false, ask filter not to call `$tw.wiki.getTiddler(title)` */
  filterGetTiddler?: boolean;
  /** Used by shift+enter to open. But will not trigger "search under this filter". */
  filterToOpen?: string;
  /** Ask navigator to set query instead of navigate to a tiddler */
  newQuery?: string;
  /** Ask to disable default behavior of close the dropdown after item activate. Let plugin handle it by itself. */
  noClose?: boolean;
  /** Ask to disable default behavior of open a tiddler. Let plugin handle it by itself. */
  noNavigate?: boolean;
  /** Two-step wizard flag for "create new tiddler" flow. */
  createTiddlerPending?: boolean;
  /** Generic variable wizard state for action-string commands. */
  actionVariablePrompt?: IActionVariablePromptState;
}

// ── Typed actions ────────────────────────────────────────────────────────────

export type ContextAction =
  /** User selected a filter tiddler; enter under-filter phase. */
  | { type: 'SELECT_FILTER'; filter: string; filterGetTiddler?: boolean }
  /** User selected a tag; enter under-filter phase for that tag. */
  | { type: 'SELECT_TAG'; filter: string; applyExclusion?: boolean }
  /** User selected a recent search entry; set the new query. */
  | { type: 'SELECT_RECENT'; newQuery: string }
  /** User activated a command (message/action); disable navigate, allow close. */
  | { type: 'EXECUTE_COMMAND' }
  /** Enter create-tiddler wizard and keep panel open for title input. */
  | { type: 'OPEN_CREATE_TIDDLER_WIZARD' }
  /** Complete create-tiddler wizard before close. */
  | { type: 'FINISH_CREATE_TIDDLER_WIZARD' }
  /** Enter action-string variable wizard and keep panel open for variable input. */
  | { type: 'OPEN_ACTION_VARIABLE_PROMPT'; prompt: IActionVariablePromptState }
  /** Update current action-string variable wizard state. */
  | { type: 'UPDATE_ACTION_VARIABLE_PROMPT'; prompt: IActionVariablePromptState }
  /** Complete action-string variable wizard before close. */
  | { type: 'FINISH_ACTION_VARIABLE_PROMPT' }
  /**
   * Clear all session state except stable deps.
   * Used when the panel closes or a flow fully completes.
   * Clears filter too — use CLEAR_TRANSIENT for within-flow resets.
   */
  | { type: 'CLEAR_SESSION' }
  /**
   * Clear only transient navigation flags (noNavigate, noClose, newQuery).
   * Intentionally keeps filter/applyExclusion so the under-filter phase
   * can continue after the initial "Enter" that selects the filter.
   * This is what widget.clearContext() should call between flow steps.
   */
  | { type: 'CLEAR_TRANSIENT' };

// ── Reducer (pure function — fully unit-testable without TW) ─────────────────

/**
 * Returns the **partial** context update that should be passed to `setContext`.
 * Does not mutate state — caller is responsible for merging via setContext.
 */
export function contextReducer(action: ContextAction): Partial<IContext> {
  switch (action.type) {
    case 'SELECT_FILTER': {
      return {
        phase: 'under-filter',
        noNavigate: true,
        noClose: true,
        filter: action.filter,
        newQuery: '',
        filterGetTiddler: action.filterGetTiddler,
      };
    }
    case 'SELECT_TAG': {
      return {
        phase: 'under-filter',
        noNavigate: true,
        noClose: true,
        filter: action.filter,
        newQuery: '',
        applyExclusion: action.applyExclusion,
      };
    }
    case 'SELECT_RECENT': {
      return {
        noNavigate: true,
        noClose: true,
        newQuery: action.newQuery,
      };
    }
    case 'EXECUTE_COMMAND': {
      return {
        noNavigate: true,
        noClose: false,
      };
    }
    case 'OPEN_CREATE_TIDDLER_WIZARD': {
      return {
        createTiddlerPending: true,
        noNavigate: true,
        noClose: true,
        newQuery: '',
      };
    }
    case 'FINISH_CREATE_TIDDLER_WIZARD': {
      return {
        createTiddlerPending: undefined,
        noNavigate: true,
        noClose: false,
      };
    }
    case 'OPEN_ACTION_VARIABLE_PROMPT': {
      return {
        actionVariablePrompt: action.prompt,
        noNavigate: true,
        noClose: true,
        newQuery: '',
      };
    }
    case 'UPDATE_ACTION_VARIABLE_PROMPT': {
      return {
        actionVariablePrompt: action.prompt,
        noNavigate: true,
        noClose: true,
        newQuery: '',
      };
    }
    case 'FINISH_ACTION_VARIABLE_PROMPT': {
      return {
        actionVariablePrompt: undefined,
        noNavigate: true,
        noClose: false,
      };
    }
    case 'CLEAR_SESSION': {
      return {
        phase: undefined,
        noNavigate: undefined,
        newQuery: undefined,
        noClose: undefined,
        createTiddlerPending: undefined,
        actionVariablePrompt: undefined,
        filter: undefined,
        filterGetTiddler: undefined,
        filterToOpen: undefined,
        applyExclusion: undefined,
      };
    }
    case 'CLEAR_TRANSIENT': {
      // Deliberately keeps filter/applyExclusion for under-filter continuity.
      return {
        noNavigate: undefined,
        newQuery: undefined,
        noClose: undefined,
      };
    }
  }
}

// ── Action creators ───────────────────────────────────────────────────────────

export const contextActions = {
  selectFilter: (filter: string, filterGetTiddler?: boolean): ContextAction => ({ type: 'SELECT_FILTER', filter, filterGetTiddler }),
  selectTag: (filter: string, applyExclusion?: boolean): ContextAction => ({ type: 'SELECT_TAG', filter, applyExclusion }),
  selectRecent: (newQuery: string): ContextAction => ({ type: 'SELECT_RECENT', newQuery }),
  executeCommand: (): ContextAction => ({ type: 'EXECUTE_COMMAND' }),
  openCreateTiddlerWizard: (): ContextAction => ({ type: 'OPEN_CREATE_TIDDLER_WIZARD' }),
  finishCreateTiddlerWizard: (): ContextAction => ({ type: 'FINISH_CREATE_TIDDLER_WIZARD' }),
  openActionVariablePrompt: (prompt: IActionVariablePromptState): ContextAction => ({ type: 'OPEN_ACTION_VARIABLE_PROMPT', prompt }),
  updateActionVariablePrompt: (prompt: IActionVariablePromptState): ContextAction => ({ type: 'UPDATE_ACTION_VARIABLE_PROMPT', prompt }),
  finishActionVariablePrompt: (): ContextAction => ({ type: 'FINISH_ACTION_VARIABLE_PROMPT' }),
  clearSession: (): ContextAction => ({ type: 'CLEAR_SESSION' }),
  clearTransient: (): ContextAction => ({ type: 'CLEAR_TRANSIENT' }),
};

// ── Legacy helpers (kept for backward compat during migration) ────────────────

/**
 * @deprecated Use `contextReducer(contextActions.clearTransient())` via dispatch instead.
 * Kept for widget.clearContext() until full migration.
 */
export const emptyContext = contextReducer({ type: 'CLEAR_TRANSIENT' }) satisfies Partial<IContext>;
