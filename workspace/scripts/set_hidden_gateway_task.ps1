$ErrorActionPreference = "Stop"

$taskName = "OpenClaw Gateway"
$root = "C:\Users\20961\.openclaw"
$wrapper = Join-Path $root "gateway-hidden.vbs"
$wscriptExe = Join-Path $env:SystemRoot "System32\wscript.exe"

if (-not (Test-Path $wrapper)) {
    throw "Missing wrapper script: $wrapper"
}

$taskCommand = "`"$wscriptExe`" //B //Nologo `"$wrapper`""

# Re-register the task so it launches the hidden VBS wrapper at logon.
schtasks /Create /TN $taskName /SC ONLOGON /TR $taskCommand /F /IT | Out-Null

Write-Host "Registered hidden gateway task:"
Write-Host "  Name: $taskName"
Write-Host "  Command: $taskCommand"
