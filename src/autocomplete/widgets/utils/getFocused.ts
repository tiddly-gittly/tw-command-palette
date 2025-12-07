export function getCurrentSelection() {
  const selection = window.getSelection()?.toString();
  if (selection !== '') return selection;
  const activeElement = getActiveElement() as HTMLInputElement | HTMLTextAreaElement | null;
  if (!activeElement?.selectionStart) return '';
  const selectionEnd = activeElement.selectionEnd ?? activeElement.selectionStart;
  if (activeElement.selectionStart > selectionEnd) {
    return activeElement.value.substring(activeElement.selectionStart, selectionEnd);
  } else {
    return activeElement.value.substring(selectionEnd, activeElement.selectionStart);
  }
}

export function getActiveElement(element = document.activeElement): HTMLElement | null {
  if (!element) {
    return null;
  }
  const shadowRoot = element.shadowRoot;
  const contentDocument = (element as HTMLIFrameElement).contentDocument;

  if (shadowRoot?.activeElement) {
    return getActiveElement(shadowRoot.activeElement);
  }

  if (contentDocument?.activeElement) {
    return getActiveElement(contentDocument.activeElement);
  }

  return element as HTMLElement;
}
