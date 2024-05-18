/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { Modal } from '$:/core/modules/utils/dom/modal.js';
import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { autocomplete } from '@algolia/autocomplete-js';
import type { AutocompleteNavigator } from '@algolia/autocomplete-shared/dist/esm/core/AutocompleteNavigator';
import { IChangedTiddlers, ITiddlerFields } from 'tiddlywiki';
import '@algolia/autocomplete-theme-classic';
import { AutocompleteState } from '@algolia/autocomplete-core';
import { observe, unobserve } from '@seznam/visibility-observer';
import { IContext } from './utils/context';
import { getSubPlugins } from './utils/getSubPlugins';
import { uniqSourcesBy } from './utils/uniqSourcesBy';

class CommandPaletteWidget extends Widget {
  id = 'default';
  refresh(_changedTiddlers: IChangedTiddlers) {
    return false;
  }

  autoCompleteInstance: ReturnType<typeof autocomplete<ITiddlerFields>> | undefined;

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
    const removeDuplicates = uniqSourcesBy<ITiddlerFields>(({ item }) => item.title);
    this.autoCompleteInstance = autocomplete<ITiddlerFields>({
      container: containerElement,
      placeholder: 'Search for tiddlers',
      autoFocus: true,
      openOnFocus: true,
      ignoreCompositionEvents: true,
      navigator: {
        navigate: this.onNavigate.bind(this) satisfies AutocompleteNavigator<ITiddlerFields>['navigate'],
      },
      plugins: getSubPlugins(),
      reshape({ sourcesBySourceId }) {
        const {
          'title': titleSource,
          'title-pinyin': titlePinyinSource,
          'story-history': storyHistorySource,
          ...rest
        } = sourcesBySourceId;
        return [...removeDuplicates(...[titleSource, titlePinyinSource, storyHistorySource].filter(Boolean)), ...Object.values(rest)];
      },
    });
    this.autoCompleteInstance.setContext({ widget: this } satisfies IContext);
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

  onNavigate({ itemUrl, state }: {
    item: ITiddlerFields;
    itemUrl: string;
    state: AutocompleteState<ITiddlerFields>;
  }): void {
    if (state.context.newQuery) {
      this.autoCompleteInstance?.setQuery?.((state.context as IContext).newQuery!);
      this.autoCompleteInstance?.setContext({ newQuery: undefined } satisfies IContext);
      void this.autoCompleteInstance?.refresh?.();
    }
    if (!state.context.noNavigate) {
      this.dispatchEvent({
        type: 'tm-navigate',
        navigateTo: itemUrl,
        navigateFromNode: this,
      });
    }
    if (!state.context.noDestroy) {
      this.destroy();
    }
    this.autoCompleteInstance?.setContext({ noNavigate: undefined, newQuery: undefined, noDestroy: undefined } satisfies IContext);
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
