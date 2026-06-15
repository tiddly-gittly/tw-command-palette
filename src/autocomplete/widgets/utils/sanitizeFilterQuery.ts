/**
 * Sanitize a user-typed query before embedding it in a TiddlyWiki
 * square-bracket filter operand.
 *
 * TW's filter parser treats the first `]` inside `[operator[operand]]` as the
 * end of the operand. A raw user query like `Foo]Bar` therefore breaks the
 * filter ("Missing [ in filter expression"). Replacing `]` with a space keeps
 * the filter valid; TW's `search` operator splits on whitespace and matches
 * each word, so `Foo Bar` still matches a title like `Foo]Bar`.
 *
 * Note: this intentionally does **not** use an indirect `{tiddler!!field}`
 * operand, because `filterTiddlersAsync` forwards the filter string to the
 * TidGi server/wiki process, where a client-only temp tiddler would not exist.
 */
export function sanitizeFilterQuery(query: string): string {
  return query.replaceAll(']', ' ');
}
