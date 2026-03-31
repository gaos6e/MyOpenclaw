import re
from pathlib import Path

p = Path(r'C:\Users\20961\.openclaw\workspace\_tmp_huangpu_alarm.html')
s = p.read_text('utf-8', errors='ignore')

print('len', len(s))
for k in ['weatherAlarm','alarm','warning','yj','signal','sign','data','json','api','ajax']:
    print(k, k in s)

urls = re.findall(r"https?://[^\s\"']+", s)
print('urls', len(urls))
for u in urls[:30]:
    print(u)

paths = re.findall(r"src=\"([^\"]+)\"", s)
print('srcs', len(paths))
for u in paths[:30]:
    print(u)
