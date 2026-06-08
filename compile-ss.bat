@echo off
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /nologo /target:exe /out:C:\claudecode\ss.exe C:\claudecode\screenshot.cs /reference:System.Drawing.dll /reference:System.Windows.Forms.dll
IF %ERRORLEVEL% EQU 0 (echo COMPILE OK) ELSE (echo COMPILE FAILED)
