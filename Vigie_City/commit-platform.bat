@echo off
cd /d "%~dp0"

echo [1/3] Copie _delivery ^-^> racine...
cd ..
powershell -NoProfile -Command "Copy-Item -Recurse -Force '.\Vigie_City\_delivery\*' '.'"
cd Vigie_City
echo OK

echo [2/3] Git add + commit...
git add -A
git commit -m "feat: J4 messagerie Realtime — trigger unread counters, fix useEffect import, badges BottomNav + AdminShell Realtime"
git push

echo.
echo Done! Press any key to close.
pause
