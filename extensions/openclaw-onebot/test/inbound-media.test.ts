import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { collectImageSegmentsFromContent } from "../src/message.js";
import { processInboundImages } from "../src/inbound-media.js";
import { processInboundMessage } from "../src/handlers/process-inbound.js";

const ONE_PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

test("collectImageSegmentsFromContent extracts image segment sources", () => {
  const images = collectImageSegmentsFromContent([
    { type: "text", data: { text: "看图" } },
    { type: "image", data: { url: "https://example.com/a.png" } },
    { type: "image", data: { file: "file:///tmp/b.jpg" } },
  ], "current");

  assert.deepEqual(images, [
    { source: "https://example.com/a.png", origin: "current" },
    { source: "file:///tmp/b.jpg", origin: "current" },
  ]);
});

test("quoted image references keep quote origin for context", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "onebot-quote-media-test-"));
  const refs = collectImageSegmentsFromContent([
    { type: "image", data: { file: `base64://${ONE_PIXEL_PNG_BASE64}` } },
  ], "quote");
  const result = await processInboundImages(refs, { rootDir: root });

  assert.equal(refs[0].origin, "quote");
  assert.match(result.contextLines[0], /引用图片/);
});

test("processInboundImages stores base64 image in OpenClaw media-compatible directory", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "onebot-media-test-"));
  const result = await processInboundImages([
    { source: `base64://${ONE_PIXEL_PNG_BASE64}`, origin: "current" },
  ], { rootDir: root });

  assert.equal(result.mediaPaths.length, 1);
  assert.equal(result.mediaTypes[0], "image/png");
  assert.match(result.mediaPaths[0], /onebot[\\/]downloads[\\/]/);
  assert.equal(fs.existsSync(result.mediaPaths[0]), true);
});

test("processInboundMessage passes image-only private messages as media context", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "onebot-process-test-"));
  process.env.OPENCLAW_ONEBOT_MEDIA_ROOT = root;

  let capturedCtx: any;
  const api = {
    config: {
      channels: {
        onebot: {
          wsUrl: "ws://127.0.0.1:30011",
          selfId: "3437738143",
        },
      },
    },
    logger: { info() {}, warn() {}, error() {} },
    runtime: {
      channel: {
        reply: {
          dispatchReplyWithBufferedBlockDispatcher: async ({ ctx }: any) => {
            capturedCtx = ctx;
          },
          formatInboundEnvelope: ({ body }: any) => ({ content: [{ type: "text", text: body }] }),
          resolveEnvelopeFormatOptions: () => ({}),
        },
        routing: {
          resolveAgentRoute: () => ({ agentId: "main" }),
        },
        session: {
          resolveStorePath: () => "",
          recordInboundSession: async () => {},
        },
        activity: { record() {} },
      },
    },
  };

  await processInboundMessage(api, {
    post_type: "message",
    message_type: "private",
    self_id: 3437738143,
    user_id: 123456,
    message: [
      { type: "image", data: { file: `base64://${ONE_PIXEL_PNG_BASE64}` } },
    ],
    sender: { nickname: "tester" },
  });

  assert.ok(capturedCtx);
  assert.equal(capturedCtx.MediaPaths.length, 1);
  assert.equal(capturedCtx.MediaPath, capturedCtx.MediaPaths[0]);
  assert.deepEqual(capturedCtx.MediaTypes, ["image/png"]);
  assert.match(capturedCtx.BodyForAgent, /当前图片/);

  delete process.env.OPENCLAW_ONEBOT_MEDIA_ROOT;
});
