/**
 * Integration tests for search-tags source plugin.
 *
 * Tests cover:
 *  1. Prefix check: only active when query starts with tags prefix.
 *  2. getItems sets filterToOpen in context on each call.
 *  3. onSelect produces context matching SELECT_TAG action result.
 *  4. CLEAR_TRANSIENT keeps tag filter alive for under-filter phase.
 */
describe('search-tags source plugin', function () {
  var helpers;
  var tagsPlugin;
  var contextModule;
  var contextActions;
  var contextReducer;

  beforeAll(function () {
    helpers = require('tests/helpers/autocomplete-mock.js');
    tagsPlugin = require('$:/plugins/linonetwo/autocomplete/widget/build-in-sub-plugins/search-tags.js');
    contextModule = require('$:/plugins/linonetwo/autocomplete/widget/utils/context.js');
    contextActions = contextModule.contextActions;
    contextReducer = contextModule.contextReducer;
  });

  function getTagsPrefix() {
    var helpTiddler = $tw.wiki.getTiddler('$:/plugins/linonetwo/autocomplete/commands/help/Tags');
    return helpTiddler ? (helpTiddler.fields['command-palette-prefix'] || '#') : '#';
  }

  // ── Prefix gating ──────────────────────────────────────────────────────────

  it('returns source even without tags prefix (routing is centralized)', function (done) {
    var params = helpers.createMockParameters('hello', {});
    Promise.resolve(tagsPlugin.plugin.getSources(params)).then(function (sources) {
      // After centralized routing, plugin no longer gates by prefix itself.
      // The wrapper in getSubPlugins.ts filters sources by sourceId.
      expect(sources.length).toBeGreaterThan(0);
    }).then(done).catch(done.fail);
  });

  it('returns empty array for empty query', function (done) {
    var params = helpers.createMockParameters('', {});
    Promise.resolve(tagsPlugin.plugin.getSources(params)).then(function (sources) {
      expect(sources).toEqual([]);
    }).then(done).catch(done.fail);
  });

  it('returns a tags source when query starts with tags prefix', function (done) {
    var prefix = getTagsPrefix();
    var params = helpers.createMockParameters(prefix + 'Test', {});
    Promise.resolve(tagsPlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'tags');
    }).then(function (tagsSource) {
      expect(tagsSource).toBeDefined();
    }).then(done).catch(done.fail);
  });

  // ── getItems sets filterToOpen ─────────────────────────────────────────────

  it('getItems calls setContext with filterToOpen', function (done) {
    var prefix = getTagsPrefix();
    var params = helpers.createMockParameters(prefix + 'Hello', {});
    Promise.resolve(tagsPlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'tags');
    }).then(function (tagsSource) {
      if (!tagsSource) {
        pending('tags source not returned; skipping');
        return;
      }
      return Promise.resolve(tagsSource.getItems({ query: prefix + 'Hello', state: params.state })).then(function () {
        var ctx = params._spies.latestContext;
        expect(ctx.filterToOpen).toBeDefined();
        expect(typeof ctx.filterToOpen).toBe('string');
        expect(ctx.filterToOpen.length).toBeGreaterThan(0);
      });
    }).then(done).catch(done.fail);
  });

  // ── onSelect context update ────────────────────────────────────────────────

  it('onSelect sets phase=under-filter, noNavigate, noClose, filter, newQuery', function (done) {
    var prefix = getTagsPrefix();
    var params = helpers.createMockParameters(prefix + 'Test', {});
    Promise.resolve(tagsPlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'tags');
    }).then(function (tagsSource) {
      if (!tagsSource) {
        pending('tags source not returned; skipping');
        return;
      }
      var tagItem = helpers.makeTiddler('TestTag');
      tagsSource.onSelect({ item: tagItem, state: params.state });

      var ctx = params._spies.latestContext;
      expect(ctx.phase).toBe('under-filter');
      expect(ctx.noNavigate).toBe(true);
      expect(ctx.noClose).toBe(true);
      expect(ctx.filter).toContain('TestTag');
      expect(ctx.newQuery).toBe('');
    }).then(done).catch(done.fail);
  });

  // ── CLEAR_TRANSIENT keeps filter alive ─────────────────────────────────────

  it('CLEAR_TRANSIENT result does not include filter key (filter survives)', function () {
    var clearResult = contextReducer(contextActions.clearTransient());
    // filter must NOT be in the clearTransient partial update,
    // so that a subsequent setContext(clearResult) does not wipe the filter.
    expect(Object.prototype.hasOwnProperty.call(clearResult, 'filter')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(clearResult, 'applyExclusion')).toBe(false);
  });
});
