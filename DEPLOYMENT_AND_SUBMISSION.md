# Sketchparty — Deployment and Company Submission (29 October 2026)

## Current verification status

- User confirmed that the two-browser manual multiplayer flow in Step 2 was completed locally.
- Existing source and `dist/` are included. Automated unit tests are run separately below.
- **Public deployment URL: not yet created or verified.** Do not claim the assignment is submitted or hosted until the steps below succeed.
- The current working ZIP is cleaned of `node_modules/`, build caches, local `.env`, and logs before publication.

## 1. Verify on a Windows PC

Install Node.js 22.12+ or current Node.js 24 LTS, then run in the extracted `sketchparty` directory:

```powershell
npm ci
npm run build
npm test
```

Fix any failed command before deploying. `START_WINDOWS.bat` is for running the game locally on port 3017, not a public deployment.

## 2. Create the GitHub repository

Recommended: GitHub Desktop. Choose **File → Add local repository**. If prompted choose **Create a Repository** in the extracted `sketchparty` folder. Commit the files and select **Publish repository**. Confirm `package.json`, `package-lock.json`, `render.yaml`, `client`, `server`, `tests`, `README.md` and `ARCHITECTURE.md` are present in the remote repository. Keep `node_modules`, `.env`, and secrets out of the repository.

Alternatively, create a new empty GitHub repository named `sketchparty` and use Git Bash/PowerShell:

```powershell
git init
git add .
git commit -m "Complete Sketchparty full-stack assignment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sketchparty.git
git push -u origin main
```

Do not copy the example username literally. GitHub may request sign-in/token via your local credential manager.

## 3. Deploy one full-stack Render Web Service

1. Open https://dashboard.render.com/ and sign in.
2. Select **New → Web Service**, connect GitHub, and choose your `sketchparty` repo.
3. Configure: **Language = Node**, **Root Directory = blank (repo root)**, **Build Command = `npm ci --include=dev && npm run build`**, **Start Command = `npm start`**, **Health Check = `/api/health`**. Select a supported plan (Free for demonstration, if offered). The repository also includes `render.yaml` if you prefer the Render Blueprint flow.
4. Click **Deploy Web Service**. Wait for a *Live* status in Render. Copy the exact `https://...onrender.com` URL assigned by Render. Never guess it.
5. Open the URL in normal and incognito browsers and repeat the full two-player flow: create → join → ready → select word → draw → guess → score → winner → rematch.
6. Run the optional Node smoke check after replacing the URL:

```powershell
node smoke-production.mjs https://YOUR-REAL-APP.onrender.com
```

This checks HTTP health, room endpoint, frontend HTML and Socket.IO polling handshake; **it does not replace the manual two-player test**.

## 4. Fill in the real live URL and submit

Replace `Live deployment URL: PENDING` in `README.md` with the **actual tested URL**. Commit/push this README update to GitHub and make sure Render redeploy completes.

Use this submission template after all checks are green:

> **Project:** Sketchparty — Real-time multiplayer skribbl.io-style drawing and guessing game  
> **Live demo:** [actual tested Render URL]  
> **Source code:** [actual GitHub repository URL]  
> **Stack:** React, TypeScript, Vite, HTML5 Canvas, Express, Socket.IO  
> **Features:** Public/private rooms, invite code, ready/start, timed drawing, secret word choices, live guesses, hints, drawing tools, scores, leaderboard, and winner/rematch.  
> **Testing:** Two-browser multiplayer workflow verified, npm build and tests passed; Render deployment checked with two separate sessions.

Delete or revise any line that is not true. Include architecture and setup explanations by linking to `ARCHITECTURE.md` and `README.md` in the repo.

## Important hosting limitation

Render's Free Web Service can spin down after an idle period and your in-memory rooms will be lost when the service restarts. This is fine to disclose for a coding assignment but should not be described as persistent multiplayer storage.

Resources: https://render.com/docs/deploy-node-express-app | https://render.com/docs/free | https://render.com/docs/websocket
