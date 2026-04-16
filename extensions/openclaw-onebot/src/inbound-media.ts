/**
 * OneBot 入站媒体处理。
 *
 * 将 NapCat/OneBot 的图片段落盘到 OpenClaw 媒体白名单目录，
 * 让核心 media understanding 能通过 MediaPaths 读取。
 */

import fs from "node:fs";
import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { OneBotImageReference } from "./message.js";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 30_000;

export interface ProcessInboundImagesOptions {
  rootDir?: string;
  workspaceDir?: string;
  maxBytes?: number;
  timeoutMs?: number;
  log?: {
    info?: (message: string) => void;
    warn?: (message: string) => void;
  };
}

export interface ProcessedInboundImages {
  mediaPaths: string[];
  mediaTypes: string[];
  contextLines: string[];
}

function getHomeDir(): string {
  try {
    return os.homedir() || process.env.USERPROFILE || process.env.HOME || os.tmpdir();
  } catch {
    return process.env.USERPROFILE || process.env.HOME || os.tmpdir();
  }
}

function getMediaRoot(options?: ProcessInboundImagesOptions): string {
  return path.resolve(
    options?.rootDir
      || process.env.OPENCLAW_ONEBOT_MEDIA_ROOT
      || path.join(getHomeDir(), ".openclaw", "media"),
  );
}

function getDownloadDir(options?: ProcessInboundImagesOptions): string {
  return path.join(getMediaRoot(options), "onebot", "downloads");
}

function getWorkspaceMirrorDir(options?: ProcessInboundImagesOptions): string | null {
  const workspaceDir = options?.workspaceDir?.trim();
  if (!workspaceDir) return null;
  return path.join(path.resolve(workspaceDir), ".openclaw-inbound-media", "onebot");
}

function normalizeLocalPath(source: string): string | null {
  const trimmed = source.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("file://")) {
    try {
      return fileURLToPath(trimmed);
    } catch {
      return trimmed.slice("file://".length);
    }
  }
  return path.isAbsolute(trimmed) ? trimmed : null;
}

