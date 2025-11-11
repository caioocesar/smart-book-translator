@echo off
REM Smart Book Translator - Desktop Launcher
REM Starts servers and opens the application in browser silently

cd /d "%~dp0"

REM Check if already running
netstat -an | findstr ":5000" >nul 2>&1
if %errorlevel% == 0 (
    echo Application is already running!
    start http://localhost:5173
    exit /b 0
)

REM Start backend in background (minimized)
start /min "Smart Book Translator - Backend" cmd /c "cd backend && npm start"

REM Wait for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend in background (minimized)
start /min "Smart Book Translator - Frontend" cmd /c "cd frontend && npm run dev"

REM Wait for frontend to start (Vite can take 5-10 seconds)
echo Waiting for frontend to start...
timeout /t 10 /nobreak > nul

REM Open browser
echo Opening browser...
start http://localhost:5173
if %errorlevel% neq 0 (
    REM Try alternative browsers
    start "" "http://localhost:5173"
)

REM Exit (servers run in background)
exit /b 0

