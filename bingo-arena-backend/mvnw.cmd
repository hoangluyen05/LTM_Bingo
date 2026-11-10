@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0.mvn\wrapper\bootstrap.ps1" %*
exit /b %ERRORLEVEL%
