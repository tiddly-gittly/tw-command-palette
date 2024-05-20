/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { Modal } from '$:/core/modules/utils/dom/modal.js';
import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { autocomplete } from '@algolia/autocomplete-js';
import type { AutocompleteNavigator } from '@algolia/autocomplete-shared/dist/esm/core/AutocompleteNavigator';
import { IChangedTiddlers, IParseTreeNode, ITiddlerFields, IWidgetInitialiseOptions } from 'tiddlywiki';
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

  constructor(parseTreeNode: IParseTreeNode, options?: IWidgetInitialiseOptions) {
    super(parseTreeNode, options);
    this.fixPanelPosition = this.fixPanelPosition.bind(this);
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
    this.onCommandPaletteInputDOMInit(containerElement);
    this.onCommandPaletteDetachedDOMInit(containerElement);
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
      $tw.wiki.setText('$:/layout', 'text', undefined, '', { suppressTimestamp: true });
      this.dispatchEvent({
        type: 'tm-navigate',
        navigateTo: itemUrl,
        navigateFromNode: this,
      });
    }
    if (!state.context.noClose) {
      this.setCloseState();
    }
    this.autoCompleteInstance?.setContext({ noNavigate: undefined, newQuery: undefined, noClose: undefined } satisfies IContext);
  }

  /**
   * Handle full screen search mode on mobile
   * @url https://www.algolia.com/doc/ui-libraries/autocomplete/core-concepts/detached-mode/
   * @returns
   */
  onCommandPaletteDetachedDOMInit(containerElement: HTMLElement) {
    const buttonElement = containerElement.querySelector<HTMLButtonElement>('button.aa-DetachedSearchButton');
    if (buttonElement === null) {
      return;
    }
    buttonElement.click();
    buttonElement.style.display = 'none';
    const detachedElement = (this.document as unknown as Document).querySelector<HTMLDivElement>('body.aa-Detached > div.aa-DetachedOverlay');
    if (detachedElement === null) {
      return;
    }
    observe(detachedElement, this.onVisibilityChange.bind(this));
  }

  /** Copy from Modal, to use its logic */
  srcDocument = this.document;
  modalCount = 0;
  /**
   * Do things after command palette UI is initialized.
   */
  onCommandPaletteInputDOMInit(containerElement: HTMLElement) {
    const inputElement = containerElement.querySelector<HTMLInputElement>('input');
    if (inputElement === null) {
      return;
    }
    observe(containerElement, this.onVisibilityChange.bind(this));
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
    /* eslint-disable @typescript-eslint/unbound-method */
    this.fixPanelPosition();
    inputElement.addEventListener('focus', this.fixPanelPosition);
    inputElement.addEventListener('blur', this.fixPanelPosition);
    window.addEventListener('resize', this.fixPanelPosition);
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  /**
   * container of command input can't be position fix, otherwise need a hack
   * @url https://github.com/algolia/autocomplete/issues/1199
   */
  fixPanelPosition() {
    const defaultInputElement = document.querySelector('.tw-commandpalette-default-container');
    if (!defaultInputElement) return;
    const rect = defaultInputElement.getBoundingClientRect();
    // Set css variable to be below the search box in case the search box moved when the window was resized
    document.documentElement.style.setProperty('--position-autocomplete-panel-top', `${rect.bottom}px`);
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

  setCloseState() {
    $tw.wiki.deleteTiddler(`$:/state/commandpalette/${this.id}/opened`);
    this.autoCompleteInstance?.setIsOpen(false);
    this.modalCount = 0;
    Modal.prototype.adjustPageClass.call(this);
  }

  destroy() {
    this.setCloseState();
    this.autoCompleteInstance?.destroy();
    this.autoCompleteInstance = undefined;
    /* eslint-disable @typescript-eslint/unbound-method */
    window.removeEventListener('resize', this.fixPanelPosition);
    /* eslint-enable @typescript-eslint/unbound-method */
  }
}

declare let exports: {
  ['command-palette']: typeof CommandPaletteWidget;
};
exports['command-palette'] = CommandPaletteWidget;
