# AI Daily Brief Source Registry

## How To Use
- Start with **tier 1**. Those are the best machine-readable official sources.
- Move to **tier 2** only when tier 1 coverage is thin or a company does not expose a stable feed.
- Use **tier 3** only when official coverage is sparse or when a media outlet materially advances the story.
- Treat `kind=rss` or `kind=feed` as `web_fetch` targets first.
- Treat `kind=page` as `browser` or `web_fetch` targets, depending on how much JavaScript the page needs.
- Treat `kind=search` as an official-domain search template, not a direct page.
- Keep the `verified` date fresh. Re-run `scripts/check_sources.py` after changing any URL.

## Tier 1: Official Machine-Readable Sources

| Name | Kind | Primary URL | Fallback | Notes | Verified |
| --- | --- | --- | --- | --- | --- |
| OpenAI News RSS | rss | `https://openai.com/news/rss.xml` | `https://openai.com/blog/rss.xml` | Prefer `news/rss.xml`. `news` and `blog` currently expose the same feed. | 2026-03-20 |
| Google AI RSS | rss | `https://blog.google/technology/ai/rss` | `https://blog.google/innovation-and-ai/technology/ai/rss/` | Use the AI tag feed, not the deprecated `ai.googleblog.com` path. | 2026-03-20 |
| Google DeepMind RSS | rss | `https://deepmind.google/blog/rss.xml` | `https://deepmind.google/blog/` | Use the RSS feed first. Fall back to the news page if parsing fails. | 2026-03-20 |
| Microsoft AI Blog Feed | rss | `https://blogs.microsoft.com/blog/tag/ai/feed/` | `https://blogs.microsoft.com/blog/tag/ai/` | Keep product, platform, partnership, policy, and model news. Skip generic enterprise marketing. | 2026-03-20 |
| NVIDIA Deep Learning Feed | rss | `https://blogs.nvidia.com/blog/category/deep-learning/feed/` | `https://blogs.nvidia.com/blog/category/enterprise/deep-learning/` | Keep AI-model, infra, and developer-platform stories. Skip CES-style hardware roundups unless AI is central. | 2026-03-20 |
| AWS Machine Learning Feed | rss | `https://aws.amazon.com/blogs/machine-learning/feed/` | `https://aws.amazon.com/blogs/machine-learning/` | Useful for Bedrock, model releases, and enterprise AI platform updates. Apply strict filtering to avoid routine how-to posts. | 2026-03-20 |
| Hugging Face Blog Feed | rss | `https://huggingface.co/blog/feed.xml` | `https://huggingface.co/blog` | Mixed authorship. Keep Hugging Face-authored or clearly major ecosystem releases only. | 2026-03-20 |

## Tier 2: Official Page Sources

| Name | Kind | Primary URL | Fallback Query | Notes | Verified |
| --- | --- | --- | --- | --- | --- |
| Anthropic Newsroom | page | `https://www.anthropic.com/news` | `site:anthropic.com/news Claude model OR API OR policy` | No stable public RSS verified today. Page is usable and current. | 2026-03-20 |
| Meta AI Blog | page | `https://ai.meta.com/blog/` | `site:ai.meta.com/blog Llama OR Meta AI OR model` | Page is readable in browser-style fetches. Direct script checks may be blocked. No stable RSS verified today. | 2026-03-20 |
| Mistral AI News | page | `https://mistral.ai/news/` | `site:mistral.ai/news Mistral model OR API OR release` | Lightweight page. Good for product announcements. | 2026-03-20 |
| Cohere Blog | page | `https://cohere.com/blog` | `site:cohere.com/blog Cohere model OR release OR newsroom` | Page is more marketing-heavy. Keep only concrete model, platform, or policy announcements. | 2026-03-20 |
| Tongyi / Qwen Official Site | page | `https://tongyi.aliyun.com/` | `site:aliyun.com 通义千问 发布 OR 升级 OR 模型` | Strong product page for current model lineup. Use official-domain search for dated announcements. | 2026-03-20 |
| Tencent Hunyuan Official Site | page | `https://hunyuan.tencent.com/` | `site:tencent.com 混元 发布 OR 升级 OR 模型` | Landing page is minimal. Use the official-domain query for dated announcements and release pages. | 2026-03-20 |
| Baidu Wenxin Official Site | page | `https://yiyan.baidu.com/` | `site:baidu.com 文心 官方 发布 OR 升级 OR 模型` | Landing page is minimal. Use official-domain search for dated announcements. | 2026-03-20 |
| iFlytek Spark Official Site | page | `https://xinghuo.xfyun.cn/` | `site:xfyun.cn 星火 发布 OR 升级 OR 大模型` | Landing page is minimal. Use official-domain search for dated announcements and release notes. | 2026-03-20 |
| Volcengine Doubao Official Site | page | `https://www.volcengine.com/product/doubao` | `site:volcengine.com 豆包 发布 OR 升级 OR 大模型` | Browser may be required because the page is JavaScript-heavy. | 2026-03-20 |
| SenseTime Official Site | page | `https://www.sensetime.com/cn` | `site:sensetime.com 日日新 OR SenseNova 官方 发布` | Use the news center or official-domain search when the homepage is too broad. | 2026-03-20 |
| Huawei Pangu Official Domain | search | `site:huaweicloud.com 盘古大模型 发布 OR 升级 OR 模型` | `site:huaweicloud.com/en-us Pangu model release OR news` | No stable public news feed verified today. Treat official-domain search as the primary fallback. | 2026-03-20 |

