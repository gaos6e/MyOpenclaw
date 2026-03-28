param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [int]$MaxChildren = 20
)

$result = [ordered]@{
    path = $Path
    exists = $false
    readable = $false
    type = $null
    resolvedPath = $null
    lastWriteTime = $null
    length = $null
    children = @()
    error = $null
}

try {
    if (-not (Test-Path -LiteralPath $Path)) {
        $result.error = "Path does not exist"
        $result | ConvertTo-Json -Depth 6
        exit 0
    }

    $item = Get-Item -LiteralPath $Path -Force -ErrorAction Stop
    $result.exists = $true
    $result.resolvedPath = $item.FullName
    $result.lastWriteTime = $item.LastWriteTime

    if ($item.PSIsContainer) {
        $result.type = "directory"
        $children = Get-ChildItem -LiteralPath $item.FullName -Force -ErrorAction Stop |
            Select-Object -First $MaxChildren Name, FullName, Mode, Length, LastWriteTime
        $result.children = @($children)
        $result.readable = $true
    } else {
        $result.type = "file"
        $result.length = $item.Length
        $stream = [System.IO.File]::Open($item.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
        $stream.Close()
        $result.readable = $true
    }
} catch {
    $result.error = $_.Exception.Message
}

$result | ConvertTo-Json -Depth 6

