$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$nodeExe = (Get-Command node -ErrorAction Stop).Source
$logDir = Join-Path $repoRoot "logs"
$logPath = Join-Path $logDir "openclaw-hygiene-task.log"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Append-LogLine {
    param(
        [string]$Text
    )

    [System.IO.File]::AppendAllText($logPath, $Text + [Environment]::NewLine, $utf8NoBom)
}

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Append-LogLine "[$stamp] hygiene task start"

try {
    $result = & $nodeExe (Join-Path $repoRoot "workspace\scripts\openclaw_hygiene_maintain.cjs") --repo-root $repoRoot 2>&1 | Out-String
    $trimmed = $result.TrimEnd()
    if ($trimmed) {
        Append-LogLine $trimmed
        Write-Host $trimmed
    }
    $doneStamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Append-LogLine "[$doneStamp] hygiene task success"
} catch {
    $failStamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Append-LogLine "[$failStamp] hygiene task failed: $($_.Exception.Message)"
    throw
}
