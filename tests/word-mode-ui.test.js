import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readProductionAssets } from './dist-assets.js';
const tsx = readFileSync(new URL('../client/src/main.tsx', import.meta.url),'utf8');
test('Word mode is NOT a native select, supports both Normal and Hidden choices', () => {
  assert.match(tsx, /function WordModePicker/);
  assert.match(tsx, /<WordModePicker value=\{config.mode\}/);
  assert.doesNotMatch(tsx, /<label>Word mode<select/);
  assert.match(tsx, /value:"normal", label:"Normal"/);
  assert.match(tsx, /value:"hidden", label:"Hidden"/);
  assert.match(tsx, /className="word-mode-trigger"/);
  assert.match(tsx, /role="listbox"/);
  assert.match(tsx, /role="option"/);
});
test('the linked production asset contains the custom word-mode picker', () => {
  const { js, css, html }=readProductionAssets();
  assert.match(js,/word-mode-trigger/);
  assert.match(js,/word-mode-option/);
  assert.match(css,/\.word-mode-options/);
  assert.match(html,/\.js/);
});
