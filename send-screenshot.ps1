Add-Type -AssemblyName System.Windows.Forms

$screenshotFile = "C:\Users\Administrator\Desktop\screenshot.png"
$feishuPath = "$env:LOCALAPPDATA\Feishu\Feishu.exe"

$col = New-Object System.Collections.Specialized.StringCollection
$col.Add($screenshotFile)
[System.Windows.Forms.Clipboard]::SetFileDropList($col)
Write-Host "Screenshot copied to clipboard"

if (Test-Path $feishuPath) {
    Start-Process $feishuPath
    Write-Host "Feishu launched - go to group and Ctrl+V"
} else {
    Write-Host "Feishu not found at: $feishuPath"
}
