import { widget as Widget } from '$:/core/modules/widgets/widget.js';
import { autocomplete } from '@algolia/autocomplete-js';
import { IChangedTiddlers } from 'tiddlywiki';
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
    autocomplete({
      container: containerElement,
      placeholder: 'Search for tiddlers',
      autoFocus: true,
      ignoreCompositionEvents: true,
      getSources() {
        return [];
      },
    });
    // autoFocus param is not working, focus manually.
    containerElement.querySelector('input')?.focus();
  }
}

declare let exports: {
  ['command-palette']: typeof CommandPaletteWidget;
};
exports['command-palette'] = CommandPaletteWidget;
