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

echo.
echo Waiting for frontend to start...
timeout /t 8 /nobreak > nul

echo Opening browser...
start http://localhost:5173
if %errorlevel% neq 0 (
    echo.
    echo Could not open browser automatically.
    echo Please open http://localhost:5173 in your browser manually.
)

echo.
echo Close this window to stop the application
echo.

pause
