@echo off
title Smart Book Translator

echo ==========================================
echo Smart Book Translator
echo ==========================================
echo.

cd /d "%~dp0"

echo Starting backend server...
start "Backend" cmd /k "cd backend && npm start"

timeout /t 3 /nobreak > nul

echo Starting frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo Application is running!
echo ==========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Close this window to stop the application
echo.

pause
