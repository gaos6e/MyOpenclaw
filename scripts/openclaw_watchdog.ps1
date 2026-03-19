param(
    [int]$Port = 18789,
    [int]$PollIntervalSeconds = 60,
    [int]$StartupGraceSeconds = 15,
    [int]$FailuresBeforeRestart = 2,
    [int]$RestartCooldownSeconds = 120,
    [string]$LogPath = "$HOME\.openclaw\logs\watchdog.log"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:lastRestartAt = [datetime]::MinValue
$script:consecutiveFailures = 0

function Write-Log {
    param([string]$Message)

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"
    Add-Content -Path $LogPath -Value $line
}

function Invoke-OpenClaw {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    & openclaw @Args 2>&1
}

function Test-Health {
    try {
        $output = Invoke-OpenClaw -Args @("gateway", "health")
        $text = ($output | Out-String).Trim()
        return @{
            Healthy = $text -match "OK"
            Output = $text
        }
    }
    catch {
        return @{
            Healthy = $false
            Output = $_.Exception.Message
        }
    }
}

function Stop-GatewayTask {
    try {
        Invoke-OpenClaw -Args @("gateway", "stop") | Out-Null
        Write-Log "Stopped gateway task via CLI."
    }
    catch {
        Write-Log "CLI stop reported: $($_.Exception.Message)"
    }

    try {
        schtasks /End /TN "OpenClaw Gateway" | Out-Null
        Write-Log "Terminated scheduled task."
    }
    catch {
        Write-Log "Scheduled task end reported: $($_.Exception.Message)"
    }
}

function Stop-GatewayProcesses {
    $processes = Get-CimInstance Win32_Process |
        Where-Object {
            $_.Name -eq "node.exe" -and
            $_.CommandLine -match "openclaw" -and
            $_.CommandLine -match "gateway"
        }

    foreach ($process in $processes) {
        try {
            Stop-Process -Id $process.ProcessId -Force
            Write-Log "Stopped stale process $($process.ProcessId)."
        }
        catch {
            Write-Log "Failed to stop process $($process.ProcessId): $($_.Exception.Message)"
        }
    }
}

function Wait-ForPortState {
    param(
        [bool]$ShouldListen,
        [int]$TimeoutSeconds
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        $isListening = $null -ne $listeners
        if ($isListening -eq $ShouldListen) {
            return $true
        }

        Start-Sleep -Seconds 1
    }

    return $false
}

function Start-GatewayTask {
    Invoke-OpenClaw -Args @("gateway", "start") | Out-Null
    Write-Log "Started gateway task via CLI."
}

function Restart-Gateway {
    Write-Log "Starting cold restart."
    Stop-GatewayTask
    Stop-GatewayProcesses

    if (-not (Wait-ForPortState -ShouldListen $false -TimeoutSeconds 10)) {
        throw "Port $Port stayed busy after shutdown."
    }

    Start-GatewayTask

    if (-not (Wait-ForPortState -ShouldListen $true -TimeoutSeconds 15)) {
        throw "Port $Port did not start listening."
    }

    Start-Sleep -Seconds $StartupGraceSeconds

    $health = Test-Health
    if (-not $health.Healthy) {
        throw "Post-restart health check failed: $($health.Output)"
    }

    $script:lastRestartAt = Get-Date
    $script:consecutiveFailures = 0
    Write-Log "Cold restart completed successfully."
}

if (-not (Test-Path -Path (Split-Path -Parent $LogPath))) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $LogPath) | Out-Null
}

Write-Log "Watchdog started. Poll=${PollIntervalSeconds}s FailuresBeforeRestart=${FailuresBeforeRestart} Cooldown=${RestartCooldownSeconds}s"

while ($true) {
    try {
        $health = Test-Health
        if ($health.Healthy) {
            if ($script:consecutiveFailures -gt 0) {
                Write-Log "Health restored: $($health.Output)"
            }
            $script:consecutiveFailures = 0
        }
        else {
            $script:consecutiveFailures++
            Write-Log "Health failure #$($script:consecutiveFailures): $($health.Output)"

            $cooldownActive = ((Get-Date) - $script:lastRestartAt).TotalSeconds -lt $RestartCooldownSeconds
            if ($script:consecutiveFailures -ge $FailuresBeforeRestart -and -not $cooldownActive) {
                Restart-Gateway
            }
        }
    }
    catch {
        Write-Log "Watchdog loop error: $($_.Exception.Message)"
    }

    Start-Sleep -Seconds $PollIntervalSeconds
}
