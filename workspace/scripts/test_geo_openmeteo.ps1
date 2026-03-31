$ErrorActionPreference='Stop'
$u='https://geocoding-api.open-meteo.com/v1/search?name=%E9%BB%84%E5%9F%94%E5%8C%BA&count=10&language=zh&format=json&country=CN'
$geo=Invoke-RestMethod -Uri $u
$geo | ConvertTo-Json -Depth 8
