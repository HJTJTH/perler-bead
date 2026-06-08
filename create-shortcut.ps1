Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$s = [System.Windows.Forms.Screen]::PrimaryScreen
$b = New-Object System.Drawing.Bitmap $s.Bounds.Width, $s.Bounds.Height
$g = [System.Drawing.Graphics]::FromImage($b)
$g.CopyFromScreen($s.Bounds.X, $s.Bounds.Y, 0, 0, $s.Bounds.Size)
$b.Save("$env:USERPROFILE\Desktop\screenshot.png")
$g.Dispose(); $b.Dispose()
