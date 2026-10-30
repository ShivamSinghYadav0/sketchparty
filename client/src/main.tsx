import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import "./style.css";
import "./premium.css";
import "./studio-v6.css";

type Player = { id: string; name: string; score: number; ready: boolean; region?: string; avatar?: string };
type Config = { maxPlayers: number; rounds: number; drawTime: number; wordCount: number; hints: number; mode: string; public: boolean };
type State = {
  id: string; hostId: string; players: Player[]; settings: Config; region?: string;
  phase: string; round: number; drawerId: string; remaining: number;
  word: string | null; options: string[]; mask: string; guessed: string[];
  messages: { name: string; text: string; kind: string }[];
};
type Point = { x: number; y: number };
type Stroke = { color: string; size: number; points: Point[] };
type PublicRoom = { id: string; host: string; players: number; max: number; region?: string };

const socket = io();
type Page = "home" | "how-to-play" | "features" | "about" | "faq";
const navItems: {id: Page; label: string}[] = [
  {id: "how-to-play", label: "How to play"}, {id: "features", label: "Features"},
  {id: "about", label: "About"}, {id: "faq", label: "FAQ"},
];
const initialPage = (): Page => {
  const value = new URLSearchParams(location.search).get("page");
  return navItems.some(x => x.id === value) ? value as Page : "home";
};
const initial: Config = { maxPlayers: 8, rounds: 3, drawTime: 80, wordCount: 3, hints: 2, mode: "normal", public: false };
const avatars = ["studio-boy", "studio-girl", "🦊", "🐼", "🐨", "🐯"];
const avatarArt = (value?: string) => value === "studio-boy" ? "/art/studio-boy.webp" : value === "studio-girl" ? "/art/studio-girl.webp" : "";
function PlayerAvatar({value}: {value?:string}) { const art = avatarArt(value); return art ? <img className="portrait-avatar" src={art} alt="Illustrated person avatar"/> : <span>{value || "🎨"}</span>; }
const regions = [
  { value: "india", label: "🇮🇳 India / South Asia" },
  { value: "asia", label: "🌏 East & Southeast Asia" },
  { value: "europe", label: "🇪🇺 Europe" },
  { value: "north-america", label: "🌎 North America" },
  { value: "south-america", label: "🌎 South America" },
  { value: "middle-east", label: "🌍 Middle East" },
  { value: "africa", label: "🌍 Africa" },
  { value: "oceania", label: "🌊 Oceania" },
];
const nameSuggestions = ["DoodleDragon", "PixelPilot", "WobbleWizard", "CaptainCrayon", "MidnightMonkey", "SketchSprout", "RocketRabbit", "JungleJoker", "HoneyHero", "CosmicKoala"];
const themeOptions = [
  { id: "midnight", name: "Midnight blue", emoji: "🌌" },
  { id: "jungle", name: "Jungle pop", emoji: "🌿" },
  { id: "honey", name: "Honey gold", emoji: "🌟" },
];
const colors = ["#17233f", "#ffffff", "#f34f64", "#ff9850", "#ffd24c", "#41c978", "#3dcae6", "#4589f7", "#8650d9", "#ec6dc4", "#92552e", "#888f9e", "#f7b1ac", "#88da9d", "#a9b9ff", "#e9e0fa"];
const regionLabel = (r?: string) => regions.find(x => x.value === r)?.label || "🌐 Global";
const storage = (key: string, fallback: string) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };

function RegionPicker({value, onChange}: {value: string; onChange:(next:string)=>void}) {
  const [opened, setOpened] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!opened) return;
    const onOutside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpened(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpened(false); };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onOutside); document.removeEventListener("keydown", onKey); };
  }, [opened]);
  const selected = regions.find(r => r.value === value);
  return <div ref={root} className={`region-picker ${opened ? "open" : ""}`}>
    <button type="button" className="region-trigger" id="player-region" aria-label="Choose your region" aria-haspopup="listbox" aria-controls="region-options" aria-expanded={opened} onClick={() => setOpened(v => !v)} onKeyDown={e => {
      if (["ArrowDown", "Enter", " "].includes(e.key) && !opened) { e.preventDefault(); setOpened(true); }
    }}>
      <span className="region-trigger-text">{selected ? selected.label : "Select a region"}</span><span aria-hidden="true" className="region-chevron">⌄</span>
    </button>
    {opened && <div className="region-menu" id="region-options" role="listbox" aria-label="Available regions" onKeyDown={e => {
      if (e.key === "Escape") { setOpened(false); root.current?.querySelector<HTMLButtonElement>(".region-trigger")?.focus(); }
      const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>(".region-option") || []);
      const at = buttons.findIndex(b => b === document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); buttons[(at + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus(); }
    }}>
      <div className="region-menu-heading">CHOOSE YOUR REGION <span>8 AVAILABLE</span></div>
      {regions.map(r => <button type="button" key={r.value} role="option" aria-selected={r.value === value} className={`region-option ${r.value === value ? "selected" : ""}`} onClick={() => {onChange(r.value); setOpened(false); root.current?.querySelector<HTMLButtonElement>(".region-trigger")?.focus();}}><span className="region-option-label">{r.label}</span>{r.value === value && <span className="region-option-check">✓</span>}</button>)}
    </div>}
  </div>;
}

