const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const handler = require(path.resolve(__dirname, "handler.js"));

test("task-ack sends a concise evidence-first start message for likely tasks", async () => {
  const event = {
    type: "message",
    action: "received",
    messages: [],
    context: {
      content: "帮我完整检查一遍当前本机 openclaw 的自定义层设计是否合理",
      isGroup: false,
    },
  };

  await handler(event);

  assert.equal(event.messages.length, 1);
  assert.match(event.messages[0], /收到/);
  assert.match(event.messages[0], /先核对现状/);
  assert.match(event.messages[0], /相关文件和约束/);
  assert.doesNotMatch(event.messages[0], /哥哥/);
});

test("task-ack skips greetings and group messages", async () => {
  const greetingEvent = {
    type: "message",
    action: "received",
    messages: [],
    context: {
      content: "你好",
      isGroup: false,
    },
  };

  const groupEvent = {
    type: "message",
    action: "received",
    messages: [],
    context: {
      content: "帮我查下最近几天日志",
      isGroup: true,
    },
  };

  await handler(greetingEvent);
  await handler(groupEvent);

  assert.equal(greetingEvent.messages.length, 0);
  assert.equal(groupEvent.messages.length, 0);
});
