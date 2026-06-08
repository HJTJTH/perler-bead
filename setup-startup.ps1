$startup = [Environment]::GetFolderPath('Startup')
Write-Host "Startup folder: $startup"

$WshShell = New-Object -ComObject WScript.Shell

# 1. CC Switch
$shortcut = $WshShell.CreateShortcut("$startup\CC Switch.lnk")
$shortcut.TargetPath = "$env:LOCALAPPDATA\Programs\CC Switch\cc-switch.exe"
$shortcut.WorkingDirectory = "$env:LOCALAPPDATA\Programs\CC Switch"
$shortcut.Description = 'CC Switch'
$shortcut.Save()
Write-Host 'CC Switch shortcut created'

# 2. Feishu
$shortcut = $WshShell.CreateShortcut("$startup\Feishu.lnk")
$shortcut.TargetPath = "$env:LOCALAPPDATA\Feishu\Feishu.exe"
$shortcut.WorkingDirectory = "$env:LOCALAPPDATA\Feishu"
$shortcut.Description = 'Feishu (Lark)'
$shortcut.Save()
Write-Host 'Feishu shortcut created'

# 3. cc-remote relay
$shortcut = $WshShell.CreateShortcut("$startup\cc-remote.lnk")
$shortcut.TargetPath = "C:\Users\Administrator\nodejs\node-v22.12.0-win-x64\node.exe"
$shortcut.Arguments = "C:\Users\Administrator\nodejs\node-v22.12.0-win-x64\node_modules\@bastdewfn\cc-remote\bin\cc-remote.js"
$shortcut.WorkingDirectory = "C:\Users\Administrator\nodejs\node-v22.12.0-win-x64"
$shortcut.Description = 'cc-remote relay for Claude Code'
$shortcut.Save()
Write-Host 'cc-remote shortcut created'

Write-Host 'Done! All three startup shortcuts created.'
