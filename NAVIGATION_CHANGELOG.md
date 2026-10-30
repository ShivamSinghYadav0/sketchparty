# Navigation and visual polish — v5

- Header and footer menu items now open direct React views, rather than anchor-scrolling.
- Browser URL retains `?page=...` and Back/Forward is handled through `popstate`.
- Removed home-page stacking of About, Features, FAQ and How to Play.
- Cleaner headings, typography and lighter content separators; retained dark blue/green/gold themes.
- Kept existing login/region picker, host/join, lobby, real-time drawing, chat and winner gameplay intact.
- `PLAY NOW` returns to login, focuses nickname input.
- Existing invite links `/?room=CODE` remain supported.
- Source files plus prebuilt dist included; normal `npm ci && npm run build` recommended for hosting.
- Tested browser navigation on desktop and mobile using inline preview. Hosting and full multiplayer test not verified in this environment.
