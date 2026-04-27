const captionField = 'caption';

/**
 * @returns configured title-like fields and a caption split for search behavior.
 */
export function getFieldsAsTitle() {
  const TitleAliasConfig = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/TitleAlias', 'title caption');
  const titleFields = TitleAliasConfig.split(' ').filter(Boolean);
  const titleOnlyFields = titleFields.filter(field => field !== captionField);
  const captionFields = titleFields.filter(field => field === captionField);
  const fieldsAsTitle = titleFields.join(',');
  const fieldsAsTitleOnly = titleOnlyFields.join(',');
  const fieldsAsCaption = captionFields.join(',');
  return { fieldsAsTitle, fieldsAsTitleOnly, fieldsAsCaption, titleFields };
}

export function buildTitleFieldFilter({
  baseFilter,
  query,
  operator,
  fieldsAsTitleOnly,
  fieldsAsCaption,
  exclusionFilter = '',
}: {
  baseFilter: string;
  query: string;
  operator: string;
  fieldsAsTitleOnly: string;
  fieldsAsCaption: string;
  exclusionFilter?: string;
}) {
  const filterRuns = [];
  if (fieldsAsTitleOnly !== '') {
    filterRuns.push(`${baseFilter} ${exclusionFilter} +[${operator}:${fieldsAsTitleOnly}[${query}]]`);
  }
  if (fieldsAsCaption !== '') {
    filterRuns.push(`${baseFilter} +[${operator}:${fieldsAsCaption}[${query}]]`);
  }
  return filterRuns.join(' ');
}

export function getFieldsAsText() {
  const TextAliasConfig = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/TextAlias', 'text');
  const textFields = TextAliasConfig.split(' ').filter(Boolean);
  const fieldsAsText = textFields.join(',');
  return { fieldsAsText, textFields };
}
