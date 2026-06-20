@echo off
cd /d "%~dp0"
git add -A
git commit -m "feat(admin): M24 — AdminShell desktop + dashboard stats + wrapping toutes les pages /admin/*

- AdminShell.tsx : sidebar emerald fixe + auth guard profiles.role + commune name
- admin/index.tsx : dashboard stats (4 cartes + tableau signalements recents)
- admin/alertes.tsx : nouvelle page diffusion alertes push (creer, historique)
- admin/signalements.tsx : suppression gate auth (AdminShell gere), profiles.collectivity_id
- admin/epci.tsx : suppression gates auth, wrap AdminShell
- admin/messagerie.tsx : profiles.collectivity_id (remplace user_roles), 2 vues wrappees
- admin/publications.tsx : AdminShell wrapper
- admin/evenements.tsx : AdminShell wrapper
- admin/services.tsx : AdminShell wrapper
- admin/urgences.tsx : AdminShell wrapper
- admin/radio.tsx : AdminShell wrapper"
git push
echo.
echo Done! Press any key to close.
pause
