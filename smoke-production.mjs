#!/usr/bin/env node
// Built-in Node 22+ only: verifies production endpoints and Socket.IO HTTP handshake.
// Usage: node smoke-production.mjs https://your-real-domain.onrender.com
const supplied = process.argv[2];
if (!supplied) {
  console.error('Usage: node smoke-production.mjs https://your-real-domain.onrender.com');
  process.exit(2);
}
let base;
try {
  base = new URL(supplied);
  if (!['http:', 'https:'].includes(base.protocol)) throw Error('URL must be http(s)');
  base.pathname = '/'; base.search = ''; base.hash = '';
} catch (err) {
  console.error('Invalid app URL:', err.message);
  process.exit(2);
}
const checks = [
  ['Home page HTML', '/', t => /<html|<!doctype html/i.test(t)],
  ['Health API', '/api/health', t => JSON.parse(t)?.ok === true],
  ['Public rooms API', '/api/rooms', t => Array.isArray(JSON.parse(t))],
  ['Socket.IO handshake', '/socket.io/?EIO=4&transport=polling', t => /^0\{/.test(t) && Boolean(JSON.parse(t.substring(1)).sid)],
];
let failed = 0;
for (const [label, path, validate] of checks) {
  const target = new URL(path, base);
  try {
    const response = await fetch(target, {signal: AbortSignal.timeout(15000)});
    const body = await response.text();
    if (!response.ok || !validate(body)) throw Error(`HTTP ${response.status} / unexpected response`);
    console.log(`PASS ${label}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${label}: ${err.message}`);
  }
}
console.log(`${checks.length - failed}/${checks.length} checks passed`);
process.exitCode = failed ? 1 : 0;
