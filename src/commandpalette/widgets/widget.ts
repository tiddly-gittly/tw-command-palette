import { Modal } from '$:/core/modules/utils/dom/modal.js';
import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { autocomplete, AutocompletePlugin } from '@algolia/autocomplete-js';
import { IChangedTiddlers, ITiddlerFields } from 'tiddlywiki';
import '@algolia/autocomplete-theme-classic';
import { observe, unobserve } from '@seznam/visibility-observer';
import { uniqSourcesBy } from './utils/uniqSourcesBy';

class CommandPaletteWidget extends Widget {
  id = 'default';
  refresh(_changedTiddlers: IChangedTiddlers) {
    return false;
  }

  autoCompleteInstance: ReturnType<typeof autocomplete> | undefined;

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
    searchTitlePluginTitles
      .map(title => this.wiki.getTiddler(title)?.fields)
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
    this.handleDarkMode();
    const removeDuplicates = uniqSourcesBy(({ item }) => item.title);
    this.autoCompleteInstance = autocomplete({
      container: containerElement,
      placeholder: 'Search for tiddlers',
      autoFocus: true,
      openOnFocus: true,
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
      reshape({ sourcesBySourceId }) {
        return removeDuplicates(...Object.values(sourcesBySourceId));
      },
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

  /** Handle CJK IME */
  imeOpen = false;
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
    inputElement.addEventListener('compositionstart', () => {
      this.imeOpen = true;
    });
    inputElement.addEventListener('compositionend', () => {
      this.imeOpen = false;
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

  destroy() {
    $tw.wiki.deleteTiddler('$:/state/commandpalette/default/opened');
    this.modalCount = 0;
    Modal.prototype.adjustPageClass.call(this);
    this.autoCompleteInstance?.destroy();
  }
}

declare let exports: {
  ['command-palette']: typeof CommandPaletteWidget;
};
exports['command-palette'] = CommandPaletteWidget;
