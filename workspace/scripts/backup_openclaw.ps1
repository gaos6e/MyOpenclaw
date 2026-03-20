$ErrorActionPreference = 'Stop'
$repo = 'C:\Users\20961\.openclaw'
Set-Location $repo
if (-not (Test-Path (Join-Path $repo '.git'))) {
  git init
  git branch -M main
  git remote add origin https://github.com/gaos6e/MyOpenclaw
}
# ensure main
try { git checkout main } catch { git checkout -b main }
# add/commit if changes
$ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$changes = git status --porcelain
if ($changes) {
  git add -A
  $gitlinks = git ls-files --stage | Select-String '^\s*160000\s+' | ForEach-Object {
    ($_ -split '\s+', 4)[3]
  }
  foreach ($gitlink in $gitlinks) {
    git reset HEAD -- $gitlink
  }
  $committableChanges = git status --porcelain
  if ($committableChanges) {
    git commit -m "backup $ts"
  }
}
# push
try { git push -u origin main } catch { git push origin main }
