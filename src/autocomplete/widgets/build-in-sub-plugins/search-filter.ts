import type { AutocompletePlugin, AutocompleteSource } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsFilter, checkIsSearchSystem, checkIsUnderFilter } from '../utils/checkPrefix';
import { cacheSystemTiddlers, missingFilterOnTop, titleTextExclusionFilter } from '../utils/configs';
import { emptyContext, IContext } from '../utils/context';
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

          const validFilterTiddlers = cachedTiddlers.filter((tiddler): tiddler is ITiddlerFields => {
            if (!tiddler.filter || typeof tiddler.filter !== 'string') return false;
            return true;
          });

          const realQuery = query.substring(1);
          const buildInFilters = realQuery
            ? validFilterTiddlers.filter(tiddler =>
              // TODO: add pinyinfuse
              $tw.wiki.filterTiddlers(
                `[search[${realQuery}]]`,
                undefined,
                $tw.wiki.makeTiddlerIterator([
                  tiddler.title.replace('$:/plugins/', '').replace('linonetwo/commandpalette/', ''),
                  renderTextWithCache(tiddler.caption, widget),
                  renderTextWithCache(tiddler.description, widget),
                  (tiddler.filter as string).trim().replaceAll('[', '').replaceAll(']', ''),
                ]),
              ).length > 0
            )
            : validFilterTiddlers;

          // allow user input a custom filter to search under it
          const userInputFilter = { filter: query, title: '', type: '', text: '' } satisfies ITiddlerFields;
          if (query.length > 1) {
            return missingFilterOnTop() ? [userInputFilter, ...buildInFilters] : [...buildInFilters, userInputFilter];
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
                parameters.setQuery('');
                void parameters.refresh().catch((error: unknown) => {
                  console.error('Error in search-filter step1 refresh', error);
                });
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
          const realQuery = system ? query.substring(1) : query;
          const context = state.context as IContext;

          // 构建基本过滤器字符串
          const baseFilter = `[all[tiddlers+shadows]]+${context.filter} ${context.applyExclusion ? titleTextExclusionFilter() : ''}`;

          return realQuery
            ? await filterTiddlersAsync(
              `${baseFilter} +[search[${realQuery}]]`,
              {
                system,
                toTiddler: (context.filterGetTiddler ?? true),
              },
            )
            : await filterTiddlersAsync(
              baseFilter,
              {
                system,
                toTiddler: (context.filterGetTiddler ?? true),
              },
            );
        },
        getItemUrl({ item }) {
          return item.title;
        },
        templates: {
          header() {
            return `${lingo('UnderFilter')} - ${(parameters.state.context as IContext).filter} ${(parameters.state.context as IContext).applyExclusion ? '- ...' : ''}`;
          },
          item({ item, createElement, state }) {
            const onclick = () => {
              // parameters.setContext(emptyContext); is not working here. But need to clear the context
              parameters.navigator.navigate({ item, itemUrl: item.title, state: { ...state, context: { ...state.context, ...emptyContext } } });
            };
            if (typeof item.caption === 'string' && item.caption !== '') {
              return createElement('div', {
                onclick,
                onTap: onclick,
              }, `${item.caption} (${item.title})`);
            }
            return createElement('div', {
              onclick,
              onTap: onclick,
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
