import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readProductionAssets } from './dist-assets.js';

const source = readFileSync(new URL('../client/src/main.tsx', import.meta.url), 'utf8');

test('header navigation switches direct content views rather than anchor-scroll', () => {
  assert.match(source, /onClick=\{\(\) => navigate\(item\.id\)\}/);
  for (const id of ['how-to-play', 'features', 'about', 'faq']) {
    assert.ok(source.includes('page === "' + id + '"'), `Missing view for ${id}`);
  }
  assert.match(source, /history\.pushState/);
  assert.match(source, /popstate/);
  assert.doesNotMatch(source, /href="#(?:how-to-play|features|about|faq)"/);
});

test('production bundle contains direct navigation and its assets exist', () => {
  const { js, css, scriptPaths, stylePaths } = readProductionAssets();
  assert.ok(scriptPaths.some(p => p.endsWith('.js')));
  assert.ok(stylePaths.some(p => p.endsWith('.css')));
  assert.match(js, /pushState/);
  assert.match(js, /How to play/);
  assert.match(css, /main-nav/);
});
