param(
  [Parameter(Mandatory=$true)][string]$ZipPath
)

try {
  Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
  $z = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
  $cnt = $z.Entries.Count
  $sum = ($z.Entries | Measure-Object Length -Sum).Sum
  $first = $z.Entries | Select-Object -First 5 | ForEach-Object { $_.FullName }
  $z.Dispose()

  Write-Output "ZipOpenOK"
  Write-Output ("ZipPath=" + $ZipPath)
  Write-Output ("Entries=" + $cnt)
  Write-Output ("SumUncompressedBytes=" + $sum)
  if ($first) {
    Write-Output "FirstEntries:"
    $first | ForEach-Object { Write-Output ("- " + $_) }
  }
  exit 0
} catch {
  Write-Output "ZipOpenFAIL"
  Write-Output ("ZipPath=" + $ZipPath)
  Write-Output $_.Exception.GetType().FullName
  Write-Output $_.Exception.Message
  exit 1
}
