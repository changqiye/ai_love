@echo off
cd /d "%~dp0"
if not exist node_modules (
  call npm.cmd install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo.
echo Heartfelt Days - http://localhost:5173
echo Open this address in a browser. Keep this window running while playing.
echo.
call npm.cmd run dev
pause
