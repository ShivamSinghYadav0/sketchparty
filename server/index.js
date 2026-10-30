import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Room, settings } from "./game.js";
export function createApp(timing = {}) {
  const app = express(),
    http = createServer(app),
    io = new Server(http, { maxHttpBufferSize: 16000 });
  const rooms = new Map();
  app.get("/api/health", (_, res) => res.json({ ok: true }));
  app.get("/api/build-info", (_, res) => res.json({ app: "Sketchparty", version: "6.3", wordMode: "custom-listbox", portHint: 3026 }));
  app.get("/api/rooms", (_, res) =>
    res.json(
      [...rooms.values()]
        .filter(
          (r) =>
            r.config.public &&
            r.phase === "lobby" &&
            r.players.length < r.config.maxPlayers,
        )
        .map((r) => ({
          id: r.id,
          host: r.players[0].name,
          players: r.players.length,
          max: r.config.maxPlayers,
          region: r.region,
        })),
    ),
  );
  app.use(express.static(fileURLToPath(new URL("../dist", import.meta.url)), {
    setHeaders(res, filename) {
      res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
    },
  }));
  const allowedRegions = new Set(["india", "asia", "europe", "north-america", "south-america", "middle-east", "africa", "oceania"]);
  const allowedAvatars = new Set(["studio-boy", "studio-girl", "🦊", "🐼", "🐸", "🐨", "🐯", "🐰", "🐙", "🦄", "🐧", "🐻", "🦁", "🐱"]);
  io.on("connection", (socket) => {
    let room = null;
    let rateStart = 0,
      count = 0;
    const guard = (fn) => (data, ack) => {
      try {
        if (Date.now() - rateStart > 1000) {
          rateStart = Date.now();
          count = 0;
        }
        if (++count > 180) throw Error("Too many requests");
        const result = fn(data);
        if (typeof ack === "function") ack({ ok: true, ...result });
      } catch (e) {
        if (typeof ack === "function") ack({ ok: false, error: e.message });
        else socket.emit("notice", e.message);
      }
    };
    const player = (name, region, avatar) => {
      if (typeof name !== "string" || !name.trim() || name.trim().length > 20)
        throw Error("Enter a name (1–20 characters)");
      if (region != null && !allowedRegions.has(region)) throw Error("Choose a valid region");
      if (avatar != null && !allowedAvatars.has(avatar)) throw Error("Choose a valid avatar");
      return { id: socket.id, name: name.trim(), score: 0, ready: false, region: region || "india", avatar: avatar || "🦊" };
    };
    socket.on(
      "create_room",
      guard(({ name, config, region, avatar } = {}) => {
        if (room) throw Error("Leave the current room first");
        if (rooms.size >= 500) throw Error("Server room limit reached");
        const p = player(name, region, avatar);
        settings(config);
        room = new Room(p, config, io, (id) => rooms.delete(id), timing);
        rooms.set(room.id, room);
        socket.join(room.id);
        room.broadcast();
        return { roomId: room.id };
      }),
    );
    socket.on(
      "join_room",
      guard(({ name, code, region, avatar } = {}) => {
        if (room) throw Error("Leave the current room first");
        const target = rooms.get(String(code).trim().toUpperCase());
        if (!target) throw Error("Room not found");
        target.add(player(name, region, avatar));
        room = target;
        socket.join(room.id);
        socket.emit("canvas", room.strokes);
        room.broadcast();
        return { roomId: room.id };
      }),
    );
    const requireRoom = () => {
      if (!room) throw Error("Join a room first");
      return room;
    };
    socket.on(
      "ready",
      guard(() => {
        const r = requireRoom(),
          p = r.players.find((p) => p.id === socket.id);
        if (!["lobby", "finished"].includes(r.phase))
          throw Error("Game in progress");
        p.ready = !p.ready;
        r.broadcast();
      }),
    );
    socket.on(
      "start_game",
      guard(() => requireRoom().start(socket.id)),
    );
    socket.on(
      "word_chosen",
      guard((word) => requireRoom().choose(socket.id, word)),
    );
    socket.on(
      "guess",
      guard((text) => requireRoom().guess(socket.id, text)),
    );
    for (const event of ["start", "move", "end", "undo", "clear"])
      socket.on(
        `draw_${event}`,
        guard((data) => requireRoom().draw(socket.id, event, data)),
      );
    const leave = () => {
      if (room) {
        socket.leave(room.id);
        room.remove(socket.id);
        room = null;
      }
    };
    socket.on("leave_room", guard(leave));
    socket.on("disconnect", leave);
  });
  return {
    app,
    http,
    io,
    rooms,
    close: async () => {
      for (const r of rooms.values()) clearInterval(r.timer);
      await new Promise((resolve) => io.close(resolve));
    },
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { http } = createApp();
  const port =
    Number(process.env.PORT) ||
    Number(process.argv[process.argv.indexOf("--port") + 1]) ||
    3000;
  http.listen(port, "0.0.0.0", () =>
    console.log(`Sketchparty running on port ${port}`),
  );
}
