$now = Get-Date
$startTime = $now.AddMinutes(1)

$action = New-ScheduledTaskAction -Execute "C:\Users\Administrator\Desktop\nircmd.exe" -Argument "savescreenshot C:\Users\Administrator\Desktop\screenshot.png"
$trigger = New-ScheduledTaskTrigger -Once -At $startTime
$principal = New-ScheduledTaskPrincipal -UserId "Administrator" -LogonType Interactive
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

$task = Register-ScheduledTask -TaskName "ScreenshotTask" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force
Start-ScheduledTask -TaskName "ScreenshotTask"
Start-Sleep -Seconds 8
Unregister-ScheduledTask -TaskName "ScreenshotTask" -Confirm:$false

Write-Host "Screenshot taken: C:\Users\Administrator\Desktop\screenshot.png"
