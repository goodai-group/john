@echo off
REM ============================================================
REM  BAM Platform - 一键启动本地 dev server
REM  双击本文件即可（无需打开 PowerShell / 记命令）
REM  行为：
REM    1. 先杀掉残留的 3000 端口进程（防止上次没关干净导致端口冲突）
REM    2. 在新的独立窗口中启动 npm run dev，关闭本窗口不会杀掉服务
REM    3. 等待端口就绪后自动打开浏览器到 http://localhost:3000
REM ============================================================
chcp 65001 >nul
setlocal

cd /d "%~dp0"

set PORT=3000
set LOG_FILE=%~dp0_dev_autostart.log

echo [1/3] 清理残留的 %PORT% 端口进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  echo   杀掉 PID %%a
  taskkill /F /PID %%a >nul 2>&1
)

echo [2/3] 启动 dev server（新窗口，日志写入 _dev_autostart.log）...
REM /b 在后台跑、/d 不打开新窗口、输出重定向到日志；不会随本窗口关闭而退出
start "BAM-Dev-Server" /b cmd /c "npm run dev > "%LOG_FILE%" 2>&1"

echo [3/3] 等待端口 %PORT% 就绪...
set /a TRY=0
:WAIT_LOOP
set /a TRY+=1
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":%PORT%" | findstr "LISTENING" >nul
if %errorlevel%==0 goto READY
if %TRY% GEQ 30 (
  echo [警告] 等待 30 秒仍未监听 %PORT%，请查看日志：%LOG_FILE%
  notepad "%LOG_FILE%"
  pause
  exit /b 1
)
goto WAIT_LOOP

:READY
echo.
echo ✅ BAM Platform Dev Server 已就绪 -> http://localhost:%PORT%
echo    日志：%LOG_FILE%
echo    关闭服务：在任务管理器结束 node.exe，或双击 stop-dev.bat
echo.
start "" "http://localhost:%PORT%"

REM 让窗口停留几秒再关，方便看到状态（也可以注释掉下面这行让窗口立刻退出）
timeout /t 3 /nobreak >nul
endlocal
exit /b 0