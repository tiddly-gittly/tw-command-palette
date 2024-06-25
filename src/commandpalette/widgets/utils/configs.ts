export const cacheSystemTiddlers = () => $tw.wiki.getTiddlerText('$:/plugins/linonetwo/commandpalette/configs/CacheSystemTiddlers') === 'yes';
export const searchSystemTitle = () => $tw.wiki.getTiddlerText('$:/plugins/linonetwo/commandpalette/configs/SearchSystemTitle') === 'yes';
export const titleTextExclusionFilter = () => $tw.wiki.getTiddlerText('$:/plugins/linonetwo/commandpalette/configs/TitleTextIgnoreFilter', '');
export const applyIgnoreFilterToTag = () => $tw.wiki.getTiddlerText('$:/plugins/linonetwo/commandpalette/configs/ApplyIgnoreFilterToTag', '') === 'yes';
export const missingFilterOnTop = () => $tw.wiki.getTiddlerText('$:/plugins/linonetwo/commandpalette/configs/MissingFilterOnTop', '');
