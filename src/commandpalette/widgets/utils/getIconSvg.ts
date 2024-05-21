import { Widget } from 'tiddlywiki';
import { renderHTMLWithCache } from './renderTextWithCache';

export function getIconSvg(iconTiddlerTitle: string, widget: Widget | undefined) {
  return renderHTMLWithCache($tw.wiki.getTiddlerText(iconTiddlerTitle), widget).replace('<p>', '').replace('</p>', '');
}
