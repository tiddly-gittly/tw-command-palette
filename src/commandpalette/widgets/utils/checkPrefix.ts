/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { GetSourcesParams } from '@algolia/autocomplete-core';
import { ITiddlerFields } from 'tiddlywiki';
import { IContext } from './context';

const commandPrefixes = ($tw.wiki.getTiddler('$:/plugins/linonetwo/commandpalette/commands/help/Command')?.fields?.['command-palette-prefix'] as string | undefined)
  ?.split(' ')?.filter(Boolean);
const filterPrefix = $tw.wiki.getTiddler('$:/plugins/linonetwo/commandpalette/commands/help/Filter')?.fields?.['command-palette-prefix'] as string | undefined;
export function checkIsCommand(parameters: GetSourcesParams<ITiddlerFields>) {
  return commandPrefixes?.includes(parameters.query[0]);
}

export function checkIsSearch(parameters: GetSourcesParams<ITiddlerFields>) {
  const firstChar = parameters.query[0];
  return !(commandPrefixes?.includes(firstChar)) && !(firstChar === filterPrefix);
}

export function checkIsFilter(parameters: GetSourcesParams<ITiddlerFields>) {
  return parameters.query[0] === filterPrefix;
}

/**
 * If context.filter, then we are search under results of a filter.
 */
export function checkIsUnderFilter(parameters: GetSourcesParams<ITiddlerFields>) {
  return Boolean((parameters.state.context as IContext).filter);
}
