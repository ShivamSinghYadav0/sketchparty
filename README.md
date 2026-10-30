> **v6.3 Word Mode fix (October 30, 2026):** Extract into a **new folder** and run `START_WINDOWS.bat`. The launcher uses **port 3026** and verifies `/api/build-info` so you do not accidentally open an older v6.2/3017 app. Word Mode has a small `v6.3` label, and both Normal and Hidden are available as a custom dark menu. See `WORD_MODE_FIX_V6_3.md` for verification.

# Sketchparty

A multiplayer drawing and guessing game built for the **Intern Assignment: skribbl.io Clone**. React + TypeScript + Vite, HTML5 Canvas, Node.js + Express, and Socket.IO.

**Live deployment URL: PENDING — hosting account connection and production verification required.** This package is not a claim of completed public deployment.

## Run locally (Windows, macOS, Linux)

Install Node.js 22.12+ or Node.js 24 LTS. Open a terminal in this folder:

```sh
npm ci
npm run build
npm start
```

Visit http://localhost:3000. On Windows, `START_WINDOWS.bat` performs these commands. Keep its terminal open. Use a second browser or incognito window for player two. Do not open `index.html` directly.

Development: run `npm run server` in one terminal and `npm run dev:client` in a second. Vite proxies API/WebSocket traffic to port 3000.

## Play

1. Enter a nickname (or use **Surprise me!**), choose your region, select a playful avatar and optionally choose **Midnight Blue**, **Jungle Pop**, or **Honey Gold** colours. Your selections are saved locally in the browser.
2. Choose **Private room** or **Public room**. Optionally expand **Game settings** (player limit, rounds, draw time, word choices, hints and word mode). Create your room.
3. Copy the invite link, or share the room code. Invitees enter their nickname, region and avatar and click Join. Public rooms can be browsed from the home screen and are displayed for the selected region.
4. All non-host players click **I'm ready!**; the host clicks **Start game**.
5. The drawer chooses a word. Only their browser receives the word/options.
6. Draw using the palette, brush size, eraser, undo, and clear. Other players type guesses.
7. All correct guessers earn points. A turn ends when everyone guesses or time expires.
8. Each player draws once per round. The game ends after the configured number of rounds.

A localhost link works only on the same computer. For multiple devices use the deployed URL, or the server computer's LAN address with port 3000 and an appropriate firewall rule.

## Professional dark-game redesign — 29 October 2026

This revision preserves the previously working room/game flow and makes the interface feel like a focused drawing game rather than an illustrated card catalog:

- Dark navy studio visual system, with three switchable themes: **Midnight Blue** (default), **Jungle Pop**, **Honey Gold**. All theme choices are local preferences, not game rules.
- Landing page: Rocket Doodle artwork, only two compact animal mascots, a single player-setup panel, and focused shortcuts instead of a long card-heavy page. How to Play, Features, About and FAQ open as distinct in-app views.
- Custom **dark RegionPicker** (listbox), avoiding the Windows browser-native white drop-down. It closes on Escape, outside pointer interaction or selection.
- Full four-state UI: welcoming Home/Login, waiting-room Lobby, active Drawing Arena and dramatic Winner/Rematch. The active canvas remains white for legibility; scoreboards, chat, HUD, toolbar, and result overlay are dark.
- Fixed final scoreboard incorrectly showing `Round 4/3` after the final round. The server now retains the final configured round count and the frontend also clamps the displayed fraction.
- Final result header, winner status, rematch button and player row labels now reflect the game phase.
- Guest nickname/region/avatar are frontend preferences. The nickname advice discourages children's real names; there are no passwords and no account registration.
- Existing room settings, private sharing, real-time Socket.IO drawing and scoring logic are unchanged except the end-of-game display bug above.
- `dist/` contains a deployable JS/CSS bundle rebuilt from this TypeScript source using local TypeScript's transpile step with the previous React/Socket.IO vendor payload preserved. **For production deploy, always run the normal `npm ci && npm run build`** with dependencies available.

