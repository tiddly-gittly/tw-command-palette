const lingoBase = '$:/plugins/linonetwo/commandpalette/';
export function lingo(key: string) {
  const languageCode = $tw.wiki.filterTiddlers('[[$:/language]get[text]get[name]else[en-GB]]')[0];
  return $tw.wiki.getTiddlerText(`${lingoBase}${languageCode}/${key}`, key);
}
