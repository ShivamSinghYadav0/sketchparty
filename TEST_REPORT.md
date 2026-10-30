# Latest test summary — v6

- **PASS:** 10 source/game-rule/unit tests (profile-region, game-rules-unit, region-menu-ui, landing-navigation, studio-landing).
- **PASS:** `node --check` for deployed JS bundle and `server/index.js`.
- **PASS:** Browser visual rendering of the homepage and custom region dropdown using shipped bundle without a live backend.
- **NOT VERIFIED HERE:** npm/Vite build from scratch, multiplayer Socket.IO end-to-end, Render cloud deployment. npm installation failed in this execution environment.

## Windows verification
````
npm ci
npm run build
npm test
npm start
````
Then open two browsers on the local port and check room create/join, ready, word choose, live stroke sync, guessing, scores, game end and rematch.
