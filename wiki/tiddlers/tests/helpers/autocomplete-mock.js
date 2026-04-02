/**
 * Test helpers: mock Algolia autocomplete parameters for source plugin tests.
 *
 * Usage:
 *   var helpers = require('tests/helpers/autocomplete-mock.js');
 *   var params = helpers.createMockParameters('hello', { filter: '[tag[MyTag]]' });
 */

/**
 * Create a minimal Algolia autocomplete `parameters` mock suitable for
 * testing source plugin getSources() callbacks.
 *
 * @param {string} query - Current query string.
 * @param {object} [context] - Initial context overrides.
 * @returns {object} Mock parameters object.
 */
function createMockParameters(query, context) {
  var ctx = Object.assign({}, context || {});
  var setContextCalls = [];
  var setQueryCalls = [];
  var refreshCallCount = 0;
  var navigateCalls = [];

  var params = {
    query: query,
    state: {
      query: query,
      context: ctx,
    },
    setContext: function (update) {
      setContextCalls.push(update);
      // Simulate merge behaviour of Algolia's setContext
      Object.assign(ctx, update);
      params.state.context = ctx;
    },
    setQuery: function (q) {
      setQueryCalls.push(q);
      params.query = q;
      params.state.query = q;
    },
    refresh: function () {
      refreshCallCount++;
      return Promise.resolve();
    },
    navigator: {
      navigate: function (opts) {
        navigateCalls.push(opts);
      },
    },

    // Inspection helpers (not part of real Algolia API)
    _spies: {
      get setContextCalls() { return setContextCalls; },
      get setQueryCalls() { return setQueryCalls; },
      get refreshCallCount() { return refreshCallCount; },
      get navigateCalls() { return navigateCalls; },
      get latestContext() { return ctx; },
    },
  };

  return params;
}

/**
 * Create a minimal tiddler fields object for test fixtures.
 *
 * @param {string} title
 * @param {object} [extraFields]
 * @returns {object}
 */
function makeTiddler(title, extraFields) {
  return Object.assign({ title: title, text: '', type: '', tags: [] }, extraFields || {});
}

/**
 * Resolve a getSources() result and return the first matching source by id.
 *
 * @param {Promise<Array>} sourcesPromise
 * @param {string} sourceId
 * @returns {Promise<object|undefined>}
 */
function findSource(sourcesPromise, sourceId) {
  return Promise.resolve(sourcesPromise).then(function (sources) {
    if (!sources) return undefined;
    for (var i = 0; i < sources.length; i++) {
      if (sources[i].sourceId === sourceId) return sources[i];
    }
    return undefined;
  });
}

exports.createMockParameters = createMockParameters;
exports.makeTiddler = makeTiddler;
exports.findSource = findSource;
