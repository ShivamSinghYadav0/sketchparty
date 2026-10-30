@echo off
setlocal
cd /d "%~dp0"
echo ====================================================
echo  SKETCHPARTY v6.1 - FINAL BUILD AND AUTOMATED TESTS
echo ====================================================
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js not found. Install Node.js 22 or newer.
  pause
  exit /b 1
)
if not exist "node_modules\react\package.json" (
  echo Installing dependencies...
  call npm ci
  if errorlevel 1 goto fail
)
call npm run build
if errorlevel 1 goto fail
call npm test
if errorlevel 1 goto fail
echo.
echo PASS: Production build and all automated tests completed.
echo Next: Commit to GitHub and deploy to Render.
pause
exit /b 0
:fail
echo.
echo FAIL: See the error above and share it for debugging.
pause
exit /b 1
