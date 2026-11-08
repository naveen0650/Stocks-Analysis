@echo off
setlocal
title FinAI R3 Launcher
cd /d "%~dp0"
set COMPOSE_PROJECT_NAME=finai-r3

echo =====================================================
echo   FinAI R3 - one-click launcher
echo   AI Personal Finance ^& Market-adjusted Fair Value
echo =====================================================

echo [1/6] Checking Docker...
docker info >nul 2>&1
if not errorlevel 1 goto docker_ok
echo       Starting Docker Desktop (first start takes a minute)...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
set TRIES=0
:wait_docker
ping -n 6 127.0.0.1 >nul
docker info >nul 2>&1
if not errorlevel 1 goto docker_ok
set /a TRIES+=1
if %TRIES% LSS 36 goto wait_docker
echo ERROR: Docker did not become ready within ~3 minutes.
pause
exit /b 1
:docker_ok
echo       Docker is ready.

echo [2/6] Stopping R2 stack if running (frees ports 8000/8080/5432)...
docker compose -p finaiproject-r2 down >nul 2>&1

echo [3/6] Building and starting R3 containers...
docker compose up --build -d
if errorlevel 1 (
    echo ERROR: docker compose failed - see messages above.
    pause
    exit /b 1
)

echo [4/6] Waiting for the API...
set TRIES=0
:wait_api
ping -n 4 127.0.0.1 >nul
curl -s -f -o nul http://localhost:8000/api/v1/healthz
if not errorlevel 1 goto api_ok
set /a TRIES+=1
if %TRIES% LSS 100 goto wait_api
echo WARNING: API not answering yet - continuing.
:api_ok

echo [5/6] Seeding demo data (skips if present)...
docker compose exec -T api python scripts/seed.py
docker compose exec -T api python scripts/demo_data.py http://web:80

echo [6/6] Opening the app...
start "" "http://localhost:8080/app"

echo.
echo =====================================================
echo   FinAI R3 is running!
echo   App             : http://localhost:8080/app
echo   Fair Value demo : login, then sidebar "Market"
echo   API docs        : http://localhost:8000/docs
echo   Demo login      : demo@example.com / Demo#12345
echo   Admin login     : admin@finai.local / Admin@12345
echo   Stop            : double-click STOP-FINAI-R3.cmd
echo =====================================================
ping -n 11 127.0.0.1 >nul
