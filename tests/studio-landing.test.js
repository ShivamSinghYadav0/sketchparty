import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { readProductionAssets } from './dist-assets.js';

const source = readFileSync(new URL('../client/src/main.tsx', import.meta.url), 'utf8');
const server = readFileSync(new URL('../server/index.js', import.meta.url), 'utf8');

test('human avatar illustrations are selectable and accepted by server', () => {
  assert.match(source, /studio-boy/);
  assert.match(source, /studio-girl/);
  assert.match(server, /"studio-boy", "studio-girl"/);
  assert.ok(existsSync(new URL('../dist/art/studio-boy.webp', import.meta.url)));
  assert.ok(existsSync(new URL('../dist/art/studio-girl.webp', import.meta.url)));
});

test('production homepage includes a drawing preview and direct page navigation', () => {
  assert.match(source, /className="studio-preview"/);
  assert.match(source, /onClick=\{\(\) => navigate\("how-to-play"\)\}/);
  assert.doesNotMatch(source, /HomeMascots\s*\/>/);
  const { js, css } = readProductionAssets();
  assert.match(js, /studio-preview/);
  assert.match(js, /how-to-play/);
  assert.match(css, /studio-preview/);
});