function inferImageExtension(source: string, mime?: string): string {
  const normalizedMime = mime?.toLowerCase();
  if (normalizedMime?.includes("jpeg") || normalizedMime?.includes("jpg")) return ".jpg";
  if (normalizedMime?.includes("gif")) return ".gif";
  if (normalizedMime?.includes("webp")) return ".webp";
  if (normalizedMime?.includes("bmp")) return ".bmp";
  if (normalizedMime?.includes("png")) return ".png";

  const lower = source.toLowerCase();
  const match = lower.match(/\.(png|jpg|jpeg|gif|webp|bmp)(?:[?#].*)?$/);
  return match?.[1] ? `.${match[1] === "jpeg" ? "jpg" : match[1]}` : ".png";
}

function inferImageMime(source: string, mime?: string): string {
  const normalizedMime = mime?.trim().toLowerCase();
  if (normalizedMime?.startsWith("image/")) return normalizedMime;
  const ext = inferImageExtension(source);
  if (ext === ".jpg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".bmp") return "image/bmp";
  return "image/png";
}

function allocateImagePath(downloadDir: string, source: string, mime?: string): string {
  const ext = inferImageExtension(source, mime);
  return path.join(
    downloadDir,
    `onebot-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`,
  );
}

async function writeImageBuffer(params: {
  source: string;
  buffer: Buffer;
  options?: ProcessInboundImagesOptions;
  mime?: string;
}): Promise<{ path: string; mime: string }> {
  const maxBytes = params.options?.maxBytes ?? MAX_IMAGE_BYTES;
  if (params.buffer.byteLength > maxBytes) {
    throw new Error(`image exceeds ${maxBytes} bytes`);
  }
  const downloadDir = getDownloadDir(params.options);
  await fsp.mkdir(downloadDir, { recursive: true });
  const targetPath = allocateImagePath(downloadDir, params.source, params.mime);
  await fsp.writeFile(targetPath, params.buffer);
  return {
    path: targetPath,
    mime: inferImageMime(params.source, params.mime),
  };
}

async function downloadImage(source: string, options?: ProcessInboundImagesOptions): Promise<Buffer> {
  const response = await fetch(source, {
    signal: AbortSignal.timeout(options?.timeoutMs ?? DOWNLOAD_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const maxBytes = options?.maxBytes ?? MAX_IMAGE_BYTES;
  if (buffer.byteLength > maxBytes) {
    throw new Error(`image exceeds ${maxBytes} bytes`);
  }
  return buffer;
}

async function materializeImage(ref: OneBotImageReference, options?: ProcessInboundImagesOptions): Promise<{ path: string; mime: string }> {
  const source = ref.source.trim();
  if (!source) {
    throw new Error("empty image source");
  }

  const dataUrlMatch = source.match(/^data:(image\/[^;]+);base64,(.+)$/i);
  if (dataUrlMatch?.[1] && dataUrlMatch[2]) {
    return writeImageBuffer({
      source,
      buffer: Buffer.from(dataUrlMatch[2], "base64"),
      options,
      mime: dataUrlMatch[1],
    });
  }

  if (source.startsWith("base64://")) {
    return writeImageBuffer({
      source,
      buffer: Buffer.from(source.slice("base64://".length), "base64"),
      options,
      mime: "image/png",
    });
  }

  if (/^https?:\/\//i.test(source)) {
    const buffer = await downloadImage(source, options);
    return writeImageBuffer({ source, buffer, options });
  }

  const localPath = normalizeLocalPath(source);
  if (!localPath) {
    throw new Error("unsupported image source");
  }
  const stat = await fsp.stat(localPath);
  const maxBytes = options?.maxBytes ?? MAX_IMAGE_BYTES;
  if (!stat.isFile()) {
    throw new Error("image source is not a file");
  }
  if (stat.size > maxBytes) {
    throw new Error(`image exceeds ${maxBytes} bytes`);
  }

  const downloadDir = getDownloadDir(options);
  await fsp.mkdir(downloadDir, { recursive: true });
  const targetPath = allocateImagePath(downloadDir, localPath);
  await fsp.copyFile(localPath, targetPath);
  return {
    path: targetPath,
    mime: inferImageMime(localPath),
  };
}

async function mirrorImageIntoWorkspace(
  sourcePath: string,
  options?: ProcessInboundImagesOptions,
): Promise<string | null> {
  const mirrorDir = getWorkspaceMirrorDir(options);
  if (!mirrorDir) return null;
  await fsp.mkdir(mirrorDir, { recursive: true });
  const targetPath = path.join(mirrorDir, path.basename(sourcePath));
  await fsp.copyFile(sourcePath, targetPath);
  return fs.realpathSync.native(targetPath);
}

function originLabel(origin: OneBotImageReference["origin"]): string {
  return origin === "quote" ? "引用图片" : "当前图片";
}

export async function processInboundImages(
  refs: OneBotImageReference[],
  options: ProcessInboundImagesOptions = {},
): Promise<ProcessedInboundImages> {
  const mediaPaths: string[] = [];
  const mediaTypes: string[] = [];
  const contextLines: string[] = [];

  for (const ref of refs) {
    try {
      const materialized = await materializeImage(ref, options);
      const storedPath = fs.realpathSync.native(materialized.path);
      const mirroredPath = await mirrorImageIntoWorkspace(storedPath, options);
      const promptPath = mirroredPath ?? storedPath;
      mediaPaths.push(promptPath);
      mediaTypes.push(materialized.mime);
      contextLines.push(`- ${originLabel(ref.origin)}已附加，可直接查看`);
      options.log?.info?.(`[onebot] inbound image saved: ${storedPath}`);
      if (mirroredPath) {
        options.log?.info?.(`[onebot] inbound image mirrored for workspace access: ${mirroredPath}`);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      contextLines.push(`- ${originLabel(ref.origin)}附加失败（${reason}）`);
      options.log?.warn?.(`[onebot] inbound image skipped: ${reason}`);
    }
  }

  return { mediaPaths, mediaTypes, contextLines };
}
