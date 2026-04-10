param(
  [Parameter(Mandatory=$true)][string]$ZipPath
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

try {
  $z = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
  try {
    $count = $z.Entries.Count
    $total = 0L
    foreach ($e in $z.Entries) {
      $total += $e.Length
    }
    [pscustomobject]@{
      ZipPath = $ZipPath
      EntryCount = $count
      TotalUncompressedBytes = $total
      Status = 'OK'
    } | Format-List
  } finally {
    $z.Dispose()
  }
} catch {
  [pscustomobject]@{
    ZipPath = $ZipPath
    Status = 'ERROR'
    Error = $_.Exception.Message
  } | Format-List
  exit 2
}
