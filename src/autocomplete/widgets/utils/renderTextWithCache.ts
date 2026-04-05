import type { Widget } from 'tiddlywiki';

function getLanguageCacheKey() {
  return $tw.wiki.getTiddlerText('$:/language', '$:/languages/en-GB');
}

function getVariablesCacheKey(variables?: Record<string, string>) {
  if (!variables) return '';
  return JSON.stringify(Object.entries(variables).sort(([left], [right]) => left.localeCompare(right)));
}

export function renderTextWithCache(text: unknown, widget: Widget | undefined, variables?: Record<string, string>) {
  if (text === undefined || typeof text !== 'string') return '';
  const languageKey = getLanguageCacheKey();
  const variablesKey = getVariablesCacheKey(variables);
  return $tw.wiki.getGlobalCache(
    `wikify-${languageKey}-${variablesKey}-${text}`,
    () => $tw.wiki.renderText('text/plain', 'text/vnd.tiddlywiki', `\\import [[$:/core/macros/lingo]]\n\n${text}`, { parentWidget: widget, variables }),
  );
}

export function renderHTMLWithCache(text: unknown, widget: Widget | undefined, variables?: Record<string, string>) {
  if (text === undefined || typeof text !== 'string') return '';
  const languageKey = getLanguageCacheKey();
  const variablesKey = getVariablesCacheKey(variables);
  return $tw.wiki.getGlobalCache(
    `wikify-html-${languageKey}-${variablesKey}-${text}`,
    () => $tw.wiki.renderText('text/html', 'text/vnd.tiddlywiki', `\\import [[$:/core/macros/lingo]]\n\n${text}`, { parentWidget: widget, variables }),
  );
}
