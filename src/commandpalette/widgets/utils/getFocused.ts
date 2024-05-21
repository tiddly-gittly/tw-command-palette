/* eslint-disable @typescript-eslint/strict-boolean-expressions */

export function getCurrentSelection() {
  // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
  const selection = window.getSelection().toString();
  if (selection !== '') return selection;
  const activeElement = getActiveElement() as HTMLInputElement | HTMLTextAreaElement | null;
  if (!activeElement?.selectionStart) return '';
  const selectionEnd = activeElement?.selectionEnd ?? activeElement.selectionStart;
  if (activeElement.selectionStart > selectionEnd) {
    return activeElement.value.substring(activeElement.selectionStart, selectionEnd);
  } else {
    return activeElement.value.substring(selectionEnd, activeElement.selectionStart);
  }
}

export function getActiveElement(element = document.activeElement): HTMLElement | null {
  // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
  const shadowRoot = element.shadowRoot;
  // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
  const contentDocument = element.contentDocument as Document;

  if (shadowRoot?.activeElement) {
    return getActiveElement(shadowRoot.activeElement);
  }

  if (contentDocument?.activeElement) {
    return getActiveElement(contentDocument.activeElement);
  }

  return element as HTMLElement;
}
