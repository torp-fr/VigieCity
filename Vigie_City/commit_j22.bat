@echo off
cd /d "C:\Users\Baptiste-\VigieCity"
git add Vigie_City/supabase/migrations/20260625000001_nurturing_cron.sql
git commit -m "J22 email nurturing -- nurturing_sent table + pg_cron daily 9h UTC"
echo Done.
pause
