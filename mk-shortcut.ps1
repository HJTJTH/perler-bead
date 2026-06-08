$ws = New-Object -ComObject WScript.Shell
$desk = [Environment]::GetFolderPath("Desktop")
$shortcutPath = "$desk\Claude Code.lnk"
if (Test-Path $shortcutPath) { Remove-Item $shortcutPath -Force }

$sc = $ws.CreateShortcut($shortcutPath)
$sc.TargetPath = "C:\Windows\System32\cmd.exe"
$sc.Arguments = "/k ""C:\claudecode\start-claude.bat"""
$sc.WorkingDirectory = "C:\claudecode"
$sc.Description = "Claude Code - 大王"
$sc.WindowStyle = 1
$iconFile = "C:\Windows\System32\imageres.dll"
if (Test-Path $iconFile) { $sc.IconLocation = "$iconFile,205" }
$sc.Save()
Write-Host "Shortcut updated to resume-mode"
