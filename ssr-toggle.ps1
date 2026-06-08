param([string]$action = "on")

$ssrExe = "C:\Users\Administrator\ShadowsocksR-win-4.9.0\ShadowsocksR-dotnet4.0.exe"

if ($action -eq "on") {
    $port = netstat -an | Select-String "1081.*LISTENING"
    if ($port) {
        Write-Host "SSR already on"
        return
    }
    Start-Process $ssrExe -WindowStyle Minimized
    Start-Sleep -Seconds 3
    $port = netstat -an | Select-String "1081.*LISTENING"
    if ($port) { Write-Host "SSR ON" } else { Write-Host "SSR FAIL" }
} else {
    $proc = Get-Process -Name "ShadowsocksR*" -ErrorAction SilentlyContinue
    if ($proc) { $proc | Stop-Process -Force; Write-Host "SSR OFF" }
    else { Write-Host "SSR not running" }
}
