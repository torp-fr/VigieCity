@echo off
echo ============================================================
echo  Fix tailwindcss v4 -- reinstall propre (sans cache npm)
echo ============================================================
cd /d "C:\Users\Baptiste-\VigieCity\Vigie_City"

echo [1/4] Suppression node_modules\tailwindcss corrompu...
rmdir /s /q node_modules\tailwindcss
rmdir /s /q node_modules\@tailwindcss\vite
rmdir /s /q node_modules\@tailwindcss\node
rmdir /s /q node_modules\@tailwindcss\oxide
echo OK

echo [2/4] Nettoyage cache npm tailwindcss...
call npm cache clean --force
echo OK

echo [3/4] Reinstallation tailwindcss + @tailwindcss/vite (sans cache)...
call npm install tailwindcss @tailwindcss/vite --legacy-peer-deps --no-cache
if errorlevel 1 (
    echo ERREUR npm install
    pause
    exit /b 1
)
echo OK

echo [4/4] Verification lib.mjs...
if exist "node_modules\tailwindcss\dist\lib.mjs" (
    echo  OK: lib.mjs present
) else (
    echo  WARN: lib.mjs toujours absent, check version
    dir node_modules\tailwindcss\dist\lib*
)

echo.
echo Lancement du build mobile...
call npm run build:mobile
if errorlevel 1 (
    echo ERREUR build:mobile
    pause
    exit /b 1
)

echo.
echo Build OK! Lancement cap add android + sync...
call npx cap add android
call npx cap sync android

echo.
echo DONE - lance ensuite: npx cap open android
pause
