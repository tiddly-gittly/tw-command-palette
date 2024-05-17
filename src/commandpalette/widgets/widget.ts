import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { autocomplete, AutocompletePlugin } from '@algolia/autocomplete-js';
import { IChangedTiddlers, ITiddlerFields } from 'tiddlywiki';
import '@algolia/autocomplete-theme-classic';

class CommandPaletteWidget extends Widget {
  refresh(_changedTiddlers: IChangedTiddlers) {
    return false;
  }

  render(parent: Element, nextSibling: Element) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    const containerElement = $tw.utils.domMaker('nav', {
      class: 'tw-commandpalette-container',
    });
    parent.insertBefore(containerElement, nextSibling);
    this.domNodes.push(containerElement);
    const plugins: Array<AutocompletePlugin<ITiddlerFields, unknown>> = [];
    /**
     * Try loading plugins. Plugin should add tag `$:/tags/CommandPalette/Plugin` and export a `plugin` object.
     */
    const searchTitlePluginTitles = $tw.wiki.filterTiddlers('[all[shadows]tag[$:/tags/CommandPalette/Plugin]]');
    searchTitlePluginTitles.forEach((title) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, security/detect-non-literal-require, security-node/detect-non-literal-require-calls
        plugins.push(require(title).plugin);
      } catch (error) {
        console.error(`Failed to load command palette plugin ${title}`, error);
      }
    });
    autocomplete({
      container: containerElement,
      placeholder: 'Search for tiddlers',
      autoFocus: true,
      ignoreCompositionEvents: true,
      getSources() {
        return [];
      },
      navigator: {
        navigate: ({ itemUrl }) => {
          this.dispatchEvent({
            type: 'tm-navigate',
            navigateTo: itemUrl,
            navigateFromNode: this,
          });
          this.onClose();
        },
      },
      plugins,
    });
    this.onCommandPaletteDOMInit(containerElement);
  }

  /**
   * Do things after command palette UI is initialized.
   */
  onCommandPaletteDOMInit(containerElement: HTMLElement) {
    const inputElement = containerElement.querySelector('input');
    if (inputElement === null) {
      return;
    }
    // autoFocus param is not working, focus manually.
    inputElement.focus();
    // no API to listen esc, listen manually
    inputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.onClose();
      }
    });
  }

  onClose() {
    $tw.wiki.deleteTiddler('$:/state/commandpalette/default/opened');
  }
}

declare let exports: {
  ['command-palette']: typeof CommandPaletteWidget;
};
exports['command-palette'] = CommandPaletteWidget;
