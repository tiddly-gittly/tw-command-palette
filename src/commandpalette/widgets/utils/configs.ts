export const cacheSystemTiddlers = () => $tw.wiki.getTiddlerText('$:/plugins/linonetwo/commandpalette/configs/CacheSystemTiddlers') === 'yes';
export const searchSystemTitle = () => $tw.wiki.getTiddlerText('$:/plugins/linonetwo/commandpalette/configs/SearchSystemTitle') === 'yes';
export const titleTextExclusionFilter = () => $tw.wiki.getTiddlerText('$:/plugins/linonetwo/commandpalette/configs/TitleTextIgnoreFilter', '');
