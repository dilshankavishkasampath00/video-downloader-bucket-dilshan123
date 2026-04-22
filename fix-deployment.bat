@echo off
REM Troubleshooting script for App Runner deployment issues

cd /d f:\downloders\1\video-downloader

echo.
echo ====================================
echo   App Runner Deployment Fix
echo ====================================
echo.

REM 1. Remove node_modules if it was accidentally committed
echo Checking for node_modules...
if exist node_modules (
    echo [WARNING] Found node_modules folder
    echo Removing it - should have been ignored by gitignore
    rmdir /s /q node_modules
    echo Done.
)

REM 2. Clean npm cache
echo.
echo Cleaning npm cache...
call npm cache clean --force
echo Done.

REM 3. Fresh install
echo.
echo Running fresh npm install...
call npm install
echo Done.

REM 4. Verify server.js exists
echo.
echo Checking server.js...
if exist server.js (
    echo [OK] server.js found
) else (
    echo [ERROR] server.js not found!
)

REM 5. Verify Dockerfile exists
echo.
echo Checking Dockerfile...
if exist Dockerfile (
    echo [OK] Dockerfile found
) else (
    echo [ERROR] Dockerfile not found!
)

REM 6. Verify package.json has correct start command
echo.
echo Checking package.json...
findstr /M "\"start\": \"node server.js\"" package.json >nul
if %errorlevel% equ 0 (
    echo [OK] Start command is correct
) else (
    echo [WARNING] Start command might be wrong
)

REM 7. Commit and push
echo.
echo ====================================
echo   Pushing fixes to GitHub...
echo ====================================
echo.

"C:\Program Files\Git\bin\git.exe" add .
"C:\Program Files\Git\bin\git.exe" commit -m "Fix: Clean install and dependency fixes"
"C:\Program Files\Git\bin\git.exe" push

echo.
echo ====================================
echo   Complete! Now:
echo   1. Go to App Runner console
echo   2. Click "Rebuild service"
echo   3. Wait 5-10 minutes
echo   4. Check if status is "Running"
echo ====================================
echo.
pause
