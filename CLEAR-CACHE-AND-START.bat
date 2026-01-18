@echo off
chcp 65001 >nul
title Smart Book Translator - Clear Cache and Start
echo.
echo ========================================
echo   CLEAR CACHE AND START
echo ========================================
echo.
echo This script will:
echo   1. Stop running servers
echo   2. Clear all caches (Vite, browser data)
echo   3. Start fresh
echo.

REM Step 1: Stop running servers
echo [1/3] Stopping running servers...
taskkill /FI "WINDOWTITLE eq Backend Server*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend Dev Server*" /F >nul 2>&1
timeout /t 2 /nobreak >nul
echo   [OK] Servers stopped
echo.

REM Step 2: Clear caches
echo [2/3] Clearing caches...
if exist "%~dp0frontend\node_modules\.vite" (
    echo   Clearing Vite cache...
    rmdir /s /q "%~dp0frontend\node_modules\.vite" 2>nul
    echo   [OK] Vite cache cleared
)
if exist "%~dp0frontend\dist" (
    echo   Clearing old build...
    rmdir /s /q "%~dp0frontend\dist" 2>nul
    echo   [OK] Old build cleared
)
echo   [OK] All caches cleared
echo.

REM Step 3: Start application
echo [3/3] Starting application...
echo.
call "%~dp0START-APP-SIMPLE.bat"
