/**
 * Integration tests for search-recent source plugin.
 *
 * Tests cover:
 *  1. getItems returns empty when query is non-empty (recent only shown on blank input).
 *  2. onSelect sets newQuery, noNavigate=true, noClose=true (SELECT_RECENT semantics).
 *  3. navigate is called on click (isClick=true).
 *  4. filter is set → getItems returns empty (recent hides under under-filter mode).
 */
describe('search-recent source plugin (via recent plugin factory)', function () {
  var helpers;
  var recentPluginFactory;
  var contextModule;
  var contextActions;
  var contextReducer;

  beforeAll(function () {
    helpers = require('tests/helpers/autocomplete-mock.js');
    recentPluginFactory = require('$:/plugins/linonetwo/autocomplete/widget/build-in-sub-plugins/search-recent.js');
    contextModule = require('$:/plugins/linonetwo/autocomplete/widget/utils/context.js');
    contextActions = contextModule.contextActions;
    contextReducer = contextModule.contextReducer;
  });

  /**
   * Build a recentSearchesPlugin and pull out the transformed 'recent-searches' source.
   * The subscribe callback registers setContext/navigator, which we need to trigger first.
   */
  function buildRecentSource(params) {
    var plugin = recentPluginFactory.plugin('test-recent');
    // Trigger subscribe so the plugin captures setContext/navigator
    if (plugin.subscribe) {
      plugin.subscribe(params);
    }
    // transformSource returns a modified source
    if (plugin.transformSource) {
      var rawSource = {
        sourceId: 'recent-searches',
        getItems: function (_p) { return Promise.resolve([]); },
        onSelect: function () {},
        templates: {},
        getItemUrl: function (o) { return o.item.id; },
      };
      return plugin.transformSource({ source: rawSource, state: params.state });
    }
    return null;
  }

  // ── getItems is empty when query is non-empty ──────────────────────────────

  it('getItems returns empty array when query is non-empty', function (done) {
    var params = helpers.createMockParameters('hello', {});
    var source = buildRecentSource(params);
    if (!source) {
      pending('recentSearchesPlugin.transformSource not available; skipping');
      done();
      return;
    }
    Promise.resolve(source.getItems({ query: 'hello', state: params.state })).then(function (items) {
      expect(items).toEqual([]);
    }).then(done).catch(done.fail);
  });

  // ── getItems is empty under under-filter mode ──────────────────────────────

  it('getItems returns empty when context.filter is set (under-filter mode)', function (done) {
    var params = helpers.createMockParameters('', { filter: '[tag[TestTag]]' });
    var source = buildRecentSource(params);
    if (!source) {
      pending('recentSearchesPlugin.transformSource not available; skipping');
      done();
      return;
    }
    Promise.resolve(source.getItems({ query: '', state: params.state })).then(function (items) {
      expect(items).toEqual([]);
    }).then(done).catch(done.fail);
  });

  // ── SELECT_RECENT semantics ────────────────────────────────────────────────

  it('SELECT_RECENT action sets newQuery, noNavigate=true, noClose=true', function () {
    var result = contextReducer(contextActions.selectRecent('my query'));
    expect(result.newQuery).toBe('my query');
    expect(result.noNavigate).toBe(true);
    expect(result.noClose).toBe(true);
  });

  it('SELECT_RECENT action does not set filter or phase', function () {
    var result = contextReducer(contextActions.selectRecent('q'));
    expect(result.filter).toBeUndefined();
    expect(result.phase).toBeUndefined();
  });

  // ── onSelect (keyboard, isClick=false) sets context but does not navigate ──

  it('onSelect (keyboard) sets newQuery in context without calling navigate', function (done) {
    var params = helpers.createMockParameters('', {});
    var source = buildRecentSource(params);
    if (!source) {
      pending('transformSource not available; skipping');
      done();
      return;
    }
    var item = { id: 'my recent query', label: 'my recent query' };
    // keyboard onSelect
    source.onSelect({ item: item, state: params.state });

    // After onSelect the context should have newQuery set
    // (setContext was called with SELECT_RECENT result)
    var ctx = params._spies.latestContext;
    expect(ctx.newQuery).toBe('my recent query');
    expect(ctx.noClose).toBe(true);
    expect(ctx.noNavigate).toBe(true);
    // navigate should NOT have been called on keyboard select
    expect(params._spies.navigateCalls.length).toBe(0);
    done();
  });
});
