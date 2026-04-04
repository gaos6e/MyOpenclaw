param(
    [string]$TaskName = "OpenClaw Daily Hygiene",
    [string]$StartTime = "03:30"
)

$ErrorActionPreference = "Stop"

$runner = (Resolve-Path (Join-Path $PSScriptRoot "run_openclaw_hygiene.ps1")).Path
$powershellExe = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"

if (-not (Test-Path $runner)) {
    throw "Missing hygiene runner script: $runner"
}

$taskCommand = "`"$powershellExe`" -NoProfile -ExecutionPolicy Bypass -File `"$runner`""

schtasks /Create /TN $TaskName /SC DAILY /ST $StartTime /TR $taskCommand /F | Out-Null

Write-Host "Registered daily hygiene task:"
Write-Host "  Name: $TaskName"
Write-Host "  Time: $StartTime"
Write-Host "  Command: $taskCommand"
