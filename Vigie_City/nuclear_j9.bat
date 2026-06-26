@echo off
echo ============================================================
echo  VigieCity J9 -- NUCLEAR: clean install + Capacitor setup
echo ============================================================
cd /d "C:\Users\Baptiste-\VigieCity\Vigie_City"

echo [1/6] Suppression complete node_modules...
rmdir /s /q node_modules
echo OK

echo [2/6] Suppression package-lock.json...
if exist package-lock.json del /f package-lock.json
echo OK

echo [3/6] Nettoyage cache npm (--force)...
call npm cache clean --force
echo OK

echo [4/6] Reinstallation complete (from scratch)...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo ERREUR: npm install echoue
    pause
    exit /b 1
)
echo OK: node_modules reinstalle.

echo [5/6] Build mobile SPA...
call npm run build:mobile
if errorlevel 1 (
    echo ERREUR: build:mobile echoue. Voir erreur ci-dessus.
    pause
    exit /b 1
)
echo OK: dist/ genere.

echo [6/6] Capacitor Android setup...
call npx cap add android
call npx cap sync android
if errorlevel 1 (
    echo ERREUR: cap sync android echoue
    pause
    exit /b 1
)
echo OK: android/ cree et synchronise.

echo.
echo [Brand] Ressources Android...
set COLORS_FILE=android\app\src\main\res\values\colors.xml
echo ^<?xml version="1.0" encoding="utf-8"?^> > %COLORS_FILE%
echo ^<resources^> >> %COLORS_FILE%
echo     ^<color name="colorPrimary"^>#1e3a8a^</color^> >> %COLORS_FILE%
echo     ^<color name="colorPrimaryDark"^>#091844^</color^> >> %COLORS_FILE%
echo     ^<color name="colorAccent"^>#3b82f6^</color^> >> %COLORS_FILE%
echo     ^<color name="ic_launcher_background"^>#1e3a8a^</color^> >> %COLORS_FILE%
echo     ^<color name="splash_background"^>#091844^</color^> >> %COLORS_FILE%
echo ^</resources^> >> %COLORS_FILE%

set STRINGS_FILE=android\app\src\main\res\values\strings.xml
echo ^<?xml version="1.0" encoding="utf-8"?^> > %STRINGS_FILE%
echo ^<resources^> >> %STRINGS_FILE%
echo     ^<string name="app_name"^>VigieCity^</string^> >> %STRINGS_FILE%
echo     ^<string name="title_activity_main"^>VigieCity^</string^> >> %STRINGS_FILE%
echo     ^<string name="package_name"^>fr.vigiecity.app^</string^> >> %STRINGS_FILE%
echo     ^<string name="custom_url_scheme"^>fr.vigiecity.app^</string^> >> %STRINGS_FILE%
echo ^</resources^> >> %STRINGS_FILE%
echo OK: colors.xml + strings.xml

echo.
echo ============================================================
echo  DONE! Etapes suivantes :
echo ============================================================
echo  1. Committer J9 : .\Vigie_City\commit_j9.bat
echo  2. Ouvrir Android Studio : npx cap open android
echo     (depuis C:\Users\Baptiste-\VigieCity\Vigie_City)
echo ============================================================
pause
