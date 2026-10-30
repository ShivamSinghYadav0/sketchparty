import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { readProductionAssets } from './dist-assets.js';

const source = readFileSync(new URL('../client/src/main.tsx', import.meta.url), 'utf8');

test('region uses a custom listbox, never a native select', () => {
  assert.match(source, /function RegionPicker/);
  assert.match(source, /<RegionPicker value=\{region\}/);
  assert.match(source, /className="region-menu"/);
  assert.match(source, /role="option"/);
  assert.doesNotMatch(source, /<select id="player-region"/);
  const { js, css } = readProductionAssets();
  assert.match(js, /region-option-label/);
  assert.match(js, /region-trigger/);
  assert.match(css, /region-menu/);
  assert.match(css, /region-option/);
  assert.match(css, /#102b40/i);
});

test('homepage has limited human illustrations and a game preview illustration', () => {
  assert.doesNotMatch(source, /<HomeMascots\s*\/>/);
  assert.doesNotMatch(source, /<RocketDoodle\s*\/>/);
  assert.match(source, /studio-human-boy/);
  assert.match(source, /studio-human-girl/);
  assert.match(source, /studio-preview-canvas/);
  const { js, css } = readProductionAssets();
  assert.match(js, /studio-preview-canvas/);
  assert.match(js, /studio-boy\.webp/);
  assert.match(js, /studio-girl\.webp/);
  assert.match(css, /studio-preview/);
  assert.ok(existsSync(new URL('../dist/art/studio-boy.webp', import.meta.url)));
  assert.ok(existsSync(new URL('../dist/art/studio-girl.webp', import.meta.url)));
});
