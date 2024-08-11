import type { Widget } from 'tiddlywiki';

export interface IContext {
  /**
   * Add a history item to the autocomplete-plugin-recent-searches.
   */
  addHistoryItem?: (text: string) => void;
  /**
   * Apply the `TitleTextIgnoreFilter` to the filter.
   */
  applyExclusion?: boolean;
  /**
   * Search under results of this filter.
   */
  filter?: string;
  /** Undefined means true. If is false, then it ask filter not to call `$tw.wiki.getTiddler(title)` */
  filterGetTiddler?: boolean;
  /**
   * Ask navigator to set query instead of navigate to a tiddler
   */
  newQuery?: string;
  /**
   * Ask to disable default behavior of close the dropdown after item activate. Let plugin handle it by itself.
   */
  noClose?: boolean;
  /**
   * Ask to disable default behavior of open a tiddler. Let plugin handle it by itself.
   */
  noNavigate?: boolean;
  widget?: Widget;
}

/**
 * don't clear filter and applyExclusion that is used in `search-filter.ts`, otherwise can't get it in next step (under-filter), because we will "Enter" before go to next step
 */
export const emptyContext = { noNavigate: undefined, newQuery: undefined, noClose: undefined /* , filter: undefined */ } satisfies IContext;
