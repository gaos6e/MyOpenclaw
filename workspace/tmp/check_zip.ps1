param(
  [Parameter(Mandatory=$true)][string]$ZipPath,
  [int]$Sample = 5
)

Add-Type -AssemblyName System.IO.Compression | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null

if (-not (Test-Path -LiteralPath $ZipPath)) {
  Write-Host "NOT_FOUND: $ZipPath"
  exit 2
}

$fs = [System.IO.File]::OpenRead($ZipPath)
try {
  $za = [System.IO.Compression.ZipArchive]::new($fs)
  try {
    Write-Host ("ZipEntries: {0}" -f $za.Entries.Count)
    Write-Host "FirstEntries:"
    $za.Entries | Select-Object -First $Sample -ExpandProperty FullName
  }
  finally {
    $za.Dispose()
  }
}
finally {
  $fs.Dispose()
}
