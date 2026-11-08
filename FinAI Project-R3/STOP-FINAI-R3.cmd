@echo off
title FinAI R3 - stop
cd /d "%~dp0"
set COMPOSE_PROJECT_NAME=finai-r3
echo Stopping FinAI R3 containers (your data is kept)...
docker compose down
echo.
echo Done. To also wipe the R3 database: docker compose -p finai-r3 down -v
pause
