/**
 * Integration tests for search-system-title source plugin.
 *
 * Tests cover the "SearchSystemTitle" configuration:
 *  1. When enabled, query starting with "#" (or configured prefix) searches system tiddlers.
 *  2. When disabled, no system-title source is returned.
 */
describe('search-system-title source plugin', function () {
  var helpers;
  var systemTitlePlugin;
  var contextModule;
  var originalSearchSystemTitle;

  beforeAll(function () {
    helpers = require('tests/helpers/autocomplete-mock.js');
    systemTitlePlugin = require('$:/plugins/linonetwo/autocomplete/widget/build-in-sub-plugins/search-system-title.js');
    contextModule = require('$:/plugins/linonetwo/autocomplete/widget/utils/context.js');
    originalSearchSystemTitle = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/SearchSystemTitle');
  });

  afterEach(function () {
    $tw.wiki.setText('$:/plugins/linonetwo/autocomplete/configs/SearchSystemTitle', 'text', undefined, originalSearchSystemTitle || 'no', { suppressTimestamp: true });
  });

  function setSearchSystemTitle(value) {
    var tiddler = $tw.wiki.getTiddler('$:/plugins/linonetwo/autocomplete/configs/SearchSystemTitle');
    if (!tiddler) {
      $tw.wiki.addTiddler({
        title: '$:/plugins/linonetwo/autocomplete/configs/SearchSystemTitle',
        text: value,
        type: 'text/vnd.tiddlywiki',
      });
    } else {
      $tw.wiki.setText('$:/plugins/linonetwo/autocomplete/configs/SearchSystemTitle', 'text', undefined, value, { suppressTimestamp: true });
    }
  }

  function getSystemTitleSource(sources) {
    for (var i = 0; i < sources.length; i++) {
      if (sources[i].sourceId === 'search-system-title') return sources[i];
    }
    return undefined;
  }

  it('returns system-title source when SearchSystemTitle is enabled', function (done) {
    setSearchSystemTitle('yes');

    var params = helpers.createMockParameters('#ControlPanel', {});
    Promise.resolve(systemTitlePlugin.plugin.getSources(params)).then(function (sources) {
      var source = getSystemTitleSource(sources);
      expect(source).toBeDefined();
    }).then(done).catch(done.fail);
  });

  it('returns empty sources when SearchSystemTitle is disabled', function (done) {
    setSearchSystemTitle('no');

    var params = helpers.createMockParameters('#ControlPanel', {});
    Promise.resolve(systemTitlePlugin.plugin.getSources(params)).then(function (sources) {
      expect(sources).toEqual([]);
    }).then(done).catch(done.fail);
  });

  it('getItems searches system tiddlers by full text', function (done) {
    setSearchSystemTitle('yes');

    var params = helpers.createMockParameters('#ControlPanel', {});
    Promise.resolve(systemTitlePlugin.plugin.getSources(params)).then(function (sources) {
      var source = getSystemTitleSource(sources);
      expect(source).toBeDefined();
      return source.getItems({ query: '#ControlPanel', state: params.state });
    }).then(function (items) {
      var titles = items.map(function (item) { return item.title; });
      expect(titles).toContain('$:/core/ui/Buttons/control-panel');
    }).then(done).catch(done.fail);
  });
});
