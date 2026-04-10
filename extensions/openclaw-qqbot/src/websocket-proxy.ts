import type { Agent } from "node:http";
import { execFileSync } from "node:child_process";
import { ProxyAgent } from "proxy-agent";

const PROXY_ENV_KEYS = [
  "HTTPS_PROXY",
  "https_proxy",
  "ALL_PROXY",
  "all_proxy",
  "HTTP_PROXY",
  "http_proxy",
];

function getConfiguredProxyUrl(): string | null {
  for (const key of PROXY_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return null;
}

export function normalizeProxyUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  let candidate = trimmed;
  if (trimmed.includes("=")) {
    const pairs = trimmed
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);
    const preferred = ["https", "http", "all"];
    for (const key of preferred) {
      const match = pairs.find((part) => part.toLowerCase().startsWith(`${key}=`));
      if (match) {
        candidate = match.slice(match.indexOf("=") + 1).trim();
        break;
      }
    }
  }

  if (!candidate) {
    return null;
  }
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
    candidate = `http://${candidate}`;
  }
  return candidate;
}

function maskProxyUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.username) {
      url.username = "***";
    }
    if (url.password) {
      url.password = "***";
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const WINDOWS_PROXY_REG_PATH = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings";
let cachedWindowsProxyUrl: string | null | undefined;

function readWindowsProxyRegistryValue(name: string): string | null {
  try {
    const output = execFileSync(
      "reg.exe",
      ["query", WINDOWS_PROXY_REG_PATH, "/v", name],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const line = output
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find((entry) => entry.toLowerCase().startsWith(name.toLowerCase()));
    if (!line) {
      return null;
    }
    const parts = line.split(/\s{2,}/).filter(Boolean);
    return parts.length >= 3 ? parts[2] : null;
  } catch {
    return null;
  }
}

function getWindowsProxyUrl(): string | null {
  if (cachedWindowsProxyUrl !== undefined) {
    return cachedWindowsProxyUrl;
  }
  if (process.platform !== "win32") {
    cachedWindowsProxyUrl = null;
    return cachedWindowsProxyUrl;
  }

  const enabled = readWindowsProxyRegistryValue("ProxyEnable");
  const rawProxy = readWindowsProxyRegistryValue("ProxyServer");
  cachedWindowsProxyUrl = enabled === "1" && rawProxy ? normalizeProxyUrl(rawProxy) : null;
  return cachedWindowsProxyUrl;
}

function getResolvedProxyUrl(): string | null {
  const envProxy = getConfiguredProxyUrl();
  if (envProxy) {
    return normalizeProxyUrl(envProxy);
  }
  return getWindowsProxyUrl();
}

export function describeConfiguredWebSocketProxy(): string | null {
  const proxyUrl = getResolvedProxyUrl();
  if (!proxyUrl) {
    return null;
  }
  return maskProxyUrl(proxyUrl);
}

export function resolveWebSocketAgent(): Agent | undefined {
  const proxyUrl = getResolvedProxyUrl();
  if (!proxyUrl) {
    return undefined;
  }
  return new ProxyAgent({
    getProxyForUrl: () => proxyUrl,
  });
}
