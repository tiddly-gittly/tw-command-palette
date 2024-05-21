/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { AutocompletePlugin, GetSources } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsFilter, checkIsSearchSystem, checkIsUnderFilter } from '../utils/checkPrefix';
import { IContext } from '../utils/context';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

export const plugin = {
  getSources(parameters) {
    const sources: ReturnType<GetSources<ITiddlerFields>> = [];
    if (checkIsFilter(parameters)) {
      const { widget } = parameters.state.context as IContext;
      sources.push({
        sourceId: 'build-in-filter',
        async getItems({ query }) {
          if (query === '') return [];
          const buildInFilters = (await filterTiddlersAsync(`[all[tiddlers+shadows]tag[$:/tags/Filter]]`))
            .filter((tiddler): tiddler is ITiddlerFields => {
              if (tiddler === undefined) return false;
              if (!tiddler.filter || typeof tiddler.filter !== 'string') return false;
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
                  (tiddler.filter as string).trim().replaceAll('[', '').replaceAll(']', ''),
                ]),
              ).length > 0
            );
          // allow user input a custom filter to search under it
          const userInputFilter = { filter: query, title: '', type: '', text: '' } satisfies ITiddlerFields;
          if (query.length > 1) {
            return [...buildInFilters, userInputFilter];
          }
          return buildInFilters;
        },
        getItemUrl({ item }) {
          return item.title;
        },
        onSelect({ item }) {
          parameters.setContext({ noNavigate: true, noClose: true, filter: (item.filter as string).trim(), newQuery: '' } satisfies IContext);
        },
        templates: {
          header() {
            return lingo('Filter');
          },
          item({ item, createElement }) {
            const description = item.description
              ? ` (${renderTextWithCache(item.description as string, widget)})`
              : '';
            return createElement('div', {
              style: 'display:flex;flex-direction:column;',
            }, [
              createElement('div', { style: 'margin-bottom:0.25em;' }, `${renderTextWithCache(item.caption, widget)}${description}`),
              createElement('div', {}, [
                createElement('small', {}, (item.filter as string).trim()),
              ]),
            ]);
          },
        },
      });
    }
    // When filter in context is set by previous step, and no prefix, we search under result of that filter
    if (checkIsSearchSystem(parameters) && checkIsUnderFilter(parameters)) {
      sources.push({
        sourceId: 'filter',
        async getItems({ query, state }) {
          return await filterTiddlersAsync(`${(state.context as IContext).filter} +[search[${query}]]`);
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
