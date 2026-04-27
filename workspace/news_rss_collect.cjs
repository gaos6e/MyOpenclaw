const feeds = [
  ['Reuters','https://www.reutersagency.com/feed/?best-regions=world&post_type=best'],
  ['BBC','https://feeds.bbci.co.uk/news/world/rss.xml'],
  ['NYT','https://rss.nytimes.com/services/xml/rss/nyt/World.xml'],
  ['FT','https://www.ft.com/world?format=rss'],
  ['Guardian','https://www.theguardian.com/world/rss'],
  ['Al Jazeera','https://www.aljazeera.com/xml/rss/all.xml'],
  ['NPR','https://feeds.npr.org/1001/rss.xml'],
  ['CNN','https://rss.cnn.com/rss/cnn_world.rss'],
  ['Economist','https://www.economist.com/international/rss.xml'],
  ['Le Monde','https://www.lemonde.fr/international/rss_full.xml'],
  ['Der Spiegel','https://www.spiegel.de/international/index.rss'],
  ['NHK','https://www3.nhk.or.jp/nhkworld/en/news/tags/international/rss/'],
  ['联合早报','https://www.zaobao.com.sg/rss/zaobao_recommended.xml']
];
function strip(s){return s.replace(/<!\[CDATA\[(.*?)\]\]>/gs,'$1').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'\"').replace(/\s+/g,' ').trim();}
function extract(xml){
  const items=[];
  const re=/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/g;
  const ms=xml.match(re)||[];
  for(const m of ms.slice(0,10)){
    let title=''; let desc=''; let link='';
    const t=m.match(/<title[^>]*>([\s\S]*?)<\/title>/i); if(t) title=strip(t[1]);
    const d=m.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || m.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || m.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i); if(d) desc=strip(d[1]);
    const l=m.match(/<link[^>]*>([\s\S]*?)<\/link>/i); if(l) link=strip(l[1]);
    if(!link){ const lh=m.match(/href=['\"]([^'\"]+)['\"]/i); if(lh) link=lh[1]; }
    items.push({title,desc,link});
  }
  return items;
}
(async()=>{
  const results=[];
  for(const [name,url] of feeds){
    try{
      const res = await fetch(url,{headers:{'user-agent':'Mozilla/5.0'}});
      const xml = await res.text();
      const items=extract(xml).filter(x=>x.title);
      results.push({name,url,items:items.slice(0,8)});
    }catch(e){
      results.push({name,url,error:String(e)});
    }
  }
  console.log(JSON.stringify(results,null,2));
})();