**Visual checks:** Playwright Chromium successfully rendered the four screens using simulated server state and tested the dark region menu, region selection, theme switching, and 390px mobile width without horizontal overflow or client JS errors. Simulated-state preview is not equivalent to live multiplayer testing. Four dependency-free unit tests pass (`game-rules-unit.test.js` and `profile-region.test.js`). Full Socket.IO end-to-end tests and standard Vite build require installing npm packages, which the current environment could not complete.

## Navigation and page views — v5

The header **How to Play / Features / About / FAQ** controls open independent, focused content views instead of scrolling the long homepage. The browser URL carries `?page=how-to-play`, `?page=features`, `?page=about`, or `?page=faq`, so you can share a direct link and use browser Back/Forward. **Play Now** returns to the home login form and focuses the nickname field. Footer navigation works the same way. Existing room/invite links using `?room=CODE` remain compatible.

These presentation-only changes do not modify the real-time multiplayer rules. The home first fold is more concise and removes the repeated card sections. Each informational view uses open rows, subtle dividers, readable body copy and a direct Create a Room CTA. These screens have been exercised in Playwright (Chromium) for desktop and 390px mobile, including navigation, FAQ, avatar, region, theme and nickname. A production `npm run build` and full Socket.IO regression suite still require installed npm dependencies.

## Requirements mapping

| PDF requirement                                 | Implementation                                             |
| ----------------------------------------------- | ---------------------------------------------------------- |
| Create/join private rooms, invite link/code     | Home and lobby; unlisted room code                         |
| Public rooms (optional)                         | Public setting + region-filtered discovery list             |
| Player list, ready-up, host start               | Lobby and server authorization                             |
| 2–20 players, 2–10 rounds                       | Validated on server and inputs                             |
| 15–240 sec drawing, 1–5 word choices, 0–5 hints | Configurable per room                                      |
| Turn-based drawing                              | Each current player draws once per round                   |
| Real-time strokes                               | Socket.IO start/move/end messages                          |
| Brush/color/size, undo/clear                    | Canvas toolbar; server drawer-only enforcement             |
| Eraser (nice to have)                           | White brush on white canvas                                |
| Word selection and blanks                       | Private options; public mask                               |
| Hints/countdown                                 | Server deadline and timed letter reveal                    |
| Guesses/chat                                    | Shared input; drawer/correct guessers muted during drawing |
| Scoring, leaderboard, winner                    | Server-owned scoring and end screen                        |
| Normal and Hidden modes                         | Supported; Combination is optional and omitted             |
| Public deployment URL                           | Pending account connection and deployment                  |
| README/architecture/code explanation            | This file and ARCHITECTURE.md                              |

Optional categories, custom words, moderation, multiple languages, spectators and replay are not implemented. They are not required by the PDF's must-have list.

## Scoring and matching

Exact match after trim, lowercase and collapsing repeated spaces. Partial words and typos are not accepted. Every correct guesser gets:

`100 + ceil(400 * timeRemaining / turnDuration) + max(0, 100 - 25 * previousCorrectGuessers)`

The drawer receives 100 points per correct guess. No client supplies scores. Duplicate guesses cannot earn points again; the earliest correct guesses have a bonus. Tied top scores share the win.

## Test

The profile/region regression tests in `tests/profile-region.test.js` can run with built-in Node modules. Run the original real-socket integration tests and full TypeScript/Vite build after `npm ci` on an internet-connected machine. See `TEST_REPORT.md` for the actual checks performed during this redesign.

```sh
npm test
npm run build
```

Tests use real Socket.IO clients over a local HTTP/WebSocket server. They cover complete two-round games, role permissions, word confidentiality, drawing/undo/clear, scoring, host transfer, capacity/public listing, cleanup, automatic word selection, hints, timeouts and invalid input. Test-only time acceleration does not change production timing.

