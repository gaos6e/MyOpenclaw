const { chromium } = require('playwright');
const sources = [
  ['Reuters','https://www.reuters.com/world/'],
  ['AP','https://apnews.com/hub/world-news'],
  ['BBC','https://www.bbc.com/news/world'],
  ['NYT','https://www.nytimes.com/section/world'],
  ['FT','https://www.ft.com/world'],
  ['Guardian','https://www.theguardian.com/world'],
  ['Al Jazeera','https://www.aljazeera.com/news/'],
  ['NPR','https://www.npr.org/sections/world/'],
  ['CNN','https://www.cnn.com/world'],
  ['Economist','https://www.economist.com/international'],
  ['Le Monde','https://www.lemonde.fr/en/international/'],
  ['Der Spiegel','https://www.spiegel.de/international/'],
  ['NHK','https://www3.nhk.or.jp/nhkworld/en/news/'],
  ['联合早报','https://www.zaobao.com.sg/global']
];
function clean(t){return (t||'').replace(/\s+/g,' ').trim();}
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:2200}});
 const out=[];
 for (const [name,url] of sources){
   try{
     await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
     await page.waitForTimeout(3000);
     const data = await page.evaluate(() => {
       const anchors = Array.from(document.querySelectorAll('a')).map(a => ({
         text: (a.innerText || a.textContent || '').replace(/\s+/g,' ').trim(),
         href: a.href || ''
       }));
       return anchors;
     });
     const uniq=[];
     for (const x of data){
       const t=clean(x.text);
       if(!t || t.length<20) continue;
       if(/subscribe|sign in|log in|cookie|privacy|terms|newsletter|advertis|menu|edition|live updates|share/i.test(t)) continue;
       if(uniq.some(u=>u.t===t)) continue;
       uniq.push({t,h:x.href});
       if(uniq.length>=12) break;
     }
     out.push({name,url,items:uniq});
   }catch(e){
     out.push({name,url,error:String(e).slice(0,250)});
   }
 }
 console.log(JSON.stringify(out,null,2));
 await browser.close();
})();
