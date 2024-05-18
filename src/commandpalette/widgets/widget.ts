import { Modal } from '$:/core/modules/utils/dom/modal.js';
import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { autocomplete } from '@algolia/autocomplete-js';
import { IChangedTiddlers } from 'tiddlywiki';
import '@algolia/autocomplete-theme-classic';
import { observe, unobserve } from '@seznam/visibility-observer';
import { uniqSourcesBy } from './utils/uniqSourcesBy';
import { getSubPlugins } from './utils/getSubPlugins';

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
      plugins: getSubPlugins(),
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
        if (inputElement.value === '') {
          this.destroy();
        } else {
          event.stopPropagation();
          event.preventDefault();
          inputElement.value = '';
        }
      }
      // pressing enter is useless (it auto searches), and will cause dropdown to close, so ignore it.
      if (event.key === 'Enter') {
        this.autoCompleteInstance?.setIsOpen(true);
        event.stopPropagation();
        event.preventDefault();
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

  destroy() {
    $tw.wiki.deleteTiddler(`$:/state/commandpalette/${this.id}/opened`);
    this.modalCount = 0;
    Modal.prototype.adjustPageClass.call(this);
    this.autoCompleteInstance?.destroy();
  }
}

declare let exports: {
  ['command-palette']: typeof CommandPaletteWidget;
};
exports['command-palette'] = CommandPaletteWidget;
