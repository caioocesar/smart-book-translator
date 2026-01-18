@echo off
REM Wrapper for backwards compatibility.
REM Use smart-book-translator.bat as the single source of truth.

cd /d "%~dp0"
call "%~dp0smart-book-translator.bat"
