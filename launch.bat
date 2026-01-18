@echo off
REM Smart Book Translator - Desktop Launcher
REM Starts servers and opens the application in browser silently

setlocal EnableExtensions EnableDelayedExpansion

REM Always run from this script's directory (handles spaces/accents in path)
pushd "%~dp0" >nul 2>&1
if errorlevel 1 (
    exit /b 1
)

REM Ensure Node + npm exist (PowerShell PATH issues are common on Windows)
call :ensure_node_npm
if errorlevel 1 (
    popd >nul 2>&1
    exit /b 1
)

REM We only reach here if Node/npm are OK. Now start minimized.

REM Check if already running
netstat -an | findstr ":5000" >nul 2>&1
if %errorlevel% == 0 (
    echo Application is already running!
    start http://localhost:3000
    popd >nul 2>&1
    exit /b 0
)

REM Start backend in background (minimized)
start /min "Smart Book Translator - Backend" cmd /c "cd /d %~dp0backend && npm start"

REM Wait for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend in background (minimized)
start /min "Smart Book Translator - Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

REM Wait for frontend to start (Vite can take 5-10 seconds)
echo Waiting for frontend to start...
set "FRONTEND_PORT=3000"
set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%"

REM Wait up to ~25s for Vite to bind to port 3000
set "FRONTEND_READY=0"
for /L %%i in (1,1,25) do (
    netstat -an | findstr /R /C:":%FRONTEND_PORT% .*LISTENING" >nul 2>&1
    if not errorlevel 1 (
        set "FRONTEND_READY=1"
        goto :frontend_ready
    )
    timeout /t 1 /nobreak >nul
)

:frontend_ready

REM Open browser
echo Opening browser...
start %FRONTEND_URL%
if %errorlevel% neq 0 (
    REM Try alternative browsers
    start "" "%FRONTEND_URL%"
)

REM Exit (servers run in background)
popd >nul 2>&1
exit /b 0

:ensure_node_npm
where node >nul 2>&1
if errorlevel 1 (
    call :try_add_node_to_path
)
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found (node is not in PATH).
    echo Install Node.js LTS from: https://nodejs.org/
    echo Then close and reopen PowerShell/Terminal.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    call :try_add_node_to_path
)
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found (npm is not in PATH).
    echo Reinstall Node.js LTS from: https://nodejs.org/ ^(ensure "Add to PATH" is enabled^).
    pause
    exit /b 1
)
exit /b 0

:try_add_node_to_path
set "NODEJS_DIR="
if exist "%ProgramFiles%\nodejs\node.exe" set "NODEJS_DIR=%ProgramFiles%\nodejs"
if not defined NODEJS_DIR if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODEJS_DIR=%ProgramFiles(x86)%\nodejs"
if not defined NODEJS_DIR if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODEJS_DIR=%LocalAppData%\Programs\nodejs"
if defined NODEJS_DIR (
    set "PATH=%NODEJS_DIR%;%PATH%"
)
exit /b 0

