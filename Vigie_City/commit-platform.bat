@echo off
cd /d "%~dp0"

echo [1/3] Copie _delivery ^-^> racine...
cd ..
powershell -NoProfile -Command "Copy-Item -Recurse -Force '.\Vigie_City\_delivery\*' '.'"
cd Vigie_City
echo OK

echo [2/3] Git add + commit...
git add -A
git commit -m "fix: force rebuild Vercel pour injecter VITE_POSTHOG_KEY dans le bundle Vite"
git push

echo.
echo Done! Press any key to close.
pause
