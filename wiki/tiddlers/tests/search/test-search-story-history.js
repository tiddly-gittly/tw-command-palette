/**
 * Integration tests for search-story-history source plugin.
 *
 * Covers:
 *  1. Normal empty-query mode hides story-history (to avoid clutter).
 *  2. Ctrl+Tab cycle-history mode shows the full story history even with no query.
 *  3. Title search inside story history works and tolerates special characters like `]`.
 */
describe('search-story-history source plugin', function () {
  var helpers;
  var storyHistoryPlugin;
  var originalStoryList;
  var originalHistoryList;

  beforeAll(function () {
    helpers = require('tests/helpers/autocomplete-mock.js');
    storyHistoryPlugin = require('$:/plugins/linonetwo/autocomplete/widget/build-in-sub-plugins/search-story-history.js');
    originalStoryList = $tw.wiki.getTiddler('$:/StoryList');
    originalHistoryList = $tw.wiki.getTiddler('$:/HistoryList');
  });

  afterEach(function () {
    if (originalStoryList) {
      $tw.wiki.addTiddler(originalStoryList.fields);
    } else {
      $tw.wiki.deleteTiddler('$:/StoryList');
    }
    if (originalHistoryList) {
      $tw.wiki.addTiddler(originalHistoryList.fields);
    } else {
      $tw.wiki.deleteTiddler('$:/HistoryList');
    }
  });

  function setStoryList(titles) {
    $tw.wiki.addTiddler({ title: '$:/StoryList', list: titles });
  }

  function setHistoryList(titles) {
    $tw.wiki.setTiddlerData('$:/HistoryList', titles.map(function (title) { return { title: title }; }));
  }

  function getStoryHistorySource(sources) {
    for (var i = 0; i < sources.length; i++) {
      if (sources[i].sourceId === 'story-history') return sources[i];
    }
    return undefined;
  }

  function makeTiddler(title, fields) {
    var tiddlerFields = Object.assign({ title: title, text: '', type: 'text/vnd.tiddlywiki', tags: [] }, fields || {});
    $tw.wiki.addTiddler(tiddlerFields);
    return tiddlerFields;
  }

  it('returns empty results on empty query in normal mode', function (done) {
    setStoryList(['HistoryA', 'HistoryB']);
    setHistoryList(['HistoryA', 'HistoryB']);

    var params = helpers.createMockParameters('', {});
    Promise.resolve(storyHistoryPlugin.plugin.getSources(params)).then(function (sources) {
      var source = getStoryHistorySource(sources);
      expect(source).toBeDefined();
      return source.getItems({ query: '', state: params.state });
    }).then(function (items) {
      expect(items).toEqual([]);
    }).then(done).catch(done.fail);
  });

  it('shows full story history on empty query in cycle-history mode', function (done) {
    makeTiddler('HistoryA');
    makeTiddler('HistoryB');
    setStoryList(['HistoryA', 'HistoryB']);
    setHistoryList(['HistoryA', 'HistoryB']);

    var params = helpers.createMockParameters('', { cycleHistoryMode: true });
    Promise.resolve(storyHistoryPlugin.plugin.getSources(params)).then(function (sources) {
      var source = getStoryHistorySource(sources);
      expect(source).toBeDefined();
      return source.getItems({ query: '', state: params.state });
    }).then(function (items) {
      var titles = items.map(function (item) { return item.title; });
      expect(titles).toContain('HistoryA');
      expect(titles).toContain('HistoryB');
    }).then(done).catch(done.fail);
  });

  it('searches history titles and escapes query containing ]', function (done) {
    makeTiddler('Bracket]Tiddler');
    setStoryList(['Bracket]Tiddler']);
    setHistoryList(['Bracket]Tiddler']);

    var params = helpers.createMockParameters('Bracket]', {});
    Promise.resolve(storyHistoryPlugin.plugin.getSources(params)).then(function (sources) {
      var source = getStoryHistorySource(sources);
      expect(source).toBeDefined();
      return source.getItems({ query: 'Bracket]', state: params.state });
    }).then(function (items) {
      var titles = items.map(function (item) { return item.title; });
      expect(titles).toContain('Bracket]Tiddler');
    }).then(done).catch(done.fail);
  });
});
