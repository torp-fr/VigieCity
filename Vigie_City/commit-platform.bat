@echo off
cd /d "%~dp0"

echo [1/3] Copie _delivery ^-^> racine...
cd ..
powershell -NoProfile -Command "Copy-Item -Recurse -Force '.\Vigie_City\_delivery\*' '.'"
cd Vigie_City
echo OK

echo [2/3] Git add + commit...
git add -A
git commit -m "feat: J7 email templates Resend white-label — send-email v3 (user_id+collectivity_id auto-resolve), report_updated trigger signalements"
git push

echo.
echo Done! Press any key to close.
pause
