$ErrorActionPreference = "Stop"

$RepoDir = Join-Path $env:USERPROFILE ".openclaw\workspace\skills\edict"
$Bash = if (Test-Path "C:\Program Files\Git\bin\bash.exe") {
  "C:\Program Files\Git\bin\bash.exe"
} elseif (Test-Path "C:\Program Files\Git\usr\bin\bash.exe") {
  "C:\Program Files\Git\usr\bin\bash.exe"
} else {
  throw "Git Bash not found"
}

$env:EDICT_DASHBOARD_PORT = "8011"
Set-Location $RepoDir
& $Bash -lc "cd '$RepoDir' && EDICT_DASHBOARD_PORT=8011 bash scripts/run_loop.sh"

