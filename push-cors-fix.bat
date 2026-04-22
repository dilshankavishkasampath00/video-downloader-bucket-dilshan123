@echo off
cd /d f:\downloders\1\video-downloader

echo Committing CORS and error handling improvements...
"C:\Program Files\Git\bin\git.exe" add server.js
"C:\Program Files\Git\bin\git.exe" commit -m "Fix: Add CORS support and improve API error handling"

echo.
echo Pushing to GitHub...
"C:\Program Files\Git\bin\git.exe" push

echo.
echo Done! App Runner will rebuild automatically.
pause
