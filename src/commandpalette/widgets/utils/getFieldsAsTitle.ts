/**
 * @returns `title,caption` that can be use with `search:title,caption[]` operator.
 */
export function getFieldsAsTitle(): string {
  const TitleAliasConfig = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/commandpalette/configs/TitleAlias', 'title caption');
  const fieldsAsTitle = TitleAliasConfig.split(' ').filter(Boolean).join(',');
  return fieldsAsTitle;
}
