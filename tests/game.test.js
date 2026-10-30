import { test } from "node:test";
import assert from "node:assert/strict";
import { io as client } from "socket.io-client";
import { createApp } from "../server/index.js";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn) {
  for (let n = 0; n < 100; n++) {
    if (fn()) return;
    await wait(20);
  }
  throw Error("Timed out waiting for state");
}
const request = (s, event, data) =>
  new Promise((resolve, reject) =>
    s
      .timeout(2000)
      .emit(event, data, (err, res) => (err ? reject(err) : resolve(res))),
  );
async function fixture(t) {
  const app = createApp({ breakMs: 10 });
  await new Promise((r) => app.http.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${app.http.address().port}`;
  const sockets = [];
  t.after(async () => {
    sockets.forEach((s) => s.disconnect());
    await app.close();
  });
  async function connect() {
    const s = client(url, { transports: ["websocket"], forceNew: true });
    s.on("state", (v) => (s.state = v));
    await new Promise((r) => s.on("connect", r));
    sockets.push(s);
    return s;
  }
  return { ...app, url, connect };
}
test("full multiplayer flow: private word, authorized drawing, guesses, scores, turn rotation, winner", async (t) => {
  const f = await fixture(t),
    a = await f.connect(),
    b = await f.connect();
  assert.equal(
    (
      await request(a, "create_room", {
        name: "Alice",
        config: { rounds: 2, drawTime: 15 },
      })
    ).ok,
    true,
  );
  const room = a.state.id;
  assert.equal(
    (await request(b, "join_room", { name: "Bob", code: room })).ok,
    true,
  );
  assert.equal((await request(b, "start_game")).ok, false);
  assert.equal((await request(a, "start_game")).ok, false);
  await request(b, "ready");
  await request(a, "start_game");
  await until(() => a.state.phase === "choosing");
  assert.equal(a.state.options.length, 3);
  assert.equal(b.state.options.length, 0);
  assert.equal(b.state.word, null);
  for (let turn = 0; turn < 4; turn++) {
    await until(() => a.state.phase === "choosing");
    const drawer = a.state.drawerId === a.id ? a : b,
      guesser = drawer === a ? b : a;
    await until(() => drawer.state.options.length > 0);
    const word = drawer.state.options[0];
    assert.equal((await request(guesser, "word_chosen", word)).ok, false);
    await request(drawer, "word_chosen", word);
    await until(() => guesser.state.phase === "drawing");
    assert.equal(guesser.state.word, null);
    assert(!JSON.stringify(guesser.state).includes(`"${word}"`));
    assert.equal(
      (
        await request(guesser, "draw_start", {
          x: 0.1,
          y: 0.1,
          color: "#000000",
          size: 5,
        })
      ).ok,
      false,
    );
    let stroke;
    guesser.once("stroke", (v) => (stroke = v));
    await request(drawer, "draw_start", {
      x: 0.1,
      y: 0.2,
      color: "#000000",
      size: 5,
    });
    await until(() => stroke);
    assert.equal(stroke.event, "start");
    await request(drawer, "draw_move", { x: 0.2, y: 0.3 });
    await request(drawer, "draw_end");
    assert.equal(f.rooms.get(room).strokes[0].points.length, 2);
    await request(drawer, "draw_undo");
    assert.equal(f.rooms.get(room).strokes.length, 0);
    await request(drawer, "draw_start", {
      x: 0.1,
      y: 0.2,
      color: "#000000",
      size: 5,
    });
    await request(drawer, "draw_clear");
    assert.equal(f.rooms.get(room).strokes.length, 0);
    assert.equal((await request(drawer, "guess", word)).ok, false);
    await request(guesser, "guess", ` ${word.toUpperCase()} `);
    await until(() => guesser.state.phase === "between");
    assert(guesser.state.players.find((p) => p.id === guesser.id).score > 0);
    assert.equal(guesser.state.word, word);
  }
  await until(() => a.state.phase === "finished");
  assert.equal(a.state.players.length, 2);
  assert(a.state.players.every((p) => p.score > 0));
});
test("room validation, capacity, public listing, disconnect recovery and cleanup", async (t) => {
  const f = await fixture(t),
    a = await f.connect(),
    b = await f.connect(),
    c = await f.connect();
  assert.equal(
    (
      await request(a, "create_room", {
        name: "Alice",
        config: { maxPlayers: 99 },
      })
    ).ok,
    false,
  );
  await request(a, "create_room", {
    name: "Alice",
    config: { public: true, maxPlayers: 2 },
  });
  const code = a.state.id;
  assert.equal((await (await fetch(f.url + "/api/rooms")).json()).length, 1);
  assert.equal(
    (await request(b, "join_room", { name: "Bob", code: "INVALID" })).ok,
    false,
  );
  await request(b, "join_room", { name: "Bob", code });
  assert.equal(
    (await request(c, "join_room", { name: "Carol", code })).ok,
    false,
  );
  assert.equal((await (await fetch(f.url + "/api/rooms")).json()).length, 0);
  await request(b, "ready");
  await request(a, "start_game");
  await until(() => b.state.phase === "choosing");
  a.disconnect();
  await until(() => b.state.phase === "lobby" && b.state.hostId === b.id);
  assert.equal(b.state.hostId, b.id);
  assert.equal(b.state.players.length, 1);
  b.disconnect();
  await until(() => f.rooms.size === 0);
});
test("automatic selection, hints, timer expiry, invalid input and in-progress joins", async (t) => {
  const f = await fixture(t),
    a = await f.connect(),
    b = await f.connect(),
    c = await f.connect();
  await request(a, "create_room", {
    name: "Alice",
    config: { hints: 2, drawTime: 15 },
  });
  const r = f.rooms.get(a.state.id);
  await request(b, "join_room", { name: "Bob", code: r.id });
  await request(b, "ready");
  await request(a, "start_game");
  r.deadline = Date.now() - 1;
  r.tick();
  assert.equal(r.phase, "drawing");
  assert.equal(
    (await request(c, "join_room", { name: "Carol", code: r.id })).ok,
    false,
  );
  assert.equal(
    (await request(a, "draw_start", { x: 8, y: 0, color: "#000000", size: 5 }))
      .ok,
    false,
  );
  r.started = Date.now() - 11000;
  r.tick();
  assert.equal(r.revealed.size, 2);
  assert.equal((await request(b, "guess", "x".repeat(201))).ok, false);
  const previous = b.state.players.find((p) => p.id === b.id).score;
  await request(b, "guess", "wrong answer");
  assert.equal(r.players.find((p) => p.id === b.id).score, previous);
  r.deadline = Date.now() - 1;
  r.tick();
  assert.equal(r.phase, "between");
});
