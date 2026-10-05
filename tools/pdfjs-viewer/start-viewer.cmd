@echo off
echo.
echo   PDF.js viewer  : http://localhost:8000/web/viewer.html
echo   Keep this window open. Close it to stop the server.
echo.
node "%~dp0serve.cjs" 8000
echo.
echo   --- server exited, see message above ---
pause
