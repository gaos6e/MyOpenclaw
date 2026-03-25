@echo off
rem OpenClaw Gateway launcher (SAFE TEMPLATE)
rem - Do NOT hardcode API keys here.
rem - Put secrets into environment variables or use a local untracked file (gateway.local.cmd).
rem
rem Required env vars (examples):
rem   set "OPENAI_API_KEY=..."
rem   set "QWEN_API_KEY=..."
rem   set "QQBOT_APP_ID=..."
rem   set "QQBOT_CLIENT_SECRET=..."

rem Optional proxy (uncomment if needed)
rem set "HTTP_PROXY=http://127.0.0.1:7890"
rem set "HTTPS_PROXY=http://127.0.0.1:7890"
rem set "NO_PROXY=127.0.0.1,localhost"

set "OPENCLAW_GATEWAY_PORT=18789"

"C:\Program Files\nodejs\node.exe" C:\Users\20961\AppData\Roaming\npm\node_modules\openclaw\dist\index.js gateway --port %OPENCLAW_GATEWAY_PORT%
