$ErrorActionPreference = "Stop"

$pythonExe = "C:\Users\20961\.openclaw\workspace\Star-Office-UI\.venv\Scripts\python.exe"

$matches = Get-CimInstance Win32_Process | Where-Object {
    $_.ExecutablePath -eq $pythonExe -or
    ($_.CommandLine -like "*app.py*" -and $_.CommandLine -like "*Star-Office-UI*") -or
    $_.CommandLine -like "*launch-star-office.cmd*"
}

if (-not $matches) {
    Write-Output "Star Office UI is not running."
    exit 0
}

$stopped = @()
foreach ($proc in $matches) {
    Stop-Process -Id $proc.ProcessId -Force
    $stopped += $proc.ProcessId
}

Write-Output ("Stopped Star Office UI process(es): " + ($stopped -join ", "))
