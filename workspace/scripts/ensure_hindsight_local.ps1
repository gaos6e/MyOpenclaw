param(
    [int]$PostgresPort = 55432,
    [int]$HindsightPort = 18890,
    [int]$StartupTimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Read-DotEnv {
    param([string]$Path)

    $map = @{}
    if (-not (Test-Path $Path)) {
        return $map
    }

    Get-Content $Path | ForEach-Object {
        if ($_ -match "^\s*#" -or $_ -match "^\s*$") {
            return
        }

        $idx = $_.IndexOf("=")
        if ($idx -le 0) {
            return
        }

        $key = $_.Substring(0, $idx).Trim()
        $value = $_.Substring($idx + 1)
        $map[$key] = $value
    }

    return $map
}

function Test-HindsightHealth {
    param([int]$Port)

    try {
        $resp = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 5
        return $resp.status -eq "healthy"
    } catch {
        return $false
    }
}

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

function Wait-HindsightHealth {
    param(
        [int]$Port,
        [int]$TimeoutSeconds
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-HindsightHealth -Port $Port) {
            return $true
        }
        Start-Sleep -Seconds 2
    }

    return $false
}

$repoRoot = Get-RepoRoot
$envFile = Join-Path $repoRoot ".env"
$envMap = Read-DotEnv -Path $envFile

if (-not $envMap.ContainsKey("QWEN_API_KEY")) {
    throw "Missing QWEN_API_KEY in $envFile"
}

$postgresEnvRoot = "C:\Users\20961\miniconda3\envs\openclaw-hindsight-pg"
$postgresBin = Join-Path $postgresEnvRoot "Library\bin"
$postgresCtl = Join-Path $postgresBin "pg_ctl.exe"
$postgresIsReady = Join-Path $postgresBin "pg_isready.exe"
$postgresPsql = Join-Path $postgresBin "psql.exe"
$postgresCreateDb = Join-Path $postgresBin "createdb.exe"

$postgresRoot = Join-Path $repoRoot "memory\hindsight-pg"
$postgresDataDir = Join-Path $postgresRoot "data"
$postgresLogDir = Join-Path $postgresRoot "logs"
$postgresLog = Join-Path $postgresLogDir "postgres.log"

$hindsightVenv = Join-Path $repoRoot "memory\hindsight-api-venv"
$hindsightExe = Join-Path $hindsightVenv "Scripts\hindsight-api.exe"
$hindsightRoot = Join-Path $repoRoot "memory\hindsight-api-runtime"
$hindsightLogDir = Join-Path $hindsightRoot "logs"
$hindsightStdout = Join-Path $hindsightLogDir "hindsight-api.stdout.log"
$hindsightStderr = Join-Path $hindsightLogDir "hindsight-api.stderr.log"
$hindsightPidFile = Join-Path $hindsightRoot "hindsight-api.pid"

if (-not (Test-Path $postgresCtl)) {
    throw "Missing PostgreSQL control binary: $postgresCtl"
}
if (-not (Test-Path $postgresDataDir)) {
    throw "Missing PostgreSQL data directory: $postgresDataDir"
}
if (-not (Test-Path $hindsightExe)) {
    throw "Missing Hindsight API executable: $hindsightExe"
}

New-Item -ItemType Directory -Force -Path $postgresLogDir, $hindsightLogDir | Out-Null

$env:PATH = "$postgresBin;$env:PATH"

& $postgresIsReady -h 127.0.0.1 -p $PostgresPort -U hindsight | Out-Null
if ($LASTEXITCODE -ne 0) {
    & $postgresCtl -D $postgresDataDir -l $postgresLog -o "-p $PostgresPort -h 127.0.0.1" start | Out-Null
    Start-Sleep -Seconds 3
    & $postgresIsReady -h 127.0.0.1 -p $PostgresPort -U hindsight | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL failed to start on 127.0.0.1:$PostgresPort"
    }
}

$dbExists = & $postgresPsql -h 127.0.0.1 -p $PostgresPort -U hindsight -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='hindsight';"
if (-not $dbExists) {
    & $postgresCreateDb -h 127.0.0.1 -p $PostgresPort -U hindsight hindsight | Out-Null
}

& $postgresPsql -h 127.0.0.1 -p $PostgresPort -U hindsight -d hindsight -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS vector;" | Out-Null

if (Test-HindsightHealth -Port $HindsightPort) {
    $existingPid = Get-ListeningProcessId -Port $HindsightPort
    if ($existingPid) {
        Set-Content -Path $hindsightPidFile -Value $existingPid -Encoding ascii
    }
    exit 0
}

$env:HINDSIGHT_API_DATABASE_URL = "postgresql://hindsight@127.0.0.1:$PostgresPort/hindsight"
$env:HINDSIGHT_API_LLM_PROVIDER = "openai"
$env:HINDSIGHT_API_LLM_API_KEY = $envMap["QWEN_API_KEY"]
$env:HINDSIGHT_API_LLM_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
$env:HINDSIGHT_API_LLM_MODEL = "qwen3.5-plus"
$env:HINDSIGHT_API_EMBEDDINGS_PROVIDER = "openai"
$env:HINDSIGHT_API_EMBEDDINGS_OPENAI_API_KEY = $envMap["QWEN_API_KEY"]
$env:HINDSIGHT_API_EMBEDDINGS_OPENAI_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
$env:HINDSIGHT_API_EMBEDDINGS_OPENAI_MODEL = "text-embedding-v4"
$env:HINDSIGHT_API_RERANKER_PROVIDER = "rrf"
$env:HINDSIGHT_API_MCP_ENABLED = "false"
$env:NO_PROXY = "127.0.0.1,localhost"

$proxyVars = @("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "OPENCLAW_USER_AGENT")
foreach ($name in $proxyVars) {
    $value = [Environment]::GetEnvironmentVariable($name, "Process")
    if (-not [string]::IsNullOrWhiteSpace($value)) {
        Set-Item -Path "Env:$name" -Value $value
    }
}

$proc = Start-Process `
    -FilePath $hindsightExe `
    -ArgumentList @("--host", "127.0.0.1", "--port", "$HindsightPort", "--log-level", "info") `
    -WorkingDirectory $repoRoot `
    -RedirectStandardOutput $hindsightStdout `
    -RedirectStandardError $hindsightStderr `
    -WindowStyle Hidden `
    -PassThru

Set-Content -Path $hindsightPidFile -Value $proc.Id -Encoding ascii

if (-not (Wait-HindsightHealth -Port $HindsightPort -TimeoutSeconds $StartupTimeoutSeconds)) {
    if (-not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force
    }

    throw "Hindsight API failed to become healthy. See $hindsightStdout and $hindsightStderr"
}
