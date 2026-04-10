param(
  [string]$NapCatRoot = "C:\Users\20961\AppData\Local\NapCatFramework\NapCat.44498.Shell\versions\9.9.26-44498\resources\app\napcat",
  [string]$AccountUin = "3437738143",
  [string]$ConfigName = "openclaw-nap3437",
  [string]$WsHost = "127.0.0.1",
  [int]$Port = 30011,
  [string]$TokenFile = "C:\Users\20961\.openclaw\identity\napcat-3437738143.access-token.txt",
  [int]$HeartInterval = 30000,
  [int]$TimeoutSeconds = 90,
  [switch]$RestartNapCat,
  [switch]$RestartGateway
)

$ErrorActionPreference = "Stop"

function Get-WebUiCredential {
  param([string]$WebUiConfigPath)

  $webui = Get-Content $WebUiConfigPath -Raw | ConvertFrom-Json
  $raw = $webui.token + ".napcat"
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hashBytes = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($raw))
  } finally {
    $sha.Dispose()
  }
  $hash = -join ($hashBytes | ForEach-Object { $_.ToString("x2") })
  $body = @{ hash = $hash } | ConvertTo-Json -Compress
  return (Invoke-RestMethod -Uri "http://127.0.0.1:6099/api/auth/login" -Method Post -ContentType "application/json" -Body $body).data.Credential
}

function Get-ApiHeaders {
  param([string]$Credential)
  return @{ Authorization = "Bearer $Credential" }
}

function Wait-For-NapCatLogin {
  param(
    [hashtable]$Headers,
    [int]$TimeoutSeconds = 90
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $status = Invoke-RestMethod -Uri "http://127.0.0.1:6099/api/QQLogin/CheckLoginStatus" -Method Post -Headers $Headers
    $info = Invoke-RestMethod -Uri "http://127.0.0.1:6099/api/QQLogin/GetQQLoginInfo" -Method Post -Headers $Headers
    if ($status.data.isLogin -and $info.data.uin) {
      return $info.data
    }
    Start-Sleep -Seconds 3
  } while ((Get-Date) -lt $deadline)

  throw "NapCat QQ account is not logged in yet. Complete the QQ login in the NapCat window, then rerun this script."
}

$webUiConfigPath = Join-Path $NapCatRoot "config\webui.json"
if (-not (Test-Path $webUiConfigPath)) {
  throw "NapCat WebUI config not found at $webUiConfigPath. Start NapCat first."
}

if (-not (Test-Path $TokenFile)) {
  throw "OneBot access token file not found at $TokenFile."
}

$credential = Get-WebUiCredential -WebUiConfigPath $webUiConfigPath
$headers = Get-ApiHeaders -Credential $credential

Invoke-RestMethod -Uri "http://127.0.0.1:6099/api/QQLogin/SetQuickLoginQQ" -Method Post -ContentType "application/json" -Headers $headers -Body (@{ uin = $AccountUin } | ConvertTo-Json -Compress) | Out-Null
$loginInfo = Wait-For-NapCatLogin -Headers $headers -TimeoutSeconds $TimeoutSeconds

$configResponse = Invoke-RestMethod -Uri "http://127.0.0.1:6099/api/OB11Config/GetConfig" -Method Post -Headers $headers
if ($configResponse.code -ne 0) {
  throw "Failed to load NapCat OB11 config: $($configResponse.message)"
}

$token = (Get-Content $TokenFile -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($token)) {
  throw "OneBot access token file is empty."
}

$config = $configResponse.data
if (-not $config.network) {
  $config | Add-Member -NotePropertyName "network" -NotePropertyValue ([pscustomobject]@{})
}

foreach ($section in @("httpServers", "httpClients", "httpSseServers", "websocketServers", "websocketClients")) {
  $hasProperty = $null -ne $config.network.PSObject.Properties[$section]
  if (-not $hasProperty) {
    $config.network | Add-Member -NotePropertyName $section -NotePropertyValue @()
  } elseif ($null -eq $config.network.$section) {
    $config.network.$section = @()
  }
}

$existing = @($config.network.websocketServers | Where-Object { $_.name -eq $ConfigName })
$others = @($config.network.websocketServers | Where-Object { $_.name -ne $ConfigName })
$entry = [pscustomobject]@{
  enable = $true
  debug = if ($existing) { [bool]$existing[0].debug } else { $false }
  name = $ConfigName
  host = $WsHost
  port = $Port
  messagePostFormat = "array"
  reportSelfMessage = $false
  enableForcePushEvent = if ($existing) { [bool]$existing[0].enableForcePushEvent } else { $true }
  token = $token
  heartInterval = $HeartInterval
}
$config.network.websocketServers = @($others + $entry)

$payload = @{ config = ($config | ConvertTo-Json -Depth 20 -Compress) } | ConvertTo-Json -Compress
$setResponse = Invoke-RestMethod -Uri "http://127.0.0.1:6099/api/OB11Config/SetConfig" -Method Post -ContentType "application/json" -Headers $headers -Body $payload
if ($setResponse.code -ne 0) {
  throw "Failed to save NapCat OB11 config: $($setResponse.message)"
}

if ($RestartNapCat) {
  Invoke-RestMethod -Uri "http://127.0.0.1:6099/api/Process/Restart" -Method Post -Headers $headers | Out-Null
  Start-Sleep -Seconds 8
}

if ($RestartGateway) {
  & openclaw gateway restart | Out-Null
}

[pscustomobject]@{
  accountUin = $loginInfo.uin
  nickname = $loginInfo.nick
  configName = $ConfigName
  host = $WsHost
  port = $Port
  timeoutSeconds = $TimeoutSeconds
  restartRequested = [bool]$RestartNapCat
  gatewayRestartRequested = [bool]$RestartGateway
} | ConvertTo-Json -Depth 5
