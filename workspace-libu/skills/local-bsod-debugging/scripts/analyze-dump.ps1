param(
  [string]$DumpPath
)

if (-not $DumpPath -or -not (Test-Path $DumpPath)) {
  Write-Error "Dump not found: $DumpPath"
  exit 1
}

# Resolve cdb.exe
$cdb = & "$PSScriptRoot\find-cdb.ps1"
if (-not $cdb) {
  Write-Error "cdb.exe not found. Install Debugging Tools for Windows or WinDbg (Store)"
  exit 2
}

# Run analysis
$cmd = "`"$cdb`" -z `"$DumpPath`" -c `"!analyze -v; q`""
Write-Host "Running: $cmd"

# Execute and tee output
& $cdb -z $DumpPath -c "!analyze -v; q"
