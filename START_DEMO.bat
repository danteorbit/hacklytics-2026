@echo off
title SnapPark Demo
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0demo.ps1"
pause
