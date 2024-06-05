/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchSystem, checkIsUnderFilter } from '../utils/checkPrefix';
import { cacheSystemTiddlers } from '../utils/configs';
import { IContext } from '../utils/context';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { getIconSvg } from '../utils/getIconSvg';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

/**
 * This list won't change during wiki use, so we can only fetch it once.
 */
let cachedTiddlers: ITiddlerFields[] = [];
export const plugin = {
  getSources(parameters) {
    if (parameters.query.length === 0) return [];
    if (!checkIsSearchSystem(parameters) || checkIsUnderFilter(parameters)) return [];
    const { widget } = parameters.state.context as IContext;
    return [
      {
        sourceId: 'layout',
        async getItems({ query }) {
          if (cachedTiddlers.length === 0 || !cacheSystemTiddlers()) {
            cachedTiddlers = await filterTiddlersAsync(`[all[tiddlers+shadows]tag[$:/tags/Layout]] [[$:/core/ui/PageTemplate]] +[!is[draft]sort[name]]`, true);
          }
          return cachedTiddlers.filter((tiddler): tiddler is ITiddlerFields => {
            // TODO: add pinyinfuse
            return $tw.wiki.filterTiddlers(
              `[search[${query.slice(1)}]]`,
              undefined,
              $tw.wiki.makeTiddlerIterator([
                renderTextWithCache(tiddler.name, widget),
                renderTextWithCache(tiddler.description, widget),
                tiddler.title.replace('$:/plugins/', ''),
              ]),
            ).length > 0;
          });
        },
        getItemUrl({ item }) {
          return item.title;
        },
        onSelect({ item }) {
          parameters.setContext({ noNavigate: true } satisfies IContext);
          $tw.wiki.setText('$:/layout', 'text', undefined, item.title, { suppressTimestamp: true });
        },
        templates: {
          header() {
            const currentLayoutTitle = $tw.wiki.getTiddlerText('$:/layout', '');
            const rawLayoutName = $tw.wiki.getTiddler(currentLayoutTitle)?.fields?.name;
            const currentLayoutName = rawLayoutName
              ? renderTextWithCache(rawLayoutName, widget)
              : $tw.wiki.getTiddlerText('$:/language/PageTemplate/Name');
            return `${lingo('Layout')} - ${lingo('CurrentLayout')}: ${currentLayoutName}`;
          },
          item({ item, createElement, state }) {
            if (typeof item.name === 'string' && item.name !== '') {
              const name = renderTextWithCache(item.name, widget);
              const description = renderTextWithCache(item.description, widget);
              const icon = getIconSvg(item.icon as string, widget);
              return createElement('div', {
                class: 'tw-commandpalette-layout-result',
                onclick: () => {
                  parameters.navigator.navigate({ item, itemUrl: item.title, state });
                },
                innerHTML: `${icon}${name}${description ? ` - ${description}` : ''}`,
              });
            }
            return createElement('div', {
              onclick: () => {
                parameters.navigator.navigate({ item, itemUrl: item.title, state });
              },
            }, item.title);
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
