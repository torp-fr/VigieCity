@echo off
setlocal enabledelayedexpansion
echo ============================================================
echo  VigieCity J9 — Capacitor Android Setup
echo ============================================================
echo.

cd /d "C:\Users\Baptiste-\VigieCity\Vigie_City"

:: ── 1. Install Capacitor packages ─────────────────────────────────────────────
echo [1/5] Installation des packages Capacitor...
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo ERREUR: npm install a echoue. Verifiez votre connexion.
    pause
    exit /b 1
)
echo OK: packages installes.
echo.

:: ── 2. First mobile build ─────────────────────────────────────────────────────
echo [2/5] Premier build mobile (SPA vers dist/)...
call npm run build:mobile
if errorlevel 1 (
    echo ERREUR: build:mobile a echoue.
    echo Verifiez que vite.mobile.config.ts est correct.
    pause
    exit /b 1
)
echo OK: dist/ genere.
echo.

:: ── 3. Add Android platform ───────────────────────────────────────────────────
echo [3/5] Creation du projet Android (cap add android)...
call npx cap add android
if errorlevel 1 (
    echo ERREUR: cap add android a echoue.
    pause
    exit /b 1
)
echo OK: android/ cree.
echo.

:: ── 4. Sync web assets to Android ─────────────────────────────────────────────
echo [4/5] Synchronisation web → Android...
call npx cap sync android
if errorlevel 1 (
    echo ERREUR: cap sync android a echoue.
    pause
    exit /b 1
)
echo OK: sync termine.
echo.

:: ── 5. Configure Android brand resources ─────────────────────────────────────
echo [5/5] Configuration ressources brand VigieCity...

:: Colors
set COLORS_FILE=android\app\src\main\res\values\colors.xml
echo ^<?xml version="1.0" encoding="utf-8"?^> > %COLORS_FILE%
echo ^<resources^> >> %COLORS_FILE%
echo     ^<color name="colorPrimary"^>#1e3a8a^</color^> >> %COLORS_FILE%
echo     ^<color name="colorPrimaryDark"^>#091844^</color^> >> %COLORS_FILE%
echo     ^<color name="colorAccent"^>#3b82f6^</color^> >> %COLORS_FILE%
echo     ^<color name="ic_launcher_background"^>#1e3a8a^</color^> >> %COLORS_FILE%
echo     ^<color name="splash_background"^>#091844^</color^> >> %COLORS_FILE%
echo ^</resources^> >> %COLORS_FILE%
echo OK: colors.xml cree (%COLORS_FILE%)

:: Strings
set STRINGS_FILE=android\app\src\main\res\values\strings.xml
echo ^<?xml version="1.0" encoding="utf-8"?^> > %STRINGS_FILE%
echo ^<resources^> >> %STRINGS_FILE%
echo     ^<string name="app_name"^>VigieCity^</string^> >> %STRINGS_FILE%
echo     ^<string name="title_activity_main"^>VigieCity^</string^> >> %STRINGS_FILE%
echo     ^<string name="package_name"^>fr.vigiecity.app^</string^> >> %STRINGS_FILE%
echo     ^<string name="custom_url_scheme"^>fr.vigiecity.app^</string^> >> %STRINGS_FILE%
echo ^</resources^> >> %STRINGS_FILE%
echo OK: strings.xml cree (%STRINGS_FILE%)

echo.
echo ============================================================
echo  DONE! Etapes suivantes :
echo ============================================================
echo.
echo  1. Icones et splash :
echo     npx @capacitor/assets generate
echo     (necessite public/logo.png 1024x1024 ou public/icons/icon.svg)
echo.
echo  2. Ouvrir Android Studio :
echo     npx cap open android
echo.
echo  3. Build APK dans Android Studio :
echo     Build ^> Generate Signed Bundle/APK
echo.
echo  4. Pour les mises a jour futures :
echo     npm run mobile:sync   (rebuild + sync)
echo     npm run mobile:android   (rebuild + sync + open Android Studio)
echo.
echo  NOTE iOS : necessite macOS + Xcode.
echo  Sur Mac, lancer : npx cap add ios ^&^& npx cap sync ios
echo.
pause
