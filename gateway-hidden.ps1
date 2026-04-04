$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$wrapper = Join-Path $scriptDir "gateway-hidden.vbs"
$wscriptExe = Join-Path $env:SystemRoot "System32\wscript.exe"

if (-not (Test-Path $wscriptExe)) {
    throw "wscript.exe not found: $wscriptExe"
}
if (-not (Test-Path $wrapper)) {
    throw "Missing hidden gateway wrapper: $wrapper"
}

Start-Process `
    -FilePath $wscriptExe `
    -ArgumentList @("//B", "//Nologo", $wrapper) `
    -WorkingDirectory $scriptDir `
    -WindowStyle Hidden | Out-Null
