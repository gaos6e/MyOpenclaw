import test from "node:test";
import assert from "node:assert/strict";

import { resolveGroupReplyPolicy } from "../src/config.js";

test("resolveGroupReplyPolicy allows five-second proactive cooldown", () => {
  const policy = resolveGroupReplyPolicy({
    proactiveCooldownMs: 5_000,
  });

  assert.equal(policy.proactiveCooldownMs, 5_000);
});

test("resolveGroupReplyPolicy clamps proactive cooldown below five seconds", () => {
  const policy = resolveGroupReplyPolicy({
    proactiveCooldownMs: 1_000,
  });

  assert.equal(policy.proactiveCooldownMs, 5_000);
});
