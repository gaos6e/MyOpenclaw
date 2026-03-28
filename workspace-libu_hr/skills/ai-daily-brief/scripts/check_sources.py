#!/usr/bin/env python3
"""Lightweight source-health check for the ai-daily-brief skill."""

from __future__ import annotations

import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
)
COMMON_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

SOURCES = [
    {
        "name": "OpenAI News RSS",
        "kind": "rss",
        "url": "https://openai.com/news/rss.xml",
    },
    {
        "name": "Google AI RSS",
        "kind": "rss",
        "url": "https://blog.google/technology/ai/rss",
    },
    {
        "name": "Google DeepMind RSS",
        "kind": "rss",
        "url": "https://deepmind.google/blog/rss.xml",
    },
    {
        "name": "Microsoft AI Blog Feed",
        "kind": "rss",
        "url": "https://blogs.microsoft.com/blog/tag/ai/feed/",
    },
    {
        "name": "NVIDIA Deep Learning Feed",
        "kind": "rss",
        "url": "https://blogs.nvidia.com/blog/category/deep-learning/feed/",
    },
    {
        "name": "AWS Machine Learning Feed",
        "kind": "rss",
        "url": "https://aws.amazon.com/blogs/machine-learning/feed/",
    },
    {
        "name": "Hugging Face Blog Feed",
        "kind": "rss",
        "url": "https://huggingface.co/blog/feed.xml",
    },
    {
        "name": "Anthropic Newsroom",
        "kind": "page",
        "url": "https://www.anthropic.com/news",
    },
    {
        "name": "Meta AI Blog",
        "kind": "page",
        "url": "https://ai.meta.com/blog/",
        "optional": True,
    },
    {
        "name": "Mistral AI News",
        "kind": "page",
        "url": "https://mistral.ai/news/",
    },
    {
        "name": "Tongyi / Qwen Official Site",
        "kind": "page",
        "url": "https://tongyi.aliyun.com/",
    },
]


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers=COMMON_HEADERS)
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read()


def clean_text(value: str) -> str:
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def check_rss(payload: bytes) -> tuple[str, str]:
    root = ET.fromstring(payload)
    channel = root.find("channel")
    if channel is None:
        raise ValueError("RSS channel missing")

    last_build = channel.findtext("lastBuildDate") or "unknown-build-date"
    item = channel.find("item")
    if item is None:
        return last_build, "no items"

    title = clean_text(item.findtext("title") or "untitled")
    pub_date = clean_text(item.findtext("pubDate") or "unknown-date")
    return last_build, f"{pub_date} | {title}"


def check_page(payload: bytes) -> tuple[str, str]:
    text = payload.decode("utf-8", errors="replace")
    title_match = re.search(r"<title>(.*?)</title>", text, flags=re.IGNORECASE | re.DOTALL)
    h1_match = re.search(r"<h1[^>]*>(.*?)</h1>", text, flags=re.IGNORECASE | re.DOTALL)
    title = clean_text(title_match.group(1)) if title_match else "no-title"
    h1 = clean_text(re.sub(r"<[^>]+>", "", h1_match.group(1))) if h1_match else "no-h1"
    return title, h1


def main() -> int:
    failures = 0
    for source in SOURCES:
        name = source["name"]
        kind = source["kind"]
        url = source["url"]
        optional = source.get("optional", False)
        try:
            payload = fetch(url)
            if kind == "rss":
                primary, secondary = check_rss(payload)
                print(f"[OK] {name}")
                print(f"     URL: {url}")
                print(f"     Last Build: {primary}")
                print(f"     Latest Item: {secondary}")
            else:
                primary, secondary = check_page(payload)
                print(f"[OK] {name}")
                print(f"     URL: {url}")
                print(f"     Title: {primary}")
                print(f"     H1: {secondary}")
        except urllib.error.HTTPError as exc:
            if not optional:
                failures += 1
            level = "WARN" if optional else f"HTTP {exc.code}"
            print(f"[{level}] {name}")
            print(f"     URL: {url}")
        except urllib.error.URLError as exc:
            if not optional:
                failures += 1
            level = "WARN" if optional else "ERROR"
            print(f"[{level}] {name}")
            print(f"     URL: {url}")
            print(f"     Reason: {exc.reason}")
        except Exception as exc:  # pragma: no cover - defensive output
            if not optional:
                failures += 1
            level = "WARN" if optional else "ERROR"
            print(f"[{level}] {name}")
            print(f"     URL: {url}")
            print(f"     Reason: {exc}")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
