/**
 * Integration tests for ignore-filter configurations.
 *
 * Tests cover:
 *  1. TitleTextIgnoreFilter excludes matching tiddlers from title search.
 *  2. ApplyIgnoreFilterToTag controls whether tag search applies the ignore filter.
 */
describe('ignore-filter configurations', function () {
  var helpers;
  var userTitlePlugin;
  var tagsPlugin;
  var contextModule;
  var contextActions;
  var originalIgnoreFilter;
  var originalApplyIgnoreToTag;

  beforeAll(function () {
    helpers = require('tests/helpers/autocomplete-mock.js');
    userTitlePlugin = require('$:/plugins/linonetwo/autocomplete/widget/build-in-sub-plugins/search-user-title.js');
    tagsPlugin = require('$:/plugins/linonetwo/autocomplete/widget/build-in-sub-plugins/search-tags.js');
    contextModule = require('$:/plugins/linonetwo/autocomplete/widget/utils/context.js');
    contextActions = contextModule.contextActions;
    originalIgnoreFilter = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/TitleTextIgnoreFilter');
    originalApplyIgnoreToTag = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/ApplyIgnoreFilterToTag');
  });

  afterEach(function () {
    $tw.wiki.setText('$:/plugins/linonetwo/autocomplete/configs/TitleTextIgnoreFilter', 'text', undefined, originalIgnoreFilter || '', { suppressTimestamp: true });
    $tw.wiki.setText('$:/plugins/linonetwo/autocomplete/configs/ApplyIgnoreFilterToTag', 'text', undefined, originalApplyIgnoreToTag || 'yes', { suppressTimestamp: true });
  });

  function setIgnoreFilter(value) {
    var tiddler = $tw.wiki.getTiddler('$:/plugins/linonetwo/autocomplete/configs/TitleTextIgnoreFilter');
    if (!tiddler) {
      $tw.wiki.addTiddler({ title: '$:/plugins/linonetwo/autocomplete/configs/TitleTextIgnoreFilter', text: value, type: 'text/vnd.tiddlywiki' });
    } else {
      $tw.wiki.setText('$:/plugins/linonetwo/autocomplete/configs/TitleTextIgnoreFilter', 'text', undefined, value, { suppressTimestamp: true });
    }
  }

  function setApplyIgnoreToTag(value) {
    var tiddler = $tw.wiki.getTiddler('$:/plugins/linonetwo/autocomplete/configs/ApplyIgnoreFilterToTag');
    if (!tiddler) {
      $tw.wiki.addTiddler({ title: '$:/plugins/linonetwo/autocomplete/configs/ApplyIgnoreFilterToTag', text: value, type: 'text/vnd.tiddlywiki' });
    } else {
      $tw.wiki.setText('$:/plugins/linonetwo/autocomplete/configs/ApplyIgnoreFilterToTag', 'text', undefined, value, { suppressTimestamp: true });
    }
  }

  function getTitleSource(sources) {
    for (var i = 0; i < sources.length; i++) {
      if (sources[i].sourceId === 'title') return sources[i];
    }
    return undefined;
  }

  function getTagsSource(sources) {
    for (var i = 0; i < sources.length; i++) {
      if (sources[i].sourceId === 'tags') return sources[i];
    }
    return undefined;
  }

  it('TitleTextIgnoreFilter excludes tiddlers from title search', function (done) {
    setIgnoreFilter('-[field:ignored[yes]]');
    $tw.wiki.addTiddler({ title: 'IgnoredTiddler', text: '', type: 'text/vnd.tiddlywiki', tags: [], ignored: 'yes' });
    $tw.wiki.addTiddler({ title: 'NormalTiddler', text: '', type: 'text/vnd.tiddlywiki', tags: [] });

    var params = helpers.createMockParameters('NormalTiddler', {});
    Promise.resolve(userTitlePlugin.plugin.getSources(params)).then(function (sources) {
      var source = getTitleSource(sources);
      return source.getItems({ query: 'NormalTiddler', state: params.state });
    }).then(function (items) {
      var titles = items.map(function (item) { return item.title; });
      expect(titles).toContain('NormalTiddler');
      expect(titles).not.toContain('IgnoredTiddler');
    }).then(done).catch(done.fail);
  });

  it('ApplyIgnoreFilterToTag=yes applies ignore filter to tag under-filter results', function (done) {
    setIgnoreFilter('-[field:ignored[yes]]');
    setApplyIgnoreToTag('yes');

    $tw.wiki.addTiddler({ title: 'IgnoredTagTiddler', text: '', type: 'text/vnd.tiddlywiki', tags: ['TestTag'], ignored: 'yes' });
    $tw.wiki.addTiddler({ title: 'NormalTagTiddler', text: '', type: 'text/vnd.tiddlywiki', tags: ['TestTag'] });

    var params = helpers.createMockParameters('#TestTag', {});
    Promise.resolve(tagsPlugin.plugin.getSources(params)).then(function (sources) {
      var source = getTagsSource(sources);
      source.onSelect({ item: helpers.makeTiddler('TestTag'), state: params.state });
      var ctx = params._spies.latestContext;
      expect(ctx.applyExclusion).toBe(true);
    }).then(done).catch(done.fail);
  });

  it('ApplyIgnoreFilterToTag=no does not apply ignore filter to tag under-filter results', function (done) {
    setIgnoreFilter('-[field:ignored[yes]]');
    setApplyIgnoreToTag('no');

    var params = helpers.createMockParameters('#TestTag', {});
    Promise.resolve(tagsPlugin.plugin.getSources(params)).then(function (sources) {
      var source = getTagsSource(sources);
      source.onSelect({ item: helpers.makeTiddler('TestTag'), state: params.state });
      var ctx = params._spies.latestContext;
      expect(ctx.applyExclusion).toBe(false);
    }).then(done).catch(done.fail);
  });
});
