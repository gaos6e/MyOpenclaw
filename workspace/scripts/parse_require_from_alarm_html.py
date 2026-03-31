import re
from pathlib import Path
s = Path(r'C:\Users\20961\.openclaw\workspace\_tmp_huangpu_alarm.html').read_text('utf-8', errors='ignore')
# print relevant script tags
for m in re.finditer(r"<script[^>]*>", s, flags=re.I):
    start = m.start()
    snippet = s[start:start+300]
    if 'require' in snippet or 'data-' in snippet or 'main' in snippet:
        print(snippet.replace('\n',' '))

# find data-main
dm = re.findall(r"data-main=\"([^\"]+)\"", s, flags=re.I)
print('data-main:', dm)

# find require.config blocks
if 'require.config' in s:
    idx = s.index('require.config')
    print('require.config near:', s[idx:idx+500])
else:
    print('no require.config')
