@echo off
cd /d f:\downloders\1\video-downloader

echo Committing changes...
"C:\Program Files\Git\bin\git.exe" add .
"C:\Program Files\Git\bin\git.exe" commit -m "Fix: Improve Dockerfile and add server error handling"

echo.
echo Pushing to GitHub...
"C:\Program Files\Git\bin\git.exe" push

echo.
echo ====================================
echo    Changes pushed! Now:
echo    1. Go to App Runner console
echo    2. Wait for automatic rebuild
echo    3. Status should change to Running
echo    4. Check logs for startup messages
echo ====================================
echo.
pause
