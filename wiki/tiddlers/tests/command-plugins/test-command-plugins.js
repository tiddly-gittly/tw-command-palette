/**
 * Integration tests for command-action-string and command-message source plugins.
 *
 * Tests cover EXECUTE_COMMAND semantics:
 *  - noNavigate=true so the panel doesn't navigate to command tiddler.
 *  - noClose=false so the panel closes after execution.
 *  - Both plugins skip when query is empty.
 *  - Both plugins skip when context.filter is set (under-filter mode).
 */
describe('command-action-string source plugin', function () {
  var helpers;
  var actionStringPlugin;
  var actionVariablePromptPlugin;
  var contextModule;
  var contextActions;
  var contextReducer;

  beforeAll(function () {
    helpers = require('tests/helpers/autocomplete-mock.js');
    actionStringPlugin = require('$:/plugins/linonetwo/autocomplete/widget/build-in-sub-plugins/command-action-string.js');
    actionVariablePromptPlugin = require('$:/plugins/linonetwo/autocomplete/widget/build-in-sub-plugins/action-variable-prompt.js');
    contextModule = require('$:/plugins/linonetwo/autocomplete/widget/utils/context.js');
    contextActions = contextModule.contextActions;
    contextReducer = contextModule.contextReducer;
  });

  function getSystemPrefixes() {
    var helpTiddler = $tw.wiki.getTiddler('$:/plugins/linonetwo/autocomplete/commands/help/System');
    var raw = helpTiddler ? (helpTiddler.fields['command-palette-prefix'] || '>') : '>';
    return raw.split(' ').filter(Boolean);
  }

  // ── EXECUTE_COMMAND semantics (pure reducer) ───────────────────────────────

  it('EXECUTE_COMMAND sets noNavigate=true and noClose=false', function () {
    var result = contextReducer(contextActions.executeCommand());
    expect(result.noNavigate).toBe(true);
    expect(result.noClose).toBe(false);
  });

  it('EXECUTE_COMMAND does not touch filter or phase', function () {
    var result = contextReducer(contextActions.executeCommand());
    expect(result.filter).toBeUndefined();
    expect(result.phase).toBeUndefined();
  });

  // ── Empty query → no sources ───────────────────────────────────────────────

  it('returns empty array when query is empty', function (done) {
    var params = helpers.createMockParameters('', {});
    Promise.resolve(actionStringPlugin.plugin.getSources(params)).then(function (sources) {
      expect(sources).toEqual([]);
    }).then(done).catch(done.fail);
  });

  // ── Under-filter mode → no sources ────────────────────────────────────────

  it('returns empty array when context.filter is set (under-filter mode)', function (done) {
    var prefix = getSystemPrefixes()[0] || '>';
    var params = helpers.createMockParameters(prefix + 'test', { filter: '[tag[X]]' });
    Promise.resolve(actionStringPlugin.plugin.getSources(params)).then(function (sources) {
      var hasActionSource = (sources || []).some(function (s) { return s.sourceId === 'actionString'; });
      expect(hasActionSource).toBe(false);
    }).then(done).catch(done.fail);
  });

  // ── onSelect sets noNavigate=true, noClose=false ───────────────────────────

  it('onSelect produces noNavigate=true and noClose=false in context', function (done) {
    var prefix = getSystemPrefixes()[0] || '>';
    // Use a fake widget that has invokeActionString
    var fakeWidget = {
      invokeActionString: function () {},
      makeFakeWidgetWithVariables: function () { return null; },
    };
    var params = helpers.createMockParameters(prefix + 'test', { widget: fakeWidget });
    Promise.resolve(actionStringPlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'actionString');
    }).then(function (source) {
      if (!source) {
        pending('actionString source not returned (no system tiddlers with $:/tags/Actions); skipping');
        return;
      }
      var item = helpers.makeTiddler('$:/plugins/test/action', { text: '<$action-setfield/>', tags: ['$:/tags/Actions'] });
      source.onSelect({ item: item, state: params.state });

      var ctx = params._spies.latestContext;
      expect(ctx.noNavigate).toBe(true);
      expect(ctx.noClose).toBe(false);
    }).then(done).catch(done.fail);
  });

  it('onSelect enters variable wizard when action-variables is declared', function (done) {
    var prefix = getSystemPrefixes()[0] || '>';
    var invokeCalls = [];
    var fakeWidget = {
      commandHandled: false,
      commandKeepOpen: false,
      invokeActionString: function () { invokeCalls.push(Array.prototype.slice.call(arguments)); },
      makeFakeWidgetWithVariables: function () { return null; },
    };
    var params = helpers.createMockParameters(prefix + 'new', { widget: fakeWidget, selectedText: 'abc' });
    Promise.resolve(actionStringPlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'actionString');
    }).then(function (source) {
      if (!source) {
        pending('actionString source not returned; skipping');
        return;
      }
      var item = helpers.makeTiddler('$:/plugins/test/action-with-vars', {
        text: '<$action-sendmessage $message="tm-new-tiddler" title=<<newTitle>>/>',
        tags: ['$:/tags/Actions'],
        'action-variables': 'newTitle',
        'newTitle/type': 'text',
        'newTitle/caption': 'Title',
      });
      source.onSelect({ item: item, state: params.state });

      expect(invokeCalls.length).toBe(0);
      expect(params._spies.latestContext.actionVariablePrompt.commandTitle).toBe('$:/plugins/test/action-with-vars');
      expect(params._spies.latestContext.actionVariablePrompt.definitions.length).toBe(1);
      expect(params._spies.latestContext.actionVariablePrompt.definitions[0].name).toBe('newTitle');
      expect(fakeWidget.commandHandled).toBe(true);
      expect(fakeWidget.commandKeepOpen).toBe(true);
    }).then(done).catch(done.fail);
  });

  it('variable wizard (text) invokes action string with collected value', function (done) {
    var invokeCalls = [];
    var fakeWidget = {
      commandHandled: false,
      commandKeepOpen: false,
      invokeActionString: function () { invokeCalls.push(Array.prototype.slice.call(arguments)); },
    };
    var prompt = {
      commandTitle: '$:/plugins/test/action-with-vars',
      actionText: '<$action-sendmessage $message="tm-new-tiddler" title=<<newTitle>>/>',
      definitions: [{ name: 'newTitle', type: 'text', caption: 'Title' }],
      currentIndex: 0,
      values: {},
      baseVariables: { currentTiddler: 'HelloThere' },
    };
    var params = helpers.createMockParameters('My New Note', { widget: fakeWidget, actionVariablePrompt: prompt });
    Promise.resolve(actionVariablePromptPlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'action-variable-prompt');
    }).then(function (source) {
      if (!source) {
        pending('action-variable-prompt source not returned; skipping');
        return;
      }
      var items = source.getItems({ query: 'My New Note', state: params.state });
      source.onSelect({ item: items[0], state: params.state });

      expect(invokeCalls.length).toBe(1);
      expect(invokeCalls[0][0]).toContain('tm-new-tiddler');
      expect(invokeCalls[0][3].newTitle).toBe('My New Note');
      expect(invokeCalls[0][3].currentTiddler).toBe('HelloThere');
      expect(fakeWidget.commandHandled).toBe(true);
      expect(fakeWidget.commandKeepOpen).toBe(false);
      expect(params._spies.latestContext.actionVariablePrompt).toBeUndefined();
    }).then(done).catch(done.fail);
  });

  it('variable wizard (checkbox) writes yes/no and can use compact field keys', function (done) {
    var prefix = getSystemPrefixes()[0] || '>';
    var fakeWidget = {
      commandHandled: false,
      commandKeepOpen: false,
      invokeActionString: function () {},
      makeFakeWidgetWithVariables: function () { return null; },
    };
    var params = helpers.createMockParameters(prefix + 'toggle', { widget: fakeWidget });
    Promise.resolve(actionStringPlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'actionString');
    }).then(function (source) {
      if (!source) {
        pending('actionString source not returned; skipping');
        return;
      }
      var item = helpers.makeTiddler('$:/plugins/test/action-checkbox', {
        text: '<$action-setfield field="hidden" value=<<isHidden>>/>',
        tags: ['$:/tags/Actions'],
        'action-variables': '[[is hidden]]',
        'ishidden/type': 'checkbox',
      });
      source.onSelect({ item: item, state: params.state });
      expect(params._spies.latestContext.actionVariablePrompt.definitions[0].type).toBe('checkbox');
      expect(params._spies.latestContext.actionVariablePrompt.definitions[0].name).toBe('is hidden');
    }).then(done).catch(done.fail);
  });
});

