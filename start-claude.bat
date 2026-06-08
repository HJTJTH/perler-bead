@echo off
title Claude Code - 大王
cd /d C:\claudecode
cls
echo.
echo    🧠 Claude Code 启动中...
echo    ─────────────────────────
echo    正在恢复上次对话...
echo.
call C:\Users\Administrator\nodejs\node-v22.12.0-win-x64\claude.cmd --resume
echo.
echo    ─────────────────────────
echo    Claude Code 已关闭
pause
