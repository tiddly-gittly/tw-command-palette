import type { Widget } from 'tiddlywiki';

export function renderTextWithCache(text: unknown, widget: Widget | undefined, variables?: Record<string, string>) {
  if (text === undefined || typeof text !== 'string') return '';
  return $tw.wiki.getGlobalCache(
    `wikify-${text}`,
    () => $tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', `\\import [[$:/core/macros/lingo]]\n\n${text}`, { parentWidget: widget, variables }),
  );
}

export function renderHTMLWithCache(text: unknown, widget: Widget | undefined, variables?: Record<string, string>) {
  if (text === undefined || typeof text !== 'string') return '';
  return $tw.wiki.getGlobalCache(
    `wikify-html-${text}`,
    () => $tw.wiki.renderText('text/html', 'text/vnd.tiddlywiki', `\\import [[$:/core/macros/lingo]]\n\n${text}`, { parentWidget: widget, variables }),
  );
}
