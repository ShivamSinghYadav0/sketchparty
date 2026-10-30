# Sketchparty v6.2 – Word Mode Dropdown Fix

## Fixed
- Replaced Windows-native **Word mode** select (white blank popup on dark backgrounds) with a fully themed custom dropdown.
- **Normal** and **Hidden** are readable and selectable; options open above their field to remain visible next to the Create Game button.
- Supported keyboard operation (Enter/Space to open, arrow navigation, Escape to close), click outside to close, and visible selected checkmark.
- Kept server-side word-mode values (`normal`, `hidden`) and all multiplayer gameplay logic unchanged.

## Windows
1. Close old Sketchparty server windows.
2. Extract this ZIP to a fresh folder.
3. Run `START_WINDOWS.bat`; it rebuilds source and starts port 3017.
4. In browser use `http://localhost:3017/?ui=v6.2`, refresh with Ctrl+Shift+R.
5. Choose Host a Game > Game settings > Word mode; verify Normal and Hidden appear on dark menu.

## Tests
Run `npm ci`, `npm run build`, `npm test` to rebuild fingerprinted frontend bundles and run tests.
