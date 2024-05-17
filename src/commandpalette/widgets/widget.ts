import { Modal } from '$:/core/modules/utils/dom/modal.js';
import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { autocomplete, AutocompletePlugin } from '@algolia/autocomplete-js';
import { IChangedTiddlers, ITiddlerFields } from 'tiddlywiki';
import '@algolia/autocomplete-theme-classic';
import { observe, unobserve } from '@seznam/visibility-observer';

class CommandPaletteWidget extends Widget {
  id = 'default';
  refresh(_changedTiddlers: IChangedTiddlers) {
    return false;
  }

  render(parent: Element, nextSibling: Element) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    this.id = this.getAttribute('id', 'default');
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
    this.handleDarkMode();
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
          this.destroy();
        },
      },
      plugins,
    });
    this.onCommandPaletteDOMInit(containerElement);
    observe(containerElement, this.onVisibilityChange.bind(this));
  }

  onVisibilityChange(
    visibilityEntry: IntersectionObserverEntry & {
      target: HTMLElement;
    },
  ) {
    if (!visibilityEntry.isIntersecting) {
      this.destroy();
      unobserve(visibilityEntry.target, this.onVisibilityChange.bind(this));
    }
  }

  /** Copy from Modal, to use its logic */
  srcDocument = this.document;
  modalCount = 0;
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
        this.destroy();
      }
    });
    this.modalCount++;
    // call with this
    Modal.prototype.adjustPageClass.call(this);
  }

  handleDarkMode() {
    const isDark = $tw.wiki.getTiddlerText('$:/info/darkmode') === 'yes';
    if (isDark) {
      // https://www.algolia.com/doc/ui-libraries/autocomplete/api-reference/autocomplete-theme-classic/#dark-mode
      const dataset = (this.document as unknown as Document).body?.dataset;
      if (dataset !== undefined) {
        dataset.theme = 'dark';
      }
    }
  }

  removeChildDomNodes(): void {
    this.destroy();
    super.removeChildDomNodes();
  }

  destroy() {
    $tw.wiki.deleteTiddler('$:/state/commandpalette/default/opened');
    this.modalCount = 0;
    Modal.prototype.adjustPageClass.call(this);
  }
}

declare let exports: {
  ['command-palette']: typeof CommandPaletteWidget;
};
exports['command-palette'] = CommandPaletteWidget;
