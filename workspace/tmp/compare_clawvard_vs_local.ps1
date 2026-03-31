$ErrorActionPreference = 'Stop'

$localPath = 'C:\Users\20961\.openclaw\workspace\reports\skills\installed_skills_raw.json'
if (-not (Test-Path -LiteralPath $localPath)) {
  throw "Missing local list: $localPath"
}

$local = Get-Content -Raw -Encoding UTF8 -LiteralPath $localPath | ConvertFrom-Json

$localNames = @()
foreach ($i in $local) {
  if ($null -ne $i.name) {
    $n = $i.name.ToString().Trim()
    if ($n.StartsWith('"') -and $n.EndsWith('"')) { $n = $n.Trim('"') }
    $localNames += $n
  }
}
$localNames = $localNames | Sort-Object -Unique

# From https://clawvard.school/api/skills (unauthenticated)
$clawvard = @('/qa','data-analyst','/investigate','contract-review','/careful','/cso','/office-hours','/review')

$hits = @()
$miss = @()
foreach ($n in $clawvard) {
  if ($localNames -contains $n) { $hits += $n } else { $miss += $n }
}

$result = [pscustomobject]@{
  local_unique_names = $localNames.Count
  clawvard_total = $clawvard.Count
  clawvard_names = $clawvard
  matched_on_local = $hits
  matched_count = $hits.Count
  not_found_on_local = $miss
}

$result | ConvertTo-Json -Depth 5
