# Find cdb.exe from common WinDbg/SDK locations
$paths = @(
  "$env:LOCALAPPDATA\Microsoft\WindowsApps\WinDbgX.exe", # Store app launcher
  "C:\Program Files (x86)\Windows Kits\10\Debuggers\x64\cdb.exe",
  "C:\Program Files (x86)\Windows Kits\10\Debuggers\x86\cdb.exe",
  "C:\Program Files\Windows Kits\10\Debuggers\x64\cdb.exe",
  "C:\Program Files\Windows Kits\10\Debuggers\x86\cdb.exe"
)
# Check WindowsApps package folders (WinDbg Store app)
$windowsApps = "C:\\Program Files\\WindowsApps"
if (Test-Path $windowsApps) {
  Get-ChildItem $windowsApps -Recurse -Filter cdb.exe -ErrorAction SilentlyContinue | ForEach-Object {
    $paths += $_.FullName
  }
}
# Also check D:\WindowsApps if present
$altWindowsApps = "D:\\WindowsApps"
if (Test-Path $altWindowsApps) {
  Get-ChildItem $altWindowsApps -Recurse -Filter cdb.exe -ErrorAction SilentlyContinue | ForEach-Object {
    $paths += $_.FullName
  }
}
# Return first existing
$paths | Select-Object -Unique | ForEach-Object {
  if (Test-Path $_) { $_; break }
}
