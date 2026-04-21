@echo off
REM AWS Video Downloader - Quick Setup Script for Windows
REM This script sets up your local environment for AWS deployment

echo.
echo ====================================
echo   Video Downloader - AWS Setup
echo ====================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please download and install from: https://nodejs.org/
    echo Make sure to check "Add to PATH" during installation
    pause
    exit /b 1
)

echo [OK] Node.js installed: 
node --version

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Python not found - will try pip3
    pip3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Python/pip not installed
        echo Download from: https://www.python.org/downloads/
        echo Check "Add Python to PATH"
        pause
        exit /b 1
    )
)

echo [OK] Python installed
python --version

REM Check if yt-dlp is installed
yt-dlp --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [INSTALLING] yt-dlp...
    pip install yt-dlp
)
echo [OK] yt-dlp installed

REM Check if FFmpeg is installed
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] FFmpeg not found - this is required!
    echo.
    echo Install FFmpeg:
    echo Option 1: Download from https://ffmpeg.org/download.html
    echo Option 2: choco install ffmpeg (if you have Chocolatey)
    echo.
    echo Press a key after installing FFmpeg...
    pause
)
echo [OK] FFmpeg installed

REM Check if AWS CLI is installed
aws --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [INSTALLING] AWS CLI...
    pip install awscli
)
echo [OK] AWS CLI installed
aws --version

REM Check if .env exists
if not exist ".env" (
    echo [CREATING] .env file...
    copy .env.example .env
    echo Created .env - Please edit with your S3 bucket name!
) else (
    echo [OK] .env file exists
)

echo.
echo ====================================
echo   Installing NPM dependencies...
echo ====================================
echo.
call npm install

echo.
echo ====================================
echo   Setup Complete!
echo ====================================
echo.
echo Next steps:
echo.
echo 1. Edit .env file with your AWS settings:
echo    notepad .env
echo.
echo 2. Configure AWS credentials:
echo    aws configure
echo.
echo 3. Create S3 bucket:
echo    aws s3 mb s3://video-downloader-bucket-YOURNAME --region us-east-1
echo.
echo 4. Test locally:
echo    npm start
echo.
echo 5. Open http://localhost:3000 in your browser
echo.
echo For AWS deployment, read: AWS_DEPLOYMENT.md
echo For troubleshooting, read: BACKEND_ISSUES.md
echo.
pause
