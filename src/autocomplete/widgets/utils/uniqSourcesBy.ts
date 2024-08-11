/**
 * Copy from https://github.com/algolia/autocomplete/blob/next/examples/reshape/
 * Based on https://www.algolia.com/doc/ui-libraries/autocomplete/guides/reshaping-sources/
 */
import { AutocompleteReshapeSource, BaseItem } from '@algolia/autocomplete-core';
import { ITiddlerFields } from 'tiddlywiki';
import { AutocompleteReshapeFunction } from './AutocompleteReshapeFunction';

type UniqByPredicate<TItem extends BaseItem> = (parameters: {
  item: TItem;
  source: AutocompleteReshapeSource<TItem>;
}) => string;

export const uniqSourcesBy: AutocompleteReshapeFunction<UniqByPredicate<ITiddlerFields>> = (
  predicate: UniqByPredicate<ITiddlerFields>,
) => {
  return function runUniqBy(...sources) {
    const seen = new Set<string>();

    return sources.map((source) => {
      const items = source.getItems().filter((item) => {
        // @ts-expect-error 'TItem' could be instantiated with a different subtype of constraint 'BaseItem'.
        const appliedItem = predicate({ source, item });
        const hasSeen = seen.has(appliedItem);

        seen.add(appliedItem);

        return !hasSeen;
      });

      return {
        ...source,
        getItems() {
          return items;
        },
      };
    });
  };
};
