/**
 * Integration tests for search-user-title source plugin.
 *
 * Tests cover the "TitleAlias" configuration (视为标题的字段):
 *  1. Default "title caption alias" searches across title, caption and alias.
 *  2. Each individual field combination works (title only, title alias, title caption).
 *  3. A match in title is returned even when caption is configured and does not match.
 *  4. Empty configuration returns no results safely.
 */
describe('search-user-title source plugin', function () {
  var helpers;
  var userTitlePlugin;
  var originalTitleAlias;

  beforeAll(function () {
    helpers = require('tests/helpers/autocomplete-mock.js');
    userTitlePlugin = require('$:/plugins/linonetwo/autocomplete/widget/build-in-sub-plugins/search-user-title.js');
    originalTitleAlias = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/TitleAlias');
  });

  afterEach(function () {
    $tw.wiki.setText('$:/plugins/linonetwo/autocomplete/configs/TitleAlias', 'text', undefined, originalTitleAlias || 'title caption alias', { suppressTimestamp: true });
  });

  function setTitleAlias(value) {
    var tiddler = $tw.wiki.getTiddler('$:/plugins/linonetwo/autocomplete/configs/TitleAlias');
    if (!tiddler) {
      $tw.wiki.addTiddler({
        title: '$:/plugins/linonetwo/autocomplete/configs/TitleAlias',
        text: value,
        type: 'text/vnd.tiddlywiki',
      });
    } else {
      $tw.wiki.setText('$:/plugins/linonetwo/autocomplete/configs/TitleAlias', 'text', undefined, value, { suppressTimestamp: true });
    }
  }

  function getTitleSource(sources) {
    for (var i = 0; i < sources.length; i++) {
      if (sources[i].sourceId === 'title') return sources[i];
    }
    return undefined;
  }

  function makeTiddlerWithFields(title, fields) {
    var tiddlerFields = Object.assign({ title: title, text: '', type: 'text/vnd.tiddlywiki', tags: [] }, fields || {});
    $tw.wiki.addTiddler(tiddlerFields);
    return tiddlerFields;
  }

  // ── Default configuration: title caption alias ─────────────────────────────

  it('default TitleAlias searches title even if caption does not match', function (done) {
    setTitleAlias('title caption alias');
    makeTiddlerWithFields('IndexTiddler', { caption: 'A different caption', alias: 'AnotherAlias' });

    var params = helpers.createMockParameters('IndexTiddler', {});
    Promise.resolve(userTitlePlugin.plugin.getSources(params)).then(function (sources) {
      var source = getTitleSource(sources);
      expect(source).toBeDefined();
      return source.getItems({ query: 'IndexTiddler', state: params.state });
    }).then(function (items) {
      var titles = items.map(function (item) { return item.title; });
      expect(titles).toContain('IndexTiddler');
    }).then(done).catch(done.fail);
  });

  it('default TitleAlias searches caption', function (done) {
    setTitleAlias('title caption alias');
    makeTiddlerWithFields('CaptionOnlyTiddler', { caption: 'UniqueCaption', alias: 'SomeAlias' });

    var params = helpers.createMockParameters('UniqueCaption', {});
    Promise.resolve(userTitlePlugin.plugin.getSources(params)).then(function (sources) {
      var source = getTitleSource(sources);
      return source.getItems({ query: 'UniqueCaption', state: params.state });
    }).then(function (items) {
      var titles = items.map(function (item) { return item.title; });
      expect(titles).toContain('CaptionOnlyTiddler');
    }).then(done).catch(done.fail);
  });

  it('default TitleAlias searches alias', function (done) {
    setTitleAlias('title caption alias');
    makeTiddlerWithFields('AliasOnlyTiddler', { caption: 'SomeCaption', alias: 'UniqueAlias' });

    var params = helpers.createMockParameters('UniqueAlias', {});
    Promise.resolve(userTitlePlugin.plugin.getSources(params)).then(function (sources) {
      var source = getTitleSource(sources);
      return source.getItems({ query: 'UniqueAlias', state: params.state });
    }).then(function (items) {
      var titles = items.map(function (item) { return item.title; });
      expect(titles).toContain('AliasOnlyTiddler');
    }).then(done).catch(done.fail);
  });

  // ── Field combination isolation ────────────────────────────────────────────

  it('title only configuration still searches title', function (done) {
    setTitleAlias('title');
    makeTiddlerWithFields('TitleOnlyTiddler', { caption: 'NoMatchCaption' });

    var params = helpers.createMockParameters('TitleOnlyTiddler', {});
    Promise.resolve(userTitlePlugin.plugin.getSources(params)).then(function (sources) {
      var source = getTitleSource(sources);
      return source.getItems({ query: 'TitleOnlyTiddler', state: params.state });
    }).then(function (items) {
      var titles = items.map(function (item) { return item.title; });
      expect(titles).toContain('TitleOnlyTiddler');
    }).then(done).catch(done.fail);
  });

  it('title alias configuration searches both title and alias', function (done) {
    setTitleAlias('title alias');
    makeTiddlerWithFields('TitleAliasTiddler', { alias: 'UniqueTitleAlias' });

    var params = helpers.createMockParameters('TitleAliasTiddler', {});
    Promise.resolve(userTitlePlugin.plugin.getSources(params)).then(function (sources) {
      var source = getTitleSource(sources);
      return source.getItems({ query: 'TitleAliasTiddler', state: params.state });
    }).then(function (items) {
      var titles = items.map(function (item) { return item.title; });
      expect(titles).toContain('TitleAliasTiddler');

      params = helpers.createMockParameters('UniqueTitleAlias', {});
      return userTitlePlugin.plugin.getSources(params);
    }).then(function (sources) {
      var source = getTitleSource(sources);
      return source.getItems({ query: 'UniqueTitleAlias', state: params.state });
    }).then(function (items) {
      var titles = items.map(function (item) { return item.title; });
      expect(titles).toContain('TitleAliasTiddler');
    }).then(done).catch(done.fail);
  });

  it('title caption configuration searches title even if caption differs', function (done) {
    setTitleAlias('title caption');
    makeTiddlerWithFields('TitleCaptionTiddler', { caption: 'NoMatchCaption' });

    var params = helpers.createMockParameters('TitleCaptionTiddler', {});
    Promise.resolve(userTitlePlugin.plugin.getSources(params)).then(function (sources) {
      var source = getTitleSource(sources);
      return source.getItems({ query: 'TitleCaptionTiddler', state: params.state });
    }).then(function (items) {
      var titles = items.map(function (item) { return item.title; });
      expect(titles).toContain('TitleCaptionTiddler');
    }).then(done).catch(done.fail);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it('empty TitleAlias configuration returns empty items safely', function (done) {
    setTitleAlias('');

    var params = helpers.createMockParameters('Anything', {});
    Promise.resolve(userTitlePlugin.plugin.getSources(params)).then(function (sources) {
      var source = getTitleSource(sources);
      if (!source) {
        // If no source is returned, the empty-config case is handled defensively.
        return [];
      }
      return source.getItems({ query: 'Anything', state: params.state });
    }).then(function (items) {
      expect(items).toEqual([]);
    }).then(done).catch(done.fail);
  });

  it('escapes query containing ] so filter syntax stays valid', function (done) {
    setTitleAlias('title');
    makeTiddlerWithFields('Bracket]Tiddler', {});

    var params = helpers.createMockParameters('Bracket]', {});
    Promise.resolve(userTitlePlugin.plugin.getSources(params)).then(function (sources) {
      var source = getTitleSource(sources);
      return source.getItems({ query: 'Bracket]', state: params.state });
    }).then(function (items) {
      var titles = items.map(function (item) { return item.title; });
      expect(titles).toContain('Bracket]Tiddler');
    }).then(done).catch(done.fail);
  });
});
