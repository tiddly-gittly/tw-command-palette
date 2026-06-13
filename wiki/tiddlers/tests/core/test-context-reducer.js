/**
 * Unit tests for contextReducer (pure function — no TW API needed).
 *
 * The reducer is exported from the compiled plugin module at:
 *   $:/plugins/linonetwo/autocomplete/widget/utils/context.js
 *
 * Covers:
 *  - Each action type produces the correct partial context update.
 *  - Stable deps (widget, addHistoryItem, selectedText) are never touched.
 *  - CLEAR_TRANSIENT keeps filter/applyExclusion (under-filter continuity).
 *  - CLEAR_SESSION wipes all session fields.
 */
describe('contextReducer', function () {
  var contextModule;
  var contextReducer;
  var contextActions;

  beforeAll(function () {
    contextModule = require('$:/plugins/linonetwo/autocomplete/widget/utils/context.js');
    contextReducer = contextModule.contextReducer;
    contextActions = contextModule.contextActions;
  });

  // ── SELECT_FILTER ──────────────────────────────────────────────────────────

  describe('SELECT_FILTER', function () {
    it('sets phase to under-filter and enables noNavigate + noClose', function () {
      var result = contextReducer(contextActions.selectFilter('[tag[MyTag]]'));
      expect(result.phase).toBe('under-filter');
      expect(result.noNavigate).toBe(true);
      expect(result.noClose).toBe(true);
    });

    it('sets filter and newQuery to empty string', function () {
      var result = contextReducer(contextActions.selectFilter('[tag[MyTag]]'));
      expect(result.filter).toBe('[tag[MyTag]]');
      expect(result.newQuery).toBe('');
    });

    it('forwards filterGetTiddler when provided', function () {
      var result = contextReducer(contextActions.selectFilter('[tag[X]]', false));
      expect(result.filterGetTiddler).toBe(false);
    });

    it('leaves filterGetTiddler undefined when not provided', function () {
      var result = contextReducer(contextActions.selectFilter('[tag[X]]'));
      expect(result.filterGetTiddler).toBeUndefined();
    });

    it('does not touch stable deps', function () {
      var result = contextReducer(contextActions.selectFilter('[tag[X]]'));
      expect(result.widget).toBeUndefined();
      expect(result.addHistoryItem).toBeUndefined();
      expect(result.selectedText).toBeUndefined();
    });
  });

  // ── SELECT_TAG ─────────────────────────────────────────────────────────────

  describe('SELECT_TAG', function () {
    it('sets phase to under-filter and enables noNavigate + noClose', function () {
      var result = contextReducer(contextActions.selectTag('[[MyTag]] [tag[MyTag]]'));
      expect(result.phase).toBe('under-filter');
      expect(result.noNavigate).toBe(true);
      expect(result.noClose).toBe(true);
    });

    it('sets filter and newQuery to empty string', function () {
      var result = contextReducer(contextActions.selectTag('[[MyTag]] [tag[MyTag]]'));
      expect(result.filter).toBe('[[MyTag]] [tag[MyTag]]');
      expect(result.newQuery).toBe('');
    });

    it('forwards applyExclusion when provided', function () {
      var result = contextReducer(contextActions.selectTag('[[X]] [tag[X]]', true));
      expect(result.applyExclusion).toBe(true);
    });

    it('does not touch stable deps', function () {
      var result = contextReducer(contextActions.selectTag('[[X]] [tag[X]]'));
      expect(result.widget).toBeUndefined();
      expect(result.addHistoryItem).toBeUndefined();
      expect(result.selectedText).toBeUndefined();
    });
  });

  // ── SELECT_RECENT ──────────────────────────────────────────────────────────

  describe('SELECT_RECENT', function () {
    it('sets newQuery and enables noNavigate + noClose', function () {
      var result = contextReducer(contextActions.selectRecent('hello world'));
      expect(result.newQuery).toBe('hello world');
      expect(result.noNavigate).toBe(true);
      expect(result.noClose).toBe(true);
    });

    it('does not set phase or filter', function () {
      var result = contextReducer(contextActions.selectRecent('q'));
      expect(result.phase).toBeUndefined();
      expect(result.filter).toBeUndefined();
    });
  });

  // ── EXECUTE_COMMAND ────────────────────────────────────────────────────────

  describe('EXECUTE_COMMAND', function () {
    it('sets noNavigate to true and noClose to false', function () {
      var result = contextReducer(contextActions.executeCommand());
      expect(result.noNavigate).toBe(true);
      expect(result.noClose).toBe(false);
    });

    it('does not touch filter or phase', function () {
      var result = contextReducer(contextActions.executeCommand());
      expect(result.filter).toBeUndefined();
      expect(result.phase).toBeUndefined();
    });
  });

  // ── CLEAR_TRANSIENT ────────────────────────────────────────────────────────

  describe('CLEAR_TRANSIENT', function () {
    it('undefines noNavigate, noClose, newQuery', function () {
      var result = contextReducer(contextActions.clearTransient());
      expect(result.noNavigate).toBeUndefined();
      expect(result.noClose).toBeUndefined();
      expect(result.newQuery).toBeUndefined();
    });

    it('does NOT touch filter or applyExclusion (under-filter continuity)', function () {
      // filter and applyExclusion must survive so that onEnter can trigger
      // step-2 under-filter search without losing the selected filter.
      var result = contextReducer(contextActions.clearTransient());
      expect(Object.prototype.hasOwnProperty.call(result, 'filter')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(result, 'applyExclusion')).toBe(false);
    });

    it('does not touch stable deps', function () {
      var result = contextReducer(contextActions.clearTransient());
      expect(result.widget).toBeUndefined();
      expect(result.addHistoryItem).toBeUndefined();
      expect(result.selectedText).toBeUndefined();
    });
  });

  // ── CLEAR_SESSION ──────────────────────────────────────────────────────────

  describe('CLEAR_SESSION', function () {
    it('undefines all session fields including filter', function () {
      var result = contextReducer(contextActions.clearSession());
      expect(result.noNavigate).toBeUndefined();
      expect(result.noClose).toBeUndefined();
      expect(result.newQuery).toBeUndefined();
      expect(result.filter).toBeUndefined();
      expect(result.filterGetTiddler).toBeUndefined();
      expect(result.filterToOpen).toBeUndefined();
      expect(result.applyExclusion).toBeUndefined();
      expect(result.phase).toBeUndefined();
    });

    it('does not touch stable deps', function () {
      var result = contextReducer(contextActions.clearSession());
      expect(result.widget).toBeUndefined();
      expect(result.addHistoryItem).toBeUndefined();
      expect(result.selectedText).toBeUndefined();
    });
  });

  // ── clearTransient direct usage (replaces deprecated emptyContext) ─────────

  describe('clearTransient result', function () {
    it('is equivalent to the legacy emptyContext contract', function () {
      var clearTransientResult = contextReducer(contextActions.clearTransient());
      expect(clearTransientResult).toEqual({ noNavigate: undefined, newQuery: undefined, noClose: undefined });
    });

    it('does not include filter key (preserves under-filter continuity)', function () {
      var clearTransientResult = contextReducer(contextActions.clearTransient());
      expect(Object.prototype.hasOwnProperty.call(clearTransientResult, 'filter')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(clearTransientResult, 'applyExclusion')).toBe(false);
    });
  });
});
