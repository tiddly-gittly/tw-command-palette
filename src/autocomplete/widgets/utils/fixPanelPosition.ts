/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/**
 * container of command input can't be position fix, otherwise need a hack
 * @url https://github.com/algolia/autocomplete/issues/1199
 */
export function fixPanelPosition(parentDomNode: Element) {
  // const defaultInputElement = document.querySelector('.tw-command-palette-default-container');
  const defaultInputElement = parentDomNode;
  if (!defaultInputElement) return;
  const rect = defaultInputElement.getBoundingClientRect();
  // Set css variable to be below the search box in case the search box moved when the window was resized
  document.documentElement.style.setProperty('--position-autocomplete-panel-top', `${rect.bottom}px`);
}
