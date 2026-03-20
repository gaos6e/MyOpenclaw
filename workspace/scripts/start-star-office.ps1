$ErrorActionPreference = "Stop"

$workspace = "C:\Users\20961\.openclaw\workspace"
$repo = Join-Path $workspace "Star-Office-UI"
$launcher = "C:\Users\20961\.openclaw\workspace\scripts\launch-star-office.cmd"
$logDir = Join-Path $repo ".logs"
$healthUrl = "http://127.0.0.1:19000/health"

if (-not (Test-Path $launcher)) {
    throw "Launcher script not found: $launcher"
}

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

try {
    $existing = curl.exe -sS $healthUrl 2>$null
    if ($LASTEXITCODE -eq 0 -and $existing) {
        Write-Output "Star Office UI is already running at http://127.0.0.1:19000"
        exit 0
    }
} catch {
}

$process = Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList "/c `"$launcher`"" `
    -WorkingDirectory $workspace `
    -WindowStyle Hidden `
    -PassThru

for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    try {
        $health = curl.exe -sS $healthUrl 2>$null
        if ($LASTEXITCODE -eq 0 -and $health) {
            Write-Output "Star Office UI started at http://127.0.0.1:19000 (PID $($process.Id))"
            exit 0
        }
    } catch {
    }
}

throw "Star Office UI did not become healthy in time. Check logs in $logDir"
