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
        [int]$TimeoutSeconds,
        [System.Diagnostics.Process]$Process = $null
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-HindsightHealth -Port $Port) {
            return @{
                Healthy = $true
                Reason = "healthy"
            }
        }

        if ($null -ne $Process) {
            try {
                if ($Process.HasExited) {
                    return @{
                        Healthy = $false
                        Reason = "process-exited"
                    }
                }
            } catch {
                # Ignore transient access/process state races and continue polling.
            }
        }

        Start-Sleep -Seconds 2
    }

    return @{
        Healthy = $false
        Reason = "timeout"
    }
}

function Get-LogTail {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [int]$Lines = 80
    )

    if (-not (Test-Path $Path)) {
        return ""
    }

    return (Get-Content -Path $Path -Tail $Lines -ErrorAction SilentlyContinue | Out-String).Trim()
}

function Stop-HindsightProcess {
    param([System.Diagnostics.Process]$Process)

    if ($null -eq $Process) {
        return
    }

    try {
        if (-not $Process.HasExited) {
            Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        }
    } catch {
        # Best-effort cleanup only.
    }
}

function Reset-HindsightLogs {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Paths
    )

    foreach ($path in $Paths) {
        New-Item -ItemType File -Force -Path $path | Out-Null
        Clear-Content -Path $path -ErrorAction SilentlyContinue
    }
}

function Set-CommonHindsightEnv {
    param([int]$PostgresPort)

    $env:HINDSIGHT_API_DATABASE_URL = "postgresql://hindsight@127.0.0.1:$PostgresPort/hindsight"
    $env:HINDSIGHT_API_RERANKER_PROVIDER = "rrf"
    $env:HINDSIGHT_API_MCP_ENABLED = "false"
    $env:NO_PROXY = "127.0.0.1,localhost"
}

function Set-RemoteHindsightProfile {
    param([hashtable]$EnvMap)

    $env:HINDSIGHT_API_LLM_PROVIDER = "openai"
    $env:HINDSIGHT_API_LLM_API_KEY = $EnvMap["QWEN_API_KEY"]
    $env:HINDSIGHT_API_LLM_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    $env:HINDSIGHT_API_LLM_MODEL = "qwen3.5-plus"
    $env:HINDSIGHT_API_EMBEDDINGS_PROVIDER = "openai"
    $env:HINDSIGHT_API_EMBEDDINGS_OPENAI_API_KEY = $EnvMap["QWEN_API_KEY"]
    $env:HINDSIGHT_API_EMBEDDINGS_OPENAI_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    $env:HINDSIGHT_API_EMBEDDINGS_OPENAI_MODEL = "text-embedding-v4"

    foreach ($name in @(
        "HINDSIGHT_API_SKIP_LLM_VERIFICATION",
        "HINDSIGHT_API_EMBEDDINGS_LOCAL_MODEL",
        "HINDSIGHT_API_EMBEDDINGS_LOCAL_FORCE_CPU",
        "HINDSIGHT_API_EMBEDDINGS_LOCAL_TRUST_REMOTE_CODE"
    )) {
        Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue
    }
}

function Get-ExistingEmbeddingDimension {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PsqlExe,
        [int]$PostgresPort
    )

    $sql = @"
SELECT format_type(a.atttypid, a.atttypmod)
FROM pg_attribute a
JOIN pg_class c ON a.attrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'memory_units'
  AND a.attname = 'embedding'
  AND a.attnum > 0
  AND NOT a.attisdropped
LIMIT 1;
"@

    $typeName = (& $PsqlExe -h 127.0.0.1 -p $PostgresPort -U hindsight -d hindsight -tAc $sql 2>$null | Out-String).Trim()
    if ($typeName -match "vector\((\d+)\)") {
        return [int]$Matches[1]
    }

    return $null
}

