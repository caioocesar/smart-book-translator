@echo off
REM Debug version of launcher - saves all output to file
REM This helps diagnose why the launcher closes immediately

setlocal EnableExtensions EnableDelayedExpansion

REM Set log file
set "LOG_FILE=%~dp0launcher-debug.log"
echo Starting debug launcher... > "%LOG_FILE%"
echo Timestamp: %date% %time% >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

REM Try to change to script directory
echo Attempting to change to: %~dp0 >> "%LOG_FILE%"
pushd "%~dp0" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Failed to set working directory >> "%LOG_FILE%"
    echo Current directory: %CD% >> "%LOG_FILE%"
    echo Script directory: %~dp0 >> "%LOG_FILE%"
    echo.
    echo [ERROR] Failed to set working directory to: %~dp0
    echo Please check launcher-debug.log for details
    pause
    exit /b 1
)
echo Successfully changed to: %CD% >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

REM Check for Node.js
echo Checking for Node.js... >> "%LOG_FILE%"
where node >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found in PATH >> "%LOG_FILE%"
    echo PATH: %PATH% >> "%LOG_FILE%"
    echo.
    echo [ERROR] Node.js not found
    echo Trying to find Node.js in common locations...
    
    REM Try common locations
    if exist "%ProgramFiles%\nodejs\node.exe" (
        echo Found Node.js at: %ProgramFiles%\nodejs >> "%LOG_FILE%"
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    ) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
        echo Found Node.js at: %ProgramFiles(x86)%\nodejs >> "%LOG_FILE%"
        set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
    ) else if exist "%LocalAppData%\Programs\nodejs\node.exe" (
        echo Found Node.js at: %LocalAppData%\Programs\nodejs >> "%LOG_FILE%"
        set "PATH=%LocalAppData%\Programs\nodejs;%PATH%"
    ) else (
        echo [ERROR] Node.js not found in any common location >> "%LOG_FILE%"
        echo.
        echo [ERROR] Node.js is not installed or not in PATH
        echo.
        echo Install Node.js from: https://nodejs.org/
        echo Make sure to check "Add to PATH" during installation
        echo.
        echo Check launcher-debug.log for more details
        pause
        exit /b 1
    )
)

REM Verify Node.js works
echo Testing Node.js... >> "%LOG_FILE%"
node -v >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js command failed >> "%LOG_FILE%"
    echo.
    echo [ERROR] Node.js is installed but not working correctly
    echo Check launcher-debug.log for details
    pause
    exit /b 1
)

echo [OK] Node.js found: >> "%LOG_FILE%"
node -v >> "%LOG_FILE%" 2>&1
echo. >> "%LOG_FILE%"

REM Check for npm
echo Checking for npm... >> "%LOG_FILE%"
where npm >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found >> "%LOG_FILE%"
    echo.
    echo [ERROR] npm is not installed or not in PATH
    echo This usually means Node.js installation is incomplete
    echo.
    echo Reinstall Node.js from: https://nodejs.org/
    echo Check launcher-debug.log for details
    pause
    exit /b 1
)

echo [OK] npm found: >> "%LOG_FILE%"
npm -v >> "%LOG_FILE%" 2>&1
echo. >> "%LOG_FILE%"

REM Check for backend folder
echo Checking for backend folder... >> "%LOG_FILE%"
if not exist "backend" (
    echo [ERROR] backend folder not found >> "%LOG_FILE%"
    echo Current directory: %CD% >> "%LOG_FILE%"
    dir >> "%LOG_FILE%" 2>&1
    echo.
    echo [ERROR] backend folder not found in current directory
    echo Current directory: %CD%
    echo.
    echo Make sure you're running this from the smart-book-translator folder
    echo Check launcher-debug.log for details
    pause
    exit /b 1
)
echo [OK] backend folder found >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

