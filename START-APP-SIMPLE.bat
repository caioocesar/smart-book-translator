@echo off
chcp 65001 >nul
title Smart Book Translator - Launcher
echo.
echo ========================================
echo   SMART BOOK TRANSLATOR - LAUNCHER
echo ========================================
echo.
echo Starting Backend...
start "Backend Server" cmd /k "cd /d "%~dp0backend" && npm start"
echo.
echo Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak >nul
echo.
echo Starting Frontend...
start "Frontend Dev Server" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo.
echo Waiting 10 seconds for frontend to initialize...
timeout /t 10 /nobreak >nul
echo.
echo Opening browser...
start http://localhost:3000
echo.
echo ========================================
echo   APPLICATION STARTED!
echo ========================================
echo.
echo Two windows should now be open:
echo   - Backend Server (running on port 5000)
echo   - Frontend Dev Server (running on port 3000)
echo.
echo Your browser should open automatically.
echo If not, go to: http://localhost:3000
echo.
echo To stop the application:
echo   - Close both server windows
echo.
echo You can now close this window.
echo.
pause
