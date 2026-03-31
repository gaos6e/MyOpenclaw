$ErrorActionPreference = 'Stop'

function Get-WindDir16([double]$deg) {
  $dirs = @('北','北东北','东北','东东北','东','东东南','东南','南东南','南','南西南','西南','西西南','西','西西北','西北','北西北')
  $i = [int][Math]::Round(($deg % 360) / 22.5) % 16
  return $dirs[$i]
}

function Get-WmoDesc([int]$code) {
  switch ($code) {
    0 { '晴' }
    1 { '大部晴' }
    2 { '局部多云' }
    3 { '阴' }
    45 { '有雾' }
    48 { '雾凇/雾' }
    51 { '毛毛雨(弱)' }
    53 { '毛毛雨(中)' }
    55 { '毛毛雨(强)' }
    56 { '冻毛毛雨(弱)' }
    57 { '冻毛毛雨(强)' }
    61 { '小雨' }
    63 { '中雨' }
    65 { '大雨' }
    66 { '冻雨(弱)' }
    67 { '冻雨(强)' }
    71 { '小雪' }
    73 { '中雪' }
    75 { '大雪' }
    77 { '雪粒' }
    80 { '阵雨(弱)' }
    81 { '阵雨(中)' }
    82 { '阵雨(强)' }
    85 { '阵雪(弱)' }
    86 { '阵雪(强)' }
    95 { '雷暴' }
    96 { '雷暴伴小冰雹' }
    99 { '雷暴伴大冰雹' }
    default { "天气码 $code" }
  }
}

# 1) geocoding: "Huangpu" within Guangzhou, Guangdong, China
$geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=Huangpu&count=5&language=en&format=json&country=CN'
$geo = Invoke-RestMethod -Uri $geoUrl
if (-not $geo.results -or $geo.results.Count -lt 1) { throw 'Geocoding 无结果' }

$place = $geo.results | Where-Object { ($_.admin2 -like '*Guangzhou*') -or ($_.admin2 -like '*Guangzhou Shi*') } | Select-Object -First 1
if (-not $place) { $place = $geo.results[0] }

$lat = [double]$place.latitude
$lon = [double]$place.longitude
$tzEnc = 'Asia%2FShanghai'

# 2) weather current
$wxUrl = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,weather_code&timezone=$tzEnc"
$wx = Invoke-RestMethod -Uri $wxUrl

# 3) air quality current
$aqUrl = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=$lat&longitude=$lon&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide&timezone=$tzEnc"
$aq = Invoke-RestMethod -Uri $aqUrl

# 4) warnings (best-effort; may not be available)
$warnText = '预警：暂无（数据源未返回有效预警/或未提供）。'
try {
  $warnUrl = "https://api.open-meteo.com/v1/warnings?latitude=$lat&longitude=$lon&timezone=$tzEnc"
  $warn = Invoke-RestMethod -Uri $warnUrl
  if ($warn -and $warn.warnings -and $warn.warnings.Count -gt 0) {
    $top = $warn.warnings | Select-Object -First 3
    $items = $top | ForEach-Object {
      $sev = if ($_.severity) { "（$($_.severity)）" } else { '' }
      $evt = if ($_.event) { $_.event } elseif ($_.headline) { $_.headline } else { '预警' }
      "$evt$sev"
    }
    $warnText = '预警：' + ($items -join '；') + ($(if ($warn.warnings.Count -gt 3) { '…' } else { '' }))
  }
} catch {
  # keep default
}

$c = $wx.current
$cond = Get-WmoDesc ([int]$c.weather_code)
$windDir = Get-WindDir16 ([double]$c.wind_direction_10m)
$timeLocal = $c.time

$aqc = $aq.current
$aqParts = @()
if ($null -ne $aqc.us_aqi) { $aqParts += ("US AQI {0}" -f ([int][Math]::Round($aqc.us_aqi))) }
if ($null -ne $aqc.pm2_5) { $aqParts += ("PM2.5 {0}µg/m³" -f ([Math]::Round($aqc.pm2_5,1))) }
if ($null -ne $aqc.pm10) { $aqParts += ("PM10 {0}µg/m³" -f ([Math]::Round($aqc.pm10,1))) }
$aqText = if ($aqParts.Count -gt 0) { '空气质量：' + ($aqParts -join '，') + '。' } else { '空气质量：暂无数据。' }

$line1 = "广州黄埔区当前（$timeLocal）：$cond，气温$([Math]::Round($c.temperature_2m,1))°C，体感$([Math]::Round($c.apparent_temperature,1))°C；湿度$([int]$c.relative_humidity_2m)%；风$windDir $([Math]::Round($c.wind_speed_10m,1))km/h；降雨$([Math]::Round($c.precipitation,1))mm。"
$line2 = "$aqText$warnText"

$line1
$line2
