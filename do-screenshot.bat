@echo off
schtasks /create /tn TakeScreenshot /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Users\Administrator\Desktop\take-screenshot.ps1" /sc once /st 00:00 /ru Administrator /it /f
schtasks /run /tn TakeScreenshot
timeout /t 5 /nobreak >/dev/null
schtasks /delete /tn TakeScreenshot /f
echo Done
