import test from "node:test";
import assert from "node:assert/strict";

import { processInboundMessage } from "../src/handlers/process-inbound.js";

function createApi(capture: (ctx: any) => void) {
  return {
    config: {
      channels: {
        onebot: {
          wsUrl: "ws://127.0.0.1:30011",
          selfId: "3437738143",
          groupReplyPolicy: "@mentions-only",
        },
      },
    },
    logger: { info() {}, warn() {}, error() {} },
    runtime: {
      channel: {
        reply: {
          dispatchReplyWithBufferedBlockDispatcher: async ({ ctx }: any) => {
            capture(ctx);
          },
          formatInboundEnvelope: ({ body }: any) => ({ content: [{ type: "text", text: body }] }),
          resolveEnvelopeFormatOptions: () => ({}),
        },
        routing: {
          resolveAgentRoute: () => ({ agentId: "onebot-3437738143" }),
        },
        session: {
          resolveStorePath: () => "",
          recordInboundSession: async () => {},
        },
        activity: { record() {} },
      },
    },
  };
}

for (const command of ["/compact", "/status"]) {
  test(`group mention ${command} is dispatched as a real slash command`, async () => {
    let capturedCtx: any;

    await processInboundMessage(createApi((ctx) => {
      capturedCtx = ctx;
    }), {
      post_type: "message",
      message_type: "group",
      self_id: 3437738143,
      user_id: 2096157181,
      group_id: 879995722,
      raw_message: `[CQ:at,qq=3437738143] ${command}`,
      message: [
        { type: "at", data: { qq: "3437738143" } },
        { type: "text", data: { text: ` ${command}` } },
      ],
      sender: { nickname: "tester" },
    });

    assert.ok(capturedCtx);
    assert.equal(capturedCtx.RawBody, command);
    assert.equal(capturedCtx.CommandBody, command);
    assert.equal(capturedCtx.BodyForAgent, command);
    assert.equal(capturedCtx.Body.content[0].text, command);
    assert.equal(capturedCtx.CommandAuthorized, true);
  });
}
