param(
  [string]$Loc = 'Huangpu,Guangzhou',
  [string]$Tz = 'Asia/Shanghai'
)

$ErrorActionPreference = 'Stop'

# Current weather via wttr.in (JSON)
$wUrl = 'https://wttr.in/' + [uri]::EscapeDataString($Loc) + '?format=j1'
$w = Invoke-RestMethod -Uri $wUrl -Method GET
$cc = $w.current_condition[0]
$area = $w.nearest_area[0]

$lat = [double]$area.latitude
$lon = [double]$area.longitude

# Air quality via Open-Meteo
$aqUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality' +
  '?latitude=' + $lat +
  '&longitude=' + $lon +
  '&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide' +
  '&timezone=' + [uri]::EscapeDataString($Tz)

$aq = $null
try {
  $aq = Invoke-RestMethod -Uri $aqUrl -Method GET
} catch {
  $aq = $null
}

$out = [ordered]@{
  location = ($area.areaName[0].value + ' ' + $area.region[0].value + ' ' + $area.country[0].value)
  obsTime = $cc.localObsDateTime
  desc = $cc.weatherDesc[0].value
  tempC = [int]$cc.temp_C
  feelsC = [int]$cc.FeelsLikeC
  humidity = [int]$cc.humidity
  windKmph = [int]$cc.windspeedKmph
  windDir = $cc.winddir16Point
  precipMM = [double]$cc.precipMM
  pressureMB = [int]$cc.pressure
  cloudcover = [int]$cc.cloudcover
}

if ($aq -and $aq.current) {
  $out.aqi_us = $aq.current.us_aqi
  $out.pm25 = $aq.current.pm2_5
  $out.pm10 = $aq.current.pm10
  $out.no2 = $aq.current.nitrogen_dioxide
  $out.o3 = $aq.current.ozone
}

$out | ConvertTo-Json -Depth 6
