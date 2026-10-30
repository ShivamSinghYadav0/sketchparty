@echo off
setlocal
cd /d "%~dp0"
set "PORT=3026"
set "APP_URL=http://localhost:3026/?ui=v6.3"
title Sketchparty v6.3 - Word Mode Fix

echo ================================================
echo SKETCHPARTY v6.3 - DARK WORD MODE DROPDOWN
echo New URL: %APP_URL%
echo Old localhost:3017 will show the previous UI.
echo ================================================

where node >nul 2>nul
if errorlevel 1 (
 echo ERROR: Node.js 22 or higher is required.
 goto fail
)

rem Avoid running an old process on this port.
powershell -NoProfile -Command "$p=Get-NetTCPConnection -LocalPort 3026 -State Listen -ErrorAction SilentlyContinue; if($p){exit 3}else{exit 0}"
if errorlevel 1 (
 echo ERROR: Port 3026 already occupied. Close the existing server and rerun.
 goto fail
)

if not exist "node_modules\react\package.json" (
 call npm ci
 if errorlevel 1 goto fail
)
call npm run build
if errorlevel 1 goto fail
start "Sketchparty v6.3 Server" cmd /k "set PORT=3026&& npm start"

for /L %%i in (1,1,15) do (
 timeout /t 1 /nobreak >nul
 powershell -NoProfile -Command "try { $v=Invoke-RestMethod -Uri 'http://127.0.0.1:3026/api/build-info' -TimeoutSec 2; if($v.version -eq '6.3'){exit 0}else{exit 2} } catch { exit 1 }"
 if not errorlevel 1 goto success
)
echo ERROR: New server not responding. Check the other command window.
goto fail
:success
echo Verified v6.3 server running on PORT 3026!
start "" "%APP_URL%"
echo Check the v6.3 label next to Word mode.
exit /b 0
:fail
echo If Word mode opens a WHITE menu, you are viewing an OLD build.
pause
exit /b 1
