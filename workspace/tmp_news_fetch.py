import re, json, html
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

URLS = {
    'BBC': ('rss', 'https://feeds.bbci.co.uk/news/world/rss.xml'),
    'NPR': ('rss', 'https://feeds.npr.org/1001/rss.xml'),
    'Al Jazeera': ('rss', 'https://www.aljazeera.com/xml/rss/all.xml'),
    'Guardian': ('rss', 'https://www.theguardian.com/world/rss'),
    'NYT': ('rss', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml'),
    'CNN': ('rss', 'http://rss.cnn.com/rss/edition_world.rss'),
    'FT': ('rss', 'https://www.ft.com/world?format=rss'),
    'NHK': ('rss', 'https://www3.nhk.or.jp/rss/news/cat6.xml'),
    'AP': ('html', 'https://apnews.com/world-news'),
    'Reuters': ('html', 'https://www.reuters.com/world/'),
}

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
}

def fetch(url):
    req = Request(url, headers=headers)
    with urlopen(req, timeout=25) as r:
        return r.read().decode('utf-8', errors='replace')

def parse_rss(xml_text):
    items = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return items
    for item in root.findall('.//item')[:10]:
        title = item.findtext('title') or ''
        desc = item.findtext('description') or ''
        pub = item.findtext('pubDate') or ''
        link = item.findtext('link') or ''
        title = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', title))).strip()
        desc = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', desc))).strip()
        if title:
            items.append({'title': title, 'desc': desc, 'pubDate': pub, 'link': link})
    return items

def parse_ap(html_text):
    lines = [re.sub(r'\s+', ' ', x).strip() for x in re.findall(r'>\s*([^<>]{25,180})\s*<', html_text)]
    seen = []
    bad_exact = {'World News: Top & Breaking World News Today | AP News', 'Menu', 'SECTIONS', 'TOP STORIES', 'Newsletters', 'See All Newsletters', 'World'}
    bad_contains = ['The Morning Wire', 'The Afternoon Wire', 'Iran war', 'Russia-Ukraine war', 'Español', 'Asia Pacific', 'Latin America', 'Europe', 'Africa', 'Politics', 'Sports', 'Entertainment', 'Business', 'Science', 'Fact Check', 'Oddities', 'Lifestyle']
    for x in lines:
        if x in bad_exact:
            continue
        if any(b in x for b in bad_contains):
            continue
        if len(x.split()) < 5:
            continue
        if x not in seen:
            seen.append(x)
    return [{'title': x, 'desc': '', 'pubDate': '', 'link': ''} for x in seen[:15]]

def parse_reuters(html_text):
    candidates = []
    for pat in [r'>([^<>]{30,180})<', r'"headline":"([^"]{20,220})"', r'"title":"([^"]{20,220})"']:
        for x in re.findall(pat, html_text):
            x = html.unescape(x)
            x = re.sub(r'\\u003c.*?\\u003e', '', x)
            x = re.sub(r'\s+', ' ', x).strip()
            if len(x.split()) < 5:
                continue
            if any(bad in x.lower() for bad in ['recommended', 'sign in', 'skip to main content', 'browse world', 'watch live', 'exclusive offers']):
                continue
            if x not in candidates:
                candidates.append(x)
    filtered = []
    for x in candidates:
        if len(x) > 120 and any(t in x for t in ['function', 'window.', '{', '}', ';']):
            continue
        filtered.append(x)
    return [{'title': x, 'desc': '', 'pubDate': '', 'link': ''} for x in filtered[:20]]

out = {}
for name, (kind, url) in URLS.items():
    try:
        text = fetch(url)
        if name == 'AP':
            items = parse_ap(text)
        elif name == 'Reuters':
            items = parse_reuters(text)
        else:
            items = parse_rss(text)
        out[name] = {'url': url, 'count': len(items), 'items': items[:8]}
    except Exception as e:
        out[name] = {'url': url, 'error': f'{type(e).__name__}: {e}'}

print(json.dumps(out, ensure_ascii=False, indent=2))
