$ErrorActionPreference = 'Stop'

# Approximate center of Huangpu District, Guangzhou
$lat = 23.10
$lon = 113.48

function Get-WindDirCN([double]$deg) {
  if ($null -eq $deg) { return '' }
  $dirs = @('北','东北','东','东南','南','西南','西','西北')
  $i = [int]([math]::Round($deg / 45.0) % 8)
  return $dirs[$i]
}

function Get-WmoDescCN([int]$code) {
  switch ($code) {
    0 { '晴' }
    1 { '大部晴朗' }
    2 { '多云' }
    3 { '阴' }
    45 { '有雾' }
    48 { '雾凇' }
    51 { '小毛毛雨' }
    53 { '毛毛雨' }
    55 { '较强毛毛雨' }
    56 { '小冻毛毛雨' }
    57 { '冻毛毛雨' }
    61 { '小雨' }
    63 { '中雨' }
    65 { '大雨' }
    66 { '小冻雨' }
    67 { '冻雨' }
    71 { '小雪' }
    73 { '中雪' }
    75 { '大雪' }
    77 { '雪粒' }
    80 { '小阵雨' }
    81 { '阵雨' }
    82 { '强阵雨' }
    85 { '小阵雪' }
    86 { '阵雪' }
    95 { '雷暴' }
    96 { '雷暴伴小冰雹' }
    99 { '雷暴伴大冰雹' }
    default { "天气码${code}" }
  }
}

$wxUrl = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&timezone=Asia%2FShanghai"
$aqUrl = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=$lat&longitude=$lon&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide&timezone=Asia%2FShanghai"

$wx = Invoke-RestMethod -Uri $wxUrl
$aq = Invoke-RestMethod -Uri $aqUrl

$c = $wx.current
$a = $aq.current

$time = $c.time
$temp = $c.temperature_2m
$feel = $c.apparent_temperature
$rh = $c.relative_humidity_2m
$precip = $c.precipitation
$rain = $c.rain
$wspd = $c.wind_speed_10m
$wdir = $c.wind_direction_10m
$wgst = $c.wind_gusts_10m
$wcode = [int]$c.weather_code

$wdirCN = Get-WindDirCN $wdir
$wdesc = Get-WmoDescCN $wcode

$aqi = $a.us_aqi
$pm25 = $a.pm2_5
$pm10 = $a.pm10

# Compose 1–3 paragraphs, concise plain text
$line1 = "广州黄埔区（约 $time）天气：$wdesc，气温 $temp°C，体感 $feel°C，湿度 $rh%。"
$line2 = "风：$wdirCN风 $wspd km/h（阵风 $wgst km/h）。降水：当前降水 $precip mm（雨量 $rain mm）。"

if ($null -ne $aqi -and $null -ne $pm25 -and $null -ne $pm10) {
  $line3 = "空气质量：US AQI $aqi（PM2.5 $pm25 μg/m³，PM10 $pm10 μg/m³）。预警：当前接口未返回预警信息（以气象部门官方预警为准）。"
} else {
  $line3 = "空气质量：暂无可用数据。预警：当前接口未返回预警信息（以气象部门官方预警为准）。"
}

"$line1`n$line2`n$line3" | Write-Output
