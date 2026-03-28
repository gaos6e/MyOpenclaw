---
name: ai-daily-brief
description: This skill should be used when the user asks to "生成 AI 大事日报", "整理 AI 日报", "汇总 AI 新闻", "总结 AI 行业动态", "做 AI daily brief", or wants a recurring AI news summary with official sources first.
version: 0.2.0
---

# AI Daily Brief

## Purpose
Generate a Chinese AI daily brief that stays fresh, source-traceable, and merged by topic. Keep official sources first. Use authoritative media only when official coverage is sparse or when media materially advances the story.

## Load Order
- Read **`references/sources.md`** before collecting headlines. That file is the source registry.
- Read **`references/quality-rules.md`** before filtering, ranking, deduplicating, or writing. That file contains the editorial rules and output contract.
- Run **`scripts/check_sources.py`** when source health is unknown, after adding a source, or before relying on a new recurring job.

## Default Contract
- Use the last 24 hours as the primary coverage window, anchored to run time.
- Output Chinese only.
- Write one paragraph per merged topic.
- Do not output raw links unless the user explicitly asks.
- Target 8-12 merged items on normal days. Allow 4-20 depending on actual activity.
- Include a header with run date and coverage window.
- Keep fewer items rather than padding with weak material.

## Workflow
1. Set the primary coverage window to the last 24 hours.
2. Collect tier-1 official machine-readable sources first. Prefer RSS/feed URLs from `references/sources.md`.
3. Collect tier-2 official page sources next. Use `browser` for JS-heavy pages and `web_fetch` for static pages.
4. Supplement with tier-3 authoritative media only when official coverage produces fewer than 4 merged topics, or when an official story needs corroboration and market context.
5. When a page-only official source is hard to scrape, use the official-domain search patterns from `references/sources.md` rather than drifting to generic search.
6. Record candidate items with `source`, `title`, `timestamp`, `url`, `source_type`, and a one-line raw note before summarizing.
7. Filter candidates using `references/quality-rules.md`. Do not auto-keep weak corporate marketing just because it came from an official domain.
8. Merge same-topic items before ranking. Prefer the official framing when an official source and media cover the same event.
9. Rank merged topics using the impact rubric from `references/quality-rules.md`.
10. Write the final brief using the output contract. State when the brief had to rely on media supplementation or a widened secondary check.

## Scarcity and Failure Policy
- If official sources yield fewer than 4 merged topics in 24 hours, supplement with authoritative media in the same 24-hour window.
- If fewer than 4 merged topics remain even after media supplementation, allow a secondary 72-hour official-only lookback for context, and label those items as `近72小时官方补充`.
- If two or more tier-1 official sources are unavailable, continue with the remaining official sources plus authoritative media, but do not fabricate missing coverage.
- If a source conflicts with an official statement, prefer the official statement for factual claims and use media only for market context.
- If coverage is thin, say so. Do not fill quota with weakly related items.

## Topic-Merge Rules
- Treat items as the same story when the entity, core action, and object match inside the coverage window.
- Merge cross-report variants such as `OpenAI desktop superapp`, `desktop app combining chat and coding`, and `OpenAI superapp plan` into one topic.
- Keep one canonical paragraph per topic.
- Combine sources as `来源：OpenAI / Bloomberg / WSJ`.
- When only media cover the story, prefer the clearest outlet framing and note multi-outlet confirmation when available.

## Writing Rules
- Start each paragraph with the event, not the source list.
- Give the new fact first, then the implication.
- Keep each paragraph to 1-3 sentences.
- Avoid title-plus-bullet formatting.
- Avoid raw URLs.
- Avoid filler like `值得关注` unless the implication is stated concretely.

## Output Skeleton
Use a header like:

```text
AI 大事日报 | 2026-03-20 10:30
统计窗口：2026-03-19 10:30 至 2026-03-20 10:30
说明：官方优先；官方更新偏少时才补充 Reuters / Bloomberg / WSJ / FT / The Verge / TechCrunch / The Information。
```

Then write one paragraph per merged topic. Keep the source list inside the paragraph tail, not as a separate bullet.

## Additional Resources
- **`references/sources.md`** - Exact source registry, tiers, fallback queries, and verification notes.
- **`references/quality-rules.md`** - Inclusion rules, merge rules, ranking rubric, scarcity policy, and output contract.
- **`scripts/check_sources.py`** - Fast source-health check for the machine-readable and page-only sources in this skill.
