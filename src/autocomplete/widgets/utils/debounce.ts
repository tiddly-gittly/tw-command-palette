/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { AutocompleteSource } from '@algolia/autocomplete-shared';
import { ITiddlerFields } from 'tiddlywiki';

/* eslint-disable @typescript-eslint/no-unsafe-argument */
type AnyFunction = (...arguments_: any[]) => any;

export function debouncePromise<T extends AnyFunction>(function_: T, time: number): (...arguments_: Parameters<T>) => Promise<ReturnType<T>> {
  let timerId: ReturnType<typeof setTimeout>;

  return async function debounced(...arguments_: Parameters<T>): Promise<ReturnType<T>> {
    if (timerId) {
      clearTimeout(timerId);
    }

    return await new Promise<ReturnType<T>>((resolve) => {
      timerId = setTimeout(() => {
        resolve(function_(...arguments_));
      }, time);
    });
  };
}

const debounceDuration = Number($tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/DebounceDuration', '300'));
export const debounced = debouncePromise(async (items: Array<AutocompleteSource<ITiddlerFields>>) => await Promise.resolve(items), debounceDuration);
