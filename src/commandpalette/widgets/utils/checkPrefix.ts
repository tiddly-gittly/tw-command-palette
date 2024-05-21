/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { GetSourcesParams } from '@algolia/autocomplete-core';
import { ITiddlerFields } from 'tiddlywiki';
import { IContext } from './context';

const systemPrefixes = ($tw.wiki.getTiddler('$:/plugins/linonetwo/commandpalette/commands/help/System')?.fields?.['command-palette-prefix'] as string | undefined)
  ?.split(' ')?.filter(Boolean);
const filterPrefix = $tw.wiki.getTiddler('$:/plugins/linonetwo/commandpalette/commands/help/Filter')?.fields?.['command-palette-prefix'] as string | undefined;
const tagsPrefix = $tw.wiki.getTiddler('$:/plugins/linonetwo/commandpalette/commands/help/Tags')?.fields?.['command-palette-prefix'] as string | undefined;
export function checkIsSearchSystem(parameters: GetSourcesParams<ITiddlerFields>) {
  return systemPrefixes?.includes(parameters.query[0]);
}

export function checkIsSearchUser(parameters: GetSourcesParams<ITiddlerFields>) {
  const firstChar = parameters.query[0];
  return !(systemPrefixes?.includes(firstChar)) && !(firstChar === filterPrefix) && !(firstChar === tagsPrefix);
}

export function checkIsFilter(parameters: GetSourcesParams<ITiddlerFields>) {
  return parameters.query[0] === filterPrefix;
}

export function checkIsSearchTags(parameters: GetSourcesParams<ITiddlerFields>) {
  return parameters.query[0] === tagsPrefix;
}

/**
 * If context.filter, then we are search under results of a filter.
 */
export function checkIsUnderFilter(parameters: GetSourcesParams<ITiddlerFields>) {
  return Boolean((parameters.state.context as IContext).filter);
}
