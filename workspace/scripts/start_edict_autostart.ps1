$ErrorActionPreference = "Stop"

$RepoDir = Join-Path $env:USERPROFILE ".openclaw\workspace\skills\edict"
$Port = 8011
$LogDir = Join-Path $env:USERPROFILE ".openclaw\logs\edict"

function Resolve-ToolPath {
  param(
    [string[]]$Candidates,
    [string]$CommandName
  )

  foreach ($candidate in $Candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      return $candidate
    }
  }

  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  throw "Cannot resolve tool path for $CommandName"
}

function Get-EdictProcesses {
  param([scriptblock]$Predicate)

  Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine } |
    Where-Object $Predicate
}

if (-not (Test-Path $RepoDir)) {
  throw "Edict repo not found: $RepoDir"
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$python = Resolve-ToolPath -Candidates @(
  (Join-Path $env:USERPROFILE "miniconda3\python.exe"),
  (Join-Path $env:USERPROFILE "AppData\Local\Microsoft\WindowsApps\python.exe"),
  (Join-Path $env:USERPROFILE "AppData\Local\Microsoft\WindowsApps\python3.exe")
) -CommandName "python"

$bash = Resolve-ToolPath -Candidates @(
  "C:\Program Files\Git\bin\bash.exe",
  "C:\Program Files\Git\usr\bin\bash.exe"
) -CommandName "bash"

$dashboardMatch = {
  $_.CommandLine -match 'dashboard[\\/]+server\.py' -and
  $_.CommandLine -match '--port\s+8011'
}

$runLoopMatch = {
  $_.CommandLine -match 'run_loop\.sh'
}

$dashboardRunning = @(Get-EdictProcesses -Predicate $dashboardMatch)
if (-not $dashboardRunning) {
  Start-Process `
    -FilePath $python `
    -ArgumentList @("dashboard\server.py", "--port", "$Port") `
    -WorkingDirectory $RepoDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $LogDir "dashboard.out.log") `
    -RedirectStandardError (Join-Path $LogDir "dashboard.err.log") | Out-Null
}

$runLoopRunning = @(Get-EdictProcesses -Predicate $runLoopMatch)
if (-not $runLoopRunning) {
  Start-Process `
    -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $env:USERPROFILE ".openclaw\workspace\scripts\run_edict_loop.ps1")) `
    -WindowStyle Hidden | Out-Null
}
