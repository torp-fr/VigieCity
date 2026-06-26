@echo off
setlocal enabledelayedexpansion
echo ============================================================
echo  VigieCity -- Build AAB signe pour Play Store
echo ============================================================

set KEYTOOL=C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe
set KEYSTORE=C:\Users\Baptiste-\Documents\vigiecity-keystore.jks
set KEYSTORE_PROPS=android\keystore.properties
set GRADLEW=android\gradlew.bat

cd /d "C:\Users\Baptiste-\VigieCity\Vigie_City"

REM ---- Java (JDK bundled with Android Studio) ----
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set PATH=%JAVA_HOME%\bin;%PATH%

REM ---- 1. Creer le keystore si inexistant ----
if exist "%KEYSTORE%" goto build

echo.
echo [KEYSTORE] Premiere fois -- creation du keystore de signature.
echo  Chemin : %KEYSTORE%
echo  IMPORTANT : notez le mot de passe dans un endroit sur !
echo.
set /p KPASS=Mot de passe keystore :
echo.

"%KEYTOOL%" -genkey -v -keystore "%KEYSTORE%" -keyalg RSA -keysize 2048 -validity 10000 -alias vigiecity -storepass !KPASS! -keypass !KPASS! -dname "CN=VigieCity, OU=App, O=VigieCity, L=Paris, S=IDF, C=FR"

if errorlevel 1 (
    echo ERREUR: creation keystore echouee.
    pause
    exit /b 1
)

echo storeFile=%KEYSTORE:\=/% > "%KEYSTORE_PROPS%"
echo storePassword=!KPASS!   >> "%KEYSTORE_PROPS%"
echo keyAlias=vigiecity       >> "%KEYSTORE_PROPS%"
echo keyPassword=!KPASS!      >> "%KEYSTORE_PROPS%"
echo [OK] keystore.properties ecrit.

:build
if not exist "%KEYSTORE_PROPS%" (
    echo ERREUR: keystore.properties manquant. Supprimez le .jks et relancez.
    pause
    exit /b 1
)

echo.
echo [BUILD] Generation du AAB release...
cd android
call gradlew.bat :app:bundleRelease
cd ..

if errorlevel 1 (
    echo ERREUR: bundleRelease echoue.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  SUCCES !
echo  Fichier : android\app\build\outputs\bundle\release\app-release.aab
echo.
echo  Upload sur : play.google.com/console
echo  Production ou Tests internes -- Creer une version -- Ajouter AAB
echo ============================================================
pause
