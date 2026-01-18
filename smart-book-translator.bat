@echo off
REM Smart Book Translator - One-Click Launcher for Windows
REM This script checks dependencies, installs if needed, and starts the application

setlocal EnableExtensions EnableDelayedExpansion

REM Always run from this script's directory (handles spaces/accents in path)
pushd "%~dp0" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Failed to set working directory to: %~dp0
    echo Please move the project to a simpler path and try again.
    pause
    exit /b 1
)

echo ========================================
echo   Smart Book Translator - Quick Start
echo ========================================
echo.

REM --- Ensure Node.js + npm are available (works even if PowerShell PATH is broken) ---
call :ensure_node_npm
if errorlevel 1 (
    popd >nul 2>&1
    exit /b 1
)

echo [OK] Node.js is installed
node -v
echo [OK] npm is installed
npm -v

REM Check if backend dependencies are installed
if not exist "backend\node_modules" (
    echo.
    echo [INFO] First time setup detected...
    echo [INFO] Installing backend dependencies...
    echo.
    cd backend
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install backend dependencies
        pause
        exit /b 1
    )
    cd ..
)

REM Check if frontend dependencies are installed
if not exist "frontend\node_modules" (
    echo.
    echo [INFO] Installing frontend dependencies...
    echo.
    cd frontend
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install frontend dependencies
        pause
        exit /b 1
    )
    cd ..
)

echo.
echo [OK] All dependencies installed
echo.
echo ========================================
echo   Starting Application...
echo ========================================
echo.

REM Start backend in new window
echo [1/2] Starting backend server...
start "Smart Book Translator - Backend" cmd /k "cd /d %~dp0backend && npm start"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in new window
echo [2/2] Starting frontend server...
start "Smart Book Translator - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

REM Wait for services to initialize
echo.
echo [INFO] Waiting for services to start...
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
echo.
if "%FRONTEND_READY%"=="1" (
    echo [OK] Opening browser...
    start %FRONTEND_URL%
) else (
    echo [ERROR] Frontend did not start on %FRONTEND_URL%.
    echo Check the "Smart Book Translator - Frontend" window for errors.
    echo Common causes: port 3000 already in use, or npm errors.
)

echo.
echo ========================================
echo   Application is Running!
echo ========================================
echo.
echo   Backend:  http://localhost:5000
echo   Frontend: %FRONTEND_URL%
echo.
echo   Two terminal windows have been opened:
echo   - Backend Server
echo   - Frontend Server
echo.
echo   Keep both windows open while using the app.
echo   Close them when you're done.
echo.
echo ========================================
echo.
echo Press any key to exit this launcher...
echo (The app will keep running in the other windows)
pause >nul
popd >nul 2>&1
exit /b 0

:ensure_node_npm
REM Check node first
where node >nul 2>&1
if errorlevel 1 (
    REM Try common install locations and patch PATH for this session
    call :try_add_node_to_path
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found (node is not in PATH).
    echo.
    echo Install Node.js LTS from: https://nodejs.org/
    echo During installation, make sure "Add to PATH" is enabled.
    echo Then close and reopen PowerShell/Terminal and run this launcher again.
    echo.
    echo Tip: You can also try running: powershell -ExecutionPolicy Bypass -File "%~dp0fix-node-path.ps1"
    pause
    exit /b 1
)

REM Check npm next
where npm >nul 2>&1
if errorlevel 1 (
    REM If node exists, npm should be in same folder; try patching PATH again
    call :try_add_node_to_path
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found (npm is not in PATH).
    echo.
    echo This usually means Node.js installation is incomplete or PATH is broken.
    echo Reinstall Node.js LTS from: https://nodejs.org/
    echo Ensure "Add to PATH" is enabled, then reopen your terminal and try again.
    echo.
    echo Tip: You can also try running: powershell -ExecutionPolicy Bypass -File "%~dp0fix-node-path.ps1"
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
    REM Patch PATH for this launcher session only
    set "PATH=%NODEJS_DIR%;%PATH%"
)
exit /b 0