import { randomBytes } from "node:crypto";
import WORDS from "./words.json" with { type: "json" };
export const defaults = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  hints: 2,
  mode: "normal",
  public: false,
};
export function settings(input = {}) {
  const out = { ...defaults };
  for (const [k, min, max] of [
    ["maxPlayers", 2, 20],
    ["rounds", 2, 10],
    ["drawTime", 15, 240],
    ["wordCount", 1, 5],
    ["hints", 0, 5],
  ]) {
    if (input[k] !== undefined) {
      if (!Number.isInteger(input[k]) || input[k] < min || input[k] > max)
        throw Error(`Invalid ${k}`);
      out[k] = input[k];
    }
  }
  out.public = input.public === true;
  out.mode = input.mode === "hidden" ? "hidden" : "normal";
  return out;
}
export const normalize = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");
export class Room {
  constructor(host, config, io, onEmpty, timing = {}) {
    this.id = randomBytes(4).toString("hex").toUpperCase();
    this.players = [host];
    this.hostId = host.id;
    this.region = host.region || "india";
    this.config = settings(config);
    this.io = io;
    this.onEmpty = onEmpty;
    this.phase = "lobby";
    this.round = 0;
    this.drawerId = null;
    this.strokes = [];
    this.messages = [];
    this.guessed = new Set();
    this.timing = timing;
    this.timer = setInterval(() => this.tick(), 250);
  }
  add(player) {
    if (!["lobby", "finished"].includes(this.phase))
      throw Error("Game already started. Join after it finishes.");
    if (this.players.length >= this.config.maxPlayers)
      throw Error("Room is full");
    this.players.push(player);
    this.system(`${player.name} joined`);
  }
  system(text) {
    this.messages.push({ name: "Game", text, kind: "system" });
    this.messages = this.messages.slice(-100);
  }
  view(id) {
    const drawer = id === this.drawerId;
    const reveal = ["between", "finished"].includes(this.phase);
    return {
      id: this.id,
      hostId: this.hostId,
      region: this.region,
      players: this.players,
      settings: this.config,
      phase: this.phase,
      round: this.round,
      drawerId: this.drawerId,
      remaining: Math.max(
        0,
        Math.ceil(((this.deadline || 0) - Date.now()) / 1000),
      ),
      word: reveal || drawer ? this.word : null,
      options: drawer && this.phase === "choosing" ? this.options : [],
      mask:
        this.phase === "drawing"
          ? this.config.mode === "hidden"
            ? "Hidden word"
            : this.word
                .split("")
                .map((c, i) =>
                  c === " " ? "/" : this.revealed?.has(i) ? c : "_",
                )
                .join(" ")
          : "",
      guessed: [...this.guessed],
      messages: this.messages,
    };
  }
  broadcast() {
    for (const p of this.players)
      this.io.to(p.id).emit("state", this.view(p.id));
  }
  start(id) {
    if (id !== this.hostId) throw Error("Only the host can start");
    if (!["lobby", "finished"].includes(this.phase))
      throw Error("Game is already running");
    if (this.players.length < 2) throw Error("At least two players required");
    if (this.players.some((p) => p.id !== id && !p.ready))
      throw Error("Wait for everyone to ready up");
    this.players.forEach((p) => (p.score = 0));
    this.round = 1;
    this.queue = this.players.map((p) => p.id);
    this.next();
  }
  next() {
    if (this.players.length < 2) return this.reset();
    while (
      this.queue.length &&
      !this.players.some((p) => p.id === this.queue[0])
    )
      this.queue.shift();
    if (!this.queue.length) {
      this.round++;
      if (this.round > this.config.rounds) {
        this.round = this.config.rounds;
        this.phase = "finished";
        this.deadline = 0;
        this.system("Game complete! Check the final leaderboard.");
        return this.broadcast();
      }
      this.queue = this.players.map((p) => p.id);
    }
    this.drawerId = this.queue.shift();
    this.phase = "choosing";
    this.word = null;
    this.guessed.clear();
    this.revealed = new Set();
    this.strokes = [];
    this.active = null;
    this.options = [...WORDS]
      .sort(() => Math.random() - 0.5)
      .slice(0, this.config.wordCount);
    this.deadline = Date.now() + (this.timing.chooseMs || 15000);
    this.io.to(this.id).emit("canvas", []);
    this.broadcast();
  }
  choose(id, word) {
    if (
      this.phase !== "choosing" ||
      id !== this.drawerId ||
      !this.options.includes(word)
    )
      throw Error("Invalid word selection");
    this.word = word;
    this.options = [];
    this.phase = "drawing";
    this.started = Date.now();
    this.deadline = this.started + this.config.drawTime * 1000;
    this.broadcast();
  }
  end() {
    if (!["drawing", "choosing"].includes(this.phase)) return;
    this.word ||= this.options[0];
    this.phase = "between";
    this.active = null;
    this.deadline = Date.now() + (this.timing.breakMs || 5000);
    this.system(`The word was ${this.word}.`);
    this.broadcast();
  }
  tick() {
    if (
      ["choosing", "drawing", "between"].includes(this.phase) &&
      Date.now() >= this.deadline
    ) {
      if (this.phase === "choosing")
        this.choose(this.drawerId, this.options[0]);
      else if (this.phase === "drawing") this.end();
      else this.next();
    } else if (this.phase === "drawing") {
      const count = Math.min(
        this.config.hints,
        Math.floor(
          (Date.now() - this.started) /
            ((this.config.drawTime * 1000) / (this.config.hints + 1)),
        ),
      );
      while (
        this.revealed.size < count &&
        this.revealed.size < this.word.length - 1
      ) {
        const index = [...this.word].findIndex(
          (c, i) => c !== " " && !this.revealed.has(i),
        );
        if (index < 0) break;
        this.revealed.add(index);
      }
    }
    if (this.lastSecond !== Math.floor(Date.now() / 1000)) {
      this.lastSecond = Math.floor(Date.now() / 1000);
      this.broadcast();
    }
  }
  guess(id, text) {
    if (typeof text !== "string" || !text.trim() || text.length > 200)
      throw Error("Message must contain 1–200 characters");
    const p = this.players.find((p) => p.id === id);
    if (
      this.phase === "drawing" &&
      (id === this.drawerId || this.guessed.has(id))
    )
      throw Error("Chat unlocks at the end of this turn");
    if (this.phase === "drawing" && normalize(text) === normalize(this.word)) {
      const points =
        100 +
        Math.ceil(
          (400 * Math.max(0, this.deadline - Date.now())) /
            (this.config.drawTime * 1000),
        ) +
        Math.max(0, 100 - this.guessed.size * 25);
      p.score += points;
      const drawer = this.players.find((p) => p.id === this.drawerId);
      if (drawer) drawer.score += 100;
      this.guessed.add(id);
      this.system(`${p.name} guessed the word! +${points}`);
      if (this.guessed.size >= this.players.length - 1) this.end();
    } else {
      this.messages.push({ name: p.name, text: text.trim(), kind: "chat" });
      this.messages = this.messages.slice(-100);
    }
    this.broadcast();
  }
  draw(id, event, data) {
    if (id !== this.drawerId || this.phase !== "drawing")
      throw Error("Only the active drawer can draw");
    if (event === "clear") {
      this.strokes = [];
      this.active = null;
      this.io.to(this.id).emit("canvas", []);
      return;
    }
    if (event === "undo") {
      this.strokes.pop();
      this.active = null;
      this.io.to(this.id).emit("canvas", this.strokes);
      return;
    }
    if (event === "end") {
      this.active = null;
      return;
    }
    if (
      !data ||
      !Number.isFinite(data.x) ||
      !Number.isFinite(data.y) ||
      data.x < 0 ||
      data.x > 1 ||
      data.y < 0 ||
      data.y > 1
    )
      throw Error("Invalid drawing coordinates");
    if (event === "start") {
      if (this.strokes.length >= 1500)
        throw Error("Canvas limit reached; clear it");
      if (
        !/^#[0-9a-f]{6}$/i.test(data.color) ||
        !Number.isFinite(data.size) ||
        data.size < 1 ||
        data.size > 40
      )
        throw Error("Invalid brush");
      this.active = {
        color: data.color,
        size: data.size,
        points: [{ x: data.x, y: data.y }],
      };
      this.strokes.push(this.active);
      this.io.to(this.id).emit("stroke", { event: "start", ...data });
    } else if (
      event === "move" &&
      this.active &&
      this.active.points.length < 3000
    ) {
      this.active.points.push({ x: data.x, y: data.y });
      this.io
        .to(this.id)
        .emit("stroke", { event: "move", x: data.x, y: data.y });
    }
  }
  reset() {
    this.phase = "lobby";
    this.drawerId = null;
    this.word = null;
    this.options = [];
    this.deadline = 0;
    this.strokes = [];
    this.guessed.clear();
    this.players.forEach((p) => (p.ready = false));
    this.io.to(this.id).emit("canvas", []);
    this.system("Waiting for at least two players.");
    this.broadcast();
  }
  remove(id) {
    const p = this.players.find((p) => p.id === id);
    this.players = this.players.filter((p) => p.id !== id);
    if (!this.players.length) {
      clearInterval(this.timer);
      this.onEmpty(this.id);
      return;
    }
    if (this.hostId === id) this.hostId = this.players[0].id;
    this.system(`${p?.name || "Player"} left`);
    if (!["lobby", "finished"].includes(this.phase)) {
      if (this.players.length < 2) return this.reset();
      if (id === this.drawerId) this.end();
      else if (
        this.phase === "drawing" &&
        this.players
          .filter((p) => p.id !== this.drawerId)
          .every((p) => this.guessed.has(p.id))
      )
        this.end();
    }
    this.broadcast();
  }
}
