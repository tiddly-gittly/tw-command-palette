/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { AutocompletePlugin, GetSources } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsFilter, checkIsSearch, checkIsUnderFilter } from '../utils/checkPrefix';
import { IContext } from '../utils/context';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

export const plugin = {
  getSources(parameters) {
    const sources: ReturnType<GetSources<ITiddlerFields>> = [];
    if (checkIsFilter(parameters)) {
      const { widget } = parameters.state.context as IContext;
      sources.push({
        sourceId: 'build-in-filter',
        getItems({ query }) {
          if (query === '') return [];
          const buildInFilters = $tw.wiki.filterTiddlers(`[all[tiddlers+shadows]tag[$:/tags/CommandPaletteCommand]field:command-palette-type[filter]]`)
            .map((title) => $tw.wiki.getTiddler(title)?.fields)
            .filter((tiddler): tiddler is ITiddlerFields => {
              if (tiddler === undefined) return false;
              return true;
            })
            .filter(tiddler =>
              // TODO: add pinyinfuse
              $tw.wiki.filterTiddlers(
                `[search[${query.slice(1)}]]`,
                undefined,
                $tw.wiki.makeTiddlerIterator([
                  tiddler.title.replace('$:/plugins/linonetwo/commandpalette/', ''),
                  renderTextWithCache(tiddler.caption, widget),
                  renderTextWithCache(tiddler.description, widget),
                  tiddler.text.trim().replaceAll('[', '').replaceAll(']', ''),
                ]),
              ).length > 0
            );
          // allow user input a custom filter to search under it
          const userInputFilter = { text: query, title: '', type: '' } satisfies ITiddlerFields;
          if (query.length > 1) {
            return [...buildInFilters, userInputFilter];
          }
          return buildInFilters;
        },
        getItemUrl({ item }) {
          return item.title;
        },
        onSelect({ item }) {
          parameters.setContext({ noNavigate: true, noClose: true, filter: item.text.trim(), newQuery: '' } satisfies IContext);
        },
        templates: {
          header() {
            return lingo('Filter');
          },
          item({ item, createElement }) {
            if (typeof item.caption === 'string' && item.caption !== '') {
              const description = item.description
                ? ` (${renderTextWithCache(item.description as string, widget)})`
                : '';
              // return `<div style="display:flex;flex-direction:column;">
              //           <div>${renderTextWithCache(item.caption, widget)}${description}</div>
              //           <div><em>${item.text.trim()}</em></div>
              //         </div>`;
              return createElement('div', {
                style: 'display:flex;flex-direction:column;',
              }, [
                createElement('div', { style: 'margin-bottom:0.25em;' }, `${renderTextWithCache(item.caption, widget)}${description}`),
                createElement('div', {}, [
                  createElement('small', {}, item.text.trim()),
                ]),
              ]);
            }
            return item.title;
          },
        },
      });
    }
    // When filter in context is set by previous step, and no prefix, we search under result of that filter
    if (checkIsSearch(parameters) && checkIsUnderFilter(parameters)) {
      sources.push({
        sourceId: 'filter',
        getItems({ query, state }) {
          return $tw.wiki.filterTiddlers(`${(state.context as IContext).filter} +[search[${query}]]`)
            .map((title) => $tw.wiki.getTiddler(title)?.fields)
            .filter(Boolean) as ITiddlerFields[];
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          header() {
            return `${lingo('UnderFilter')} - ${(parameters.state.context as IContext).filter}`;
          },
          item({ item }) {
            if (typeof item.caption === 'string' && item.caption !== '') {
              return `${item.caption} (${item.title})`;
            }
            return item.title;
          },
          noResults() {
            return lingo('NoResult');
          },
        },
      });
    }
    return sources;
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
