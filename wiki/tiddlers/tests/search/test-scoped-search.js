describe('scoped WikiText search', function() {
  var search;
  var widget;
  var titles = ['Scope unit title', 'Scope unit alias', 'Scope unit body', 'Scope outside'];

  beforeAll(function() {
    search = require('$:/plugins/linonetwo/autocomplete/widget/utils/scopedSources.js').searchScopedEntries;
  });

  beforeEach(function() {
    widget = $tw.wiki.makeWidget(null);
    widget.attributes = { candidateFilter: '[tag[Scope unit]]', limit: '2' };
    $tw.wiki.addTiddler({ title: titles[0], tags: ['Scope unit'], text: 'ordinary' });
    $tw.wiki.addTiddler({ title: titles[1], tags: ['Scope unit'], alias: 'special ] query' });
    $tw.wiki.addTiddler({ title: titles[2], tags: ['Scope unit'], text: 'special ] query' });
    $tw.wiki.addTiddler({ title: titles[3], text: 'special ] query' });
  });

  afterEach(function() {
    titles.forEach(function(title) { $tw.wiki.deleteTiddler(title); });
  });

  it('searches literal queries across configured candidates and respects the limit', function() {
    expect(search(widget, 'special ] query').map(function(item) { return item.title; })).toEqual([titles[1], titles[2]]);
    widget.attributes.limit = '1';
    expect(search(widget, 'Scope unit').length).toBe(1);
  });

  it('keeps an empty input focused on actions rather than scanning entries', function() {
    expect(search(widget, '')).toEqual([]);
    expect(search(widget, '  ')).toEqual([]);
  });

  it('evaluates candidate filters in the embedding widget context', function() {
    widget.attributes.candidateFilter = '[tag<scopeTag>]';
    widget.parentWidget = $tw.wiki.makeWidget(null);
    widget.parentWidget.setVariable('scopeTag', 'Scope unit');
    expect(search(widget, 'ordinary').map(function(item) { return item.title; })).toEqual([titles[0]]);
  });

  it('restricts every run in a multi-run candidate filter', function() {
    widget.attributes.candidateFilter = '[tag[Scope unit]] [[Scope outside]]';
    expect(search(widget, 'ordinary').map(function(item) { return item.title; })).toEqual([titles[0]]);
  });
});
