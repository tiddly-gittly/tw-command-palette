/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { GetSourcesParams } from '@algolia/autocomplete-core';
import { ITiddlerFields } from 'tiddlywiki';

const commandPrefixes = ($tw.wiki.getTiddler('$:/plugins/linonetwo/commandpalette/commands/help/Command')?.fields?.['command-palette-prefix'] as string | undefined)
  ?.split(' ')?.filter(Boolean);
export function checkIsCommand(parameters: GetSourcesParams<ITiddlerFields>) {
  return commandPrefixes?.includes(parameters.query[0]);
}

export function checkIsSearch(parameters: GetSourcesParams<ITiddlerFields>) {
  return !(commandPrefixes?.includes(parameters.query[0]));
}
