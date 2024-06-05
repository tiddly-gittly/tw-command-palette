export const cacheSystemTiddlers = () => $tw.wiki.getTiddlerText('$:/plugins/linonetwo/commandpalette/configs/CacheSystemTiddlers') === 'yes';
export const titleTextExclusionFilter = () => $tw.wiki.getTiddlerText('$:/plugins/linonetwo/commandpalette/configs/TitleTextIgnoreFilter', '');
