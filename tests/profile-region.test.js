import { test } from "node:test";
import assert from "node:assert/strict";
import { Room, settings } from "../server/game.js";

test("region and chosen avatar survive the room state and remain player-specific", () => {
  const sent = [];
  const io = { to: (id) => ({ emit: (event, payload) => sent.push({ id, event, payload }) }) };
  const host = { id: "host", name: "Host", score: 0, ready: false, region: "india", avatar: "🐼" };
  const guest = { id: "guest", name: "Guest", score: 0, ready: true, region: "europe", avatar: "🦊" };
  const room = new Room(host, { public: true }, io, () => {});
  try {
    room.add(guest);
    room.broadcast();
    assert.equal(room.view("host").region, "india");
    assert.deepEqual(room.view("guest").players.map(p => [p.name,p.region,p.avatar]), [["Host","india","🐼"],["Guest","europe","🦊"]]);
    assert(sent.some(m => m.id === "host" && m.event === "state"));
    assert(sent.some(m => m.id === "guest" && m.event === "state"));
    room.start("host");
    assert.equal(room.view("guest").options.length, 0);
    const word = room.view("host").options[0];
    room.choose("host",word);
    assert.equal(room.view("guest").word, null);
    room.guess("guest",word.toUpperCase());
    assert.equal(room.view("guest").phase, "between");
    assert(room.players.find(p => p.id === "guest").score > 0);
  } finally { clearInterval(room.timer); }
});

test("existing game settings continue to validate ranges", () => {
  assert.equal(settings({ maxPlayers: 20, rounds: 10, drawTime: 240 }).maxPlayers, 20);
  assert.throws(() => settings({ maxPlayers: 21 }), /Invalid maxPlayers/);
});
