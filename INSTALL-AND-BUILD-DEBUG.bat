@echo off
setlocal enabledelayedexpansion
echo ========================================
echo  Smart Book Translator - Install and Build (DEBUG MODE)
echo ========================================
echo.
echo This script will show detailed error messages.
echo.
pause

REM Check Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo.
    echo Please install Node.js from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found:
node --version
echo.

REM Check npm is installed
echo Checking npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed or not in PATH!
    echo.
    pause
    exit /b 1
)

echo [OK] npm found:
npm --version
echo.

REM Check if we're in the right directory
echo Checking project structure...
if not exist "package.json" (
    echo [ERROR] package.json not found!
    echo.
    echo Make sure you're running this script from the project root folder.
    echo Current directory: %CD%
    echo.
    pause
    exit /b 1
)

if not exist "frontend\" (
    echo [ERROR] frontend folder not found!
    echo.
    pause
    exit /b 1
)

if not exist "backend\" (
    echo [ERROR] backend folder not found!
    echo.
    pause
    exit /b 1
)

if not exist "electron\" (
    echo [ERROR] electron folder not found!
    echo.
    pause
    exit /b 1
)

echo [OK] Project structure looks good
echo.

REM Step 1: Install dependencies
echo ========================================
echo  Step 1: Installing Dependencies
echo ========================================
echo.

if not exist "frontend\node_modules\" (
    echo Installing dependencies... This will take 2-5 minutes.
    echo.
    
    echo [1/3] Installing backend dependencies...
    cd backend
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Backend npm install failed!
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Backend dependencies installed
    echo.
    
    echo [2/3] Installing frontend dependencies...
    cd frontend
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Frontend npm install failed!
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Frontend dependencies installed
    echo.
    
    echo [3/3] Installing electron dependencies...
    cd electron
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Electron npm install failed!
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Electron dependencies installed
    echo.
) else (
    echo [OK] Dependencies already installed
    echo.
)

REM Step 2: Build frontend
echo ========================================
echo  Step 2: Building Frontend
echo ========================================
echo.

cd frontend
echo Running: npm run build
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Frontend build failed!
    echo.
    echo Check the error messages above.
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo [OK] Frontend built successfully!
echo.

REM Step 3: Build installer
echo ========================================
echo  Step 3: Building Windows Installer
echo ========================================
echo.

cd electron
echo Running: npm run dist:win
echo.
echo This will take 3-5 minutes...
echo.

call npm run dist:win

if errorlevel 1 (
    echo.
    echo ========================================
    echo  [ERROR] Installer build failed!
    echo ========================================
    echo.
    echo Common issues:
    echo  1. Not running as administrator (needed for symlinks)
    echo  2. Antivirus blocking electron-builder
    echo  3. Insufficient disk space
    echo  4. Network issues downloading dependencies
    echo.
    echo Check the error messages above for details.
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo ========================================
echo  [SUCCESS] Build Complete!
echo ========================================
echo.

REM Check if files were created
if exist "electron\dist\Smart Book Translator-Setup-1.0.0.exe" (
    echo [OK] NSIS Installer created successfully!
) else (
    echo [WARNING] NSIS Installer not found!
)

if exist "electron\dist\Smart Book Translator-1.0.0-Portable.exe" (
    echo [OK] Portable version created successfully!
) else (
    echo [WARNING] Portable version not found!
)

echo.
echo Files location: electron\dist\
echo.

REM List all files in dist folder
if exist "electron\dist\" (
    echo Files in electron\dist\:
    dir /b "electron\dist\*.exe" 2>nul
    if errorlevel 1 (
        echo [WARNING] No .exe files found in electron\dist\
    )
)

echo.
echo Opening dist folder...
start "" "%~dp0electron\dist"

echo.
pause
