const { chromium } = require('playwright');

// Prefer official feeds / list pages (fetched via Playwright browser context).
// Note: some publishers are paywalled; RSS is used where it is the most stable public surface.
const SOURCES = [
  { name: 'Reuters', url: 'https://www.reutersagency.com/feed/?best-topics=world&post_type=best' },
  { name: 'AP', url: 'https://apnews.com/hub/world-news?output=rss' },
  { name: 'BBC', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'NYT', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
  { name: 'WSJ', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml' },
  { name: 'FT', url: 'https://www.ft.com/world?format=rss' },
  { name: 'Guardian', url: 'https://www.theguardian.com/world/rss' },
  // Al Jazeera “all” includes sports/entertainment — we will filter aggressively.
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { name: 'NPR', url: 'https://feeds.npr.org/1004/rss.xml' },
  { name: 'CNN', url: 'http://rss.cnn.com/rss/edition_world.rss' },
  { name: 'The Economist', url: 'https://www.economist.com/international/rss.xml' },
  { name: 'Le Monde', url: 'https://www.lemonde.fr/international/rss_full.xml' },
  { name: 'Der Spiegel', url: 'https://www.spiegel.de/international/index.rss' },
  { name: 'NHK', url: 'https://www3.nhk.or.jp/nhkworld/en/news/rss/' },
  { name: '联合早报', url: 'https://www.zaobao.com.sg/rss.xml' },
];

const DROP_RE = new RegExp(
  [
    'premier league', 'man city', 'warriors', 'nba', 'mlb', 'nfl', 'tennis', 'golf', 'f1',
    'curry', 'silva', 'champions league',
    'dating agency', 'suzuki met suzuki'
  ].join('|'),
  'i'
);

const OPINION_RE = /\b(opinion|column|comment|analysis)\b/i;

function topicTags(title = '') {
  const t = title.toLowerCase();
  const tags = [];
  if (/(iran|tehran|hormuz|strait of hormuz)/i.test(t)) tags.push('伊朗/霍尔木兹');
  if (/(israel|gaza|hamas|haifa|middle east)/i.test(t)) tags.push('以色列/加沙');
  if (/(ukraine|russia|moscow|kyiv|kiev|drone)/i.test(t)) tags.push('俄乌');
  if (/(pope|vatican)/i.test(t)) tags.push('梵蒂冈/教皇');
  if (/(eu\b|european union|brussels|eurozone|bank of england|boe|inflation|energy)/i.test(t)) tags.push('欧洲经济/能源');
  if (/\btrump\b/i.test(t)) tags.push('美国政治/特朗普');
  if (/(china|beijing|taiwan|hong kong)/i.test(t)) tags.push('中国相关');
  if (/(crypto|bitcoin)/i.test(t)) tags.push('加密/金融');
  if (/(employment|jobs|jobless)/i.test(t)) tags.push('美国就业');
  if (/\b(ai|artificial intelligence)\b/i.test(t)) tags.push('AI');
  if (tags.length === 0) tags.push('其他');
  return tags;
}

function decodeEntities(s = '') {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function pickTag(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(re);
  return m ? decodeEntities(m[1].trim()) : '';
}

function stripHtml(s = '') {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseRss(xml, limit = 10) {
  const items = [];
  const reItem = /<item\b[\s\S]*?<\/item>/gi;
  const blocks = xml.match(reItem) || [];
  for (const b of blocks.slice(0, limit)) {
    const title = pickTag(b, 'title');
    const link = pickTag(b, 'link') || pickTag(b, 'guid');
    const pubDate = pickTag(b, 'pubDate') || pickTag(b, 'published') || pickTag(b, 'dc:date');
    let desc = pickTag(b, 'description') || pickTag(b, 'content:encoded');
    desc = stripHtml(decodeEntities(desc));
    if (title) items.push({ title, link, pubDate, desc });
  }
  return items;
}

function normTokens(title) {
  const t = title
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\u4e00-\u9fff\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = t.split(' ').filter(Boolean);
  // drop very short tokens
  return tokens.filter(x => x.length >= 3 || /[\u4e00-\u9fff]/.test(x));
}

function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  const uni = sa.size + sb.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

function parseDate(s) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'Asia/Shanghai',
  });
  const page = await context.newPage();

  const all = [];
  for (const s of SOURCES) {
    try {
      const resp = await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      const xml = await resp.text();
      const items = parseRss(xml, 12);
      for (const it of items) {
        all.push({
          source: s.name,
          feedUrl: s.url,
          title: it.title,
          link: it.link,
          pubDate: it.pubDate,
          pubTs: (parseDate(it.pubDate) || new Date(0)).getTime(),
          desc: it.desc,
          tokens: normTokens(it.title),
        });
      }
    } catch (e) {
      all.push({ source: s.name, feedUrl: s.url, error: String(e && e.message ? e.message : e) });
    }
  }

  // filter out errors + obvious non-international / non-hard-news items
  const items = all
    .filter(x => x.title && x.tokens)
    .filter(x => !DROP_RE.test(x.title))
    // drop obvious opinion/columns (keep straight news)
    .filter(x => !OPINION_RE.test(x.title));

  items.sort((a, b) => b.pubTs - a.pubTs);

  // clustering
  const clusters = [];
  const TH = 0.35;
  for (const it of items) {
    let placed = false;
    for (const c of clusters) {
      const sim = jaccard(it.tokens, c.repr.tokens);
      if (sim >= TH) {
        c.items.push(it);
        c.sources.add(it.source);
        c.maxPubTs = Math.max(c.maxPubTs, it.pubTs);
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push({
        repr: it,
        items: [it],
        sources: new Set([it.source]),
        maxPubTs: it.pubTs,
      });
    }
  }

  const now = Date.now();
  for (const c of clusters) {
    const ageH = Math.max(0, (now - c.maxPubTs) / 3600000);
    const recency = Math.exp(-ageH / 18); // half-ish in ~12h
    c.score = c.sources.size * 10 + recency * 5 + Math.min(5, c.items.length);
  }

  clusters.sort((a, b) => b.score - a.score);

  const top = clusters.slice(0, 40).map(c => ({
    score: c.score,
    sources: Array.from(c.sources),
    title: c.repr.title,
    link: c.repr.link,
    pubDate: c.repr.pubDate,
    tags: topicTags(c.repr.title),
    // Keep some alt titles for context
    altTitles: c.items.slice(0, 4).map(x => `${x.source}: ${x.title}`),
  }));

  await browser.close();

  process.stdout.write(JSON.stringify({
    generatedAt: new Date().toISOString(),
    itemCount: items.length,
    clusterCount: clusters.length,
    errors: all.filter(x => x.error).map(x => ({ source: x.source, error: x.error, feedUrl: x.feedUrl })),
    top
  }, null, 2));
})().catch(e => {
  console.error(e);
  process.exit(1);
});
