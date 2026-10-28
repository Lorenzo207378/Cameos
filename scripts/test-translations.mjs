import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'espree';
import { SUPPORTED_LANGUAGE_KEYS } from '../src/utils/languages.js';
import { MOVIE_CATEGORY_CONFIG } from '../src/utils/selections.js';
import { formatTranslation, translate, translations } from '../src/utils/translationUtils.js';

const root = new URL('../', import.meta.url);
const jsxFiles = (await readdir(new URL('src/', root), { recursive: true }))
  .filter((file) => file.endsWith('.jsx'));
const parseJsx = (source) => parse(source, {
  ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true }, comment: true, loc: true
});

function walk(node, visit, parent = null) {
  if (!node || typeof node !== 'object') return;
  if (node.type) visit(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'comments'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit, node));
    else if (value && typeof value === 'object') walk(value, visit, node);
  }
}

function flatten(dictionary, prefix = '') {
  return Object.fromEntries(Object.entries(dictionary).flatMap(([key, value]) =>
    typeof value === 'string' ? [[prefix + key, value]] : Object.entries(flatten(value, `${prefix}${key}.`))
  ));
}

const dictionaries = Object.fromEntries(SUPPORTED_LANGUAGE_KEYS.map((lang) => [lang, flatten(translations[lang])]));
const placeholders = (text) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();

function resolveKeys(node, file, ast) {
  if (node.type === 'Literal' && typeof node.value === 'string') return [node.value];
  if (node.type === 'ConditionalExpression') {
    return [...resolveKeys(node.consequent, file, ast), ...resolveKeys(node.alternate, file, ast)];
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 1) {
    const prefix = node.quasis[0].value.cooked;
    const suffix = node.quasis[1].value.cooked;
    assert.equal(suffix, '', 'Unexpected dynamic translation suffix');
    if (file.endsWith('MovieCategory.jsx')) {
      const categories = ['upcoming', ...Object.keys(MOVIE_CATEGORY_CONFIG)];
      if (prefix === 'categories.') return categories.map((key) => `${prefix}${key}`);
      if (prefix === 'carousels.') {
        const ending = node.expressions[0].name === 'titleKey' ? 'Title' : 'Sub';
        return categories.map((key) => `${prefix}${key === 'comedy' ? 'movieComedy' : key}${ending}`);
      }
    }
    if (file.endsWith('MediaDetail.jsx') && prefix === 'detail.') {
      const keys = [];
      walk(ast, (entry) => {
        if (entry.type === 'Property' && entry.key.name === 'key' && typeof entry.value.value === 'string') {
          keys.push(prefix + entry.value.value);
        }
      });
      assert.ok(keys.length > 0);
      return keys;
    }
  }
  assert.fail(`Unverified dynamic translation key in ${file}:${node.loc.start.line}`);
}

test('all JSX translation calls use one key and resolve in every supported language', async () => {
  let calls = 0;
  for (const file of jsxFiles) {
    const source = await readFile(new URL(`src/${file.replaceAll(path.sep, '/')}`, root), 'utf8');
    const ast = parseJsx(source);
    const trees = [ast];
    // Keep disabled legacy components covered without activating their code.
    for (const comment of ast.comments) {
      if (comment.value.includes('export default') && comment.value.includes('t(')) {
        trees.push(parseJsx(comment.value.replaceAll('/!*', '/* ').replaceAll('*!/', ' */')));
      }
    }
    for (const tree of trees) {
      walk(tree, (node, parent) => {
        if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier' || node.callee.name !== 't') return;
        calls++;
        const location = `${file}:${node.loc.start.line}`;
        assert.equal(node.arguments.length, 1, `${location}: t accepts only a key`);
        for (const key of resolveKeys(node.arguments[0], file, tree)) {
          for (const lang of SUPPORTED_LANGUAGE_KEYS) {
            const text = dictionaries[lang][key];
            assert.equal(typeof text, 'string', `${location}: missing ${lang}.${key}`);
            assert.equal(translate(key, lang), text);
            const expected = placeholders(text);
            if (expected.length) {
              assert.equal(parent?.callee?.name, 'formatTranslation', `${location}: missing interpolation for ${key}`);
              const params = parent.arguments[1];
              assert.equal(params?.type, 'ObjectExpression');
              const supplied = params.properties.map((property) => property.key.name || property.key.value).sort();
              assert.deepEqual(supplied, expected, `${location}: wrong parameters for ${key}`);
            }
          }
        }
      });
    }
  }
  assert.ok(calls > 0, 'No translation calls were audited');
  console.log(`Audited ${jsxFiles.length} JSX files and ${calls} translation calls, including commented components.`);
});

test('dictionaries have matching keys and placeholders in all supported languages', () => {
  const reference = dictionaries[SUPPORTED_LANGUAGE_KEYS[0]];
  for (const lang of SUPPORTED_LANGUAGE_KEYS) {
    assert.deepEqual(Object.keys(dictionaries[lang]).sort(), Object.keys(reference).sort());
    for (const [key, text] of Object.entries(dictionaries[lang])) {
      assert.deepEqual(placeholders(text), placeholders(reference[key]), `${lang}.${key}`);
      const values = Object.fromEntries(placeholders(text).map((name) => [name, `value:${name}`]));
      assert.equal(placeholders(formatTranslation(text, values)).length, 0, `${lang}.${key}`);
    }
  }
});

test('interpolation preserves literal values, repeated placeholders and zero', () => {
  assert.equal(formatTranslation('{name}: {count}; {name}', { name: '$& $1 {count}', count: 0 }), '$& $1 {count}: 0; $& $1 {count}');
  assert.equal(formatTranslation('{missing} {empty}', { empty: null }), '{missing} ');
  assert.equal(formatTranslation('Plain text'), 'Plain text');
  assert.equal(formatTranslation(translate('slider.seasonsCount', 'it'), { count: 3 }), '3 Stagioni');
  assert.equal(formatTranslation(translate('slider.seasonsCount', 'en'), { count: 3 }), '3 Seasons');
});
