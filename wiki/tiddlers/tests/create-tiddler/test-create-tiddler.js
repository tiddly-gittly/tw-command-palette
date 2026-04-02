/**
 * Integration tests for create-tiddler wizard source plugin.
 */
describe('create-tiddler wizard source plugin', function () {
  var helpers;
  var createTiddlerPlugin;

  beforeAll(function () {
    helpers = require('tests/helpers/autocomplete-mock.js');
    createTiddlerPlugin = require('$:/plugins/linonetwo/autocomplete/widget/build-in-sub-plugins/create-tiddler.js');
  });

  it('returns no sources when createTiddlerPending is false', function (done) {
    var params = helpers.createMockParameters('My New Note', { createTiddlerPending: false });
    Promise.resolve(createTiddlerPlugin.plugin.getSources(params)).then(function (sources) {
      expect((sources || []).length).toBe(0);
    }).then(done).catch(done.fail);
  });

  it('returns wizard source when createTiddlerPending is true', function (done) {
    var fakeWidget = { commandHandled: false, commandKeepOpen: false, dispatchEvent: function () {} };
    var params = helpers.createMockParameters('', { createTiddlerPending: true, widget: fakeWidget });
    Promise.resolve(createTiddlerPlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'create-tiddler');
    }).then(function (source) {
      expect(source).toBeDefined();
    }).then(done).catch(done.fail);
  });

  it('dispatches tm-new-tiddler once when title is entered and selected', function (done) {
    var dispatchCalls = [];
    var fakeWidget = {
      commandHandled: false,
      commandKeepOpen: false,
      dispatchEvent: function (evt) { dispatchCalls.push(evt); },
    };
    var params = helpers.createMockParameters('My New Note', { createTiddlerPending: true, widget: fakeWidget });
    Promise.resolve(createTiddlerPlugin.plugin.getSources(params)).then(function (sources) {
      return helpers.findSource(sources, 'create-tiddler');
    }).then(function (source) {
      if (!source) {
        pending('create-tiddler source not returned; skipping');
        return;
      }
      var items = source.getItems();
      expect(items.length).toBe(1);
      source.onSelect({ item: items[0], state: params.state });

      expect(dispatchCalls.length).toBe(1);
      expect(dispatchCalls[0].type).toBe('tm-new-tiddler');
      expect(dispatchCalls[0].title).toBe('My New Note');
      expect(fakeWidget.commandHandled).toBe(true);
      expect(fakeWidget.commandKeepOpen).toBe(false);
      // Wizard should be marked as finished.
      expect(params._spies.latestContext.createTiddlerPending).toBeUndefined();
    }).then(done).catch(done.fail);
  });
});
