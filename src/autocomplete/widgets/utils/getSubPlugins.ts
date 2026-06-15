import { GetSourcesParams } from '@algolia/autocomplete-core';
import type { AutocompletePlugin, AutocompleteSource } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';
import { IContext } from './context';
import { computeActiveSourceIds, computePhase } from './phaseRouter';

export function getSubPlugins(id: string) {
  const plugins: Array<AutocompletePlugin<ITiddlerFields, unknown>> = [];
  /**
   * Try loading plugins. Plugin should add tag `$:/tags/AutoCompletePlugin` and export a `plugin` object.
   */
  const searchTitlePluginTitles = $tw.wiki.filterTiddlers('[all[shadows]tag[$:/tags/AutoCompletePlugin]]');
  searchTitlePluginTitles
    .map(title => $tw.wiki.getTiddler(title)?.fields)
    .filter(item => item !== undefined)
    .sort((a, b) => (b.priority as number | undefined ?? 0) - (a.priority as number | undefined ?? 0))
    .forEach((tiddlerField) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pluginModule = require(tiddlerField.title) as {
          plugin: AutocompletePlugin<ITiddlerFields, unknown> | ((id: string) => AutocompletePlugin<ITiddlerFields, unknown>);
        };
        let plugin = pluginModule.plugin;
        if (typeof plugin === 'function') {
          plugin = plugin(id);
        }

        // Wrap the plugin's getSources with centralized routing logic
        const originalGetSources = plugin.getSources;
        if (originalGetSources) {
          plugin.getSources = async function(parameters: GetSourcesParams<ITiddlerFields>) {
            const context = parameters.state.context as IContext;
            const phase = context.phase ?? computePhase(parameters.query, context);
            const activeSourceIds = computeActiveSourceIds(phase, parameters.query, context);

            // Call original getSources
            const sources = await originalGetSources.call(this, parameters) as Array<AutocompleteSource<ITiddlerFields>>;

            // Filter to only active sources
            return sources.filter((source) => activeSourceIds.has(source.sourceId));
          };
        }

        plugins.push(plugin);
      } catch (error) {
        console.error(`Failed to load command palette plugin ${tiddlerField.title}`, error);
      }
    });
  return plugins;
}
