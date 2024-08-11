export const cacheSystemTiddlers = () => $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/CacheSystemTiddlers') === 'yes';
export const searchSystemTitle = () => $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/SearchSystemTitle') === 'yes';
export const titleTextExclusionFilter = () => $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/TitleTextIgnoreFilter', '');
export const applyIgnoreFilterToTag = () => $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/ApplyIgnoreFilterToTag', '') === 'yes';
export const missingFilterOnTop = () => $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/MissingFilterOnTop', '');
