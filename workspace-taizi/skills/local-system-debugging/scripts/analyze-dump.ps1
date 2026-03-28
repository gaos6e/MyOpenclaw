param(
    [Parameter(Mandatory = $true)]
    [string]$DumpPath
)

function Find-Debugger {
    $toolsJson = & powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\find-local-debug-tools.ps1"
    $tools = $toolsJson | ConvertFrom-Json
    foreach ($preferred in @("cdb.exe", "kd.exe", "dumpchk.exe")) {
        $match = $tools.found | Where-Object { $_.name -ieq $preferred } | Select-Object -First 1
        if ($match) { return $match }
    }
    return $null
}

$result = [ordered]@{
    dumpPath = $DumpPath
    exists = $false
    debugger = $null
    command = $null
    exitCode = $null
    stdout = $null
    stderr = $null
    error = $null
}

try {
    if (-not (Test-Path -LiteralPath $DumpPath)) {
        throw "Dump file not found: $DumpPath"
    }

    $result.exists = $true
    $debugger = Find-Debugger
    if (-not $debugger) {
        throw "No CLI debugger found. Checked cdb.exe, kd.exe, dumpchk.exe."
    }

    $result.debugger = $debugger
    $toolPath = $debugger.path
    $outFile = Join-Path $env:TEMP ("openclaw-dump-out-" + [guid]::NewGuid().ToString() + ".txt")
    $errFile = Join-Path $env:TEMP ("openclaw-dump-err-" + [guid]::NewGuid().ToString() + ".txt")

    if ($debugger.name -ieq "dumpchk.exe") {
        $result.command = "`"$toolPath`" `"$DumpPath`""
        $proc = Start-Process -FilePath $toolPath -ArgumentList @($DumpPath) -Wait -PassThru -NoNewWindow -RedirectStandardOutput $outFile -RedirectStandardError $errFile
    } else {
        $result.command = "`"$toolPath`" -z `"$DumpPath`" -c `"!analyze -v; q`""
        $proc = Start-Process -FilePath $toolPath -ArgumentList @("-z", $DumpPath, "-c", "!analyze -v; q") -Wait -PassThru -NoNewWindow -RedirectStandardOutput $outFile -RedirectStandardError $errFile
    }

    $result.exitCode = $proc.ExitCode
    if (Test-Path $outFile) { $result.stdout = Get-Content $outFile -Raw }
    if (Test-Path $errFile) { $result.stderr = Get-Content $errFile -Raw }
} catch {
    $result.error = $_.Exception.Message
}

$result | ConvertTo-Json -Depth 6

