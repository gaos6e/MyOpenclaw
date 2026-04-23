process.env.HTTPS_PROXY = '';
process.env.HTTP_PROXY = '';
process.env.ALL_PROXY = '';
const { chromium } = require('playwright');

const targets = [
  {name:'Reuters', url:'https://www.reuters.com/world/'},
  {name:'AP', url:'https://apnews.com/hub/world-news'},
  {name:'BBC', url:'https://www.bbc.com/news/world'},
  {name:'Guardian', url:'https://www.theguardian.com/world'},
  {name:'Al Jazeera', url:'https://www.aljazeera.com/news/'},
  {name:'CNN', url:'https://www.cnn.com/world'},
  {name:'NPR', url:'https://www.npr.org/sections/world/'},
  {name:'FT', url:'https://www.ft.com/world'},
  {name:'WSJ', url:'https://www.wsj.com/news/world'},
  {name:'Le Monde', url:'https://www.lemonde.fr/international/'},
  {name:'NHK', url:'https://www3.nhk.or.jp/nhkworld/en/news/'},
  {name:'Lianhe Zaobao', url:'https://www.zaobao.com/realtime/world'},
];

function clean(t) {
  return String(t || '').replace(/\s+/g, ' ').trim();
}

async function extract(page) {
  return await page.evaluate(() => {
    const bad = /subscribe|sign in|log in|cookie|privacy|newsletter|advert|menu|search|watch live|podcast|register|accept all|consent|account/i;
    const seen = new Set();
    const out = [];
    const selectors = ['main a', 'article a', 'h1 a', 'h2 a', 'h3 a', 'a[href]'];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(a => {
        const text = (a.innerText || a.textContent || '').replace(/\s+/g, ' ').trim();
        const href = a.href || '';
        if (!text || text.length < 22 || text.length > 180) return;
        if (bad.test(text)) return;
        if (!href.startsWith('http')) return;
        const key = text + '|' + href;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({ text, href });
      });
      if (out.length >= 15) break;
    }
    return out.slice(0, 15);
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const target of targets) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 2200 }, locale: 'en-US' });
    try {
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3500);
      const title = clean(await page.title().catch(() => ''));
      const items = await extract(page);
      console.log(`== ${target.name} ==`);
      console.log(title || target.url);
      for (const item of items.slice(0, 8)) {
        console.log(`- ${clean(item.text)} :: ${item.href}`);
      }
      console.log('');
    } catch (e) {
      console.log(`== ${target.name} ERROR ==`);
      console.log(String(e && e.message ? e.message : e));
      console.log('');
    } finally {
      await page.close().catch(() => {});
    }
  }
  await browser.close();
})();
