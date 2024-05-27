/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { Modal } from '$:/core/modules/utils/dom/modal.js';
import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { autocomplete, OnStateChangeProps } from '@algolia/autocomplete-js';
import type { AutocompleteNavigator } from '@algolia/autocomplete-shared/dist/esm/core/AutocompleteNavigator';
import { IChangedTiddlers, ITiddlerFields } from 'tiddlywiki';
import '@algolia/autocomplete-theme-classic';
import { AutocompleteState } from '@algolia/autocomplete-core';
import { observe, unobserve } from '@seznam/visibility-observer';
import { IContext } from './utils/context';
import { fixPanelPosition } from './utils/fixPanelPosition';
import { getActiveElement } from './utils/getFocused';
import { getSubPlugins } from './utils/getSubPlugins';
import { handleDarkMode } from './utils/handleDarkMode';
import { uniqSourcesBy } from './utils/uniqSourcesBy';

class CommandPaletteWidget extends Widget {
  id = 'default';
  refresh(_changedTiddlers: IChangedTiddlers) {
    return false;
  }

  /** We restore focus of element when we are close */
  // eslint-disable-next-line unicorn/no-null
  previouslyFocusedElement: HTMLElement | null = null;
  autoCompleteInstance: ReturnType<typeof autocomplete<ITiddlerFields>> | undefined;
  /** Can't get state from its instance, so use this as a way to get state */
  autoCompleteState?: OnStateChangeProps<ITiddlerFields>;
  historyMode = false;

