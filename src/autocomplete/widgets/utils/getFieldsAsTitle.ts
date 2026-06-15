import { sanitizeFilterQuery } from './sanitizeFilterQuery';

const captionField = 'caption';

/**
 * @returns configured title-like fields and a caption split for search behavior.
 */
export function getFieldsAsTitle() {
  const TitleAliasConfig = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/TitleAlias', 'title caption alias');
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
  // Combine all configured title-like fields (title, alias, caption, etc.) into a single
  // search run. Previously caption was searched in a second run, which accidentally turned
  // the query into an intersection: a tiddler matching title but not caption was dropped.
  const allFields = [fieldsAsTitleOnly, fieldsAsCaption].filter(Boolean).join(',');
  if (allFields === '') return '';
  return `${baseFilter} ${exclusionFilter} +[${operator}:${allFields}[${sanitizeFilterQuery(query)}]]`;
}

export function getFieldsAsText() {
  const TextAliasConfig = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/TextAlias', 'text keywords');
  const textFields = TextAliasConfig.split(' ').filter(Boolean);
  const fieldsAsText = textFields.join(',');
  return { fieldsAsText, textFields };
}
