@echo off
cd /d "C:\Users\Baptiste-\VigieCity"
git add Vigie_City/package.json
git add Vigie_City/capacitor.config.json
git add Vigie_City/vite.mobile.config.ts
git add Vigie_City/dist/index.html
git add Vigie_City/android/
git commit -m "J9 Capacitor -- Android live vigiecity.fr + capacitor server.url + dist placeholder"
echo Done.
pause
