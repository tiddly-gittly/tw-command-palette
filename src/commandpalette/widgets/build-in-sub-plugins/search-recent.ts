import { StateUpdater } from '@algolia/autocomplete-core';
import type { AutocompletePlugin } from '@algolia/autocomplete-js';
import { createLocalStorageRecentSearchesPlugin, RecentSearchesPluginData } from '@algolia/autocomplete-plugin-recent-searches';
import { RecentSearchesItem } from '@algolia/autocomplete-plugin-recent-searches/dist/esm/types';
import { IContext } from '../utils/context';
import { getIconSvg } from '../utils/getIconSvg';
import { lingo } from '../utils/lingo';

export const plugin = (id: string): AutocompletePlugin<RecentSearchesItem, RecentSearchesPluginData<RecentSearchesItem>> => {
  let setContext: StateUpdater<IContext> | undefined;
  let refresh: () => Promise<void> | undefined;
  const deleteIcon = getIconSvg('$:/core/images/delete-button');
  const recentSearchesPlugin = createLocalStorageRecentSearchesPlugin({
    key: `recent-${id}`,
    subscribe(parameters) {
      parameters.setContext?.({ addHistoryItem: (text: string) => recentSearchesPlugin.data?.addItem({ id: text, label: text }) } satisfies IContext);
      setContext = parameters.setContext as unknown as StateUpdater<IContext>;
      refresh = parameters.refresh.bind(parameters);
    },
    transformSource({ source }) {
      const onSelect = (text: string) => {
        setContext?.({ newQuery: text, noClose: true, noNavigate: true } satisfies IContext);
      };
      return {
        ...source,
        getItemUrl({ item }) {
          return item.id;
        },
        onSelect({ item }) {
          onSelect(item.id);
        },
        templates: {
          ...source.templates,
          header() {
            return lingo('SearchHistory');
          },
          item({ item, createElement }) {
            return createElement(
              'div',
              {
                class: 'tw-commandpalette-search-recent-item',
                onclick: onSelect,
              },
              createElement('span', {}, item.id),
              createElement('span', {
                class: 'tw-commandpalette-search-recent-item-delete',
                onclick: () => {
                  recentSearchesPlugin.data?.removeItem(item.id);
                  void refresh?.()?.catch?.(error => {
                    console.error('Error in search-recent refresh', error);
                  });
                },
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
