$ErrorActionPreference='Stop'

$queries = @(
  'Huangpu',
  'Huangpu District',
  'Huangpu Guangzhou',
  'Huangpu, Guangzhou',
  'Guangzhou Huangpu',
  'Huangpu Qu Guangzhou',
  'Huangpu, Guangdong',
  'Guangzhou'
)

foreach ($q in $queries) {
  $enc = [Uri]::EscapeDataString($q)
  $u = "https://geocoding-api.open-meteo.com/v1/search?name=$enc&count=5&language=en&format=json&country=CN"
  try {
    $geo = Invoke-RestMethod -Uri $u
    $n = if ($geo.results) { $geo.results.Count } else { 0 }
    "QUERY: $q -> results: $n"
    if ($n -gt 0) {
      $geo.results | Select-Object -First 3 | ForEach-Object {
        "  - name=$($_.name) admin1=$($_.admin1) admin2=$($_.admin2) lat=$($_.latitude) lon=$($_.longitude)"
      }
    }
  } catch {
    "QUERY: $q -> ERROR $($_.Exception.Message)"
  }
  ""
}
