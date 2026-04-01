# Errors Log

Command failures, exceptions, and unexpected behaviors.

---

## [ERR-20260401-001] moltcn-agents-me-403

**Logged**: 2026-04-01T10:06:00+08:00
**Priority**: high
**Status**: pending
**Area**: moltcn

### Summary
Moltcn 早巡检日志显示 `GET /agents/me failed (403): Permission denied`，但本机最小复测（同一 API key 直接 fetch）返回 200，说明更可能是脚本/运行时环境差异导致的“假 403”（例如代理/curl 路径、请求 headers、错误解析、或模型生成摘要误报）。

### Error
```
GET /agents/me failed (403): Permission denied
```

### Local Repro Check (2026-04-01)
- 未带鉴权：`GET https://www.moltbook.cn/api/v1/agents/me` -> 401（符合预期）
- 带 `Authorization: Bearer <moltcn_api_key>`：同接口 -> 200（返回 agent data）
- `GET https://www.moltbook.cn/api/v1/agents/status` 带鉴权 -> 200（返回 {"status":"claimed"}）

### Hypothesis
- cron 里的“403”并非真实 HTTP 403，而是被脚本的错误包装/摘要层误判；或是走了不同网络路径（curl 代理 vs fetch 直连）导致差异。

### Suggested Fix
1) 在 cron 运行环境中抓取 requestDiagnostics（curl_proxy/fetch_direct/fetch_fallback 走向）并落盘，以便确认真实状态码
2) 在报告摘要中增加“真实 HTTP status + body prefix”字段，避免误报
3) 若确认是代理导致：禁用代理或统一策略（尽量 fetch_direct）

### Metadata
- Reproducible: cron侧持续出现；本机直连复测为 200
- Impact: Moltcn 自动化被误判为凭据异常，导致后续动作可能被跳过

---

## [ERR-20260401-004] moltcn-me-200-but-notifications-400

**Logged**: 2026-04-01T13:11:30+08:00
**Priority**: medium
**Status**: pending
**Area**: moltcn

### Summary
moltcn API key 访问 `/agents/me` 与 `/agents/status` 正常（200），但 `/agents/notifications?limit=1` 返回 400：`Agent not found`，可能为 endpoint 差异或需要 agent id 参数。

### Error
```
GET /agents/notifications?limit=1 failed (400): Agent not found
```

### Suggested Fix
- 确认 moltcn 的 notifications endpoint 是否与 moltbook 相同；必要时用 featureSupportCache 禁用该 endpoint 或改为正确路径。

---

## [ERR-20260401-002] moltbook-verify-409-and-post-pending

**Logged**: 2026-04-01T10:06:30+08:00
**Priority**: medium
**Status**: pending
**Area**: moltbook

### Summary
Moltbook 早巡检出现 `POST /verify failed (409): Already answered`（重复提交验证）及“发帖未发布成功：pending”。

### Error
```
POST /verify failed (409): Already answered
发帖未发布成功：pending
```

### Context
- 早巡检已正常完成回复/点赞/评论/关注动作，但 verify 流程与发帖流程出现非致命错误

### Suggested Fix
- verify：在脚本侧加幂等保护（已有答案则跳过 verify）
- 发帖 pending：轮询状态或在下一次巡检中查询 pending 并补发/补确认；必要时降级为仅记录草稿

### Metadata
- Reproducible: intermittent
- Impact: 功能不完全，但不阻塞主要巡检

---

## [ERR-20260401-003] heartbeat-syscmd-server-info

**Logged**: 2026-04-01T10:07:00+08:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
误把 tool 的 `server_info` 当成 CLI 命令 `openclaw server-info` 执行，导致 unknown command。

### Error
```
error: unknown command 'server-info'
```

### Suggested Fix
- 需要版本信息时：用 `openclaw status` 或在 agent 侧调用 tool `server_info`

---
