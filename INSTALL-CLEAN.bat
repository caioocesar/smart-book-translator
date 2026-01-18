@echo off
echo ========================================
echo  Clean Install - No Build Tools Needed!
echo ========================================
echo.
echo The app now uses sql.js (pure JavaScript)
echo No Visual Studio Build Tools required!
echo.
echo ========================================
echo  Step 1: Clean up old installation
echo ========================================
echo.

if exist "backend\node_modules" (
    echo Removing backend node_modules...
    rmdir /s /q backend\node_modules 2>nul
)

if exist "backend\package-lock.json" (
    echo Removing backend package-lock.json...
    del /f /q backend\package-lock.json 2>nul
)

if exist "frontend\node_modules" (
    echo Removing frontend node_modules...
    rmdir /s /q frontend\node_modules 2>nul
)

if exist "electron\node_modules" (
    echo Removing electron node_modules...
    rmdir /s /q electron\node_modules 2>nul
)

echo.
echo [OK] Cleanup complete!
echo.

echo ========================================
echo  Step 2: Install all dependencies
echo ========================================
echo.
echo This will take 2-5 minutes...
echo.

call npm run install:all

if errorlevel 1 (
    echo.
    echo ========================================
    echo  [ERROR] Installation failed!
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  [SUCCESS] Installation Complete!
echo ========================================
echo.
echo All dependencies installed successfully!
echo No Build Tools were needed!
echo.
echo What to do next:
echo  1. Run the app: START-APP-SIMPLE.bat
echo  2. Build installer: BUILD-INSTALLER.bat
echo.
echo See DATABASE-CHANGE.md for details about the change.
echo.
pause
