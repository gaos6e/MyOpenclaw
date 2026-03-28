$ErrorActionPreference = "Stop"

Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine } |
  Where-Object {
    ($_.CommandLine -match 'dashboard[\\/]+server\.py' -and $_.CommandLine -match '--port\s+8011') -or
    ($_.CommandLine -match 'run_loop\.sh')
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