describe('command-message source plugin', function () {
  var helpers;
  var messagePlugin;
  var contextModule;
  var contextActions;
  var contextReducer;

  beforeAll(function () {
    helpers = require('tests/helpers/autocomplete-mock.js');
    messagePlugin = require('$:/plugins/linonetwo/autocomplete/widget/build-in-sub-plugins/command-message.js');
    contextModule = require('$:/plugins/linonetwo/autocomplete/widget/utils/context.js');
    contextActions = contextModule.contextActions;
    contextReducer = contextModule.contextReducer;
  });

  function getSystemPrefixes() {
    var helpTiddler = $tw.wiki.getTiddler('$:/plugins/linonetwo/autocomplete/commands/help/System');
    var raw = helpTiddler ? (helpTiddler.fields['command-palette-prefix'] || '>') : '>';
    return raw.split(' ').filter(Boolean);
  }

  it('returns empty array when query is empty', function (done) {
    var params = helpers.createMockParameters('', {});
    Promise.resolve(messagePlugin.plugin.getSources(params)).then(function (sources) {
      expect(sources).toEqual([]);
    }).then(done).catch(done.fail);
  });

  it('returns empty array when context.filter is set', function (done) {
    var prefix = getSystemPrefixes()[0] || '>';
    var params = helpers.createMockParameters(prefix + 'test', { filter: '[tag[X]]' });
    Promise.resolve(messagePlugin.plugin.getSources(params)).then(function (sources) {
      var hasMessageSource = (sources || []).some(function (s) { return s.sourceId === 'message'; });
      expect(hasMessageSource).toBe(false);
    }).then(done).catch(done.fail);
  });

  it('onSelect produces noNavigate=true and noClose=false in context', function (done) {
    var prefix = getSystemPrefixes()[0] || '>';
    var fakeWidget = {
      dispatchEvent: function () {},
    };
    var params = helpers.createMockParameters(prefix + 'test', { widget: fakeWidget });
    Promise.resolve(messagePlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'message');
    }).then(function (source) {
      if (!source) {
        pending('message source not returned (no $:/tags/Messages tiddlers); skipping');
        return;
      }
      var item = helpers.makeTiddler('$:/plugins/test/message', { text: 'tm-close-tiddler', tags: ['$:/tags/Messages'] });
      source.onSelect({ item: item, state: params.state });

      var ctx = params._spies.latestContext;
      expect(ctx.noNavigate).toBe(true);
      expect(ctx.noClose).toBe(false);
    }).then(done).catch(done.fail);
  });

  // ── Regression: item.text undefined must NOT throw ─────────────────────────

  it('onSelect does not throw when item.text is undefined (regression: trim of undefined)', function (done) {
    var prefix = getSystemPrefixes()[0] || '>';
    var dispatchCalls = [];
    var fakeWidget = {
      dispatchEvent: function (evt) { dispatchCalls.push(evt); },
    };
    var params = helpers.createMockParameters(prefix + 'create', { widget: fakeWidget });
    Promise.resolve(messagePlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'message');
    }).then(function (source) {
      if (!source) {
        pending('message source not returned; skipping');
        return;
      }
      // Simulate a tiddler where text field is missing (undefined)
      var itemNoText = helpers.makeTiddler('$:/plugins/test/message-no-text', { tags: ['$:/tags/Messages'] });
      delete itemNoText.text;  // ensure text is undefined

      // Must not throw
      expect(function () {
        source.onSelect({ item: itemNoText, state: params.state });
      }).not.toThrow();

      // dispatchEvent should NOT have been called because messageType is empty
      expect(dispatchCalls.length).toBe(0);
    }).then(done).catch(done.fail);
  });

  it('onSelect does not dispatch when item.text is empty string', function (done) {
    var prefix = getSystemPrefixes()[0] || '>';
    var dispatchCalls = [];
    var fakeWidget = {
      dispatchEvent: function (evt) { dispatchCalls.push(evt); },
    };
    var params = helpers.createMockParameters(prefix + 'create', { widget: fakeWidget });
    Promise.resolve(messagePlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'message');
    }).then(function (source) {
      if (!source) {
        pending('message source not returned; skipping');
        return;
      }
      var itemEmptyText = helpers.makeTiddler('$:/plugins/test/message-empty', { text: '   ', tags: ['$:/tags/Messages'] });
      source.onSelect({ item: itemEmptyText, state: params.state });
      expect(dispatchCalls.length).toBe(0);
    }).then(done).catch(done.fail);
  });

  // ── New Tiddler enters two-step wizard ────────────────────────────────────

  it('New Tiddler command enters wizard instead of dispatching tm-new-tiddler immediately', function (done) {
    var prefix = getSystemPrefixes()[0] || '>';
    var dispatchCalls = [];
    var fakeWidget = {
      commandHandled: false,
      commandKeepOpen: false,
      dispatchEvent: function (evt) { dispatchCalls.push(evt); },
    };
    var params = helpers.createMockParameters(prefix + 'new', { widget: fakeWidget });
    Promise.resolve(messagePlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'message');
    }).then(function (source) {
      if (!source) {
        pending('message source not returned; skipping');
        return;
      }
      var item = helpers.makeTiddler('$:/plugins/linonetwo/commandpalette/New Tiddler', { text: 'tm-new-tiddler', tags: ['$:/tags/Messages'] });
      source.onSelect({ item: item, state: params.state });

      // Should NOT dispatch tm-new-tiddler in phase 1.
      expect(dispatchCalls.length).toBe(0);
      // Should enter pending wizard state and keep panel open.
      expect(params._spies.latestContext.createTiddlerPending).toBe(true);
      expect(params._spies.latestContext.noNavigate).toBe(true);
      expect(params._spies.latestContext.noClose).toBe(true);
      expect(fakeWidget.commandHandled).toBe(true);
      expect(fakeWidget.commandKeepOpen).toBe(true);
    }).then(done).catch(done.fail);
  });
});
