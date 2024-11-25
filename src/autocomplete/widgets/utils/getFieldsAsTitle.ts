/**
 * @returns `title,caption` that can be use with `search:title,caption[]` operator.
 */
export function getFieldsAsTitle() {
  const TitleAliasConfig = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/TitleAlias', 'title caption');
  const titleFields = TitleAliasConfig.split(' ').filter(Boolean);
  const fieldsAsTitle = titleFields.join(',');
  return { fieldsAsTitle, titleFields };
}

export function getFieldsAsText() {
  const TextAliasConfig = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/TextAlias', 'text');
  const textFields = TextAliasConfig.split(' ').filter(Boolean);
  const fieldsAsText = textFields.join(',');
  return { fieldsAsText, textFields };
}
