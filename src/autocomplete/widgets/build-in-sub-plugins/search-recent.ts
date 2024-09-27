import { GetSourcesParams, StateUpdater } from '@algolia/autocomplete-core';
import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { createLocalStorageRecentSearchesPlugin, RecentSearchesPluginData } from '@algolia/autocomplete-plugin-recent-searches';
import { RecentSearchesItem } from '@algolia/autocomplete-plugin-recent-searches/dist/esm/types';
import { AutocompleteNavigator } from '@algolia/autocomplete-shared/dist/esm/core/AutocompleteNavigator';
import { ITiddlerFields } from 'tiddlywiki';
import { checkIsUnderFilter } from '../utils/checkPrefix';
import { IContext } from '../utils/context';
import { getIconSvg } from '../utils/getIconSvg';
import { lingo } from '../utils/lingo';

export const plugin = (id: string): AutocompletePlugin<RecentSearchesItem, RecentSearchesPluginData<RecentSearchesItem>> => {
  let setContext: StateUpdater<IContext> | undefined;
  let refresh: () => Promise<void> | undefined;
  let navigator: AutocompleteNavigator<RecentSearchesItem> | undefined;
  const deleteIcon = getIconSvg('$:/core/images/delete-button', undefined);
  const recentSearchesPlugin = createLocalStorageRecentSearchesPlugin({
    key: `recent-${id}`,
    subscribe(parameters) {
      parameters.setContext?.({ addHistoryItem: (text: string) => recentSearchesPlugin.data?.addItem({ id: text, label: text }) } satisfies IContext);
      setContext = parameters.setContext as unknown as StateUpdater<IContext>;
      navigator = parameters.navigator;
      refresh = parameters.refresh.bind(parameters);
    },
    transformSource({ source, state }) {
      const onSelect = (item: RecentSearchesItem) => {
        const newContext = { newQuery: item.id, noClose: true, noNavigate: true } satisfies IContext;
        setContext?.(newContext);
        navigator?.navigate?.({ item, itemUrl: item.id, state: { ...state, context: { ...state.context, ...newContext } } });
      };
      return {
        ...source,
        getItemUrl({ item }) {
          return item.id;
        },
        async getItems(parameters) {
          if (parameters.query.length > 0 || checkIsUnderFilter(parameters as unknown as GetSourcesParams<ITiddlerFields>)) return [];
          const items = source.getItems(parameters);
          return await items;
        },
        onSelect({ item }) {
          onSelect(item);
        },
        templates: {
          ...source.templates,
          header() {
            return lingo('SearchHistory');
          },
          item({ item, createElement }) {
            const onDelete = () => {
              recentSearchesPlugin.data?.removeItem(item.id);
              void refresh?.()?.catch?.(error => {
                console.error('Error in search-recent refresh', error);
              });
            };
            return createElement(
              'div',
              {
                class: 'tw-commandpalette-search-recent-item',
                onclick: () => {
                  onSelect(item);
                },
                onTap: () => {
                  onSelect(item);
                },
              },
              createElement('span', {}, item.id),
              createElement('span', {
                class: 'tw-commandpalette-search-recent-item-delete',
                onclick: onDelete,
                onTap: onDelete,
                innerHTML: deleteIcon,
              }),
            );
          },
        },
      };
    },
  });
  return recentSearchesPlugin;
};
