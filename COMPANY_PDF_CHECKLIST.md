# Company PDF comparison — Intern Assignment: skribbl.io Clone

**Source:** `full stack task 2 (1)(1).pdf`, 7 pages. The PDF lists *Must Have*, *Should Have*, *Nice to Have*, Deployment and Deliverables. The original reference site is `https://skribbl.io`.

## Mandatory: keep working

| PDF item | Code / UI | Assessment |
|---|---|---|
| Create/join rooms with settings | `create_room`, `join_room`, guest profile & room controls | Implemented; live production test pending |
| Invite link / room code | lobby code / copy invite | Implemented; verify publicly after deployment |
| Lobby, players, ready, host start | `Room.start`, `ready`, Lobby view | Implemented |
| Turn-based drawing and rotating drawer | `Room.next`, `choose` | Implemented; unit checked |
| Real-time drawing broadcast | `draw_start`, `draw_move`, `draw_end` over Socket.IO | Implemented; end-to-end pending |
| Word choices (1–5), secret and blanks | `Room.options`, `Room.view` masks and secret | Implemented; unit checked |
| Chat/guesses/scoring | `Room.guess`, state messages, leaderboard | Implemented; full socket test pending |
| Winner/game end | `Room.next` finish phase, final results | Implemented; round counter regression fixed |
| Basic brush/colors/undo/clear | canvas tools + `Room.draw` server enforcement | Implemented |
| WebSocket sync | `server/index.js`, Socket.IO client | Implemented; full socket test pending |

## Recommended / Optional

- Hints, countdown, private invite, eraser: already implemented.
- Modes: Normal / Hidden implemented, Combination optional not implemented.
- Nice-to-have moderation, custom word lists, spectators, replay, extra languages: **not implemented**. Do not claim otherwise.
- Region picker, avatars, original rocket and cartoon characters, theme switching, About/FAQ are *our own presentation enhancements*, not mandatory requirements from the PDF. The PDF does not prescribe specific colours or an exact replica layout.
- Children: public live chat is **not moderated**. Prefer private rooms with known players and suitable adult supervision.

## Delivery must still be completed

The PDF explicitly requires a **publicly accessible URL**, `README.md`, architecture explanation, and ability to walk through the code. This ZIP has source, a compiled frontend bundle, `ARCHITECTURE.md` and `README.md`, but **no public deployment and no verified production URL**. Deploy on Render or Railway and test with two independent clients before submission.

## Demonstration flow for interview

1. Select nickname/region/avatar and create private room, show settings.
2. Copy link, join with second browser, ready-up and start match.
3. Select a secret word in the drawer browser; verify the guesser sees only blanks.
4. Draw a stroke; verify remote appearance; try brush/color/undo/clear.
5. Guess correctly from second browser, show points and leaderboard.
6. Finish rounds; explain winner, turn rotation and matching normalization.
7. Explain Express/Socket.IO connection and exactly which server values the browser is not allowed to set.
