$ErrorActionPreference = "Stop"

$taskName = "NapCat Hidden"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$wrapper = Join-Path $root "napcat-hidden.vbs"
$wscriptExe = Join-Path $env:SystemRoot "System32\wscript.exe"
$principalUser = "$env:UserDomain\$env:UserName"

if (-not (Test-Path $wrapper)) {
    throw "Missing wrapper script: $wrapper"
}
if (-not (Test-Path $wscriptExe)) {
    throw "Missing wscript.exe: $wscriptExe"
}

$action = New-ScheduledTaskAction -Execute $wscriptExe -Argument "//B //Nologo `"$wrapper`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $principalUser
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId $principalUser -LogonType Interactive -RunLevel Highest

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Force | Out-Null

Write-Host "Registered hidden NapCat task:"
Write-Host "  Name: $taskName"
Write-Host "  Command: $wscriptExe //B //Nologo $wrapper"
Write-Host "  Trigger: At logon for $principalUser"
