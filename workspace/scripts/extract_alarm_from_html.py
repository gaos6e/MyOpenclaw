import re
import sys
from pathlib import Path

p = Path(sys.argv[1])
html = p.read_text('utf-8', errors='ignore')

# Remove scripts/styles
html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.I)

# Replace tags with newlines
text = re.sub(r"<[^>]+>", "\n", html)
text = re.sub(r"[\r\t ]+", " ", text)
lines = [ln.strip() for ln in text.split("\n") if ln.strip()]

keys = ("预警", "信号", "解除", "生效", "发布")
hits = [ln for ln in lines if any(k in ln for k in keys)]

print(f"total_lines={len(lines)}")
print(f"hit_lines={len(hits)}")
for ln in hits[:80]:
    print(ln)
