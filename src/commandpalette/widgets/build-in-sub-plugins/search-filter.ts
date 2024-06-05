/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import type { AutocompletePlugin, AutocompleteSource } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsFilter, checkIsSearchSystem, checkIsUnderFilter } from '../utils/checkPrefix';
import { cacheSystemTiddlers } from '../utils/configs';
import { IContext } from '../utils/context';
import { debounced } from '../utils/debounce';
import { filterTiddlersAsync } from '../utils/filterTiddlersAsync';
import { lingo } from '../utils/lingo';
import { renderTextWithCache } from '../utils/renderTextWithCache';

/**
 * This list won't change during wiki use, so we can only fetch it once.
 */
let cachedTiddlers: ITiddlerFields[] = [];
export const plugin = {
  async getSources(parameters) {
    const sources: Array<AutocompleteSource<ITiddlerFields>> = [];
    if (checkIsFilter(parameters)) {
      const { widget } = parameters.state.context as IContext;
      const onSelect = (item: ITiddlerFields) => {
        const filterGetTiddler = item['command-palette-get-tiddler'] !== 'no';
        parameters.setContext({ noNavigate: true, noClose: true, filter: (item.filter as string).trim(), newQuery: '', filterGetTiddler } satisfies IContext);
      };
      sources.push({
        sourceId: 'build-in-filter',
        async getItems({ query }) {
          if (query === '') return [];
          if (cachedTiddlers.length === 0 || !cacheSystemTiddlers()) {
            cachedTiddlers = await filterTiddlersAsync(`[all[tiddlers+shadows]tag[$:/tags/Filter]]`, { system: true });
          }
          const buildInFilters = cachedTiddlers
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
                  tiddler.title.replace('$:/plugins/', '').replace('linonetwo/commandpalette/', ''),
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
          onSelect(item);
        },
        templates: {
          header() {
            return lingo('Filter');
          },
          item({ item, createElement }) {
            const caption = renderTextWithCache(item.caption, widget);
            const description = item.description
              ? `${caption ? ' - ' : ''}${renderTextWithCache(item.description as string, widget)}`
              : '';
            return createElement('div', {
              style: 'display:flex;flex-direction:column;',
              onclick: () => {
                onSelect(item);
              },
            }, [
              createElement('div', { style: 'margin-bottom:0.25em;' }, `${caption}${description}`),
              createElement('div', {}, [
                createElement('small', {}, (item.filter as string).trim()),
              ]),
            ]);
          },
        },
      });
    }
    // When filter in context is set by previous step, and no prefix, we search under result of that filter
    if (checkIsUnderFilter(parameters)) {
      sources.push({
        sourceId: 'filter',
        async getItems({ query, state }) {
          const system = checkIsSearchSystem(parameters);
          return await filterTiddlersAsync(`[all[tiddlers+shadows]]+${(state.context as IContext).filter} +[search[${system ? query.slice(1) : query}]]`, {
            system,
            toTiddler: ((state.context as IContext).filterGetTiddler ?? true),
          });
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          header() {
            return `${lingo('UnderFilter')} - ${(parameters.state.context as IContext).filter}`;
          },
          item({ item, createElement, state }) {
            if (typeof item.caption === 'string' && item.caption !== '') {
              return createElement('div', {
                onclick: () => {
                  parameters.navigator.navigate({ item, itemUrl: item.title, state });
                },
              }, `${item.caption} (${item.title})`);
            }
            return createElement('div', {
              onclick: () => {
                parameters.navigator.navigate({ item, itemUrl: item.title, state });
              },
            }, item.title);
          },
          noResults() {
            return lingo('NoResult');
          },
        },
      });
    }
    return await debounced(sources);
  },
} satisfies AutocompletePlugin<ITiddlerFields, unknown>;
