@echo off
cd /d "C:\Users\Baptiste-\VigieCity\Vigie_City"
git add _delivery/src/routes/admin/accept-invite.tsx
git commit -m "J19 -- email bienvenue post-activation (accept-invite fire-and-forget + send-welcome EF v2 template reel)"
git push
echo.
echo === DONE ===
pause
