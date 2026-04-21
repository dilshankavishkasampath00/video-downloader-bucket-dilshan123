@echo off
echo Fixing Git permissions...
"C:\Program Files\Git\bin\git.exe" config --global --add safe.directory F:/downloders/1/video-downloader

echo.
echo Configuring Git user...
"C:\Program Files\Git\bin\git.exe" config --global user.email "dilshankavishka@example.com"
"C:\Program Files\Git\bin\git.exe" config --global user.name "Dilshan"

cd /d f:\downloders\1\video-downloader

echo.
echo Adding all files...
"C:\Program Files\Git\bin\git.exe" add .

echo.
echo Committing changes...
"C:\Program Files\Git\bin\git.exe" commit -m "Initial commit - video downloader app"

echo.
echo Adding remote repository...
"C:\Program Files\Git\bin\git.exe" remote remove origin 2>nul
"C:\Program Files\Git\bin\git.exe" remote add origin https://github.com/dilshankavishkasampath00/video-downloader-bucket-dilshan123.git

echo.
echo Setting branch to main...
"C:\Program Files\Git\bin\git.exe" branch -M main

echo.
echo Pushing to GitHub...
"C:\Program Files\Git\bin\git.exe" push -u origin main

echo.
echo Done! Your code has been pushed to GitHub.
pause
