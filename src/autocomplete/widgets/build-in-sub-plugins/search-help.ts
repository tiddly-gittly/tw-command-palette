import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsHelp, checkIsUnderFilter } from '../utils/checkPrefix';
import { cacheSystemTiddlers } from '../utils/configs';
import { IContext } from '../utils/context';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

/**
 * This list won't change during wiki use, so we can only fetch it once.
 */
let cachedTiddlers: string[] = [];
export const plugin = {
  getSources(parameters) {
    const { widget } = parameters.state.context as IContext;
    if (!checkIsHelp(parameters) || checkIsUnderFilter(parameters)) return [];
    return [
      {
        sourceId: 'help',
        getItems({ query }) {
          if (cachedTiddlers.length === 0 || !cacheSystemTiddlers()) {
            cachedTiddlers = $tw.wiki.filterTiddlers('[all[shadows]tag[$:/tags/AutoCompleteHelp]]');
          }
          const allHelpTiddlers = cachedTiddlers
            .map((title) => $tw.wiki.getTiddler(title)?.fields)
            .filter(Boolean) as ITiddlerFields[];

          const realQuery = query.substring(1);
          return realQuery
            ? allHelpTiddlers.filter((tiddler) =>
              // TODO: add pinyinfuse
              $tw.wiki.filterTiddlers(
                `[search[${realQuery}]]`,
                undefined,
                $tw.wiki.makeTiddlerIterator([
                  tiddler.title.replace('$:/plugins/linonetwo/autocomplete/commands/help/', ''),
                  renderTextWithCache(tiddler.caption, widget),
                  renderTextWithCache(tiddler.description, widget),
                ]),
              ).length > 0
            )
            : allHelpTiddlers;
        },
        getItemUrl({ item }) {
          return item.title;
        },
        onSelect({ item }) {
          const newQuery = (item['command-palette-prefix'] as string).charAt(0);
          parameters.setContext({ noNavigate: true, noClose: true, newQuery } satisfies IContext);
        },
        templates: {
          header() {
            return lingo('Help');
          },
          item({ item, createElement }) {
            const description = item.description
              ? ` ${renderTextWithCache(item.description as string, widget)}`
              : '';
            const onclick = () => {
              const newQuery = (item['command-palette-prefix'] as string).charAt(0);
              parameters.setQuery(newQuery);
              void parameters.refresh().catch(error => {
                console.error('Error in search-help refresh', error);
              });
            };
            return createElement('div', {
              style: 'display:flex;flex-direction:column;',
              onclick,
              onTap: onclick,
            }, [
              createElement('div', { style: 'margin-bottom:0.25em;' }, [
                createElement('em', { style: 'margin-right:0.25em;' }, [item['command-palette-prefix'] as string]),
                renderTextWithCache(item.caption, widget),
              ]),
              createElement('div', { style: 'margin-bottom:0.3em;' }, description),
            ]);
          },
        },
      },
    ];
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
