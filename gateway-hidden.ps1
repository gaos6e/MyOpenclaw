$ErrorActionPreference = "Stop"

$env:TMPDIR = "C:\Users\20961\AppData\Local\Temp"
$env:NODE_USE_ENV_PROXY = "1"
$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:NO_PROXY = "127.0.0.1,localhost"
$env:ALL_PROXY = "http://127.0.0.1:7890"
$env:http_proxy = "http://127.0.0.1:7890"
$env:https_proxy = "http://127.0.0.1:7890"
$env:no_proxy = "127.0.0.1,localhost"
$env:all_proxy = "http://127.0.0.1:7890"
$env:OPENCLAW_GATEWAY_PORT = "18789"
$env:OPENCLAW_SYSTEMD_UNIT = "openclaw-gateway.service"
$env:OPENCLAW_WINDOWS_TASK_NAME = "OpenClaw Gateway"
$env:OPENCLAW_SERVICE_MARKER = "openclaw"
$env:OPENCLAW_SERVICE_KIND = "gateway"
$env:OPENCLAW_SERVICE_VERSION = "2026.3.13"

$logDir = "C:\Users\20961\AppData\Local\Temp\openclaw"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$stdoutLog = Join-Path $logDir "gateway-stdout.log"
$stderrLog = Join-Path $logDir "gateway-stderr.log"

$proc = Start-Process `
    -FilePath "C:\Program Files\nodejs\node.exe" `
    -ArgumentList @(
        "C:\Users\20961\AppData\Roaming\npm\node_modules\openclaw\dist\index.js",
        "gateway",
        "--port",
        "18789"
    ) `
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
