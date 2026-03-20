$ErrorActionPreference = "Stop"

$workspace = "C:\Users\20961\.openclaw\workspace"
$repo = Join-Path $workspace "Star-Office-UI"
$python = Join-Path $repo ".venv\Scripts\python.exe"
$script = Join-Path $repo "set_state.py"

if (-not (Test-Path $python)) {
    throw "Python runtime not found: $python"
}

if (-not (Test-Path $script)) {
    throw "State script not found: $script"
}

& $python $script @args
