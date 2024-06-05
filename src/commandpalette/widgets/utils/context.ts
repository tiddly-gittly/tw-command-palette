import type { Widget } from 'tiddlywiki';

export interface IContext {
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
