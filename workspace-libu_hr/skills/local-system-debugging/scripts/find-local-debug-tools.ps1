param()

$candidates = @(
    "cdb.exe",
    "kd.exe",
    "dumpchk.exe",
    "windbg.exe",
    "WinDbgX.exe"
)

$searchRoots = @(
    "C:\Program Files\WindowsApps",
    "C:\Program Files (x86)\Windows Kits",
    "C:\Program Files\Windows Kits",
    "C:\Program Files\Debugging Tools for Windows",
    "C:\Program Files (x86)\Debugging Tools for Windows"
)

$found = @()

foreach ($name in $candidates) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) {
        $found += [pscustomobject]@{
            name = $name
            source = "PATH"
            path = $cmd.Source
        }
    }
}

foreach ($root in $searchRoots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    foreach ($name in $candidates) {
        try {
            $matches = Get-ChildItem -LiteralPath $root -Recurse -File -Filter $name -ErrorAction SilentlyContinue |
                Select-Object -First 5 FullName
            foreach ($m in $matches) {
                if (-not ($found | Where-Object { $_.path -eq $m.FullName })) {
                    $found += [pscustomobject]@{
                        name = $name
                        source = "filesystem"
                        path = $m.FullName
                    }
                }
            }
        } catch {
        }
    }
}

[pscustomobject]@{
    found = @($found)
    checked = $candidates
} | ConvertTo-Json -Depth 5
