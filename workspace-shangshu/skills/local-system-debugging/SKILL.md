---
name: local-system-debugging
description: |
  This skill should be used when the user asks to "检查本机", "自己检查", "查看 C:\\", "检查系统盘", "看 Minidump", "分析 dmp", "查看蓝屏原因", "使用 WinDbg", "检查本机软件", or requests local Windows troubleshooting that requires reading host files or invoking installed local tools. It forces local verification first: try exec/read/process against the requested path or tool before claiming access is unavailable.
allowed-tools: ["Bash", "Read", "Write"]
---

# Local System Debugging

Use this skill for host-local Windows troubleshooting in OpenClaw.

The goal is to stop false refusals like "I cannot access the system drive" when local tools are actually available.

## Core Rule

Before saying any of the following:

- "无法直接访问系统盘"
- "只能读取你发过来的文件"
- "不能使用本机软件"
- "不能检查这个目录"

first run a local check with `exec` or `read`.

Do not infer capability limits from generic sandbox expectations. Verify them on this machine.

## When This Skill Applies

Use it when the user asks to inspect or troubleshoot:

- Local Windows paths such as `C:\Windows\Minidump`, `C:\Windows\MEMORY.DMP`, `C:\Program Files`, other drives, or app data folders
- Crash dumps, blue screens, dump files, or `Minidump`
- Whether `WinDbg`, `cdb`, `kd`, `dumpchk`, or other local tools are installed
- Whether OpenClaw can use local software or host files
- A problem that requires checking the machine state, not just files the user sent manually

## Required Workflow

### 1. Verify local path access first

For a requested path, run:

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>\scripts\check-local-path.ps1" -Path "<target>"
```

Interpret the result:

- If `exists=true` and `readable=true`, do not claim access is unavailable.
- If `exists=false`, say the path does not exist.
- If `readable=false`, quote the actual error.

### 2. Verify local tool availability before talking about software limits

For requests involving local tools or software, run:

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>\scripts\find-local-debug-tools.ps1"
```

If tools are found:

- Say which exact executable paths were found
- Prefer command-line analysis instead of asking the user to operate the GUI manually

If tools are not found:

- Say which tools were checked
- Then propose the next best fallback

### 3. For dump analysis, inspect likely dump locations directly

Check these in order:

1. `C:\Windows\Minidump`
2. `C:\Windows\MEMORY.DMP`
3. Any user-provided dump path

Use:

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>\scripts\check-local-path.ps1" -Path "C:\Windows\Minidump"
```

If a dump exists and a debugger is available, try CLI analysis before asking for manual WinDbg steps.

### 4. Prefer CLI debugging over GUI instructions

When a dump file is present, run:

```powershell
powershell -ExecutionPolicy Bypass -File "<skill-dir>\scripts\analyze-dump.ps1" -DumpPath "<dump-path>"
```

This script will try local debugger executables in a safe order and emit structured output.

If CLI analysis succeeds:

- Summarize `BUGCHECK`, likely module/driver, and next steps

If CLI analysis fails:

- Report the exact tool/error
- Then ask for user help only if needed

## Response Policy

### Good behavior

- "我先检查本机 `C:\Windows\Minidump` 是否存在。"
- "本机已发现 `cdb.exe`，我先直接分析 dump。"
- "这个目录不存在，不是权限问题。"
- "读取失败，错误是 Access is denied。"

### Bad behavior

- "我没法直接访问你电脑系统盘。"
- "我不能使用本机软件。"
- "你先把文件发给我再说。"

These are only acceptable after a local check actually fails.

## Common Scenarios

### Scenario: "你自己检查下蓝屏原因"

Do this:

1. Check `C:\Windows\Minidump`
2. Check `C:\Windows\MEMORY.DMP`
3. Discover local debugger tools
4. Analyze the newest dump if possible

Do not immediately ask the user to send files.

### Scenario: "本机有 WinDbg，你能使用吗"

Do this:

1. Discover tools with `find-local-debug-tools.ps1`
2. If found, say that command-line debugging is available and use it
3. If only GUI executables are present and no CLI path is usable, say exactly that

Do not reply with a generic "I can't directly control your software" unless you have already verified no usable CLI path exists.

### Scenario: "检查 C:\something"

Do this:

1. Run `check-local-path.ps1`
2. Quote the result
3. Continue with deeper commands only if the path exists and is readable

## Notes

- This skill is about host-local verification, not remote desktop control.
- GUI-only control is a separate capability. Do not confuse "no GUI automation" with "no host file access".
- If a path or tool is blocked, surface the exact system error instead of inventing a generic limitation.

