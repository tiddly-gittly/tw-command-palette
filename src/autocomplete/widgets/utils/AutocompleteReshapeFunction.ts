/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unicorn/prevent-abbreviations */
import { AutocompleteReshapeSource, BaseItem } from '@algolia/autocomplete-core';

export type AutocompleteReshapeFunction<TParams = any> = <
  TItem extends BaseItem,
>(
  ...params: TParams[]
) => (
  ...expressions: Array<AutocompleteReshapeSource<TItem>>
) => Array<AutocompleteReshapeSource<TItem>>;
