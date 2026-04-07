param(
    [int]$PostgresPort = 55432,
    [int]$HindsightPort = 18890
)

$ErrorActionPreference = "Stop"

function Get-ListeningProcessId {
    param([int]$Port)

    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1
        if ($connection) {
            return [int]$connection.OwningProcess
        }
    } catch {
        return $null
    }

    return $null
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$postgresCtl = "C:\Users\20961\miniconda3\envs\openclaw-hindsight-pg\Library\bin\pg_ctl.exe"
$postgresDataDir = Join-Path $repoRoot "memory\hindsight-pg\data"
$hindsightPidFile = Join-Path $repoRoot "memory\hindsight-api-runtime\hindsight-api.pid"

$resolvedPid = $null
if (Test-Path $hindsightPidFile) {
    $pid = Get-Content $hindsightPidFile -ErrorAction SilentlyContinue
    if ($pid -match "^\d+$") {
        $resolvedPid = [int]$pid
    }
}

if (-not $resolvedPid) {
    $resolvedPid = Get-ListeningProcessId -Port $HindsightPort
}

if ($resolvedPid) {
    $process = Get-Process -Id $resolvedPid -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $process.Id -Force
    }
}

Remove-Item $hindsightPidFile -Force -ErrorAction SilentlyContinue

if (Test-Path $postgresCtl -and Test-Path $postgresDataDir) {
    & $postgresCtl -D $postgresDataDir stop -m fast | Out-Null
}
