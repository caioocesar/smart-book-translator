@echo off
chcp 65001 >nul
title Smart Book Translator - Quick Update (No Restart)
echo.
echo ========================================
echo   SMART BOOK TRANSLATOR - QUICK UPDATE
echo ========================================
echo.
echo This script rebuilds the frontend WITHOUT restarting.
echo Use this if your servers are already running.
echo.
echo After running this:
echo   1. Press Ctrl+F5 in your browser to refresh
echo   2. The changes should appear immediately
echo.
echo Please wait...
echo.

echo Rebuilding frontend with latest changes...
echo.

cd /d "%~dp0frontend"
call npm run build

if errorlevel 1 (
    echo.
    echo [ERROR] Frontend build failed!
    echo Please check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   UPDATE COMPLETE!
echo ========================================
echo.
echo The frontend has been rebuilt with your latest changes.
echo.
echo NEXT STEPS:
echo   1. Go to your browser (http://localhost:3000)
echo   2. Press Ctrl+F5 to force refresh and clear cache
echo   3. Your changes should now be visible!
echo.
echo If changes don't appear:
echo   - Make sure you pressed Ctrl+F5 (not just F5)
echo   - Try closing and reopening the browser tab
echo   - Or run UPDATE-AND-RESTART.bat for a full restart
echo.
pause
