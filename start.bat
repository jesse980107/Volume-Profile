@echo off
echo ========================================
echo   Stock Analysis System - Dev Startup
echo ========================================
echo.

echo [1/3] Checking Python dependencies...
python -c "import fastapi, uvicorn, pandas, numpy; print('OK: Python dependencies')" 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Missing Python dependencies
    echo Please run: pip install -r requirements.txt
    pause
    exit /b 1
)

echo [2/3] Checking Node.js dependencies...
if not exist "node_modules\" (
    echo ERROR: Missing Node.js dependencies
    echo Please run: npm install
    pause
    exit /b 1
) else (
    echo OK: Node.js dependencies
)

echo [3/3] Starting services...
echo.
echo ==========================================
echo   Backend (FastAPI): http://localhost:8000
echo   Frontend (Vite):   http://localhost:5173
echo ==========================================
echo.
echo Starting backend server...
start "Backend-FastAPI" cmd /k "cd /d %~dp0 && python backend\main.py"

echo Waiting for backend to start (3 seconds)...
timeout /t 3 /nobreak >nul

echo Starting frontend dev server...
start "Frontend-Vite" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ========================================
echo   Dev servers started successfully!
echo.
echo   Main App:     http://localhost:5173
echo   API Docs:     http://localhost:8000/api/docs
echo   Health Check: http://localhost:8000/health
echo.
echo   Close both terminal windows to stop
echo ========================================
echo.
pause
