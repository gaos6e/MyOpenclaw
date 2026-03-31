$ErrorActionPreference = "Stop"

$roots = @(
  "C:\Users\20961\.openclaw\workspace\skills",
  "C:\Users\20961\.openclaw\skills",
  "C:\Users\20961\AppData\Roaming\npm\node_modules\openclaw\skills",
  "C:\Users\20961\.openclaw\extensions"
)

$items = foreach ($root in $roots) {
  if (-not (Test-Path $root)) { continue }

  Get-ChildItem -Path $root -Recurse -Filter "SKILL.md" -File -ErrorAction SilentlyContinue |
    ForEach-Object {
      $skillPath = $_.FullName
      if ($skillPath -match '\\references\\') { return }
      if ($root -ne "C:\Users\20961\AppData\Roaming\npm\node_modules\openclaw\skills" -and $skillPath -match '\\node_modules\\') { return }
      $name = Split-Path (Split-Path $skillPath -Parent) -Leaf
      $description = $null

      try {
        $content = Get-Content -Path $skillPath -TotalCount 40
        $match = $content | Select-String -Pattern '^description:\s*(.+)$' | Select-Object -First 1
        if ($match) {
          $description = $match.Matches[0].Groups[1].Value.Trim().Trim('"')
        }
      } catch {
        $description = $null
      }

      [PSCustomObject]@{
        name = $name
        description = $description
        root = $root
        skill_md = $skillPath
      }
    }
}

$items |
  Sort-Object name, skill_md |
  ConvertTo-Json -Depth 4
