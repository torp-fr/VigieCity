@echo off
setlocal enabledelayedexpansion
echo ============================================================
echo  VigieCity J9 -- Fix tailwindcss v4 + suite setup
echo ============================================================
echo.

cd /d "C:\Users\Baptiste-\VigieCity\Vigie_City"

:: ── Fix: reinstall tailwindcss v4 (npm install l'a retrograde en v3) ──────────
echo [Fix] Reinstallation tailwindcss v4...
call npm install tailwindcss@">=4.2.1" @tailwindcss/vite@">=4.2.1" --legacy-peer-deps --force
if errorlevel 1 (
    echo ERREUR: reinstall tailwindcss echoue
    pause
    exit /b 1
)
echo OK: tailwindcss v4 restaure.
echo.

:: ── 2. Mobile build ────────────────────────────────────────────────────────────
echo [2/4] Build mobile (SPA vers dist/)...
call npm run build:mobile
if errorlevel 1 (
    echo ERREUR: build:mobile echoue.
    pause
    exit /b 1
)
echo OK: dist/ genere.
echo.

:: ── 3. Add Android platform ────────────────────────────────────────────────────
echo [3/4] Creation du projet Android (cap add android)...
call npx cap add android
if errorlevel 1 (
    echo WARN: cap add android a echoue (peut-etre deja present).
)
echo.

:: ── 4. Sync web assets ─────────────────────────────────────────────────────────
echo [4/4] Synchronisation web vers Android...
call npx cap sync android
if errorlevel 1 (
    echo ERREUR: cap sync android echoue.
    pause
    exit /b 1
)
echo OK: sync termine.
echo.

:: ── Brand resources ────────────────────────────────────────────────────────────
echo [Brand] Configuration ressources Android...

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

echo OK: colors.xml et strings.xml ecrits.
echo.

echo ============================================================
echo  DONE! Etapes suivantes :
echo ============================================================
echo.
echo  1. Committer les fichiers J9 :
echo     .\Vigie_City\commit_j9.bat
echo.
echo  2. Ouvrir Android Studio :
echo     npx cap open android
echo     (dans C:\Users\Baptiste-\VigieCity\Vigie_City)
echo.
echo  3. Build APK/AAB dans Android Studio :
echo     Build > Generate Signed Bundle/APK
echo     (AAB recommande pour Google Play Console)
echo.
pause
