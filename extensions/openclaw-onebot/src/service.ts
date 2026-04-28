/**
 * OneBot WebSocket 服务
 */

import type { OneBotMessage } from "./types.js";
import { getOneBotConfig } from "./config.js";
import { connectForward, createServerAndWait, setWs, stopConnection, handleEchoResponse, startImageTempCleanup, stopImageTempCleanup } from "./connection.js";
import { processInboundMessage } from "./handlers/process-inbound.js";
import { handleGroupIncrease } from "./handlers/group-increase.js";
import { startScheduler, stopScheduler } from "./scheduler.js";

function attachOneBotHandlers(api: any, ws: any, onActivity?: (kind: "transport" | "inbound") => void): void {
    ws.on("message", (data: Buffer) => {
        try {
            const payload = JSON.parse(data.toString());
            if (handleEchoResponse(payload)) return;
            if (payload.meta_event_type === "heartbeat") return;
            onActivity?.("transport");

            const msg = payload as OneBotMessage;
            if (msg.post_type === "message" && (msg.message_type === "private" || msg.message_type === "group")) {
                onActivity?.("inbound");
                processInboundMessage(api, msg).catch((e) => {
                    api.logger?.error?.(`[onebot] processInboundMessage: ${e?.message}`);
                });
            } else if (msg.post_type === "notice" && msg.notice_type === "group_increase") {
                handleGroupIncrease(api, msg).catch((e) => {
                    api.logger?.error?.(`[onebot] handleGroupIncrease: ${e?.message}`);
                });
            }
        } catch (e: any) {
            api.logger?.error?.(`[onebot] parse message: ${e?.message}`);
        }
    });
}

export async function runOneBotGatewayAccount(api: any, ctx: any): Promise<void> {
    const config = getOneBotConfig(ctx.cfg, ctx.accountId);
    if (!config) {
        throw new Error("OneBot not configured");
    }
    if (config.enabled === false) {
        ctx.setStatus({
            ...ctx.getStatus(),
            running: false,
            connected: false,
            lastError: "disabled",
        });
        return;
    }

    (globalThis as any).__onebotGatewayConfig = ctx.cfg;

    let ws: any;
    try {
        ws = config.type === "forward-websocket"
            ? await connectForward(config)
            : await createServerAndWait(config);

        setWs(ws);
        api.logger?.info?.("[onebot] WebSocket connected");
        ctx.setStatus({
            ...ctx.getStatus(),
            running: true,
            connected: true,
            lastConnectedAt: Date.now(),
            lastTransportActivityAt: Date.now(),
            lastError: null,
        });

        startImageTempCleanup();
        startScheduler(api);

        const markActivity = (kind: "transport" | "inbound") => {
            const now = Date.now();
            ctx.setStatus({
                ...ctx.getStatus(),
                running: true,
                connected: true,
                lastTransportActivityAt: now,
                ...(kind === "inbound" ? { lastInboundAt: now } : {}),
            });
        };
        attachOneBotHandlers(api, ws, markActivity);

        await new Promise<void>((resolve, reject) => {
            const onAbort = () => {
                resolve();
            };
            ctx.abortSignal.addEventListener("abort", onAbort, { once: true });

            ws.on("close", () => {
                api.logger?.info?.("[onebot] WebSocket closed");
                ctx.setStatus({
                    ...ctx.getStatus(),
                    connected: false,
                    lastDisconnectedAt: Date.now(),
                });
                ctx.abortSignal.removeEventListener("abort", onAbort);
                if (ctx.abortSignal.aborted) {
                    resolve();
                } else {
                    reject(new Error("OneBot WebSocket closed"));
                }
            });

            ws.on("error", (e: Error) => {
                api.logger?.error?.(`[onebot] WebSocket error: ${e?.message}`);
                ctx.setStatus({
                    ...ctx.getStatus(),
                    lastError: e?.message ?? String(e),
                });
            });
        });
    } finally {
        stopImageTempCleanup();
        stopScheduler();
        stopConnection();
        api.logger?.info?.("[onebot] service stopped");
    }
}

export function registerService(api: any): void {
    api.registerService({
        id: "onebot-ws",
        start: async () => {
            const config = getOneBotConfig(api);
            if (!config) {
                api.logger?.warn?.("[onebot] no config, service will not connect");
                return;
            }
            if (config.enabled === false) {
                api.logger?.info?.("[onebot] service disabled by account config");
                return;
            }

            try {
                let ws;
                if (config.type === "forward-websocket") {
                    ws = await connectForward(config);
                } else {
                    ws = await createServerAndWait(config);
                }

                setWs(ws);
                api.logger?.info?.("[onebot] WebSocket connected");

                startImageTempCleanup();
                startScheduler(api);

                attachOneBotHandlers(api, ws);

                ws!.on("close", () => {
                    api.logger?.info?.("[onebot] WebSocket closed");
                });

                ws!.on("error", (e: Error) => {
                    api.logger?.error?.(`[onebot] WebSocket error: ${e?.message}`);
                });
            } catch (e: any) {
                api.logger?.error?.(`[onebot] start failed: ${e?.message}`);
            }
        },
        stop: async () => {
            stopImageTempCleanup();
            stopScheduler();
            stopConnection();
            api.logger?.info?.("[onebot] service stopped");
        },
    });
}
