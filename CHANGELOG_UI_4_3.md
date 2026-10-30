# UI v4.3 — Region dropdown and lighter home page

- **Region** uses a React button/listbox. It is **not a native `<select>`** and therefore cannot invoke a white Windows dropdown. Eight region names always render in the dark menu, including when no region is chosen.
- Selected region is propagated to the game room and kept in local storage (no backend event names changed).
- Added Escape, Arrow Up and Arrow Down keyboard support, outside-click close, selected checkmark, and high-contrast styling.
- Removed four cartoon mascot strip items, removed extra celebratory sticker, and left a clean rocket illustration with only two small character accents.
- Separate Windows port **3017** and versioned assets avoid confusing an older app still serving on `localhost:3000`.
- `START_WINDOWS.bat` installs dependencies if required and builds the source before launching. It opens `http://localhost:3017/?ui=v4.3`.
- If you still see the white region popup, confirm the address bar says **3017** and not **3000**, then do Ctrl+Shift+R.
- Company assignment's real-time room/game Socket.IO logic is unchanged.
