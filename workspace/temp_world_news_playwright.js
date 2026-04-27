const { chromium } = require('playwright');
const fs = require('fs');

const sources = [
  {name:'Reuters', url:'https://www.reuters.com/world/'},
  {name:'AP', url:'https://apnews.com/hub/world-news'},
  {name:'BBC', url:'https://www.bbc.com/news/world'},
  {name:'NYT', url:'https://www.nytimes.com/section/world'},
  {name:'WSJ', url:'https://www.wsj.com/news/world'},
  {name:'FT', url:'https://www.ft.com/world'},
  {name:'Guardian', url:'https://www.theguardian.com/world'},
  {name:'Al Jazeera', url:'https://www.aljazeera.com/news/'},
  {name:'Bloomberg', url:'https://www.bloomberg.com/world'},
  {name:'NPR', url:'https://www.npr.org/sections/world/'},
  {name:'CNN', url:'https://www.cnn.com/world'},
  {name:'Economist', url:'https://www.economist.com/international'},
  {name:'Le Monde', url:'https://www.lemonde.fr/international/'},
  {name:'Der Spiegel', url:'https://www.spiegel.de/international/'},
  {name:'NHK', url:'https://www3.nhk.or.jp/nhkworld/en/news/'},
  {name:'联合早报', url:'https://www.zaobao.com.sg/realtime/world'},
];

(async() => {
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const results = [];
  for (const s of sources) {
    try {
      await page.goto(s.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(3000);
      const text = await page.evaluate(() => {
        const data = [];
        const seen = new Set();
        const els = [...document.querySelectorAll('a, h1, h2, h3, li')];
        for (const el of els) {
          const t = (el.innerText || el.textContent || '').replace(/\s+/g,' ').trim();
          const href = el.href || '';
          if (!t || t.length < 20) continue;
          if (/cookie|sign in|subscribe|advertisement|newsletter|privacy|terms/i.test(t)) continue;
          if (seen.has(t)) continue;
          seen.add(t);
          data.push({t, href});
          if (data.length >= 25) break;
        }
        return data;
      });
      results.push({source: s.name, url: s.url, items: text.slice(0,10)});
      console.error(`OK ${s.name}: ${text.slice(0,3).map(x=>x.t).join(' || ')}`);
    } catch (e) {
      results.push({source: s.name, url: s.url, error: String(e)});
      console.error(`ERR ${s.name}: ${e.message}`);
    }
  }
  await browser.close();
  fs.writeFileSync('C:/Users/20961/.openclaw/workspace/world_news_raw.json', JSON.stringify(results, null, 2), 'utf8');
  console.log(JSON.stringify(results, null, 2));
})();
