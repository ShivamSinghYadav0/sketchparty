# Word Mode Dropdown — v6.3

The old screenshot showed the native Windows option popup (white empty area). The project code already used a custom picker in v6.2, so the likely cause was an old server/build on localhost:3017. This update isolates the running version on **port 3026** and exposes `/api/build-info` to confirm the correct server.

## Verify on Windows
1. Extract this ZIP to a **new folder**. Do not overwrite the old folder.
2. Double click `START_WINDOWS.bat`. It installs packages if needed, builds, checks that port 3026 is clear, starts server, and checks `/api/build-info` before opening the browser.
3. Open `http://localhost:3026/?ui=v6.3`. Avoid 3017 and 3000. Use Ctrl+Shift+R if needed.
4. Navigate to Game Settings → Word mode. A small **v6.3** label should appear; click the control. Both **Normal** and **Hidden** appear as dark buttons in an accessible listbox, above the field.
5. Choose Hidden, verify label changes, then choose Normal again.
6. Visit `http://localhost:3026/api/build-info` to see `version: 6.3` and `wordMode: custom-listbox`.

This changes no game/scoring logic. If a white native popup appears, you are using an older server/browser tab or another project directory. The server will refuse to start if port 3026 is already occupied; it will not silently show a different version.

## Validation note
The bundled `dist` files were synchronized for this fix. Running `npm run build` on a normal Windows machine regenerates optimized, fingerprinted assets from the updated source. Full npm build may not be available in an offline environment without dependencies.
