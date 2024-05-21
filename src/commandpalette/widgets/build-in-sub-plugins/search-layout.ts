/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsSearchSystem } from '../utils/checkPrefix';
import { IContext } from '../utils/context';
import { getIconSvg } from '../utils/getIconSvg';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

export const plugin = {
  getSources(parameters) {
    if (parameters.query.length === 0) return [];
    if (!checkIsSearchSystem(parameters)) return [];
    const { widget } = parameters.state.context as IContext;
    return [
      {
        sourceId: 'layout',
        getItems({ query }) {
          return $tw.wiki.filterTiddlers(`[all[tiddlers+shadows]tag[$:/tags/Layout]] [[$:/core/ui/PageTemplate]] +[!is[draft]sort[name]]`)
            .map((title) => $tw.wiki.getTiddler(title)?.fields)
            .filter((tiddler): tiddler is ITiddlerFields => {
              if (tiddler === undefined) return false;
              // TODO: add pinyinfuse
              return $tw.wiki.filterTiddlers(
                `[search[${query.slice(1)}]]`,
                undefined,
                $tw.wiki.makeTiddlerIterator([renderTextWithCache(tiddler.name, widget), renderTextWithCache(tiddler.description, widget)]),
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
          item({ item, createElement }) {
            if (typeof item.name === 'string' && item.name !== '') {
              const name = renderTextWithCache(item.name, widget);
              const description = renderTextWithCache(item.description, widget);
              const icon = getIconSvg(item.icon as string, widget);
              return createElement('div', {
                class: 'tw-commandpalette-layout-result',
                innerHTML: `${icon}${name}${description ? ` - ${description}` : ''}`,
              });
            }
            return item.title;
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
