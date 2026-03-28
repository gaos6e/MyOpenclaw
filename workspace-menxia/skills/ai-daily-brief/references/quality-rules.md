# AI Daily Brief Editorial Rules

## Inclusion Rules
- Keep items that materially change the AI landscape in one of these buckets: model release, product or API update, pricing or availability change, major partnership, financing or M&A, regulation or policy, safety or governance, benchmark or research breakthrough, or a high-signal open-source release.
- Keep official-source items only when the title, summary, or page section is clearly about AI models, AI products, AI policy, AI research, AI infrastructure, or AI developer tooling.
- Exclude generic hiring posts, unrelated CSR material, broad cloud marketing, conference promotion without a concrete AI announcement, and generic thought leadership.
- Keep media items only when they contain both a topic signal and an entity signal, unless a single top-tier outlet has a clearly high-impact exclusive.
- Treat China official sources the same way: keep official releases, upgrades, product launches, pricing changes, platform changes, policy statements, and benchmark claims; skip generic brand marketing.

## Topic Signals
- AI
- 人工智能
- 大模型
- foundation model
- LLM
- reasoning
- 推理
- training
- 训练
- inference
- 算力
- model release
- 模型发布
- API
- agent
- multimodal
- 多模态
- chip
- AI 芯片
- safety
- 安全
- governance
- policy
- 监管
- benchmark
- open source
- 开源

## Entity Signals
- OpenAI
- Anthropic
- Claude
- DeepMind
- Gemini
- Google AI
- Microsoft
- Azure AI
- NVIDIA
- Meta
- Llama
- AWS
- Bedrock
- Hugging Face
- Mistral
- Cohere
- xAI
- Grok
- 文心
- 通义
- 千问
- 混元
- 豆包
- 火山
- 盘古
- 星火
- 讯飞
- 商汤
- 日日新

## Impact Ranking
- Priority 1: new frontier or major open-weight models, API or platform changes with broad downstream impact, major financing or acquisition, regulation, security incidents, official policy shifts.
- Priority 2: notable research releases, benchmark results, enterprise product launches, infrastructure updates, and important partner announcements.
- Priority 3: ecosystem commentary, case studies, and lower-impact developer updates.
- Rank official confirmation above media speculation when both exist.
- Rank multi-outlet confirmation above single-outlet media coverage when the events are otherwise similar.

## Merge Rules
- Merge items when the company, core action, and object match in the coverage window.
- Normalize recurring patterns such as:
  - `OpenAI plans desktop superapp`
  - `OpenAI desktop app combining chat and coding`
  - `OpenAI desktop app with browsing`
- Use one canonical paragraph per story.
- Prefer the official headline or framing when an official source confirms the same event.
- Combine corroborating media sources at the end of the paragraph as `来源：OpenAI / Bloomberg / WSJ`.
- Do not emit near-duplicates that differ only by outlet wording, headline style, or minor background detail.

## Scarcity Policy
- Keep the main brief on a strict 24-hour window.
- If official coverage produces fewer than 4 merged topics, supplement with tier-3 media in the same 24-hour window.
- If the combined 24-hour set still has fewer than 4 merged topics, allow a 72-hour official-only lookback and clearly label those items as `近72小时官方补充`.
- Never pad the brief to hit a target count.
- If coverage is thin, say so in the header note.

## Conflict Policy
- Prefer official sources for release details, product names, pricing, policy language, and timing.
- Use media sources for market context, capital moves, executive intent, and cross-company comparison.
- If two outlets disagree and no official confirmation exists, either keep the most conservative framing or drop the item.

## Output Contract
- Header line 1: `AI 大事日报 | <run time>`
- Header line 2: `统计窗口：<start> 至 <end>`
- Optional header line 3: one short note about media supplementation or 72-hour official补充.
- Body: one paragraph per merged topic.
- Structure per paragraph:
  - Sentence 1: what happened.
  - Sentence 2: why it matters.
  - Sentence 3: only when needed for context or source attribution.
- End each paragraph with a short source tail such as `来源：OpenAI / Bloomberg`.
- Do not output raw links unless the user explicitly asks for them.
- Do not use title-plus-bullet format.

## Writing Tone
- Keep paragraphs compact, factual, and specific.
- State implications concretely.
- Avoid vague transitions and hype language.
- Prefer direct verbs like `发布`, `上线`, `收购`, `披露`, `宣布`, `升级`, `开放`.

## Quality Checks Before Sending
- Check that each paragraph is about a distinct story.
- Check that each story is inside the declared window, unless it is explicitly labeled as a 72-hour official supplement.
- Check that the source tail matches the merged evidence.
- Check that media-only items are still strongly AI-related after filtering.
- Check that the brief stays readable even if it contains only 4-6 items.
