@echo off
cd /d "%~dp0"

echo [1/3] Copie _delivery ^-^> racine...
cd ..
powershell -NoProfile -Command "Copy-Item -Recurse -Force '.\Vigie_City\_delivery\*' '.'"
cd Vigie_City
echo OK

echo [2/3] Git add + commit...
git add -A
git commit -m "feat: J8.6 — timeline visuelle mes-signalements (dots colorés par statut + ligne connectante + entrée Soumission)"
git push

echo.
echo Done! Press any key to close.
pause
