const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const MODULE_PATH = path.join(__dirname, "control_ui_localization.cjs");

function loadModule() {
  assert.equal(
    fs.existsSync(MODULE_PATH),
    true,
    "expected control_ui_localization.cjs to exist",
  );
  return require(MODULE_PATH);
}

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("injectOverlayIntoIndex appends the stable overlay asset exactly once", () => {
  const { injectOverlayIntoIndex, OVERLAY_ASSET_NAME } = loadModule();
  const original = `<!doctype html>
<html lang="en">
  <head>
    <script type="module" crossorigin src="./assets/index-main.js"></script>
  </head>
  <body>
    <openclaw-app></openclaw-app>
  </body>
</html>`;

  const injected = injectOverlayIntoIndex(original, `./assets/${OVERLAY_ASSET_NAME}?v=test-hash`);
  const overlayTag = `<script defer src="./assets/${OVERLAY_ASSET_NAME}?v=test-hash" data-openclaw-zh-cn-overlay></script>`;

  assert.match(injected, new RegExp(OVERLAY_ASSET_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(injected.includes(overlayTag), true);
  assert.equal(injected.indexOf(overlayTag), injected.lastIndexOf(overlayTag));

  const reinjected = injectOverlayIntoIndex(injected);
  assert.equal(reinjected, injected);
});

test("translate helpers only localize known chrome strings", () => {
  const { translateExactText, translateUiAttributeValue } = loadModule();

  assert.equal(translateExactText("Overview"), "概览");
  assert.equal(translateExactText(" Save "), " 保存 ");
  assert.equal(translateExactText("Workspace paths and identity metadata."), "工作区路径与身份元数据。");
  assert.equal(translateExactText("Primary model"), "主模型");
  assert.equal(translateExactText("(default)"), "（默认）");
  assert.equal(translateExactText("Default model"), "默认模型");
  assert.equal(
    translateExactText("Default (gpt-5.2-codex · openai-codex)"),
    "默认（gpt-5.2-codex · openai-codex）",
  );
  assert.equal(translateExactText("Reload"), "重新加载");
  assert.equal(translateExactText("QQ Bot"), "QQ 机器人");
  assert.equal(translateExactText("Cron"), "Cron 表达式");
  assert.equal(
    translateExactText("Cron 0 */2 * * * (Asia/Shanghai)"),
    "Cron：0 */2 * * * (Asia/Shanghai)",
  );
  assert.equal(translateExactText("Running"), "运行中");
  assert.equal(translateExactText("Configured"), "已配置");
  assert.equal(translateExactText("Last inbound"), "最后入站");
  assert.equal(translateExactText("Schedule"), "调度");
  assert.equal(translateExactText("Last run"), "上次运行");
  assert.equal(translateExactText("Reset"), "重置");
  assert.equal(translateExactText("Run if due"), "到点则运行");
  assert.equal(translateExactText("Channel status and configuration."), "频道状态与配置。");
  assert.equal(translateExactText("Channel health"), "频道健康");
  assert.equal(translateExactText("Channel status snapshots from the gateway."), "来自网关的频道状态快照。");
  assert.equal(translateExactText("21m ago"), "21 分钟前");
  assert.equal(translateExactText("in 2m"), "2 分钟后");
  assert.equal(translateExactText("in <1m"), "少于 1 分钟后");
  assert.equal(
    translateExactText("周二, 2026/3/24 16:02:27 (in 1h)"),
    "周二, 2026/3/24 16:02:27（1 小时后）",
  );
  assert.equal(translateExactText("just now"), "刚刚");
  assert.equal(
    translateExactText("announce (qqbot -> qqbot:c2c:123456)"),
    "发布（qqbot -> qqbot:c2c:123456）",
  );
  assert.equal(translateExactText("isolated"), "隔离");
  assert.equal(translateExactText("now"), "立即");
  assert.equal(
    translateExactText("Unsupported type: . Use Raw mode."),
    "不支持的类型：。请使用原始模式。",
  );
  assert.equal(translateExactText("OpenClaw Control"), "OpenClaw 控制台");
  assert.equal(translateExactText("openai-codex/gpt-5.2-codex"), "openai-codex/gpt-5.2-codex");
  assert.equal(translateUiAttributeValue("aria-label", "Toggle token visibility"), "切换令牌可见性");
  assert.equal(translateUiAttributeValue("aria-label", "Color mode"), "颜色模式");
  assert.equal(translateUiAttributeValue("title", "Delete message"), "删除消息");
  assert.equal(translateUiAttributeValue("title", "Open Files tab"), "打开文件标签");
  assert.equal(
    translateUiAttributeValue("aria-label", "Message 小毛毛 (Enter to send)"),
    "给 小毛毛 发消息（回车发送）",
  );
});

test("syncControlUi rebuilds the local target from upstream and injects overlay assets", () => {
  const { OVERLAY_ASSET_NAME, syncControlUi } = loadModule();
  const sourceDir = makeTempDir("openclaw-control-ui-source-");
  const targetDir = makeTempDir("openclaw-control-ui-target-");

  fs.mkdirSync(path.join(sourceDir, "assets"), { recursive: true });
  fs.writeFileSync(
    path.join(sourceDir, "index.html"),
    `<!doctype html>
<html>
  <head>
    <script type="module" crossorigin src="./assets/index-main.js"></script>
  </head>
  <body>
    <openclaw-app></openclaw-app>
  </body>
</html>`,
  );
  fs.writeFileSync(path.join(sourceDir, "assets", "index-main.js"), "console.log('upstream');");
  fs.writeFileSync(path.join(sourceDir, "assets", "zh-CN.js"), "export const zh_CN = {};");
  fs.mkdirSync(path.join(targetDir, "assets"), { recursive: true });
  fs.writeFileSync(path.join(targetDir, "stale.txt"), "remove me");

  syncControlUi({ sourceDir, targetDir });

  assert.equal(fs.existsSync(path.join(targetDir, "stale.txt")), false);
  assert.equal(fs.existsSync(path.join(targetDir, "assets", "index-main.js")), true);
  assert.equal(fs.existsSync(path.join(targetDir, "assets", OVERLAY_ASSET_NAME)), true);

  const targetIndex = fs.readFileSync(path.join(targetDir, "index.html"), "utf8");
  assert.match(
    targetIndex,
    new RegExp(`${OVERLAY_ASSET_NAME.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\?v=`),
  );

  const overlaySource = fs.readFileSync(path.join(targetDir, "assets", OVERLAY_ASSET_NAME), "utf8");
  assert.match(overlaySource, /MutationObserver/);
  assert.match(overlaySource, /Toggle token visibility/);
  assert.match(overlaySource, /characterData:\s*true/);
  assert.match(overlaySource, /setTimeout/);
});
