/**
 * @returns `title,caption` that can be use with `search:title,caption[]` operator.
 */
export function getFieldsAsTitle(): string {
  const TitleAliasConfig = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/TitleAlias', 'title caption');
  const fieldsAsTitle = TitleAliasConfig.split(' ').filter(Boolean).join(',');
  return fieldsAsTitle;
}

export function getFieldsAsText(): string {
  const TextAliasConfig = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/TextAlias', 'text');
  const fieldsAsText = TextAliasConfig.split(' ').filter(Boolean).join(',');
  return fieldsAsText;
}
