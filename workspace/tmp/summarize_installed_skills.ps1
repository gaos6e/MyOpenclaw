$ErrorActionPreference = 'Stop'

$rawPath = 'C:\Users\20961\.openclaw\workspace\PD\installed_skills_raw.json'
if (-not (Test-Path $rawPath)) {
  throw "Missing $rawPath"
}

$items = Get-Content -Raw -Encoding UTF8 $rawPath | ConvertFrom-Json

# Normalize name (trim quotes/spaces)
foreach ($i in $items) {
  if ($null -ne $i.name) {
    $i.name = ($i.name.ToString().Trim())
    if ($i.name.StartsWith('"') -and $i.name.EndsWith('"')) {
      $i.name = $i.name.Trim('"')
    }
  }
}

$all = $items | Sort-Object name, root, skill_md

# Prefer skills under workspace\skills, then ~/.openclaw\skills, then openclaw global, then extensions.
function RankRoot($root) {
  if ($root -like '*\\.openclaw\\workspace\\skills*') { return 1 }
  if ($root -like '*\\.openclaw\\skills*') { return 2 }
  if ($root -like '*\\npm\\node_modules\\openclaw\\skills*') { return 3 }
  if ($root -like '*\\.openclaw\\extensions*') { return 4 }
  return 9
}

$best = @{}
foreach ($i in $all) {
  $name = $i.name
  if (-not $name) { continue }
  $rank = RankRoot $i.root
  if (-not $best.ContainsKey($name)) {
    $best[$name] = [pscustomobject]@{ name=$name; best_root=$i.root; best_skill_md=$i.skill_md; rank=$rank }
  } else {
    if ($rank -lt $best[$name].rank) {
      $best[$name] = [pscustomobject]@{ name=$name; best_root=$i.root; best_skill_md=$i.skill_md; rank=$rank }
    }
  }
}

$result = [pscustomobject]@{
  count_all_skillmd = ($all | Measure-Object).Count
  count_unique_names = ($best.Keys | Measure-Object).Count
  best_by_name = ($best.Values | Sort-Object name)
  all_entries = $all
}

$result | ConvertTo-Json -Depth 6