## Deployment on Render

Use one **Node Web Service**, serving both Express and the compiled React frontend. `render.yaml` is included.

1. Push this folder to your Git repository, excluding node_modules and secrets.
2. Connect the repository in Render and create a Web Service (or use the included Blueprint).
3. Build command: `npm ci --include=dev && npm run build`.
4. Start command: `npm start`; health check: `/api/health`.
5. Keep **one instance**. The server binds `0.0.0.0` and uses Render's `PORT` environment variable.
6. After deployment, test the live URL in two independent browsers/devices. Verify create → join → ready → choose → draw → guess → score → winner.
7. Replace the pending live-URL line at the top with the actual verified URL.

Frontend and WebSocket backend share the same origin; no hardcoded localhost endpoints or separate CORS setup are needed. Render supports inbound WebSockets on the same port. Free services may sleep when idle; a cold start is not a game bug. Do not deploy the Node server as a Vercel/Netlify frontend-only static site.

Official references: https://render.com/docs/deploy-node-express-app and https://render.com/docs/websocket

## Known limits / explicit choices

- In-memory rooms and scores: server restarts erase games. No database was required.
- Disconnect removes that player immediately; host ownership transfers. With fewer than two players, the game returns to lobby. There is no seamless session restoration. Rejoin an available lobby after reconnecting.
- Mid-game joining is rejected to keep turn order fair; join after the game finishes.
- Private means unlisted with an invite code, not password protected.
- Word selection auto-picks after 15 seconds; a five-second reveal separates turns.
- Horizontally scaling requires a shared room-state store plus a Socket.IO adapter/sticky-session strategy; this submission uses one instance.
- Basic payload, rate and stroke limits are included; this is an assignment implementation, not a globally scaled anti-abuse platform.
- Browser visual QA and public production verification are tracked in TEST_REPORT.md.


## Latest UI v4.3 (October 29, 2026)
Use **START_WINDOWS.bat** to launch the current UI at **http://localhost:3017/?ui=v4.3**. The old localhost:3000 server may still show a previous ZIP; don't judge the new region menu using that old tab. The latest menu is made of HTML buttons with a dark option list, not a native select. See CHANGELOG_UI_4_3.md.

## Deployment/submission handoff

See **[DEPLOYMENT_AND_SUBMISSION.md](DEPLOYMENT_AND_SUBMISSION.md)** for GitHub upload, Render Web Service creation, a two-browser production test, and a final assignment submission template. GitHub Actions (`.github/workflows/ci.yml`) automatically builds and tests the repository after push. `smoke-production.mjs` is a dependency-free HTTP/Socket.IO production smoke check.

**Production status:** Not yet deployed or tested on Render. The URL at the top stays `PENDING` until a real Render deployment is available and verified.


## v6 Studio Homepage (30 October 2026)

- Dark, restrained game-platform visual style and illustrative (non-live) game preview.
- Two human-style illustrated characters; limited animal avatars retained as a playful optional choice.
- The login still supports nickname, region, public/private room, room code, theme settings and game options.
- Human avatar values `studio-boy` and `studio-girl` are accepted by the server; existing avatar IDs remain valid for older clients.
- Static illustration files live in `client/public/art` and ship in `dist/art`.
- All dynamic game behavior remains server-managed by Socket.IO; the landing preview is intentionally a sample, not a live match.
- The `/dist` bundle was refreshed from the TSX source with the available local TypeScript transpiler; on Windows, `START_WINDOWS.bat` runs the full npm dependency install/build.
- Do not infer server availability from the screenshot preview, which displays `Connecting...` without a backend.


## v6.1 test suite compatibility

After installing dependencies run `npm run build` followed by `npm test`. The frontend tests now detect Vite fingerprinted output assets automatically rather than expecting older fixed `dist/assets` filenames. See `TEST_FIX_V6_1.md` for details.
