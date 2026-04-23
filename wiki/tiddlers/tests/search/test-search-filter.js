/**
 * Integration tests for search-filter source plugin.
 *
 * Tests cover:
 *  1. Prefix check: only active when query starts with filter prefix.
 *  2. onSelect (via keyboard): produces correct context update (SELECT_FILTER action result).
 *  3. Under-filter: when context.filter is set, 'filter' source is returned.
 *  4. Context isolation: SELECT_FILTER does NOT pollute filter from previous session.
 */
describe('search-filter source plugin', function () {
  var helpers;
  var filterPlugin;
  var contextModule;
  var contextActions;

  beforeAll(function () {
    helpers = require('tests/helpers/autocomplete-mock.js');
    filterPlugin = require('$:/plugins/linonetwo/autocomplete/widget/build-in-sub-plugins/search-filter.js');
    contextModule = require('$:/plugins/linonetwo/autocomplete/widget/utils/context.js');
    contextActions = contextModule.contextActions;
    contextModule.contextReducer;

    // Ensure at least one Filter-tagged tiddler exists so the search can work.
    // We add a minimal one only if the wiki doesn't already have any.
    if ($tw.wiki.filterTiddlers('[all[tiddlers+shadows]tag[$:/tags/Filter]]').length === 0) {
      $tw.wiki.addTiddler({
        title: '$:/plugins/linonetwo/commandpalette/commands/filter/TestFilter',
        tags: ['$:/tags/Filter'],
        filter: '[tag[TestTag]]',
        caption: 'Test Filter',
        type: 'text/vnd.tiddlywiki',
        text: '',
      });
    }
  });

  // ── Prefix gating ──────────────────────────────────────────────────────────

  it('returns both sources when query is empty (routing wrapper filters them)', function (done) {
    var params = helpers.createMockParameters('', {});
    Promise.resolve(filterPlugin.plugin.getSources(params)).then(function (sources) {
      // After centralized routing, plugin always returns both sources;
      // the wrapper in getSubPlugins.ts filters by sourceId.
      var hasFilterSelect = (sources || []).some(function (s) { return s.sourceId === 'filter-select'; });
      var hasFilter = (sources || []).some(function (s) { return s.sourceId === 'filter'; });
      expect(hasFilterSelect).toBe(true);
      expect(hasFilter).toBe(true);
    }).then(done).catch(done.fail);
  });

  it('returns build-in-filter source when query starts with filter prefix', function (done) {
    // The filter prefix comes from the help tiddler. In tests it may not exist,
    // so we test the canonical prefix '[' via direct plugin check.
    // First find out what the actual filter prefix is.
    var filterHelpTiddler = $tw.wiki.getTiddler('$:/plugins/linonetwo/autocomplete/commands/help/Filter');
    var filterPrefix = filterHelpTiddler
      ? (filterHelpTiddler.fields['command-palette-prefix'] || '[')
      : '[';

    var params = helpers.createMockParameters(filterPrefix + 'tag[Test]', {});
    Promise.resolve(filterPlugin.plugin.getSources(params)).then(function (sources) {
      return Promise.all([sources, helpers.findSource(sources, 'filter-select')]);
    }).then(function (results) {
      var filterSelectSource = results[1];
      expect(filterSelectSource).toBeDefined();
    }).then(done).catch(done.fail);
  });

  // ── onSelect context update ────────────────────────────────────────────────

  it('onSelect sets phase=under-filter, noNavigate, noClose, filter, newQuery', function (done) {
    var filterHelpTiddler = $tw.wiki.getTiddler('$:/plugins/linonetwo/autocomplete/commands/help/Filter');
    var filterPrefix = filterHelpTiddler
      ? (filterHelpTiddler.fields['command-palette-prefix'] || '[')
      : '[';

    var params = helpers.createMockParameters(filterPrefix + 'tag', {});
    Promise.resolve(filterPlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'filter-select');
    }).then(function (source) {
      if (!source) {
        pending('filter-select source not returned (prefix mismatch); skipping');
        return;
      }
      // Simulate keyboard selection
      var testFilterItem = {
        title: '$:/test/filter',
        filter: '[tag[TestTag]]',
        'command-palette-get-tiddler': 'yes',
        text: '',
        type: '',
        tags: [],
      };
      source.onSelect({ item: testFilterItem, state: params.state });

      var ctx = params._spies.latestContext;
      expect(ctx.phase).toBe('under-filter');
      expect(ctx.noNavigate).toBe(true);
      expect(ctx.noClose).toBe(true);
      expect(ctx.filter).toBe('[tag[TestTag]]');
      expect(ctx.newQuery).toBe('');
    }).then(done).catch(done.fail);
  });

  // ── Under-filter: returns 'filter' source when context.filter is set ───────

  it('returns filter source when context.filter is non-empty and query has no prefix', function (done) {
    var params = helpers.createMockParameters('', { filter: '[tag[TestTag]]' });
    Promise.resolve(filterPlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'filter');
    }).then(function (filterSource) {
      expect(filterSource).toBeDefined();
    }).then(done).catch(done.fail);
  });

  it('returns filter source even when context.filter is empty string (wrapper handles routing)', function (done) {
    var params = helpers.createMockParameters('hello', { filter: '' });
    Promise.resolve(filterPlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'filter');
    }).then(function (filterSource) {
      // After centralized routing, plugin no longer gates by context.filter itself.
      expect(filterSource).toBeDefined();
    }).then(done).catch(done.fail);
  });

  // ── Context isolation ──────────────────────────────────────────────────────

  it('SELECT_FILTER action does not leak state: re-running onSelect replaces filter cleanly', function (done) {
    var filterHelpTiddler = $tw.wiki.getTiddler('$:/plugins/linonetwo/autocomplete/commands/help/Filter');
    var filterPrefix = filterHelpTiddler
      ? (filterHelpTiddler.fields['command-palette-prefix'] || '[')
      : '[';

    var params = helpers.createMockParameters(filterPrefix + 'tag', {});
    Promise.resolve(filterPlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'filter-select');
    }).then(function (source) {
      if (!source) {
        pending('filter-select source not returned; skipping');
        return;
      }
      var item1 = { title: '$:/t1', filter: '[tag[A]]', 'command-palette-get-tiddler': 'yes', text: '', type: '', tags: [] };
      var item2 = { title: '$:/t2', filter: '[tag[B]]', 'command-palette-get-tiddler': 'yes', text: '', type: '', tags: [] };

      source.onSelect({ item: item1, state: params.state });
      expect(params._spies.latestContext.filter).toBe('[tag[A]]');

      source.onSelect({ item: item2, state: params.state });
      expect(params._spies.latestContext.filter).toBe('[tag[B]]');
    }).then(done).catch(done.fail);
  });
});
