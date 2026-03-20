@echo off
setlocal

set "WORKSPACE=C:\Users\20961\.openclaw\workspace"
set "REPO=%WORKSPACE%\Star-Office-UI"
set "BACKEND_DIR=%REPO%\backend"
set "PYTHON_EXE=%REPO%\.venv\Scripts\python.exe"
set "STDOUT_LOG=%REPO%\.logs\backend.stdout.log"
set "STDERR_LOG=%REPO%\.logs\backend.stderr.log"

if not exist "%REPO%\.logs" mkdir "%REPO%\.logs"
if not exist "%PYTHON_EXE%" exit /b 1
if not exist "%BACKEND_DIR%\app.py" exit /b 1

set "OPENCLAW_WORKSPACE=%WORKSPACE%"
set "STAR_BACKEND_PORT=19000"
set "FLASK_SECRET_KEY=SmoMZXdH3tnWEjyBr08hs5pifITuGPY4F7kORcCgw2AzDV6a"
set "ASSET_DRAWER_PASS=1234"

cd /d "%BACKEND_DIR%"
"%PYTHON_EXE%" app.py >> "%STDOUT_LOG%" 2>> "%STDERR_LOG%"
