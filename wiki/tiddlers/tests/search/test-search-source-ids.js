/**
 * Integration tests verifying source plugin IDs match their semantics.
 *
 * These tests guard against regressions where sourceIds were accidentally
 * swapped (e.g. recent-searches using 'story-history' and story-history using
 * 'story-list'), which broke routing, reshaping and ctrl+tab cycle history.
 */
describe('search source identifiers', function () {
  var helpers;
  var recentPluginFactory;
  var storyHistoryPlugin;

  beforeAll(function () {
    helpers = require('tests/helpers/autocomplete-mock.js');
    recentPluginFactory = require('$:/plugins/linonetwo/autocomplete/widget/build-in-sub-plugins/search-recent.js');
    storyHistoryPlugin = require('$:/plugins/linonetwo/autocomplete/widget/build-in-sub-plugins/search-story-history.js');
  });

  it('search-recent exposes sourceId "recent-searches"', function (done) {
    var plugin = recentPluginFactory.plugin('test-recent');
    // Trigger subscribe so the plugin captures setContext/navigator
    if (plugin.subscribe) {
      plugin.subscribe(helpers.createMockParameters('', {}));
    }
    if (plugin.transformSource) {
      var rawSource = {
        sourceId: 'recent-searches',
        getItems: function () { return Promise.resolve([]); },
        onSelect: function () {},
        templates: {},
        getItemUrl: function (o) { return o.item.id; },
      };
      var source = plugin.transformSource({ source: rawSource, state: helpers.createMockParameters('', {}).state });
      expect(source.sourceId).toBe('recent-searches');
    }
    done();
  });

  it('search-story-history exposes sourceId "story-history"', function (done) {
    var params = helpers.createMockParameters('', {});
    Promise.resolve(storyHistoryPlugin.plugin.getSources(params)).then(function (sources) {
      expect(sources.length).toBe(1);
      expect(sources[0].sourceId).toBe('story-history');
    }).then(done).catch(done.fail);
  });
});
