@echo off
cd /d "%~dp0"

echo [1/3] Copie _delivery -^> racine git...
cd ..
powershell -NoProfile -Command "Copy-Item -Recurse -Force '.\Vigie_City\_delivery\*' '.'"
cd Vigie_City
echo OK

echo [2/3] Git add + commit...
git add -A
git commit -m "fix: audit P0+P1+P2 — BUG-001 navigate /admin/, BUG-002 usePlatformAuth user_roles, BUG-003 types.ts regenere, BUG-004 nav Prospection, BUG-005 SW postMessage activate, BUG-008 retention sans full-table scan, BUG-010 pathnameRef stale closure, BUG-011 /auth SHELL_FREE_ROUTES"
git push

echo.
echo Done! Press any key to close.
pause
