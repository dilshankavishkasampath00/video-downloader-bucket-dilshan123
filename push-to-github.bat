@echo off
cd /d f:\downloders\1\video-downloader

echo Initializing Git repository...
"C:\Program Files\Git\bin\git.exe" init

echo.
echo Configuring Git user...
"C:\Program Files\Git\bin\git.exe" config --global user.email "dilshankavishka@example.com"
"C:\Program Files\Git\bin\git.exe" config --global user.name "Dilshan"

echo.
echo Adding all files...
"C:\Program Files\Git\bin\git.exe" add .

echo.
echo Committing changes...
"C:\Program Files\Git\bin\git.exe" commit -m "Initial commit - video downloader app"

echo.
echo Adding remote repository...
"C:\Program Files\Git\bin\git.exe" remote add origin https://github.com/dilshankavishkasampath00/video-downloader-bucket-dilshan123.git

echo.
echo Setting branch to main...
"C:\Program Files\Git\bin\git.exe" branch -M main

echo.
echo Pushing to GitHub...
"C:\Program Files\Git\bin\git.exe" push -u origin main

echo.
echo Done! Your code is now on GitHub.
pause
