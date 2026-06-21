@echo off
cd /d "%~dp0"

echo [1/3] Copie _delivery ^-^> racine...
cd ..
powershell -NoProfile -Command "Copy-Item -Recurse -Force '.\Vigie_City\_delivery\*' '.'"
cd Vigie_City
echo OK

echo [2/3] Git add + commit...
git add -A
git commit -m "feat: J8.1+J8.5 — météo vigilance EF+widget, agenda citoyen inscriptions+iCal+push J-1, admin max_capacity"
git push

echo.
echo Done! Press any key to close.
pause
