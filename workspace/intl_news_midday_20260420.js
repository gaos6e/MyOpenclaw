const { chromium } = require('playwright');

const sources = [
  {
    name: 'Reuters',
    url: 'https://www.reuters.com/world/',
    extract: () => Array.from(document.querySelectorAll('a[data-testid="Heading"], a[data-testid="HeadingLink"]')).map(a => ({title:(a.textContent||'').trim(), url:a.href})).filter(x => x.title).slice(0,10)
  },
  {
    name: 'AP',
    url: 'https://apnews.com/world-news',
    extract: () => Array.from(document.querySelectorAll('a[data-key="card-headline"], .PagePromo-title a, .PagePromo-content a, .Component-headline-0-2-187 a')).map(a => ({title:(a.textContent||'').trim(), url:a.href})).filter(x => x.title).slice(0,10)
  },
  {
    name: 'BBC',
    url: 'https://www.bbc.com/news/world',
    extract: () => Array.from(document.querySelectorAll('main a')).map(a => ({title:(a.textContent||'').trim(), url:a.href})).filter(x => x.title && x.title.length > 25 && /^https?:/.test(x.url)).slice(0,12)
  },
  {
    name: 'Guardian',
    url: 'https://www.theguardian.com/world',
    extract: () => Array.from(document.querySelectorAll('a[data-link-name="article"], a.u-faux-block-link__overlay')).map(a => ({title:(a.textContent||'').trim(), url:a.href})).filter(x => x.title).slice(0,12)
  },
  {
    name: 'Al Jazeera',
    url: 'https://www.aljazeera.com/news/',
    extract: () => Array.from(document.querySelectorAll('a.u-clickable-card__link, a.article-card__title-link, a.gc__title__link, h3 a')).map(a => ({title:(a.textContent||'').trim(), url:a.href})).filter(x => x.title).slice(0,12)
  },
  {
    name: 'CNN',
    url: 'https://edition.cnn.com/world',
    extract: () => Array.from(document.querySelectorAll('a.container__link, a.card-container__link, a[href*="/2026/"]')).map(a => ({title:(a.textContent||'').trim(), url:a.href})).filter(x => x.title && x.title.length > 20).slice(0,12)
  },
  {
    name: 'NPR',
    url: 'https://www.npr.org/sections/world/',
    extract: () => Array.from(document.querySelectorAll('article a, h2 a')).map(a => ({title:(a.textContent||'').trim(), url:a.href})).filter(x => x.title && x.title.length > 20).slice(0,12)
  },
  {
    name: 'NHK',
    url: 'https://www3.nhk.or.jp/nhkworld/en/news/',
    extract: () => Array.from(document.querySelectorAll('a')).map(a => ({title:(a.textContent||'').trim(), url:a.href})).filter(x => x.title && x.title.length > 25 && /^https?:/.test(x.url)).slice(0,12)
  },
  {
    name: '联合早报',
    url: 'https://www.zaobao.com/realtime/world',
    extract: () => Array.from(document.querySelectorAll('a')).map(a => ({title:(a.textContent||'').trim(), url:a.href})).filter(x => x.title && x.title.length > 12 && /^https?:/.test(x.url)).slice(0,12)
  }
];

(async() => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 2000 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' });
  const page = await context.newPage();
  const results = [];
  for (const src of sources) {
    try {
      await page.goto(src.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(5000);
      const items = await page.evaluate(src.extract);
      results.push({ source: src.name, url: src.url, items });
    } catch (e) {
      results.push({ source: src.name, url: src.url, error: String(e) });
    }
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
