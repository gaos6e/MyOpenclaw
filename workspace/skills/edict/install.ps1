# ══════════════════════════════════════════════════════════════
# 三省六部 · OpenClaw Multi-Agent System 一键安装脚本 (Windows)
# PowerShell 版本 — 对应 install.sh
# ══════════════════════════════════════════════════════════════
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$REPO_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$OC_HOME = Join-Path $env:USERPROFILE ".openclaw"
$OC_CFG = Join-Path $OC_HOME "openclaw.json"

function Write-Banner {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Blue
    Write-Host "║  🏛️  三省六部 · OpenClaw Multi-Agent     ║" -ForegroundColor Blue
    Write-Host "║       安装向导 (Windows)                  ║" -ForegroundColor Blue
    Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Blue
    Write-Host ""
}

function Log   { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Warn  { param($msg) Write-Host "⚠️  $msg" -ForegroundColor Yellow }
function Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Info  { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Blue }

# ── Step 0: 依赖检查 ──
function Check-Deps {
    Info "检查依赖..."

    $oc = Get-Command openclaw -ErrorAction SilentlyContinue
    if (-not $oc) {
        Error "未找到 openclaw CLI。请先安装 OpenClaw: https://openclaw.ai"
        exit 1
    }
    Log "OpenClaw CLI: OK"

    $py = Get-Command python3 -ErrorAction SilentlyContinue
    if (-not $py) {
        $py = Get-Command python -ErrorAction SilentlyContinue
    }
    if (-not $py) {
        Error "未找到 python3 或 python"
        exit 1
    }
    $global:PYTHON = $py.Source
    Log "Python: $($global:PYTHON)"

    if (-not (Test-Path $OC_CFG)) {
        Error "未找到 openclaw.json。请先运行 openclaw 完成初始化。"
        exit 1
    }
    Log "openclaw.json: $OC_CFG"
}

# ── Step 0.5: 备份已有 Agent 数据 ──
function Backup-Existing {
    $hasExisting = Get-ChildItem -Path $OC_HOME -Directory -Filter "workspace-*" -ErrorAction SilentlyContinue
    if ($hasExisting) {
        Info "检测到已有 Agent Workspace，自动备份中..."
        $ts = Get-Date -Format "yyyyMMdd-HHmmss"
        $backupDir = Join-Path $OC_HOME "backups\pre-install-$ts"
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

        Get-ChildItem -Path $OC_HOME -Directory -Filter "workspace-*" | ForEach-Object {
            Copy-Item -Path $_.FullName -Destination (Join-Path $backupDir $_.Name) -Recurse
        }

        if (Test-Path $OC_CFG) {
            Copy-Item $OC_CFG (Join-Path $backupDir "openclaw.json")
        }
        Log "已备份到: $backupDir"
    }
}

# ── Step 1: 创建 Workspace ──
function Create-Workspaces {
    Info "创建 Agent Workspace..."

    $agents = @("taizi","zhongshu","menxia","shangshu","hubu","libu","bingbu","xingbu","gongbu","libu_hr","zaochao")
    foreach ($agent in $agents) {
        $ws = Join-Path $OC_HOME "workspace-$agent"
        New-Item -ItemType Directory -Path $ws -Force | Out-Null

        $soulSrc = Join-Path $REPO_DIR "agents\$agent\SOUL.md"
        $soulDst = Join-Path $ws "SOUL.md"
        if (Test-Path $soulSrc) {
            if (Test-Path $soulDst) {
                $ts = Get-Date -Format "yyyyMMdd-HHmmss"
                Copy-Item $soulDst "$soulDst.bak.$ts"
                Warn "已备份旧 SOUL.md → $soulDst.bak.$ts"
            }
            $content = (Get-Content $soulSrc -Raw) -replace "__REPO_DIR__", $REPO_DIR
            Set-Content -Path $soulDst -Value $content -Encoding UTF8
        }
        Log "Workspace 已创建: $ws"

        # AGENTS.md
        $agentsMd = @"
# AGENTS.md · 工作协议

1. 接到任务先回复"已接旨"。
2. 输出必须包含：任务ID、结果、证据/文件路径、阻塞项。
3. 需要协作时，回复尚书省请求转派，不跨部直连。
4. 涉及删除/外发动作必须明确标注并等待批准。
"@
        Set-Content -Path (Join-Path $ws "AGENTS.md") -Value $agentsMd -Encoding UTF8
    }
}

# ── Step 2: 注册 Agents ──
function Register-Agents {
    Info "注册三省六部 Agents..."

    $ts = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item $OC_CFG "$OC_CFG.bak.sansheng-$ts"
    Log "已备份配置: $OC_CFG.bak.*"

    $agentMap = @{
        "taizi"   = @("zhongshu")
        "zhongshu" = @("menxia", "shangshu")
        "menxia"  = @("shangshu", "zhongshu")
        "shangshu" = @("zhongshu", "menxia", "hubu", "libu", "bingbu", "xingbu", "gongbu", "libu_hr")
        "hubu"    = @("shangshu")
        "libu"    = @("shangshu")
        "bingbu"  = @("shangshu")
        "xingbu"  = @("shangshu")
        "gongbu"  = @("shangshu")
        "libu_hr" = @("shangshu")
        "zaochao" = @()
    }

    foreach ($agent in $agentMap.Keys) {
        $workspace = Join-Path $OC_HOME "workspace-$agent"
        $agentDir = Join-Path $OC_HOME "agents\$agent\agent"
        try {
            openclaw agents add $agent --workspace $workspace --agent-dir $agentDir --non-interactive --json | Out-Null
            Log "Agent 已注册: $agent"
        } catch {
            Warn "Agent 注册失败: $agent，继续尝试写入权限矩阵"
        }
    }

    $agentJson = ($agentMap.GetEnumerator() | ForEach-Object {
        @{
            id = $_.Key
            allowAgents = $_.Value
        }
    } | ConvertTo-Json -Compress)

    $pyScript = @"
import json, pathlib, os

cfg_path = pathlib.Path(os.environ['USERPROFILE']) / '.openclaw' / 'openclaw.json'
cfg = json.loads(cfg_path.read_text(encoding='utf-8'))
agent_map = {entry['id']: entry['allowAgents'] for entry in json.loads(r'''$agentJson''')}

for agent in cfg.get('agents', {}).get('list', []):
    allow = agent_map.get(agent.get('id'))
    if allow is not None:
        agent['subagents'] = {'allowAgents': allow}
        agent['tools'] = {'profile': 'full'}
        print(f"  set subagents: {agent['id']} -> {allow}")
        print(f"  set tools.profile=full: {agent['id']}")

bindings = cfg.get('bindings', [])
for b in bindings:
    match = b.get('match', {})
    if isinstance(match, dict) and 'pattern' in match:
        del match['pattern']
        print(f"  cleaned invalid pattern from binding: {b.get('agentId', '?')}")

cfg_path.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding='utf-8')
print('Done: agent registration normalized')
"@
    & $global:PYTHON -c $pyScript
    Log "Agents 注册完成"
}

