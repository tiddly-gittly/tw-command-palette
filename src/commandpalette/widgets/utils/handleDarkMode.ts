export function handleDarkMode() {
  const isDark = $tw.wiki.filterTiddlers('[[$:/palette]get[text]get[color-scheme]compare:string:eq[dark]]').length > 0;
  const dataset = document.body?.dataset;
  if (dataset !== undefined) {
    if (isDark) {
      // https://www.algolia.com/doc/ui-libraries/autocomplete/api-reference/autocomplete-theme-classic/#dark-mode
      dataset.theme = 'dark';
    } else {
      dataset.theme = 'light';
    }
  }
}
