$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeExe = "C:\Program Files\nodejs\node.exe"
$gatewayEntry = "C:\Users\20961\AppData\Roaming\npm\node_modules\openclaw\dist\index.js"

if (-not (Test-Path $nodeExe)) {
    throw "node.exe not found: $nodeExe"
}
if (-not (Test-Path $gatewayEntry)) {
    throw "OpenClaw gateway entry not found: $gatewayEntry"
}

$logDir = Join-Path $env:LOCALAPPDATA "Temp\openclaw"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$stdoutLog = Join-Path $logDir "gateway-wrapper-stdout.log"
$stderrLog = Join-Path $logDir "gateway-wrapper-stderr.log"

$env:CODEX_HOME = Join-Path $scriptDir ".codex-openclaw"
$env:OPENCLAW_GATEWAY_PORT = "18789"

$proc = Start-Process `
    -FilePath $nodeExe `
    -ArgumentList @($gatewayEntry, "gateway", "--port", $env:OPENCLAW_GATEWAY_PORT) `
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
