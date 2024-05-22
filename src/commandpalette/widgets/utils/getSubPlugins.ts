import { AutocompletePlugin } from '@algolia/autocomplete-js';
import { ITiddlerFields } from 'tiddlywiki';

export function getSubPlugins() {
  const plugins: Array<AutocompletePlugin<ITiddlerFields, unknown>> = [];
  /**
   * Try loading plugins. Plugin should add tag `$:/tags/CommandPalettePlugin` and export a `plugin` object.
   */
  const searchTitlePluginTitles = $tw.wiki.filterTiddlers('[all[shadows]tag[$:/tags/CommandPalettePlugin]]');
  searchTitlePluginTitles
    .map(title => $tw.wiki.getTiddler(title)?.fields)
    .filter(item => item !== undefined)
    .sort((a, b) => (b.priority as number | undefined ?? 0) - (a.priority as number | undefined ?? 0))
    .forEach((tiddlerField) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, security/detect-non-literal-require, security-node/detect-non-literal-require-calls
        plugins.push(require(tiddlerField.title).plugin);
      } catch (error) {
        console.error(`Failed to load command palette plugin ${tiddlerField.title}`, error);
      }
    });

  return plugins;
}