/** Accessible, fully themed menu: native Windows select popups ignore dark CSS. */
function WordModePicker({value, onChange}: {value:string; onChange:(next:string)=>void}) {
  const [opened, setOpened] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const options = [{value:"normal", label:"Normal"}, {value:"hidden", label:"Hidden"}];
  useEffect(() => {
    if (!opened) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpened(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpened(false);
        root.current?.querySelector<HTMLButtonElement>(".word-mode-trigger")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [opened]);
  const selected = options.find(option => option.value === value) ?? options[0];
  const choose = (next: string) => {
    onChange(next);
    setOpened(false);
    root.current?.querySelector<HTMLButtonElement>(".word-mode-trigger")?.focus();
  };
  return <div className={`word-mode-picker ${opened ? "open" : ""}`} ref={root}>
    <button type="button" className="word-mode-trigger" aria-label="Word mode" aria-haspopup="listbox" aria-controls="word-mode-options" aria-expanded={opened} onClick={() => setOpened(o => !o)} onKeyDown={e => {
      if (!opened && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); setOpened(true); }
    }}>
      <span>{selected.label}</span><span aria-hidden="true" className="word-mode-chevron">⌄</span>
    </button>
    {opened && <div className="word-mode-options" id="word-mode-options" role="listbox" aria-label="Word mode options" onKeyDown={e => {
      const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>(".word-mode-option") || []);
      const active = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (["ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); buttons[(active + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus(); }
    }}>
      {options.map(option => <button key={option.value} type="button" role="option" aria-selected={option.value === value} className={`word-mode-option ${option.value === value ? "selected" : ""}`} onClick={() => choose(option.value)}><span>{option.label}</span>{option.value === value && <span className="word-mode-check" aria-hidden="true">✓</span>}</button>)}
    </div>}
  </div>;
}

function RocketDoodle() {
  return <svg className="rocket-art" viewBox="0 0 520 340" role="img" aria-label="Illustrated rocket, stars and doodles on a drawing canvas">
    <defs><linearGradient id="rocketFill" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#ffb456"/><stop offset="1" stopColor="#ff715c"/></linearGradient></defs>
    <g transform="translate(250 168) rotate(34)">
      <path d="M-42 63 Q-76 82 -74 123 L-30 99 M42 63 Q76 82 74 123 L30 99" fill="#5b8bfe" stroke="#202448" strokeWidth="5" strokeLinejoin="round"/>
      <path d="M-44 64 Q-52 -34 0 -108 Q52 -34 44 64 L25 107 H-25 Z" fill="#fff7e8" stroke="#202448" strokeWidth="6" strokeLinejoin="round"/>
      <path d="M0 -108 Q29 -69 39 -27 H-39 Q-29 -69 0 -108Z" fill="url(#rocketFill)" stroke="#202448" strokeWidth="5" strokeLinejoin="round"/>
      <circle cx="0" cy="13" r="23" fill="#9fe5fc" stroke="#202448" strokeWidth="5"/><circle cx="-7" cy="5" r="8" fill="#ffffffa8"/>
      <path d="M-20 105 L-12 146 L0 127 L12 146 L20 105" fill="#ffb947" stroke="#202448" strokeWidth="4" strokeLinejoin="round"/>
    </g>
    <g strokeLinecap="round" fill="none"><path d="M64 70 l10 17 l19 3 l-15 14 l3 19 l-17 -9 l-17 9 l4 -20 l-15 -13 l20 -3Z" stroke="#ffbe46" strokeWidth="5"/>
      <path d="M404 60 q35 -31 55 6" stroke="#8e78ff" strokeWidth="6" strokeDasharray="2 16"/>
      <path d="M107 245 Q134 218 158 251" stroke="#5bd4bc" strokeWidth="8"/>
      <path d="M434 215 l-11 13 m18 7 l-18 -4" stroke="#fc7fa0" strokeWidth="6"/>
      <path d="M130 40 q10 -18 21 0 q10 19 20 0" stroke="#5ad2be" strokeWidth="6"/>
    </g>
    <circle cx="413" cy="119" r="9" fill="#7cd5d5"/><circle cx="90" cy="170" r="7" fill="#ff9c8e"/><circle cx="420" cy="288" r="6" fill="#ffca58"/>
    <text x="64" y="307" fontFamily="Fredoka, sans-serif" fontSize="26" fontWeight="600" fill="#8c78f9" transform="rotate(-9 64 307)">is it a rocket?!</text>
  </svg>;
}

function App() {
  const [page, setPage] = useState<Page>(initialPage);
  const playFocus = useRef(false);
  const navigate = (next: Page) => {
    setPage(next);
    const url = new URL(location.href);
    if (next === "home") url.searchParams.delete("page");
    else url.searchParams.set("page", next);
    try { history.pushState({view: next}, "", url.pathname + url.search); }
    catch { /* Embedded previews without a normal origin still navigate in-app. */ }
    window.scrollTo({top: 0, behavior: "instant"});
  };
  const openPlay = () => {
    if (page === "home") document.getElementById("player-name")?.focus();
    else { playFocus.current = true; navigate("home"); }
  };
  useEffect(() => {
    const onBack = () => { setPage(initialPage()); window.scrollTo(0, 0); };
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);
  useEffect(() => {
    if (page === "home" && playFocus.current) {
      playFocus.current = false;
      document.getElementById("player-name")?.focus();
    }
  }, [page]);
  const [name, setName] = useState(storage("sketch-name", ""));
  const [region, setRegion] = useState(storage("sketch-region", ""));
  const [avatar, setAvatar] = useState(storage("sketch-avatar", "studio-boy"));
  const [theme, setTheme] = useState(storage("sketch-theme", "midnight"));
  const pickTheme = (next: string) => { setTheme(next); try { localStorage.setItem("sketch-theme", next); } catch { /* optional preference */ } };
  const [code, setCode] = useState(new URLSearchParams(location.search).get("room") || "");
  const [config, setConfig] = useState<Config>(initial);
  const [state, setState] = useState<State | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState(colors[0]);
  const [size, setSize] = useState(6);
  const [eraser, setEraser] = useState(false);
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [roomsShown, setRoomsShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const drawing = useRef(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  const paint = () => {
    const c = canvas.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const s of strokes.current) {
      const first = s.points[0]; if (!first) continue;
      ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.size;
      ctx.beginPath(); ctx.arc(first.x * c.width, first.y * c.height, s.size / 2, 0, 2 * Math.PI); ctx.fill();
      ctx.beginPath(); ctx.moveTo(first.x * c.width, first.y * c.height);
      for (const p of s.points.slice(1)) ctx.lineTo(p.x * c.width, p.y * c.height);
      ctx.stroke();
    }
  };
  useEffect(() => {
    const onState = (s: State) => setState(s);
    const onCanvas = (s: Stroke[]) => { strokes.current = s; paint(); };
    const onStroke = (d: Point & { event: string; color: string; size: number }) => {
      if (d.event === "start") strokes.current.push({ color: d.color, size: d.size, points: [{ x: d.x, y: d.y }] });
      else strokes.current.at(-1)?.points.push({ x: d.x, y: d.y });
      paint();
    };
    const online = () => { setConnected(true); setError(""); };
    const offline = () => { setConnected(false); setState(null); strokes.current = []; setError("Connection lost. Rejoin once the server is back online."); };
    socket.on("state", onState); socket.on("canvas", onCanvas); socket.on("stroke", onStroke);
    socket.on("notice", setError); socket.on("connect", online); socket.on("disconnect", offline);
    return () => { socket.off("state", onState); socket.off("canvas", onCanvas); socket.off("stroke", onStroke); socket.off("notice", setError); socket.off("connect", online); socket.off("disconnect", offline); };
  }, []);
  useEffect(() => { paint(); }, [state?.id, state?.phase]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: "nearest" }); }, [state?.messages.length]);

  const act = (event: string, data?: unknown, done?: () => void) => {
    setError("");
    socket.timeout(5000).emit(event, data, (err: Error | null, result: { ok: boolean; error?: string }) => {
      if (err) setError("The server did not respond. Please try again.");
      else if (!result?.ok) setError(result?.error || "Something went wrong.");
      else done?.();
    });
  };
  const profileReady = name.trim().length > 0 && !!region && avatars.includes(avatar);
  const enter = (join: boolean, roomCode = code) => {
    if (!profileReady) { setError("Please enter your name and choose a region and avatar first."); return; }
    try { localStorage.setItem("sketch-name", name.trim()); localStorage.setItem("sketch-region", region); localStorage.setItem("sketch-avatar", avatar); } catch { /* Storage may be disabled */ }
    act(join ? "join_room" : "create_room", join ? { name: name.trim(), code: roomCode, region, avatar } : { name: name.trim(), region, avatar, config });
  };
  const browseRooms = () => {
    setRoomsShown(true);
    fetch("/api/rooms").then(r => { if (!r.ok) throw Error(); return r.json(); }).then(setRooms).catch(() => setError("Couldn't load public rooms. Please try again."));
  };
  const isDrawer = state?.drawerId === socket.id;
  const isHost = state?.hostId === socket.id;
  const isLobby = !!state && ["lobby", "finished"].includes(state.phase);
  const me = state?.players.find(p => p.id === socket.id);
  const chatLocked = state?.phase === "drawing" && (isDrawer || state.guessed.includes(socket.id || ""));
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
  };
  const stop = () => { if (drawing.current) socket.emit("draw_end"); drawing.current = false; };
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${location.origin}/?room=${state?.id}`); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError(`Copy this room code to invite a friend: ${state?.id}`); }
  };
  const canDraw = isDrawer && state?.phase === "drawing";
  const sortedPlayers = state ? [...state.players].sort((a, b) => b.score - a.score) : [];
  const roomPhase = state?.phase === "lobby" ? "Waiting room" : state?.phase === "finished" ? "Game over" : state?.phase === "choosing" ? "Choosing word" : state?.phase === "between" ? "Next round soon" : "Game in progress";

  return <div className={`app-shell theme-${theme} ${!state ? "homepage" : "in-game"} ${!state && page !== "home" ? "informational-view" : ""}`}>
    <div className="decor decor-a">✳</div><div className="decor decor-b">✦</div><div className="decor decor-c">✳</div>
    <div className="site-container">
      <header className="site-header">
        <a className="brand" href="/" onClick={e => {e.preventDefault(); if (!state) navigate("home");}} aria-label="Sketchparty home">
          <span className="brand-symbol">✎</span><span>sketch<span className="brand-accent">party</span><small>.io</small></span>
        </a>
        <div className="header-right">
          {!state && <nav className="main-nav" aria-label="Main navigation">{navItems.map(item => <button type="button" key={item.id} className={`nav-link ${page === item.id ? "current" : ""}`} aria-current={page === item.id ? "page" : undefined} onClick={() => navigate(item.id)}>{item.label}</button>)}</nav>}
          <span className="connection"><i className={connected ? "online" : ""}/>{connected ? "Live & ready" : "Connecting…"}</span>
          {!state && <button type="button" className="nav-play" onClick={openPlay}>PLAY NOW <span>↗</span></button>}
        </div>
      </header>
      {error && <div className="alert" role="alert"><span>⚠ {error}</span><button onClick={() => setError("")} aria-label="Dismiss alert">×</button></div>}
      {!state ? <>
        {page === "home" && <>
        <main className="home-layout">
          <section className="hero-area">
            <span className="studio-eyebrow"><span className="studio-dot"/> REAL-TIME DRAW & GUESS</span>
            <h1>Draw together.<br/><span className="text-guess">Guess faster.</span></h1>
            <p className="hero-desc">The drawing game for friends. Create a room, sketch a secret word, and race to guess what everyone draws. No downloads or sign-ups.</p>
            <div className="hero-actions"><button type="button" className="hero-play" onClick={openPlay}>Start playing <span aria-hidden="true">→</span></button><button type="button" className="hero-how" onClick={() => navigate("how-to-play")}>How it works <span aria-hidden="true">↗</span></button></div>
            <div className="studio-preview" aria-label="Illustrative preview of the drawing game, not a live session">
              <div className="studio-preview-top"><span className="studio-preview-mark">GAME PREVIEW</span><span>ROUND 2 / 3</span><span className="studio-preview-timer">◷ 00:48</span></div>
              <div className="studio-preview-main">
                <div className="studio-preview-players"><div className="studio-player"><img src="/art/studio-boy.webp" alt=""/><span><strong>Alex</strong><small>2,450 pts</small></span></div><div className="studio-player"><img src="/art/studio-girl.webp" alt=""/><span><strong>Sam</strong><small>1,860 pts</small></span></div><div className="studio-player"><span className="studio-mini-avatar">S</span><span><strong>Sparky</strong><small>1,240 pts</small></span></div></div>
                <div className="studio-preview-canvas"><div className="studio-preview-word">_ _ _ _ _ _ _ _</div><svg viewBox="0 0 340 220" role="img" aria-label="Simple blue airplane sketch on a white drawing canvas"><g stroke="#214c9a" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M30 133 L139 110 193 44 215 44 198 111 307 131 310 151 196 154 173 185 153 185 155 155 49 158 Z"/><path d="M111 135 L235 135" strokeWidth="4"/><path d="M41 92 l-21 -5 M60 175 l-21 6" stroke="#60a5fa" strokeWidth="4"/></g><g fill="#60a5fa"><circle cx="137" cy="128" r="5"/><circle cx="164" cy="128" r="5"/><circle cx="192" cy="128" r="5"/></g></svg><div className="studio-palette"><i/><i/><i/><i/><i/><i/><i/></div></div>
                <div className="studio-preview-chat"><div className="studio-chat-title">LIVE GUESSES</div><p><b>Sam</b> is it a bird?</p><p><b>Alex</b> a plane?</p><p className="studio-correct">✓ Alex guessed the word!</p></div>
              </div>
              <div className="studio-preview-bottom"><span>◉ Friends-only rooms</span><span>One player draws. Everyone guesses.</span></div>
              <div className="studio-human studio-human-boy"><img src="/art/studio-boy.webp" alt="Illustrated boy gaming"/></div>
              <div className="studio-human studio-human-girl"><img src="/art/studio-girl.webp" alt="Illustrated girl gaming"/></div>
            </div>
            <div className="studio-proof"><span>2–20 players per room</span><span>Private invites</span><span>Live drawing</span></div>
          </section>
          <section className="entry-card" id="play-now" aria-labelledby="entry-title">
            <div className="entry-topline"><span>PLAYER SETUP</span><span className="entry-sticker">NO ACCOUNT NEEDED</span></div>
            <h2 id="entry-title">Ready to play?</h2>
            <p className="entry-subtitle">Set up a nickname and avatar. Host a room or join your friends with an invite code.</p>
            <div className="identity-preview"><div className="identity-avatar"><PlayerAvatar value={avatar}/></div><div><small>YOUR CHARACTER</small><strong>{name.trim() || "Mystery Artist"}</strong><span>{region ? regionLabel(region) : "Pick your region below"}</span></div><span className="identity-star">✦</span></div>
            <div className="label-with-action"><label className="field-label" htmlFor="player-name">YOUR NICKNAME <span>*</span></label><button type="button" className="surprise-name" onClick={() => setName(nameSuggestions[Math.floor(Math.random() * nameSuggestions.length)])}>Random name</button></div>
            <input id="player-name" className="field-input" autoComplete="nickname" maxLength={20} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. RainbowRacer"/>
            <p className="privacy-tip">💡 Pick a fun nickname—please don't use your real name or personal details.</p>
            <label className="field-label" htmlFor="player-region">YOUR REGION <span>*</span></label>
            <RegionPicker value={region} onChange={setRegion}/>
            <div className="field-label avatar-label">CHOOSE AN AVATAR <span>*</span> <span className="selection-note">Your look</span></div>
            <div className="avatar-picker" role="group" aria-label="Choose your avatar">{avatars.map(a => <button key={a} type="button" className={avatar === a ? "avatar-option chosen" : "avatar-option"} aria-label={`Choose ${a} avatar`} aria-pressed={avatar === a} onClick={() => setAvatar(a)}><PlayerAvatar value={a}/></button>)}</div>
            <div className="theme-picker"><div className="field-label">APPEARANCE <span className="selection-note">Make it your vibe!</span></div><div className="theme-options" role="group" aria-label="Choose website colour theme">{themeOptions.map(t => <button key={t.id} type="button" className={`theme-option theme-choice-${t.id} ${theme === t.id ? "active" : ""}`} onClick={() => pickTheme(t.id)} aria-pressed={theme === t.id}><span>{t.emoji}</span><b>{t.name}</b><span className="theme-check">{theme === t.id ? "✓" : ""}</span></button>)}</div></div>
            <div className="create-section">
              <div className="section-heading"><strong>Host a game</strong><span>Customize your party</span></div>
              <div className="room-types" role="group" aria-label="Room visibility"><button className={!config.public ? "room-type active" : "room-type"} aria-pressed={!config.public} onClick={() => setConfig(c => ({ ...c, public: false }))}><span>🔒</span><b>Private room</b><small>Invite your friends</small></button><button className={config.public ? "room-type active" : "room-type"} aria-pressed={config.public} onClick={() => setConfig(c => ({ ...c, public: true }))}><span>🌍</span><b>Public room</b><small>Anyone can join</small></button></div>
              <details className="settings-disclosure"><summary>⚙ Game settings <span>Customize rounds, time & more ▾</span></summary><div className="settings-grid">
                {([ ["maxPlayers", "Players", 2, 20], ["rounds", "Rounds", 2, 10], ["drawTime", "Draw time (sec)", 15, 240], ["wordCount", "Word choices", 1, 5], ["hints", "Hints", 0, 5] ] as const).map(([key, label, min, max]) => <label key={key}>{label}<input type="number" min={min} max={max} value={config[key]} onChange={e => setConfig(c => ({...c, [key]: Number(e.target.value)}))}/></label>)}
                <div className="word-mode-field"><span className="word-mode-label">Word mode <span className="word-mode-version">v6.3</span></span><WordModePicker value={config.mode} onChange={next => setConfig(c => ({...c, mode: next}))}/></div>
              </div></details>
              <button className="cta-button" disabled={!connected || !profileReady} onClick={() => enter(false)}>🚀 Create my game <span>→</span></button>
            </div>
            <div className="separator"><span>or join your friends</span></div>
            <form className="join-form" onSubmit={e => { e.preventDefault(); enter(true); }}><input aria-label="Room invite code" placeholder="Enter invite code" maxLength={12} value={code} onChange={e => setCode(e.target.value.toUpperCase())}/><button disabled={!connected || !profileReady || !code.trim()}>Join →</button></form>
            <button className="explore-link" onClick={browseRooms}>🌎 Browse public rooms <span>↗</span></button>
            {roomsShown && <div className="public-rooms"><div className="public-title">OPEN ROOMS <button onClick={browseRooms}>↻ Refresh</button></div>{rooms.filter(r => !region || !r.region || r.region === region).length === 0 ? <p>No open rooms in your region yet. Create a public room to start!</p> : rooms.filter(r => !region || !r.region || r.region === region).map(r => <button className="public-room" key={r.id} onClick={() => enter(true, r.id)} disabled={!profileReady}><span>🎨 {r.host}'s party<small>{regionLabel(r.region)} · {r.players}/{r.max} players</small></span><b>JOIN →</b></button>)}</div>}
          </section>
        </main>
        <div className="home-shortcuts"><span>PLAY TOGETHER, FROM ANYWHERE</span><button onClick={() => navigate("how-to-play")}>New here? Learn the rules <span aria-hidden="true">↗</span></button><button onClick={() => navigate("features")}>Explore game features <span aria-hidden="true">↗</span></button></div>
        </>}
        {page !== "home" && <main className="info-page" id="content" key={page}>
          <div className="info-masthead"><button type="button" onClick={() => navigate("home")} className="back-home">← Back to game</button><div className="info-eyebrow">SKETCHPARTY / {page.replaceAll("-", " ").toUpperCase()}</div></div>
          {page === "how-to-play" && <>
        <section className="content-section steps-section" id="how-to-play">
          <div className="section-kicker">✳ SO EASY, SO MUCH FUN</div><h2 className="content-title">How to <span>play</span> 🎮</h2><p className="section-description">You don't need to be an artist. If you can doodle a potato, you can play Sketchparty!</p>
          <div className="steps-grid">
            <article className="step-card"><span className="step-number">01</span><div className="step-illustration">🦊<span>✨</span></div><h3>Create your player</h3><p>Choose a silly nickname, pick an animal avatar and select your region. No account needed.</p></article>
            <article className="step-card"><span className="step-number">02</span><div className="step-illustration">🚪<span>🎉</span></div><h3>Make or join a room</h3><p>Start a private game with an invite code or join an open public room in your region.</p></article>
            <article className="step-card"><span className="step-number">03</span><div className="step-illustration">🖍️<span>🎨</span></div><h3>Draw the secret word</h3><p>Take turns picking a word. Use colours, brushes and doodles to help everyone guess.</p></article>
            <article className="step-card"><span className="step-number">04</span><div className="step-illustration">🏆<span>⭐</span></div><h3>Guess & grab points!</h3><p>Type your guesses in chat, earn points for correct answers and race up the leaderboard.</p></article>
          </div>
        </section>
          </>}
          {page === "features" && <>
        <section className="content-section features-section" id="features">
          <div className="section-heading-large"><div><div className="section-kicker">🌟 THE GOOD STUFF</div><h2 className="content-title">More than just <span>doodles.</span></h2><p className="section-description">Everything you need for a laugh-out-loud drawing battle.</p></div><div className="features-sticker">100%<br/><strong>FUN</strong></div></div>
          <div className="features-grid">
            <article className="feature-card"><div className="feature-emoji">👫</div><h3>Play together</h3><p>Invite friends with a code. Each room supports 2–20 players for a proper drawing party.</p><span>FRIEND TIME ↗</span></article>
            <article className="feature-card"><div className="feature-emoji">🖌️</div><h3>Real-time drawing</h3><p>Watch every doodle appear live as the artist draws. Choose brushes, colours, undo and erase.</p><span>GET CREATIVE ↗</span></article>
            <article className="feature-card"><div className="feature-emoji">💬</div><h3>Guess in the chat</h3><p>Type what you think the picture shows. Correct guesses bring a burst of excitement and points.</p><span>THINK FAST ↗</span></article>
            <article className="feature-card"><div className="feature-emoji">👑</div><h3>Race to the top</h3><p>Play multiple rounds, rotate drawing turns, and see who becomes the doodle champion.</p><span>LET'S WIN ↗</span></article>
            <article className="feature-card"><div className="feature-emoji">⚙️</div><h3>Your room, your rules</h3><p>Hosts can choose round count, drawing time, word choices, hints and room visibility.</p><span>MAKE IT YOURS ↗</span></article>
            <article className="feature-card"><div className="feature-emoji">🐼</div><h3>Cute characters</h3><p>Pick your favourite animal, switch up your party colours and make your player card unique.</p><span>BE YOU ↗</span></article>
          </div>
        </section>
          </>}
          {page === "about" && <>
        <section className="about-section" id="about">
          <div className="about-copy"><div className="section-kicker">💛 HELLO, FUTURE DOODLE CHAMPION!</div><h2>What's <em>Sketchparty?</em></h2><p>Sketchparty is an online multiplayer drawing and guessing game inspired by classic Pictionary-style party games. One player gets a secret word and draws it, while everybody else races to guess it.</p><p>It isn't about creating perfect art. It's about funny ideas, wobbly lines, wild guesses and those unforgettable “I KNEW IT!” moments. Play with your friends, family or a group in a shared room.</p><div className="about-pills"><span>🎨 Creative play</span><span>🧠 Quick thinking</span><span>🎉 Group fun</span></div><button type="button" className="about-cta" onClick={openPlay}>Start a game ↗</button></div>
          <div className="about-art" aria-label="Cartoon drawing party illustration"><div className="about-paper"><span className="paper-top">TODAY'S MASTERPIECE ✨</span><div className="about-paper-emoji">🍕</div><div className="about-paper-scribble">IS IT PIZZA?!</div><span className="paper-bottom">⭐ 450 POINTS ⭐</span></div><span className="about-float about-float-a">🖍️</span><span className="about-float about-float-b">👀</span><span className="about-float about-float-c">💬 NICE!</span></div>
        </section>
          </>}
          {page === "faq" && <>
        <section className="content-section faq-section" id="faq"><div className="section-kicker">❓ LITTLE QUESTIONS, BIG FUN</div><h2 className="content-title">Questions? <span>We got you.</span></h2><div className="faq-grid"><div className="faq-list">
          <details><summary>Is Sketchparty free to play?<span>＋</span></summary><p>Yes! You can create or join a drawing game without paying or making an account.</p></details>
          <details><summary>Can I play with my friends?<span>＋</span></summary><p>Of course! Create a private room and share its invite code or link. Your friends can join from their browsers.</p></details>
          <details><summary>How do I earn points?<span>＋</span></summary><p>Guess another player's secret word correctly during the drawing round. Correct guesses earn points and the leaderboard tracks everyone's score.</p></details>
          <details><summary>What if I can't draw?<span>＋</span></summary><p>That's half the fun! All you need is a mouse or touchscreen. Your friends have to figure out whatever you doodle.</p></details>
          <details><summary>Are public rooms moderated?<span>＋</span></summary><p>Not currently. Public rooms include live player chat. Younger players should use private rooms with people they know and have appropriate adult supervision.</p></details>
        </div><div className="faq-side"><div className="faq-mascot">🐸</div><h3>Still thinking?</h3><p>Pick an avatar, invite a buddy and see how fun terrible drawings can be!</p><button type="button" onClick={openPlay}>LET'S DRAW! ↗</button></div></div></section>
          </>}
          <div className="info-end"><span>NO DOWNLOADS. NO LONG SIGN-UPS.</span><button type="button" onClick={openPlay}>Create a room <span aria-hidden="true">↗</span></button></div>
        </main>}
      </> : <>
        <div className="game-intro"><div><span className="mini-pill">🎮 {roomPhase.toUpperCase()}</span><h1>{state.phase === "finished" ? "Match complete" : state.phase === "lobby" ? "Game lobby" : "The drawing arena"} <span>✳</span></h1><p>{state.phase === "finished" ? "See the final scores, then play again." : "Every doodle counts. Draw, guess, win."}</p></div><div className="room-actions"><div className="room-code"><small>ROOM CODE</small><strong>{state.id}</strong></div><button className="invite-button" onClick={copy}>{copied ? "✓ Copied!" : "↗ Invite friends"}</button><button className="leave-button" onClick={() => act("leave_room", null, () => {setState(null); strokes.current = [];})}>Leave ×</button></div></div>
        <div className="match-hud"><span>🎮 {state.settings.public ? "Public" : "Private"} match <b>•</b> {regionLabel(state.region)}</span><span>👥 {state.players.length} / {state.settings.maxPlayers} players</span><span>⚡ {state.settings.rounds} rounds <b>•</b> {state.settings.drawTime}s turns</span></div>
        <main className="game-layout">
          <aside className="game-panel leaderboard"><div className="panel-heading"><strong>🏆 Leaderboard</strong><span>{state.players.length} PLAYERS</span></div><div className="player-list">{sortedPlayers.map((p, i) => <div className={`player-row ${p.id === socket.id ? "self" : ""} ${p.id === state.drawerId ? "drawing-now" : ""}`} key={p.id}><span className="player-rank">#{i + 1}</span><span className="player-avatar"><PlayerAvatar value={p.avatar}/></span><div className="player-info"><strong>{p.name}{p.id === socket.id && <i> YOU</i>}</strong><small>{state.phase === "finished" ? i === 0 ? "★ Champion" : "Final score" : state.phase === "lobby" ? p.id === state.hostId ? "♛ Host" : p.ready ? "✓ Ready" : "Not ready" : p.id === state.drawerId ? "✎ Drawing now" : state.guessed.includes(p.id) ? "✓ Guessed it!" : p.ready ? "✓ Ready to play" : "Waiting"}</small></div><b className="player-score">{p.score}</b></div>)}</div><div className="leaderboard-footer"><span>✦</span> Every guess earns you glory! <span>✦</span></div></aside>
          <section className="game-panel drawing-panel"><div className="drawing-top"><div className={`timer-badge ${state.phase === "drawing" && state.remaining <= 10 ? "time-low" : ""}`}><span>◷</span><strong>{["drawing", "choosing", "between"].includes(state.phase) ? `${state.remaining}s` : "—"}</strong></div><div className="word-area"><small>{state.phase === "finished" ? "FINAL RESULTS" : state.phase === "lobby" ? "WAITING FOR PLAYERS" : state.phase === "drawing" ? isDrawer ? "YOUR WORD — DRAW IT!" : "GUESS THE SECRET WORD" : state.phase === "choosing" ? "CHOOSE YOUR WORD" : state.phase === "between" ? "THE ANSWER WAS" : "GET READY TO PLAY"}</small><strong>{state.phase === "drawing" ? isDrawer ? state.word : state.mask : state.phase === "between" ? state.word : state.phase === "choosing" ? "Picking a word…" : state.phase === "finished" ? "🏆 Final scores" : "Invite your friends"}</strong></div><span className="round-badge">ROUND <b>{Math.min(state.round || 1,state.settings.rounds)}/{state.settings.rounds}</b></span></div>
            <div className="canvas-area"><canvas ref={canvas} width={960} height={600} aria-label="Live drawing canvas" className={canDraw ? "can-draw" : "view-only"} onPointerDown={e => { if (!canDraw) return; e.currentTarget.setPointerCapture(e.pointerId); drawing.current = true; socket.emit("draw_start", {...point(e), color: eraser ? "#ffffff" : color, size: eraser ? 28 : size}); }} onPointerMove={e => { if (drawing.current) socket.emit("draw_move", point(e)); }} onPointerUp={stop} onPointerCancel={stop}/>
              {isLobby && <div className="canvas-overlay"><div className="overlay-emoji">{state.phase === "finished" ? "🏆" : "🎨"}</div><h2>{state.phase === "finished" ? `${sortedPlayers.filter(p => p.score === sortedPlayers[0]?.score).map(p => p.name).join(" & ")} wins!` : "Your lobby is ready"}</h2><p>{state.phase === "finished" ? "Final results are in. Ready for another challenge?" : "Invite your friends, then start the round. Everyone gets a turn to draw."}</p>{isHost ? <><button className="cta-button overlay-button" onClick={() => act("start_game")}>{state.phase === "finished" ? "↻ Rematch" : "▶ Start match"} →</button>{state.players.length < 2 && <small>At least 2 players needed to start</small>}{state.players.length >= 2 && state.players.some(p => p.id !== state.hostId && !p.ready) && <small>Waiting for everyone to ready up…</small>}</> : <button className="cta-button overlay-button" onClick={() => act("ready")}>{me?.ready ? "✓ Ready — change" : state.phase === "finished" ? "Ready for rematch" : "✓ I'm ready"}</button>}<div className="lobby-invite">Invite code <b>{state.id}</b> <button onClick={copy}>{copied ? "✓ Copied" : "Copy ↗"}</button></div></div>}
              {state.phase === "choosing" && <div className="canvas-overlay"><div className="overlay-emoji">💭</div><h2>{isDrawer ? "Choose your secret word!" : `${state.players.find(p => p.id === state.drawerId)?.name || "The artist"} is choosing…`}</h2><p>{isDrawer ? "Pick one to draw. Keep it secret from the guessers!" : "Get those guessing skills warmed up!"}</p>{isDrawer && <div className="word-choices">{state.options.map(w => <button key={w} onClick={() => act("word_chosen", w)}>{w} ✎</button>)}</div>}</div>}
              {state.phase === "between" && <div className="result-ribbon">✨ The word was <strong>{state.word}</strong> · Next turn in {state.remaining}s</div>}
            </div>
            <div className="drawing-toolbar"><div className="tool-top"><strong>✎ DRAWING TOOLS</strong><span>{canDraw ? "Have fun creating!" : "Only the active drawer can paint"}</span></div><div className="tools-row"><div className="color-palette">{colors.map(c => <button type="button" key={c} aria-label={`Paint color ${c}`} title={c} className={color === c && !eraser ? "swatch selected" : "swatch"} style={{background:c}} disabled={!canDraw} onClick={() => {setColor(c); setEraser(false);}}/>)}</div><div className="tool-controls"><label className="size-control">Size<input aria-label="Brush size" type="range" min="2" max="30" value={size} disabled={!canDraw} onChange={e => setSize(Number(e.target.value))}/></label><button className={eraser ? "tool-button selected" : "tool-button"} disabled={!canDraw} onClick={() => setEraser(!eraser)} title="Eraser">◻ <span>Eraser</span></button><button className="tool-button" disabled={!canDraw} onClick={() => act("draw_undo")} title="Undo last stroke">↶ <span>Undo</span></button><button className="tool-button" disabled={!canDraw} onClick={() => act("draw_clear")} title="Clear canvas">▤ <span>Clear</span></button></div></div></div>
          </section>
          <aside className="game-panel chat-panel"><div className="panel-heading"><strong>💬 Live chat</strong><span>GUESS HERE!</span></div><div className="chat-hint">💡 The faster you guess, the more points you earn!</div><div className="messages" aria-live="polite">{state.messages.length === 0 && <div className="empty-messages">💬<p>It's a little quiet here.<br/>Say hello to your fellow artists!</p></div>}{state.messages.map((m, i) => <div className={m.kind === "system" ? "system-message" : "chat-message"} key={i}>{m.kind === "system" ? <><span>✦</span> {m.text}</> : <><strong>{m.name}</strong><span>{m.text}</span></>}</div>)}<div ref={chatEnd}/></div><form className="chat-form" onSubmit={e => {e.preventDefault(); if (message.trim()) act("guess", message, () => setMessage(""));}}><input aria-label="Guess or chat" maxLength={200} disabled={chatLocked} value={message} onChange={e => setMessage(e.target.value)} placeholder={chatLocked ? "Wait for the next turn…" : state.phase === "drawing" ? "Type your guess…" : "Say something fun…"}/><button className="send-button" disabled={chatLocked || !message.trim()} aria-label="Send guess or chat">➤</button></form></aside>
        </main>
      </>}
      <footer className="site-footer"><span>© Sketchparty • Made for doodles, giggles & good guesses. 🎨</span>{!state && <nav className="footer-links" aria-label="Footer navigation">{navItems.map(item => <button type="button" key={item.id} onClick={() => navigate(item.id)}>{item.label}</button>)}</nav>}<span>DRAW • GUESS • LAUGH • REPEAT ✦</span></footer>
    </div>
  </div>;
}
createRoot(document.getElementById("root")!).render(<App/>);
