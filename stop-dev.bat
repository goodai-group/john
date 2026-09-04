@echo off
REM ============================================================
REM  BAM Platform - 一键停止本地 dev server
REM  杀掉监听 3000 端口的所有进程
REM ============================================================
chcp 65001 >nul
setlocal

set PORT=3000

echo 查找 %PORT% 端口监听进程...
set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  echo 杀掉 PID %%a
  taskkill /F /PID %%a >nul 2>&1
  set FOUND=1
)

if %FOUND%==0 (
  echo 端口 %PORT% 上没有 dev server 在运行
)
endlocal
pause
exit /b 0