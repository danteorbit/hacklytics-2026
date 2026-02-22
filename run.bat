@echo off
REM ============================================================
REM  SnapPark — One-click local launcher (Windows)
REM  Run this from the project root: run.bat
REM ============================================================

title SnapPark Launcher
cd /d "%~dp0"

echo.
echo ========================================
echo   SnapPark Local Setup
echo ========================================
echo.

REM ---------- Check for Python ----------
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install Python 3.13+ and add it to PATH.
    pause
    exit /b 1
)

REM ---------- Check for pnpm ----------
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] pnpm not found. Install it with: npm install -g pnpm
    pause
    exit /b 1
)

REM ==========================================================
REM  1. Python virtual-env + backend dependencies
REM ==========================================================
echo [1/4] Setting up Python virtual environment...

if not exist ".venv\Scripts\activate.bat" (
    python -m venv .venv
)
call .venv\Scripts\activate.bat

echo [2/4] Installing backend dependencies...
pip install -q -r backend\requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] pip install failed. Check backend\requirements.txt.
    pause
    exit /b 1
)

REM ==========================================================
REM  2. Frontend dependencies
REM ==========================================================
echo [3/4] Installing frontend dependencies...
pushd frontend\src
call pnpm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] pnpm install failed. Check frontend\src\package.json.
    popd
    pause
    exit /b 1
)
popd

REM ==========================================================
REM  3. Launch backend (Flask) in a new window
REM ==========================================================
echo [4/4] Starting servers...
echo.

start "SnapPark Backend (Flask :5000)" cmd /k "cd /d "%~dp0" && call .venv\Scripts\activate.bat && cd backend && python app.py"

REM Give Flask a moment to boot before the frontend proxy hits it
timeout /t 3 /nobreak >nul

REM ==========================================================
REM  4. Launch frontend (Vite) in a new window
REM ==========================================================
start "SnapPark Frontend (Vite :5173)" cmd /k "cd /d "%~dp0\frontend\src" && pnpm dev"

echo.
echo ========================================
echo   SnapPark is starting!
echo.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:5000
echo.
echo   Two new terminal windows opened.
echo   Close them to stop the servers.
echo ========================================
echo.
pause
