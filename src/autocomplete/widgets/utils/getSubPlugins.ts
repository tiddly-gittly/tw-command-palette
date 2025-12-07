import { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';

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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        let plugin = require(tiddlerField.title).plugin;
        if (typeof plugin === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
          plugin = plugin(id);
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        plugins.push(plugin);
      } catch (error) {
        console.error(`Failed to load command palette plugin ${tiddlerField.title}`, error);
      }
    });
  return plugins;
}
