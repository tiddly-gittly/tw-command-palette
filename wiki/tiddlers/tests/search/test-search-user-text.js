/**
 * Integration tests for search-user-text source plugin.
 *
 * Tests cover the "TextAlias" configuration (视为正文文本的字段):
 *  1. Default "text keywords" searches across both fields.
 *  2. Custom field list works.
 *  3. Empty configuration returns no results safely.
 */
describe('search-user-text source plugin', function () {
  var helpers;
  var userTextPlugin;
  var originalTextAlias;

  beforeAll(function () {
    helpers = require('tests/helpers/autocomplete-mock.js');
    userTextPlugin = require('$:/plugins/linonetwo/autocomplete/widget/build-in-sub-plugins/search-user-text.js');
    originalTextAlias = $tw.wiki.getTiddlerText('$:/plugins/linonetwo/autocomplete/configs/TextAlias');
  });

  afterEach(function () {
    $tw.wiki.setText('$:/plugins/linonetwo/autocomplete/configs/TextAlias', 'text', undefined, originalTextAlias || 'text keywords', { suppressTimestamp: true });
  });

  function setTextAlias(value) {
    var tiddler = $tw.wiki.getTiddler('$:/plugins/linonetwo/autocomplete/configs/TextAlias');
    if (!tiddler) {
      $tw.wiki.addTiddler({
        title: '$:/plugins/linonetwo/autocomplete/configs/TextAlias',
        text: value,
        type: 'text/vnd.tiddlywiki',
      });
    } else {
      $tw.wiki.setText('$:/plugins/linonetwo/autocomplete/configs/TextAlias', 'text', undefined, value, { suppressTimestamp: true });
    }
  }

  function getTextSource(sources) {
    for (var i = 0; i < sources.length; i++) {
      if (sources[i].sourceId === 'text') return sources[i];
    }
    return undefined;
  }

  function makeTiddler(title, fields) {
    var tiddlerFields = Object.assign({ title: title, text: '', type: 'text/vnd.tiddlywiki', tags: [] }, fields || {});
    $tw.wiki.addTiddler(tiddlerFields);
    return tiddlerFields;
  }

  it('default TextAlias searches text field', function (done) {
    setTextAlias('text keywords');
    makeTiddler('TextMatchTiddler', { text: 'UniqueTextContent' });

    var params = helpers.createMockParameters('UniqueTextContent', {});
    Promise.resolve(userTextPlugin.plugin.getSources(params)).then(function (sources) {
      var source = getTextSource(sources);
      expect(source).toBeDefined();
      return source.getItems({ query: 'UniqueTextContent', state: params.state });
    }).then(function (items) {
      var titles = items.map(function (item) { return item.title; });
      expect(titles).toContain('TextMatchTiddler');
    }).then(done).catch(done.fail);
  });

  it('default TextAlias searches keywords field', function (done) {
    setTextAlias('text keywords');
    makeTiddler('KeywordsMatchTiddler', { keywords: 'UniqueKeywordValue' });

    var params = helpers.createMockParameters('UniqueKeywordValue', {});
    Promise.resolve(userTextPlugin.plugin.getSources(params)).then(function (sources) {
      var source = getTextSource(sources);
      return source.getItems({ query: 'UniqueKeywordValue', state: params.state });
    }).then(function (items) {
      var titles = items.map(function (item) { return item.title; });
      expect(titles).toContain('KeywordsMatchTiddler');
    }).then(done).catch(done.fail);
  });

  it('custom TextAlias searches configured field only', function (done) {
    setTextAlias('description');
    makeTiddler('DescriptionMatchTiddler', { description: 'UniqueDescription', text: 'DifferentText' });

    var params = helpers.createMockParameters('UniqueDescription', {});
    Promise.resolve(userTextPlugin.plugin.getSources(params)).then(function (sources) {
      var source = getTextSource(sources);
      return source.getItems({ query: 'UniqueDescription', state: params.state });
    }).then(function (items) {
      var titles = items.map(function (item) { return item.title; });
      expect(titles).toContain('DescriptionMatchTiddler');
    }).then(done).catch(done.fail);
  });

  it('empty TextAlias configuration returns empty items safely', function (done) {
    setTextAlias('');

    var params = helpers.createMockParameters('Anything', {});
    Promise.resolve(userTextPlugin.plugin.getSources(params)).then(function (sources) {
      var source = getTextSource(sources);
      if (!source) return [];
      return source.getItems({ query: 'Anything', state: params.state });
    }).then(function (items) {
      expect(items).toEqual([]);
    }).then(done).catch(done.fail);
  });
});
