# Sketchparty v6 — Studio homepage

## Visual changes
- Mature navy-blue desktop/mobile landing presentation with a game-layout preview, not a wall of cartoon cards.
- Two human-style illustrated portraits, used in the hero and offered as selectable avatars; a small number of animal avatar options retained.
- Replaced rocket illustration, pizza/stickers, and floating mascot strip with an illustrative drawing-board preview.
- Simplified titles, player panel and button shapes while keeping direct How to Play / Features / About / FAQ navigation.
- Existing room controls, region listbox, settings, leaderboard and live canvas preserved.

## Backend compatibility
- Added `studio-boy` and `studio-girl` to allowed avatar IDs in server/index.js.
- The live gameplay continues to run through the Socket.IO server and Room state machine. The homepage game preview is illustrative, not a live connected game.

## Verification
- JS syntax check passed for the shipped `dist/assets/sketchparty-v5.js` and backend entrypoint.
- 10 dependency-free tests passed.
- Browser rendered the new desktop homepage and dark region dropdown using the shipped JS bundle.
- Full npm install, production Vite build and live Socket.IO end-to-end tests **not run successfully here** due unavailable dependencies. Re-run `npm ci && npm run build && npm test` on Windows or CI before submission.