  render(parent: Element, nextSibling: Element) {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    this.id = this.getAttribute('id', 'default');
    // params are get from `$:/plugins/linonetwo/commandpalette/DefaultCommandPalette` using transclusion from `$:/temp/commandpalette/default/opened`
    const initialPrefix = this.getAttribute('prefix', '');
    this.historyMode = this.getAttribute('historyMode', 'no') === 'yes';
    const titlePriorityText = this.wiki.getTiddlerText('$:/plugins/linonetwo/commandpalette/configs/TitlePriorityText', 'no') === 'yes';
    const containerElement = $tw.utils.domMaker('nav', {
      class: 'tw-commandpalette-container',
    });
    parent.insertBefore(containerElement, nextSibling);
    this.domNodes.push(containerElement);

    handleDarkMode();
    const removeDuplicates = uniqSourcesBy<ITiddlerFields>(({ item }) => item.title);
    this.previouslyFocusedElement = getActiveElement();
    const updateState = (nextState: OnStateChangeProps<ITiddlerFields>) => {
      this.autoCompleteState = nextState;
    };
    this.autoCompleteInstance = autocomplete<ITiddlerFields>({
      id: this.id,
      container: containerElement,
      placeholder: 'Search for tiddlers',
      initialState: {
        query: initialPrefix,
      },
      defaultActiveItemId: 0,
      onStateChange(nextState) {
        updateState(nextState);
      },
      autoFocus: true,
      openOnFocus: true,
      ignoreCompositionEvents: true,
      navigator: {
        navigate: this.onEnter.bind(this) satisfies AutocompleteNavigator<ITiddlerFields>['navigate'],
        navigateNewTab: this.onCtrlEnter.bind(this) satisfies AutocompleteNavigator<ITiddlerFields>['navigateNewTab'],
      },
      plugins: getSubPlugins(),
      reshape({ sourcesBySourceId }) {
        const {
          'title': titleSource,
          'title-pinyin': titlePinyinSource,
          'story-history': storyHistorySource,
          'text': textSource,
          ...rest
        } = sourcesBySourceId;
        // this will also affect `priority` field. The order here is more important than `priority` field.
        return [
          ...removeDuplicates(...[...(titlePriorityText ? [titleSource, textSource] : [textSource, titleSource]), titlePinyinSource, storyHistorySource].filter(Boolean)),
          ...Object.values(rest),
        ];
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

  onEnter({ itemUrl, state }: {
    item: ITiddlerFields;
    itemUrl: string;
    state: AutocompleteState<ITiddlerFields>;
  }): void {
    if (state.context.newQuery !== undefined) {
      this.autoCompleteInstance?.setQuery?.((state.context as IContext).newQuery!);
      this.autoCompleteInstance?.setContext({ newQuery: undefined } satisfies IContext);
      // use query to re-search, and will set activeItemId to defaultActiveItemId
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
    this.clearContext();
  }

  onCtrlEnter({ itemUrl, state }: {
    item: ITiddlerFields;
    itemUrl: string;
    state: AutocompleteState<ITiddlerFields>;
  }) {
    $tw.utils.copyToClipboard(itemUrl);
    if (!state.context.noClose) {
      this.setCloseState();
    }
    this.clearContext();
  }

  clearContext() {
    // don't clear filter, otherwise can't get it in next step (under-filter)
    this.autoCompleteInstance?.setContext({ noNavigate: undefined, newQuery: undefined, noClose: undefined /* , filter: undefined */ } satisfies IContext);
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
    this.registerHistoryKeyboardHandlers(inputElement);
    // autoFocus param is not working, focus manually.
    inputElement.focus();
    // no API to listen esc, listen manually
    inputElement.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.setCloseState();
        return;
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
    fixPanelPosition();
    inputElement.addEventListener('focus', fixPanelPosition);
    inputElement.addEventListener('blur', fixPanelPosition);
    window.addEventListener('resize', fixPanelPosition);
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  historySwitchActiveItemId?: number;

  registerHistoryKeyboardHandlers(inputElement: HTMLInputElement) {
    if (!this.historyMode) return;
    inputElement.addEventListener('keydown', (event) => {
      if (this.autoCompleteInstance === undefined) return;
      // when use ctrl+tab to switch between history, when release tab (while still holding ctrl), do nothing after palette open.
      if (event.key === 'Tab' && event.ctrlKey) {
        this.historySwitchActiveItemId = (this.historySwitchActiveItemId ?? this.autoCompleteState?.state?.activeItemId ?? 0) + (event.shiftKey ? -1 : 1);
        const collectionLength = this.autoCompleteState?.state?.collections?.[0]?.items?.length ?? 0;
        if (this.historySwitchActiveItemId === -1) {
          this.historySwitchActiveItemId = Math.max(collectionLength - 1, 0);
        } else if (this.historySwitchActiveItemId >= collectionLength) {
          this.historySwitchActiveItemId = 0;
        }
        this.autoCompleteInstance.setActiveItemId(this.historySwitchActiveItemId);
        this.autoCompleteInstance.setIsOpen(true);
        event.stopPropagation();
        event.preventDefault();
      }
    });
    inputElement.addEventListener('keyup', (event) => {
      if (this.autoCompleteInstance === undefined) return;
      if (event.key === 'Tab' && event.ctrlKey) {
        event.stopPropagation();
        event.preventDefault();
        return;
      }
      // when release ctrl, and we are in history mode (no query), open the tiddler.
      if (event.key === 'Control' && this.autoCompleteState?.state?.query === '') {
        event.stopPropagation();
        event.preventDefault();
        const item = this.autoCompleteState?.state?.collections.find(({ source }) => source.sourceId === 'story-history')?.items[this.autoCompleteState?.state?.activeItemId ?? 0];
        if (!item) return;
        this.autoCompleteInstance.navigator.navigate({ item, itemUrl: item.title, state: this.autoCompleteState?.state });
      }
    });
  }

  setCloseState() {
    $tw.wiki.deleteTiddler(`$:/temp/commandpalette/${this.id}/opened`);
    this.autoCompleteInstance?.setIsOpen(false);
    this.modalCount = 0;
    Modal.prototype.adjustPageClass.call(this);
  }

  destroy() {
    this.setCloseState();
    this.autoCompleteInstance?.destroy();
    this.autoCompleteInstance = undefined;
    /* eslint-disable @typescript-eslint/unbound-method */
    window.removeEventListener('resize', fixPanelPosition);
    /* eslint-enable @typescript-eslint/unbound-method */
    this.previouslyFocusedElement?.focus?.();
  }
}

declare let exports: {
  ['command-palette']: typeof CommandPaletteWidget;
};
exports['command-palette'] = CommandPaletteWidget;
