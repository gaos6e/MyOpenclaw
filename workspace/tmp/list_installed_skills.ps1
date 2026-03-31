$ErrorActionPreference = 'Stop'

$roots = @(
  'C:\Users\20961\.openclaw\workspace\skills',
  'C:\Users\20961\.openclaw\skills',
  'C:\Users\20961\AppData\Roaming\npm\node_modules\openclaw\skills',
  'C:\Users\20961\.openclaw\extensions'
)

$items = New-Object System.Collections.Generic.List[object]

foreach ($root in $roots) {
  if (-not (Test-Path $root)) { continue }

  Get-ChildItem -Path $root -Recurse -Filter 'SKILL.md' -File -ErrorAction SilentlyContinue |
    ForEach-Object {
      $path = $_.FullName
      $lines = Get-Content -LiteralPath $path -TotalCount 80 -ErrorAction SilentlyContinue
      if (-not $lines) { return }

      $name = $null
      $desc = $null

      foreach ($l in $lines) {
        if (-not $name -and $l -match '^name:\s*(.+)\s*$') { $name = $Matches[1].Trim() }
        if (-not $desc -and $l -match '^description:\s*(.+)\s*$') { $desc = $Matches[1].Trim() }
        if ($name -and $desc) { break }
      }

      if (-not $name) {
        # Fallback: use folder name
        $name = Split-Path -Path (Split-Path -Path $path -Parent) -Leaf
      }

      $items.Add([pscustomobject]@{
        name = $name
        description = $desc
        root = $root
        skill_md = $path
      })
    }
}

# Deduplicate by (name, skill_md)
$dedup = $items | Sort-Object name, skill_md -Unique

$dedup | ConvertTo-Json -Depth 4
