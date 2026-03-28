---
name: local-bsod-debugging
description: Analyze Windows BSOD/blue screen crash dumps locally. Use when the user asks to check 蓝屏原因, analyze .dmp / Minidump / MEMORY.DMP, run WinDbg/cdb, or diagnose DPC_WATCHDOG_VIOLATION and driver faults on this machine.
---

# Local BSOD Debugging

## Overview
Run local analysis on Windows crash dumps, extract BugCheck code, faulting module/driver, and actionable next steps.

## Workflow (end-to-end)
1) **Locate dumps**
   - Check `C:\Windows\Minidumps`.
   - If missing, ask for dump path or confirm dump settings.

2) **Run analysis (CLI preferred)**
   - Use `scripts\analyze-dump.ps1` to run `cdb.exe` with `!analyze -v`.
   - If `cdb` not found, run `scripts\find-cdb.ps1` to locate it (WinDbg Store app paths are common).

3) **Summarize result**
   - Extract: BugCheck code, MODULE_NAME/IMAGE_NAME, process name, and stack highlights.
   - Provide 2–4 concrete remediation steps (update/rollback driver, remove conflicting software, firmware/chipset/USB updates).

## Commands
### Analyze latest dump (example)
```powershell
# Replace with actual dump path if needed
powershell -ExecutionPolicy Bypass -File "<skill-dir>\scripts\analyze-dump.ps1" -DumpPath "C:\Windows\Minidumps\032026-10640-01.dmp"
```

### Find cdb.exe path
```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>\scripts\find-cdb.ps1"
```

## Notes
- WinDbg Store app often installs `cdb.exe` under `C:\Program Files\WindowsApps\Microsoft.WinDbg_*\amd64\cdb.exe` (or `D:\WindowsApps` if moved).
- If symbols are slow, keep default `srv*` and let WinDbg fetch symbols.

## Resources
### scripts/
- `find-cdb.ps1` → locate `cdb.exe`
- `analyze-dump.ps1` → run `!analyze -v` and output full report
