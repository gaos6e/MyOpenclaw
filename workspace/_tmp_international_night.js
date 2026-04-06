// International news nightly brief - scrape homepage headlines via Playwright (Chromium)
// Output: JSON lines to stdout

const { chromium } = require('playwright');

const sources = [
  { name: 'BBC', url: 'https://www.bbc.com/news/world', selectors: ['a[data-testid="internal-link"]'] },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/', selectors: ['a.u-clickable-card__link', 'a[href^="/news/"]'] },
  { name: 'The Guardian', url: 'https://www.theguardian.com/world', selectors: ['a[data-link-name="article"]', 'a.js-headline-text'] },
  { name: 'NPR', url: 'https://www.npr.org/sections/world/', selectors: ['a.title', 'h2 a'] },
  { name: 'NYT', url: 'https://www.nytimes.com/section/world', selectors: ['a[href^="/" ] h3', 'section a'] },
  { name: 'FT', url: 'https://www.ft.com/world', selectors: ['a.js-teaser-heading-link', 'a.o-teaser__heading'] },
  { name: 'Le Monde', url: 'https://www.lemonde.fr/international/', selectors: ['a.article__title-link', 'section a'] },
  { name: 'Der Spiegel', url: 'https://www.spiegel.de/international/', selectors: ['a[href*="/international/"]'] },
  { name: 'NHK', url: 'https://www3.nhk.or.jp/nhkworld/en/news/', selectors: ['a.p-article__link', 'a'] },
  { name: '联合早报', url: 'https://www.zaobao.com.sg/realtime/world', selectors: ['a[href*="/realtime/"]', 'a'] },
  // Bloomberg/WSJ/Reuters/AP often block; attempt best-effort homepages
  { name: 'CNN', url: 'https://edition.cnn.com/world', selectors: ['h3 a', 'a[data-link-type="article"]'] },
  { name: 'Economist', url: 'https://www.economist.com/international', selectors: ['a[data-analytics="link"]', 'h3 a'] },
];

function cleanText(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function normTitle(s) {
  return cleanText(s)
    .replace(/[“”"']/g, '')
    .replace(/\s*\|\s*.*$/,'')
    .toLowerCase();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
  });

  const items = [];

  for (const src of sources) {
    const page = await context.newPage();
    page.setDefaultTimeout(25000);
    try {
      await page.goto(src.url, { waitUntil: 'domcontentloaded' });
      // allow hydration
      await page.waitForTimeout(1500);

      const extracted = await page.evaluate((selectors) => {
        const results = [];
        const seen = new Set();

        function pushItem(a, title) {
          if (!a) return;
          const href = a.href || a.getAttribute('href') || '';
          if (!href) return;
          const t = (title || a.textContent || '').replace(/\s+/g, ' ').trim();
          if (t.length < 20) return;
          const key = href + '|' + t;
          if (seen.has(key)) return;
          seen.add(key);
          results.push({ title: t, url: href });
        }

        for (const sel of selectors) {
          const nodes = Array.from(document.querySelectorAll(sel));
          for (const n of nodes) {
            if (n.tagName && n.tagName.toLowerCase() === 'a') {
              pushItem(n);
            } else {
              // if selector hits h3 etc, try closest link
              const a = n.closest('a') || n.querySelector('a');
              pushItem(a, n.textContent);
            }
          }
        }

        // fallback: all links in main
        const main = document.querySelector('main') || document.body;
        const links = Array.from(main.querySelectorAll('a'));
        for (const a of links.slice(0, 200)) {
          pushItem(a);
        }
        return results;
      }, src.selectors);

      extracted.slice(0, 50).forEach((x, idx) => {
        items.push({
          source: src.name,
          title: cleanText(x.title),
          url: x.url,
          order: idx,
          fetchedFrom: src.url,
        });
      });

    } catch (e) {
      console.error(JSON.stringify({ level: 'warn', source: src.name, url: src.url, error: String(e) }));
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();

  // de-dup by normalized title across sources
  const seenTitle = new Map();
  const deduped = [];
  for (const it of items) {
    const nt = normTitle(it.title);
    if (nt.length < 25) continue;
    if (!seenTitle.has(nt)) {
      seenTitle.set(nt, { ...it, count: 1, sources: new Set([it.source]) });
      deduped.push(seenTitle.get(nt));
    } else {
      const agg = seenTitle.get(nt);
      agg.count += 1;
      agg.sources.add(it.source);
    }
  }

  // ranking: higher cross-source count first, then earlier order
  deduped.sort((a,b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.order !== b.order) return a.order - b.order;
    return a.source.localeCompare(b.source);
  });

  // emit top 30 candidates
  const out = deduped.slice(0, 30).map(x => ({
    title: x.title,
    url: x.url,
    sources: Array.from(x.sources),
    count: x.count,
  }));
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), items: out }, null, 2));
})();