function Get-DegradedLocalEmbeddingModel {
    param([Nullable[int]]$Dimension)

    if ($null -eq $Dimension) {
        return "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    }

    switch ($Dimension) {
        384 {
            return "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        }
        1024 {
            return "BAAI/bge-large-zh-v1.5"
        }
        default {
            throw "No degraded local embedding model is mapped for existing embedding dimension $Dimension"
        }
    }
}

function Ensure-LocalEmbeddingsDependencies {
    param([string]$PythonExe)

    & $env:ComSpec /d /c "`"$PythonExe`" -c `"import sentence_transformers`" >nul 2>nul" | Out-Null
    if ($LASTEXITCODE -eq 0) {
        return
    }

    & $PythonExe -m pip install --disable-pip-version-check sentence-transformers
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install sentence-transformers into $PythonExe"
    }
}

function Set-DegradedHindsightProfile {
    param(
        [string]$PythonExe,
        [string]$PsqlExe,
        [int]$PostgresPort
    )

    Ensure-LocalEmbeddingsDependencies -PythonExe $PythonExe
    $existingDimension = Get-ExistingEmbeddingDimension -PsqlExe $PsqlExe -PostgresPort $PostgresPort
    $localModel = Get-DegradedLocalEmbeddingModel -Dimension $existingDimension

    $env:HINDSIGHT_API_LLM_PROVIDER = "none"
    $env:HINDSIGHT_API_LLM_API_KEY = ""
    $env:HINDSIGHT_API_LLM_BASE_URL = ""
    $env:HINDSIGHT_API_LLM_MODEL = "none"
    $env:HINDSIGHT_API_SKIP_LLM_VERIFICATION = "true"
    $env:HINDSIGHT_API_EMBEDDINGS_PROVIDER = "local"
    $env:HINDSIGHT_API_EMBEDDINGS_LOCAL_MODEL = $localModel
    $env:HINDSIGHT_API_EMBEDDINGS_LOCAL_FORCE_CPU = "true"
    $env:HINDSIGHT_API_EMBEDDINGS_LOCAL_TRUST_REMOTE_CODE = "false"

    foreach ($name in @(
        "HINDSIGHT_API_EMBEDDINGS_OPENAI_API_KEY",
        "HINDSIGHT_API_EMBEDDINGS_OPENAI_BASE_URL",
        "HINDSIGHT_API_EMBEDDINGS_OPENAI_MODEL"
    )) {
        Remove-Item -Path "Env:$name" -ErrorAction SilentlyContinue
    }
}

function Start-HindsightApiProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,
        [Parameter(Mandatory = $true)]
        [int]$Port,
        [Parameter(Mandatory = $true)]
        [string]$StdoutPath,
        [Parameter(Mandatory = $true)]
        [string]$StderrPath,
        [Parameter(Mandatory = $true)]
        [string]$PidFilePath
    )

    Reset-HindsightLogs -Paths @($StdoutPath, $StderrPath)

    $proc = Start-Process `
        -FilePath $FilePath `
        -ArgumentList @("--host", "127.0.0.1", "--port", "$Port", "--log-level", "info") `
        -WorkingDirectory $WorkingDirectory `
        -RedirectStandardOutput $StdoutPath `
        -RedirectStandardError $StderrPath `
        -WindowStyle Hidden `
        -PassThru

    Set-Content -Path $PidFilePath -Value $proc.Id -Encoding ascii
    return $proc
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

Set-CommonHindsightEnv -PostgresPort $PostgresPort

$proxyVars = @("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "OPENCLAW_USER_AGENT")
foreach ($name in $proxyVars) {
    $value = [Environment]::GetEnvironmentVariable($name, "Process")
    if (-not [string]::IsNullOrWhiteSpace($value)) {
        Set-Item -Path "Env:$name" -Value $value
    }
}

$startupErrors = @()

Set-RemoteHindsightProfile -EnvMap $envMap
$proc = Start-HindsightApiProcess `
    -FilePath $hindsightExe `
    -WorkingDirectory $repoRoot `
    -Port $HindsightPort `
    -StdoutPath $hindsightStdout `
    -StderrPath $hindsightStderr `
    -PidFilePath $hindsightPidFile

$primaryHealth = Wait-HindsightHealth -Port $HindsightPort -TimeoutSeconds $StartupTimeoutSeconds -Process $proc
if ($primaryHealth.Healthy) {
    exit 0
}

$primaryStdout = Get-LogTail -Path $hindsightStdout
$primaryStderr = Get-LogTail -Path $hindsightStderr
$startupErrors += "Remote Hindsight profile failed ($($primaryHealth.Reason))."
if ($primaryStderr) {
    $startupErrors += "Remote stderr:`n$primaryStderr"
}
if ($primaryStdout) {
    $startupErrors += "Remote stdout:`n$primaryStdout"
}
Stop-HindsightProcess -Process $proc

Set-DegradedHindsightProfile `
    -PythonExe (Join-Path $hindsightVenv "Scripts\python.exe") `
    -PsqlExe $postgresPsql `
    -PostgresPort $PostgresPort
$fallbackProc = Start-HindsightApiProcess `
    -FilePath $hindsightExe `
    -WorkingDirectory $repoRoot `
    -Port $HindsightPort `
    -StdoutPath $hindsightStdout `
    -StderrPath $hindsightStderr `
    -PidFilePath $hindsightPidFile

$fallbackHealth = Wait-HindsightHealth -Port $HindsightPort -TimeoutSeconds $StartupTimeoutSeconds -Process $fallbackProc
if ($fallbackHealth.Healthy) {
    exit 0
}

$fallbackStdout = Get-LogTail -Path $hindsightStdout
$fallbackStderr = Get-LogTail -Path $hindsightStderr
$startupErrors += "Degraded Hindsight profile failed ($($fallbackHealth.Reason))."
if ($fallbackStderr) {
    $startupErrors += "Degraded stderr:`n$fallbackStderr"
}
if ($fallbackStdout) {
    $startupErrors += "Degraded stdout:`n$fallbackStdout"
}
Stop-HindsightProcess -Process $fallbackProc

throw ($startupErrors -join "`n`n")
