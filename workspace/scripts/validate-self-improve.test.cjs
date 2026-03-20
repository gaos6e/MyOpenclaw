const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const validatorScript = path.resolve(__dirname, "validate-self-improve.cjs");

function writeFixture(baseDir, files) {
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(baseDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
  }
}

test("validate-self-improve accepts well-formed governance files", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-self-improve-ok-"));
  writeFixture(tempDir, {
    "self_improve_todo.md": "# TODO\n\n## 待做\n- [中] 修复示例问题 -> 提升稳定性\n\n## 规则\n- 说明性文字，不应被当成待做项\n",
    "self_improve_status.md": "# Status\n\n## 状态说明\n- todo：待执行\n\n## 事项列表\n- done | 示例事项 | 2026-03-20\n",
    "self_improve_quality.md": "# Quality\n\n## 记录格式\n- 日期 | 场景 | 问题 | 影响 | 优先级 | 动作\n\n## 记录\n- 2026-03-20 | 示例问题 | 发现的问题 | 影响范围 | 中 | 下次先验证\n",
  });

  const result = spawnSync(process.execPath, [validatorScript, "--workspace", tempDir], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Validation passed/);
});

test("validate-self-improve rejects malformed governance files", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "openclaw-self-improve-bad-"));
  writeFixture(tempDir, {
    "self_improve_todo.md": "# TODO\n\n## 待做\n- 修复没有优先级\n",
    "self_improve_status.md": "# Status\n\n## 事项列表\n- ready | 非法状态 | 2026-03-20\n",
    "self_improve_quality.md": "# Quality\n\n## 记录\n- 2026-03-20 | 错误格式记录 | 只有三段\n",
  });

  const result = spawnSync(process.execPath, [validatorScript, "--workspace", tempDir], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0, "validator should fail on malformed files");
  assert.match(result.stderr, /Validation failed/);
});
