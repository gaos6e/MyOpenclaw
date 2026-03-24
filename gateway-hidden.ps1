$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$gatewayCmd = Join-Path $scriptDir "gateway.cmd"

if (-not (Test-Path $gatewayCmd)) {
    throw "gateway.cmd not found: $gatewayCmd"
}

$logDir = Join-Path $env:LOCALAPPDATA "Temp\openclaw"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$stdoutLog = Join-Path $logDir "gateway-wrapper-stdout.log"
$stderrLog = Join-Path $logDir "gateway-wrapper-stderr.log"

$proc = Start-Process `
    -FilePath "$env:SystemRoot\System32\cmd.exe" `
    -ArgumentList @("/d", "/s", "/c", "`"$gatewayCmd`"") `
    -WorkingDirectory $scriptDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru

try {
    Wait-Process -Id $proc.Id
    exit $proc.ExitCode
}
finally {
    if (-not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}
