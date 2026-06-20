@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat(platform): pages /platform/* + PlatformShell + routeTree complet

- PlatformShell.tsx : sidebar + auth guard super_admin
- /platform/rss : gestion flux RSS avec toggle active/delete/sync
- /platform/collectivites : liste collectivites + toggle is_active
- /platform/users : liste profils + changement role inline
- /platform/publishers : grille editeurs + compteur articles
- /platform/settings : infos plateforme + modules + RSS cron
- routeTree.gen.ts : toutes les routes /platform/* + /admin/login enregistrees, bug fullPath duplique corrige"
git push
echo.
echo Done! Press any key to close.
pause
