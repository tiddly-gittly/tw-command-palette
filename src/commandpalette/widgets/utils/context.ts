import type { Widget } from 'tiddlywiki';

export interface IContext {
  /**
   * Ask navigator to set query instead of navigate to a tiddler
   */
  newQuery?: string;
  /**
   * Ask to disable default behavior of destroy the widget after item activate. Let plugin handle it by itself.
   */
  noDestroy?: boolean;
  /**
   * Ask to disable default behavior of open a tiddler. Let plugin handle it by itself.
   */
  noNavigate?: boolean;
  widget?: Widget;
}
