/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import Fuse, { FuseResult } from 'fuse.js';
import pinyin from 'pinyin';
import type { IFilterOperatorParameterOperator, ISearchOptions, SourceIterator } from 'tiddlywiki';

/** Regex equivalent to \p{Han} in other programming languages. */
const HAN_REGEX = /[\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B\u3400-\u4DB5\u4E00-\u9FD5\uF900-\uFA6D\uFA70-\uFAD9]/;

/**
 * Returns true if the `text` contains at least one Chinese characters;
 * false otherwise.
 * @param {string} text - The text to be checked for Chinese.
 * @returns {boolean}
 */
function containsChinese(text: string) {
  // Empty strings don't contain Chinese.
  if (text === null || text === undefined || text === '') {
    return false;
  }
  // Check for any match using regex; cast boolean
  return !!HAN_REGEX.test(text);
}
$tw.utils.containsChinese = containsChinese;

function translatePinyin(item: string): string {
  if (!containsChinese(item)) {
    return item;
  }
  const pinyinVersionOfItem = pinyin(item, { style: pinyin.STYLE_NORMAL }).join('');
  return `${pinyinVersionOfItem} ${item}`;
}

export function hasPinyinMatchOrFuseMatch<T extends Record<string, string>, Ks extends keyof T>(
  items: T[],
  input: string,
  keys: Ks[] = [],
  options: { distance?: number; minMatchCharLength?: number; searchTiddlerByTitle?: boolean; threshold?: number } = {},
): Array<FuseResult<T>> {
  const { threshold = 0.3, distance = 60, minMatchCharLength = 1, searchTiddlerByTitle = false } = options;
  const fuse = new Fuse<T>(items, {
    getFn: (object: T, keyPath: string | string[]): string => {
      if (!keyPath) return '';
      // general usage
      let realKeyPath: string;
      if (Array.isArray(keyPath)) {
        realKeyPath = keyPath[0] as 'any';
      } else {
        realKeyPath = keyPath as 'any';
      }
      const value = object[realKeyPath];
      // tiddler search usage, should provide { title: string } to work
      if (searchTiddlerByTitle) {
        const title = object.title;
        const fieldName = realKeyPath;
        const tiddler = $tw.wiki.getTiddler(title)?.fields;
        if (!tiddler) return '';
        const fieldValue = typeof tiddler[fieldName] === 'string' ? tiddler[fieldName] as string : String(tiddler[fieldName] ?? '');
        // parse pinyin for long text is time consuming
        // if use chinese to search chinese, no need for pinyin
        if (fieldName === 'text' || containsChinese(input)) {
          return fieldValue;
        }
        return translatePinyin(fieldValue);
      }

      return translatePinyin(value);
    },
    keys: keys as string[],
    ignoreLocation: false,
    includeScore: true,
    includeMatches: true,
    shouldSort: true,
    minMatchCharLength,
    threshold,
    distance,
  });
  const result = fuse.search(input);
  return result.reverse();
}

$tw.utils.pinyinfuse = hasPinyinMatchOrFuseMatch;

/**
Return an array of tiddler titles that match a search string
@param searchText The text string to search for
@param options see below

Options available:
- source: an iterator function for the source tiddlers, called source(iterator), where iterator is called as iterator(tiddler,title)
- exclude: An array of tiddler titles to exclude from the search
- invert: If true returns tiddlers that do not contain the specified string
- caseSensitive: If true forces a case sensitive search
- field: If specified, restricts the search to the specified field, or an array of field names
- anchored: If true, forces all but regexp searches to be anchored to the start of text
- excludeField: If true, the field options are inverted to specify the fields that are not to be searched

The search mode is determined by the first of these boolean flags to be true:
- literal: searches for literal string
- whitespace: same as literal except runs of whitespace are treated as a single space
- regexp: treats the search term as a regular expression
- words: (default) treats search string as a list of tokens, and matches if all tokens are found, regardless of adjacency or ordering

*/
export function fuzzySearchWiki(searchText: string, options: ISearchOptions = {}): string[] {
  const { exclude, field, excludeField, source } = options;
  // Accumulate the array of fields to be searched or excluded from the search
  const fields: string[] = [];
  if (field) {
    if (Array.isArray(field)) {
      field.forEach((fieldName) => {
        if (fieldName) {
          fields.push(fieldName);
        }
      });
    } else {
      fields.push(field);
    }
  }
  // Use default fields if none specified and we're not excluding fields (excluding fields with an empty field array is the same as searching all fields)
  if (fields.length === 0 && !excludeField) {
    fields.push('title', 'tags', 'text');
  }

  // get tiddler list to search
  let tiddlerTitlesToSearch: string[] = [];
  if (typeof source === 'function') {
    source((tiddler, title) => {
      tiddlerTitlesToSearch.push(title);
    });
  } else {
    tiddlerTitlesToSearch = $tw.wiki.getTiddlers();
  }

  // 开始搜索

  // 首先进行精确匹配，快速搜索，需要空格隔开的各个部分都命中，顺序不重要
  const inputKeywords: string[] = searchText
    .toLowerCase()
    .split(' ')
    .filter(Boolean);
  const exactMatches = tiddlerTitlesToSearch.filter((title) => {
    const lowerCaseTitle = title.toLowerCase();
    return inputKeywords.every((keyword) => lowerCaseTitle.includes(keyword));
  });
  if (exactMatches.length > 0) {
    return exactMatches;
  }

  // 没有发现完全匹配的，首先模糊拼音搜索兜底
  // seems getFn is not working here if it searches string[] , so we have to make items { title: string } first, and turn it back later
  const results = hasPinyinMatchOrFuseMatch<{ title: string }, any>(
    tiddlerTitlesToSearch.map((title) => ({ title })),
    searchText,
    fields,
    { searchTiddlerByTitle: true },
  ).map((item) => item.item.title);
  // Remove any of the results we have to exclude
  if (exclude) {
    for (const element of exclude) {
      const p = results.findIndex((item) => item.includes(element));
      if (p !== -1) {
        results.splice(p, 1);
      }
    }
  }
  return results.filter(Boolean);
}

/**
 * @example [pinyinfuse]
 * @param source
 * @param operator
 * @param options // TODO: add title,caption option same as search operator
 * @returns
 */
export const pinyinfuse = (source: (iter: SourceIterator) => void, operator: IFilterOperatorParameterOperator) => {
  const invert = operator.prefix === '!';
  if (operator.suffixes) {
    const hasFlag = function(flag: string): boolean {
      return (operator.suffixes?.[1] ?? []).includes(flag);
    };
    let excludeFields = false;
    const fieldList = operator.suffixes[0] || [];
    const firstField = fieldList[0] || '';
    const firstChar = firstField.charAt(0);
    let fields: string[];
    if (firstChar === '-') {
      fields = [firstField.slice(1), ...fieldList.slice(1)];
      excludeFields = true;
    } else if (fieldList[0] === '*') {
      fields = [];
      excludeFields = true;
    } else {
      fields = [...fieldList];
    }
    return fuzzySearchWiki(operator.operand, {
      source,
      invert,
      field: fields,
      excludeField: excludeFields,
      caseSensitive: hasFlag('casesensitive'),
      literal: hasFlag('literal'),
      whitespace: hasFlag('whitespace'),
      anchored: hasFlag('anchored'),
      words: hasFlag('words'),
    });
  } else {
    return fuzzySearchWiki(operator.operand, {
      source,
      invert,
    });
  }
};
