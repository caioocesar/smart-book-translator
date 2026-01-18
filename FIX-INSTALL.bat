@echo off
echo ========================================
echo  Fix Installation - better-sqlite3
echo ========================================
echo.
echo This script will fix the better-sqlite3 installation issue
echo by using prebuilt binaries instead of compiling from source.
echo.
echo ========================================
echo  Step 1: Clean up failed installation
echo ========================================
echo.

cd backend
if exist "node_modules" (
    echo Removing backend node_modules...
    rmdir /s /q node_modules 2>nul
    if exist "node_modules" (
        echo [WARNING] Could not remove all files. Some may be locked.
        echo Continuing anyway...
    )
)
if exist "package-lock.json" (
    echo Removing package-lock.json...
    del /f /q package-lock.json 2>nul
)

cd ..

echo.
echo ========================================
echo  Step 2: Install with prebuilt binaries
echo ========================================
echo.

REM Set environment variable to prefer prebuilt binaries
set npm_config_build_from_source=false

echo Installing backend dependencies...
cd backend
call npm install --prefer-offline --no-audit --legacy-peer-deps

if errorlevel 1 (
    echo.
    echo ========================================
    echo  [ERROR] Backend installation failed!
    echo ========================================
    echo.
    echo You need to install Visual Studio Build Tools:
    echo.
    echo Option 1 - Automatic (run as Administrator):
    echo   npm install --global windows-build-tools
    echo.
    echo Option 2 - Manual:
    echo   1. Download: https://visualstudio.microsoft.com/downloads/
    echo   2. Install "Build Tools for Visual Studio 2022"
    echo   3. Select "Desktop development with C++"
    echo   4. Run this script again
    echo.
    pause
    exit /b 1
)

cd ..

echo.
echo ========================================
echo  Step 3: Install frontend dependencies
echo ========================================
echo.

cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install --no-audit
    if errorlevel 1 (
        echo [ERROR] Frontend installation failed!
        cd ..
        pause
        exit /b 1
    )
) else (
    echo [OK] Frontend dependencies already installed.
)
cd ..

echo.
echo ========================================
echo  Step 4: Install electron dependencies
echo ========================================
echo.

cd electron
if not exist "node_modules" (
    echo Installing electron dependencies...
    call npm install --no-audit
    if errorlevel 1 (
        echo [ERROR] Electron installation failed!
        cd ..
        pause
        exit /b 1
    )
) else (
    echo [OK] Electron dependencies already installed.
)
cd ..

echo.
echo ========================================
echo  [SUCCESS] Installation Complete!
echo ========================================
echo.
echo All dependencies installed successfully!
echo.
echo What to do next:
echo  1. Run the app: START-APP-SIMPLE.bat
echo  2. Build installer: BUILD-INSTALLER.bat
echo.
pause
