$ErrorActionPreference = 'Stop'

$dstDir = 'C:\Users\20961\.openclaw\workspace\reports\skills'
New-Item -ItemType Directory -Force -Path $dstDir | Out-Null

$files = @(
  @{ src = 'C:\Users\20961\.openclaw\workspace\PD\installed_skills_raw.json';      dst = (Join-Path $dstDir 'installed_skills_raw.json') },
  @{ src = 'C:\Users\20961\.openclaw\workspace\PD\installed_skills_summary.json'; dst = (Join-Path $dstDir 'installed_skills_summary.json') }
)

foreach ($f in $files) {
  if (Test-Path -LiteralPath $f.src) {
    Move-Item -LiteralPath $f.src -Destination $f.dst -Force
    Write-Output ("MOVED " + $f.src + " -> " + $f.dst)
  } else {
    Write-Output ("SKIP (not found) " + $f.src)
  }
}