REM Check for frontend folder
echo Checking for frontend folder... >> "%LOG_FILE%"
if not exist "frontend" (
    echo [ERROR] frontend folder not found >> "%LOG_FILE%"
    echo.
    echo [ERROR] frontend folder not found in current directory
    echo Check launcher-debug.log for details
    pause
    exit /b 1
)
echo [OK] frontend folder found >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

REM Check backend dependencies
echo Checking backend dependencies... >> "%LOG_FILE%"
if not exist "backend\node_modules" (
    echo [INFO] Backend dependencies not installed >> "%LOG_FILE%"
    echo Installing backend dependencies... >> "%LOG_FILE%"
    echo.
    echo [INFO] Installing backend dependencies...
    echo This may take a few minutes...
    cd backend
    call npm install >> "%LOG_FILE%" 2>&1
    if errorlevel 1 (
        echo [ERROR] npm install failed for backend >> "%LOG_FILE%"
        echo.
        echo [ERROR] Failed to install backend dependencies
        echo Check launcher-debug.log for details
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Backend dependencies installed >> "%LOG_FILE%"
) else (
    echo [OK] Backend dependencies already installed >> "%LOG_FILE%"
)
echo. >> "%LOG_FILE%"

REM Check frontend dependencies
echo Checking frontend dependencies... >> "%LOG_FILE%"
if not exist "frontend\node_modules" (
    echo [INFO] Frontend dependencies not installed >> "%LOG_FILE%"
    echo Installing frontend dependencies... >> "%LOG_FILE%"
    echo.
    echo [INFO] Installing frontend dependencies...
    echo This may take a few minutes...
    cd frontend
    call npm install >> "%LOG_FILE%" 2>&1
    if errorlevel 1 (
        echo [ERROR] npm install failed for frontend >> "%LOG_FILE%"
        echo.
        echo [ERROR] Failed to install frontend dependencies
        echo Check launcher-debug.log for details
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Frontend dependencies installed >> "%LOG_FILE%"
) else (
    echo [OK] Frontend dependencies already installed >> "%LOG_FILE%"
)
echo. >> "%LOG_FILE%"

echo ========================================
echo   All checks passed!
echo ========================================
echo.
echo [OK] Node.js: 
node -v
echo [OK] npm:
npm -v
echo [OK] Backend folder: exists
echo [OK] Frontend folder: exists
echo [OK] Dependencies: installed
echo.
echo Starting servers...
echo.

echo Starting backend server... >> "%LOG_FILE%"
start "Smart Book Translator - Backend" cmd /k "cd /d %~dp0backend && npm start"

timeout /t 3 /nobreak >nul

echo Starting frontend server... >> "%LOG_FILE%"
start "Smart Book Translator - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo [INFO] Waiting for frontend to start (port 3000)...
echo.

REM Wait for port 3000 to be listening
set "FRONTEND_READY=0"
for /L %%i in (1,1,30) do (
    netstat -an | findstr /R /C:":3000 .*LISTENING" >nul 2>&1
    if not errorlevel 1 (
        set "FRONTEND_READY=1"
        echo [OK] Frontend is ready on port 3000 >> "%LOG_FILE%"
        goto :ready
    )
    timeout /t 1 /nobreak >nul
)

:ready
echo. >> "%LOG_FILE%"
echo Launcher completed >> "%LOG_FILE%"
echo Frontend ready: %FRONTEND_READY% >> "%LOG_FILE%"

if "%FRONTEND_READY%"=="1" (
    echo [OK] Opening browser at http://localhost:3000
    start http://localhost:3000
) else (
    echo [WARNING] Frontend did not start within 30 seconds
    echo Check the "Smart Book Translator - Frontend" window for errors
    echo.
    echo Common issues:
    echo - Port 3000 already in use
    echo - npm errors during startup
    echo - Missing dependencies
)

echo.
echo ========================================
echo   Debug log saved to:
echo   %LOG_FILE%
echo ========================================
echo.
echo Press any key to exit...
pause >nul

popd >nul 2>&1
exit /b 0
