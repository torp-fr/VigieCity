@echo off
echo === VigieCity - Fix git lock + commit + push ===
echo.

:: Supprimer le verrou git stale
if exist ".git\index.lock" (
    del ".git\index.lock"
    echo [OK] Lock file supprime
) else (
    echo [OK] Pas de lock file
)

:: Se placer dans le bon dossier
cd /d "C:\Users\Baptiste-\VigieCity"

:: Ajouter tous les fichiers
git add -A
echo [OK] git add -A

:: Commit
git commit -m "fix(platform): restore truncated files + complete routeTree + auth guards"
echo [OK] Commit cree

:: Push
git push
echo.
echo === Push termine - Vercel va deployer automatiquement ===
pause
