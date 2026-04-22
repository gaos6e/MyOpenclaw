import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildSenderRuleContext, getSenderAddressRule } from "../src/sender-rules.js";
import { processInboundMessage } from "../src/handlers/process-inbound.js";

function writeSenderRules(workspaceDir: string) {
    fs.writeFileSync(path.join(workspaceDir, "onebot_sender_rules.json"), JSON.stringify({
        rules: {
            "2096157181": {
                addressAs: "哥哥～",
                note: "Apply in both private and group chats.",
            },
            "2164955274": {
                addressAs: "儿子～",
            },
        },
    }, null, 2));
}

test("getSenderAddressRule loads exact sender rules from workspace", () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "onebot-sender-rules-"));
    writeSenderRules(workspace);

    const elder = getSenderAddressRule(workspace, "2096157181");
    const junior = getSenderAddressRule(workspace, 2164955274);

    assert.equal(elder?.addressAs, "哥哥～");
    assert.equal(junior?.addressAs, "儿子～");
    assert.equal(getSenderAddressRule(workspace, "999999"), null);
});

test("buildSenderRuleContext returns deterministic prompt context for matched sender", () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "onebot-sender-rules-"));
    writeSenderRules(workspace);

    const context = buildSenderRuleContext(workspace, "2096157181");

    assert.match(context, /Exact SenderId match: 2096157181/);
    assert.match(context, /Address this sender as: 哥哥～/);
    assert.match(context, /both private and group chats/);
});

test("processInboundMessage injects sender rule context into BodyForAgent", async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "onebot-sender-rules-workspace-"));
    writeSenderRules(workspace);

    let capturedCtx: any;
    const api = {
        config: {
            agents: {
                defaults: {
                    workspace,
                },
            },
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
        user_id: 2096157181,
        message: [
            { type: "text", data: { text: "hello" } },
        ],
        sender: { nickname: "tester" },
    });

    assert.ok(capturedCtx);
    assert.match(capturedCtx.BodyForAgent, /Address this sender as: 哥哥～/);
    assert.match(capturedCtx.SenderRuleContext, /2096157181/);
});
