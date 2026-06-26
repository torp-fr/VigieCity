@echo off
cd /d "C:\Users\Baptiste-\VigieCity\Vigie_City"

echo.
echo [GIT] Commit + push - route /auth + icones Android...
echo.

git add _delivery/src/routes/auth.tsx
git add _delivery/src/routes/__root.tsx
git add capacitor.config.json
git add android/app/src/main/assets/capacitor.config.json
git add android/app/src/main/res/mipmap-*/ic_launcher.png
git add android/app/src/main/res/mipmap-*/ic_launcher_round.png
git add android/app/src/main/res/mipmap-*/ic_launcher_foreground.png

git commit -m "J9 mobile: route /auth splash+login, icones Android, server.url /auth"

git push

echo.
echo [OK] Push effectue - Vercel va deployer automatiquement.
echo      Attends ~2 minutes puis relance build_aab.bat
echo.
pause