## Tier 2 Optional Sources

| Name | Kind | Primary URL | Notes | Verified |
| --- | --- | --- | --- | --- |
| Stability AI Official Domain | search | `site:stability.ai Stability AI release OR model OR news` | `/news` returned 404 today. Do not treat as a primary source until a stable news page is verified. | 2026-03-20 |
| xAI Official Domain | search | `site:x.ai Grok OR xAI release OR model` | Anonymous fetch to `/news` was blocked today. Use only when browser access succeeds. | 2026-03-20 |

## Tier 3: Authoritative Media Supplement

| Name | Domain | Use Case |
| --- | --- | --- |
| Reuters | `reuters.com` | M&A, financing, policy, regulation, executive moves, exclusive reporting |
| Bloomberg | `bloomberg.com` | M&A, financing, enterprise AI, supply chain, exclusive reporting |
| WSJ | `wsj.com` | Corporate strategy, product direction, enterprise positioning |
| Financial Times | `ft.com` | Regulation, geopolitics, enterprise and capital context |
| The Verge | `theverge.com` | Consumer AI products, platform changes, ecosystem reactions |
| TechCrunch | `techcrunch.com` | Startups, funding, launches, developer platform updates |
| The Information | `theinformation.com` | High-signal enterprise and private-market reporting |

## Official-Domain Search Patterns
- OpenAI: `site:openai.com/news OpenAI model OR API OR policy`
- Anthropic: `site:anthropic.com/news Claude model OR API OR policy`
- Google AI / DeepMind: `site:blog.google AI Gemini OR AI Studio` and `site:deepmind.google/blog Gemini OR research OR safety`
- Microsoft: `site:blogs.microsoft.com/blog/tag/ai/ Copilot OR Azure AI OR Foundry`
- NVIDIA: `site:blogs.nvidia.com deep learning model OR AI platform`
- Tongyi / Qwen: `site:aliyun.com 通义千问 发布 OR 升级 OR 模型`
- Tencent Hunyuan: `site:tencent.com 混元 发布 OR 升级 OR 模型`
- Baidu Wenxin: `site:baidu.com 文心 官方 发布 OR 升级`
- Volcengine Doubao: `site:volcengine.com 豆包 发布 OR 升级`
- Huawei Pangu: `site:huaweicloud.com 盘古大模型 发布 OR 升级`
- iFlytek Spark: `site:xfyun.cn 星火 发布 OR 升级`
- SenseTime: `site:sensetime.com 日日新 发布 OR 升级`

## Maintenance Notes
- Keep source URLs exact. Do not replace them with brand names inside the workflow.
- Prefer stable feeds over homepages.
- When a source is JS-heavy or blocked, fall back to an official-domain search instead of a generic media search.
- Re-check blocked or unstable sources weekly if they are strategically important.
