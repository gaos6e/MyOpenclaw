param(
  [Parameter(Mandatory=$true)][string]$SourceDir,
  [Parameter(Mandatory=$true)][string]$DestDir
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $SourceDir)) {
  throw "SourceDir not found: $SourceDir"
}

New-Item -ItemType Directory -Force -Path $DestDir | Out-Null

# Use local time for naming (job is scheduled in Asia/Shanghai)
$stamp = (Get-Date).ToString('yyyyMMdd')
$time  = (Get-Date).ToString('HHmmss')
$zipName = "zotero-storage-$stamp-$time.zip"
$zipPath = Join-Path $DestDir $zipName

Write-Host "SourceDir: $SourceDir"
Write-Host "DestDir:   $DestDir"
Write-Host "ZipPath:   $zipPath"

# Retention policy: keep ONLY today's zip, delete older zotero-storage-*.zip in DestDir
Write-Host "Retention: delete previous zotero-storage-*.zip, keep today's only"
Get-ChildItem -LiteralPath $DestDir -File -Force -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like 'zotero-storage-*.zip' } |
  ForEach-Object {
    try {
      Remove-Item -LiteralPath $_.FullName -Force -ErrorAction Stop
      Write-Host ("Deleted old zip: " + $_.FullName)
    } catch {
      Write-Host ("Failed to delete old zip: " + $_.FullName)
      Write-Host $_.Exception.Message
    }
  }

# Also delete old tar logs
Get-ChildItem -LiteralPath $DestDir -File -Force -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like 'zotero-storage-*.tar.log.txt' } |
  ForEach-Object {
    try { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction Stop } catch { }
  }

# Create zip
# Strategy:
# - Prefer Compress-Archive (best Unicode filename support)
# - If file lock/IO exception occurs, fall back to tar via cmd.exe + chcp 65001
$compressed = $false

Write-Host "Compress-Archive: start"
try {
  Compress-Archive -Path (Join-Path $SourceDir '*') -DestinationPath $zipPath -Force
  $compressed = $true
  Write-Host "Compress-Archive: ok"
} catch {
  Write-Host "Compress-Archive failed, fallback to tar.exe"
  Write-Host $_.Exception.Message
}

if (-not $compressed) {
  $tar = (Get-Command tar.exe -ErrorAction SilentlyContinue)
  if (-not $tar) {
    throw "Both Compress-Archive and tar.exe unavailable"
  }

  $logPath = Join-Path $DestDir ("zotero-storage-" + $stamp + "-" + $time + ".tar.log.txt")
  $cmd = "chcp 65001>nul & tar -a -c -f `"$zipPath`" -C `"$SourceDir`" . 1>nul 2>`"$logPath`""
  cmd.exe /c $cmd | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "tar.exe failed with exit code $LASTEXITCODE (see log: $logPath)"
  }

  Write-Host "tar.exe: ok (see log: $logPath)"
}

# Quick stats
$zipItem = Get-Item -LiteralPath $zipPath -Force
Write-Host ("ZipSizeMB: " + [Math]::Round($zipItem.Length/1MB, 2))
Write-Host ("ZipLastWrite: " + $zipItem.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))

Write-Host "(done)"