# ── Step 3: 初始化 Data ──
function Init-Data {
    Info "初始化数据目录..."
    $dataDir = Join-Path $REPO_DIR "data"
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null

    foreach ($f in @("live_status.json","agent_config.json","model_change_log.json")) {
        $fp = Join-Path $dataDir $f
        if (-not (Test-Path $fp)) { Set-Content $fp "{}" -Encoding UTF8 }
    }
    Set-Content (Join-Path $dataDir "pending_model_changes.json") "[]" -Encoding UTF8
    Log "数据目录初始化完成"
}

# ── Step 3.3: 创建 data/scripts/skills 目录连接 (Junction) ──
function Link-Resources {
    Info "创建 data/scripts/skills 目录连接..."
    $linked = 0
    $agents = @("taizi","zhongshu","menxia","shangshu","hubu","libu","bingbu","xingbu","gongbu","libu_hr","zaochao")
    $sharedSkills = Join-Path $OC_HOME "workspace\skills"
    New-Item -ItemType Directory -Path $sharedSkills -Force | Out-Null
    foreach ($agent in $agents) {
        $ws = Join-Path $OC_HOME "workspace-$agent"
        New-Item -ItemType Directory -Path $ws -Force | Out-Null

        # data 目录
        $wsData = Join-Path $ws "data"
        $srcData = Join-Path $REPO_DIR "data"
        if (-not (Test-Path $wsData)) {
            cmd /c mklink /J "$wsData" "$srcData" | Out-Null
            $linked++
        } elseif (-not ((Get-Item $wsData).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            $ts = Get-Date -Format "yyyyMMdd-HHmmss"
            Rename-Item $wsData "$wsData.bak.$ts"
            cmd /c mklink /J "$wsData" "$srcData" | Out-Null
            $linked++
        }

        # scripts 目录
        $wsScripts = Join-Path $ws "scripts"
        $srcScripts = Join-Path $REPO_DIR "scripts"
        if (-not (Test-Path $wsScripts)) {
            cmd /c mklink /J "$wsScripts" "$srcScripts" | Out-Null
            $linked++
        } elseif (-not ((Get-Item $wsScripts).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            $ts = Get-Date -Format "yyyyMMdd-HHmmss"
            Rename-Item $wsScripts "$wsScripts.bak.$ts"
            cmd /c mklink /J "$wsScripts" "$srcScripts" | Out-Null
            $linked++
        }

        # skills 目录：所有职位共享主 workspace 的技能库
        $wsSkills = Join-Path $ws "skills"
        if (-not (Test-Path $wsSkills)) {
            cmd /c mklink /J "$wsSkills" "$sharedSkills" | Out-Null
            $linked++
        } else {
            $wsSkillsItem = Get-Item $wsSkills -Force
            $isReparse = ($wsSkillsItem.Attributes -band [IO.FileAttributes]::ReparsePoint)
            $currentTarget = if ($isReparse -and $wsSkillsItem.Target) { ($wsSkillsItem.Target | Select-Object -First 1) } else { $null }
            if (-not $isReparse) {
                $ts = Get-Date -Format "yyyyMMdd-HHmmss"
                Rename-Item $wsSkills "$wsSkills.bak.$ts"
                cmd /c mklink /J "$wsSkills" "$sharedSkills" | Out-Null
                $linked++
            } elseif ($currentTarget -ne $sharedSkills) {
                Remove-Item $wsSkills -Force
                cmd /c mklink /J "$wsSkills" "$sharedSkills" | Out-Null
                $linked++
            }
        }
    }
    Log "已创建 $linked 个目录连接 (data/scripts/skills → 统一目录)"
}

# ── Step 3.5: 设置 Agent 间通信可见性 ──
function Setup-Visibility {
    Info "配置 Agent 间消息可见性..."
    try {
        & openclaw config set tools.sessions.visibility all *> $null
        $current = (openclaw config get tools.sessions.visibility 2>$null | Out-String).Trim()
        if ($current -eq "all") {
            Log "已设置 tools.sessions.visibility=all"
        } else {
            throw "visibility not applied"
        }
    } catch {
        Warn "设置 visibility 失败，请手动执行: openclaw config set tools.sessions.visibility all"
    }
}

# ── Step 3.6: 同步 API Key 到所有 Agent ──
function Sync-Auth {
    Info "同步 API Key 到所有 Agent..."

    $sourceCandidates = @(
        (Join-Path $OC_HOME "agents\main\agent\models.json"),
        (Join-Path $OC_HOME "agents\main\agent\auth-profiles.json"),
        (Join-Path $OC_HOME "agents\models.json"),
        (Join-Path $OC_HOME "agents\auth-profiles.json")
    )
    $existingSources = $sourceCandidates | Where-Object { Test-Path $_ }

    if (-not $existingSources) {
        Warn "未找到可复用的 models.json 或 auth-profiles.json，跳过凭证同步"
        return
    }

    $synced = 0
    $agents = @("taizi","zhongshu","menxia","shangshu","hubu","libu","bingbu","xingbu","gongbu","libu_hr","zaochao")
    foreach ($agent in $agents) {
        $agentDir = Join-Path $OC_HOME "agents\$agent\agent"
        New-Item -ItemType Directory -Path $agentDir -Force | Out-Null
        foreach ($source in $existingSources) {
            Copy-Item $source (Join-Path $agentDir (Split-Path $source -Leaf)) -Force
        }
        $synced++
    }

    Log "API Key/模型凭证已同步到 $synced 个 Agent"
}

# ── Step 4: 构建前端 ──
function Build-Frontend {
    Info "构建 React 前端..."
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Warn "未找到 node，跳过前端构建。"
        Warn "请安装 Node.js 18+ 后运行: cd edict\frontend && npm install && npm run build"
        return
    }
    $pkgJson = Join-Path $REPO_DIR "edict\frontend\package.json"
    if (Test-Path $pkgJson) {
        Push-Location (Join-Path $REPO_DIR "edict\frontend")
        npm install --silent 2>$null
        npm run build 2>$null
        Pop-Location
        $indexHtml = Join-Path $REPO_DIR "dashboard\dist\index.html"
        if (Test-Path $indexHtml) {
            Log "前端构建完成: dashboard\dist\"
        } else {
            Warn "前端构建可能失败，请手动检查"
        }
    }
}

# ── Step 5: 首次数据同步 ──
function First-Sync {
    Info "执行首次数据同步..."
    Push-Location $REPO_DIR
    $env:REPO_DIR = $REPO_DIR
    try { & $global:PYTHON scripts/sync_agent_config.py } catch { Warn "sync_agent_config 有警告" }
    try { & $global:PYTHON scripts/sync_officials_stats.py } catch { Warn "sync_officials_stats 有警告" }
    try { & $global:PYTHON scripts/refresh_live_data.py } catch { Warn "refresh_live_data 有警告" }
    Pop-Location
    Log "首次同步完成"
}

# ── Step 6: 重启 Gateway ──
function Restart-Gateway {
    Info "重启 OpenClaw Gateway..."
    try {
        openclaw gateway restart 2>$null
        Log "Gateway 重启成功"
    } catch {
        Warn "Gateway 重启失败，请手动重启: openclaw gateway restart"
    }
}

# ── Main ──
Write-Banner
Check-Deps
Backup-Existing
Create-Workspaces
Register-Agents
Init-Data
Link-Resources
Setup-Visibility
Sync-Auth
Build-Frontend
First-Sync
Restart-Gateway

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  🎉  三省六部安装完成！                          ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "下一步："
Write-Host "  1. 配置 API Key（如尚未配置）:"
Write-Host "     openclaw agents add taizi     # 按提示输入 Anthropic API Key"
Write-Host "     .\install.ps1                 # 重新运行以同步到所有 Agent"
Write-Host "  2. 启动数据刷新循环:  bash scripts/run_loop.sh"
Write-Host "  3. 启动看板服务器:    python dashboard/server.py"
Write-Host "  4. 打开看板:          http://127.0.0.1:7891"
Write-Host ""
Warn "首次安装必须配置 API Key，否则 Agent 会报错"
Info "文档: docs/getting-started.md"
