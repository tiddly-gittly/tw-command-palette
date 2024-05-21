export function handleDarkMode() {
  const isDark = $tw.wiki.getTiddlerText('$:/info/darkmode') === 'yes';
  if (isDark) {
    // https://www.algolia.com/doc/ui-libraries/autocomplete/api-reference/autocomplete-theme-classic/#dark-mode
    const dataset = document.body?.dataset;
    if (dataset !== undefined) {
      dataset.theme = 'dark';
    }
  }
}
