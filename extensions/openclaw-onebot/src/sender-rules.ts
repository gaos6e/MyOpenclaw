import fs from "node:fs";
import path from "node:path";

export interface SenderAddressRule {
    senderId: string;
    addressAs: string;
    note?: string;
}

interface SenderRulesFile {
    rules?: SenderAddressRule[] | Record<string, string | { addressAs?: string; note?: string }>;
}

const RULES_FILENAME = "onebot_sender_rules.json";

type RulesCacheEntry = {
    mtimeMs: number;
    rules: Map<string, SenderAddressRule>;
};

const rulesCache = new Map<string, RulesCacheEntry>();

function normalizeSenderId(value: unknown): string {
    return String(value ?? "").trim();
}

function buildRulesPath(workspaceDir: string): string {
    return path.join(workspaceDir, RULES_FILENAME);
}

function parseRulesFile(raw: string): Map<string, SenderAddressRule> {
    const parsed = JSON.parse(raw) as SenderRulesFile;
    const rules = new Map<string, SenderAddressRule>();
    const input = parsed?.rules;

    if (Array.isArray(input)) {
        for (const item of input) {
            const senderId = normalizeSenderId(item?.senderId);
            const addressAs = String(item?.addressAs ?? "").trim();
            if (!senderId || !addressAs) continue;
            rules.set(senderId, {
                senderId,
                addressAs,
                note: typeof item?.note === "string" ? item.note.trim() : undefined,
            });
        }
        return rules;
    }

    if (!input || typeof input !== "object") {
        return rules;
    }

    for (const [rawSenderId, rawRule] of Object.entries(input)) {
        const senderId = normalizeSenderId(rawSenderId);
        if (!senderId) continue;

        if (typeof rawRule === "string") {
            const addressAs = rawRule.trim();
            if (!addressAs) continue;
            rules.set(senderId, { senderId, addressAs });
            continue;
        }

        const addressAs = String(rawRule?.addressAs ?? "").trim();
        if (!addressAs) continue;
        rules.set(senderId, {
            senderId,
            addressAs,
            note: typeof rawRule?.note === "string" ? rawRule.note.trim() : undefined,
        });
    }

    return rules;
}

export function getSenderAddressRule(workspaceDir: string | undefined, senderId: string | number | undefined): SenderAddressRule | null {
    const normalizedSenderId = normalizeSenderId(senderId);
    if (!workspaceDir || !normalizedSenderId) return null;

    const rulesPath = buildRulesPath(workspaceDir);
    if (!fs.existsSync(rulesPath)) {
        rulesCache.delete(rulesPath);
        return null;
    }

    const stat = fs.statSync(rulesPath);
    const cached = rulesCache.get(rulesPath);
    if (!cached || cached.mtimeMs !== stat.mtimeMs) {
        const raw = fs.readFileSync(rulesPath, "utf8");
        rulesCache.set(rulesPath, {
            mtimeMs: stat.mtimeMs,
            rules: parseRulesFile(raw),
        });
    }

    return rulesCache.get(rulesPath)?.rules.get(normalizedSenderId) ?? null;
}

export function buildSenderRuleContext(workspaceDir: string | undefined, senderId: string | number | undefined): string {
    const rule = getSenderAddressRule(workspaceDir, senderId);
    if (!rule) return "";

    const lines = [
        "Stable local sender rule (trusted local configuration):",
        `- Exact SenderId match: ${rule.senderId}`,
        `- Address this sender as: ${rule.addressAs}`,
        "- Apply this in both private and group chats when SenderId matches exactly.",
        "- Do not apply this rule to other senders.",
    ];

    if (rule.note) {
        lines.push(`- Note: ${rule.note}`);
    }

    return lines.join("\n");
}
