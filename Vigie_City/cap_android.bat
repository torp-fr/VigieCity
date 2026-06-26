@echo off
echo ============================================================
echo  VigieCity J9 -- Capacitor Android (mode Live URL)
echo  L'APK charge https://vigiecity.fr via WebView
echo ============================================================
cd /d "C:\Users\Baptiste-\VigieCity\Vigie_City"

echo [1/3] cap add android...
call npx cap add android
if errorlevel 1 (
    echo WARN: android/ existe peut-etre deja, on continue.
)

echo [2/3] cap sync android...
call npx cap sync android
if errorlevel 1 (
    echo ERREUR: cap sync android echoue
    pause
    exit /b 1
)
echo OK: android/ synchronise.

echo [3/3] Ressources brand Android...
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
echo  DONE!
echo ============================================================
echo  1. Committer :  .\Vigie_City\commit_j9.bat
echo  2. Ouvrir Android Studio :
echo       cd Vigie_City
echo       npx cap open android
echo  3. Dans Android Studio :
echo       Build ^> Generate Signed Bundle/APK
echo       Choisir AAB (recommande pour Play Store)
echo ============================================================
pause
