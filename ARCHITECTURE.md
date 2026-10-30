# Architecture and walkthrough

## Data flow

React captures pointer events from an HTML5 canvas. Coordinates are normalized to [0,1] so different screen sizes draw in the same place. Socket.IO sends the brush metadata on `draw_start`, points on `draw_move`, and termination on `draw_end`. The server verifies that the socket is the current drawer in the drawing phase, stores the stroke, and broadcasts the accepted data to all room members, including the drawer. Clients reconstruct strokes and render at the intrinsic 960×600 canvas resolution, scaled responsively with CSS.

Undo removes the final stroke on the server, and clear empties the stroke list. The server broadcasts the resulting full canvas history. Erasing uses white strokes and therefore also supports undo.

## Files

- `client/src/main.tsx`: typed React UI, socket lifecycle, home/lobby, canvas, controls, chat and leaderboard.
- `client/src/style.css`: responsive styling and visual states.
- `server/index.js`: Express/static hosting, health/public-room APIs, socket validation/handlers and room registry.
- `server/game.js`: `Room` class owns players, settings, phase machine, timer, words, score, strokes, host transfer and cleanup.
- `tests/game.test.js`: real-network integration tests.

## Phase machine

`lobby → choosing → drawing → between → choosing … → finished`

The host starts only after at least two players are present and non-host players are ready. The queue contains each player's ID once per round. Advancing past the queue increments the round. Exceeding the configured round count finishes the game. A disconnect removes stale queued IDs; if the drawer leaves, the current turn ends. Fewer than two players returns to lobby.

The server uses absolute deadlines based on Date.now(), not client countdowns. A 250ms tick drives transitions; display state is refreshed about once per second. It automatically selects a word on selection timeout and reveals letters at evenly spaced intervals. Hidden mode suppresses the public word mask.

## State confidentiality

`Room.view(playerId)` creates a separate payload for each client. Word choices appear only for the active drawer during choosing. The answer is present only for that drawer while drawing and for everyone after the turn ends. Sending the answer to all clients and hiding it with CSS would not protect the answer. Client-supplied room IDs do not authorize drawing: actions resolve against the socket's actual joined room and role.

## Events

| Client → server               | Meaning                           |
| ----------------------------- | --------------------------------- |
| create_room `{name,config}`   | Validate and create               |
| join_room `{name,code}`       | Join available room               |
| ready                         | Toggle lobby readiness            |
| start_game                    | Host-only start/rematch           |
| word_chosen `word`            | Validate against drawer's choices |
| draw_start `{x,y,color,size}` | Begin validated stroke            |
| draw_move `{x,y}`             | Append point                      |
| draw_end                      | End active stroke                 |
| draw_undo / draw_clear        | Mutate canvas history             |
| guess `text`                  | Match answer or add chat          |
| leave_room                    | Leave and clean up                |

| Server → client | Meaning                                                     |
| --------------- | ----------------------------------------------------------- |
| state           | Per-player game view, players, messages, deadline countdown |
| stroke          | Accepted incremental drawing event                          |
| canvas          | Authoritative replacement history                           |
| notice          | Validation feedback for unacknowledged actions              |

Acknowledged requests return `{ok:true}` or `{ok:false,error}`. Event names differ slightly from the PDF's suggested examples; functionality and real-time synchronization are the same.

## Interview answers

**Why WebSockets?** Each player's browser needs server-initiated updates with low latency. Socket.IO supplies the transport lifecycle and room broadcasts.

**Why server-side scoring?** A browser can be modified; accepting arbitrary scores or trusting a client-supplied answer would allow cheating.

**Why no database?** This assignment requires live room state, not accounts or persistent history. In-memory state keeps the scope understandable; persistence can be added later.

**How are guesses matched?** Trim, lowercase, normalize whitespace, then exact equality. No substring match, so a partial word cannot win.

**What does one round mean?** Every current player gets one drawing turn. Three rounds with four players means twelve drawing turns if nobody leaves.

**What happens when the host leaves?** The earliest remaining player becomes host. Empty rooms cancel their interval and are removed from the registry.

**How would you scale it?** Use shared authoritative room state and a pub/sub adapter, route events consistently per room, persist session identities, and handle reconnection/recovery. Multiple independent in-memory instances are not enough.

**Deployment?** Express serves Vite's compiled assets and Socket.IO on one HTTP server/PORT. The deployment platform must support a long-lived Node process and WebSocket upgrades.
