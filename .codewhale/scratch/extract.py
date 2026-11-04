import re, html

raw = open('/tmp/ld_dom.html', encoding='utf-8').read()

# remove scripts/styles
raw = re.sub(r'<(script|style|noscript)[^>]*>.*?</\1>', ' ', raw, flags=re.S|re.I)

# mark block boundaries
raw = re.sub(r'<(br|/p|/div|/li|/h[1-6]|/section|/tr|/ul|/ol)[^>]*>', '\n', raw, flags=re.I)
raw = re.sub(r'<(li|h[1-6]|p|div|section)[^>]*>', '\n', raw, flags=re.I)

text = re.sub(r'<[^>]+>', ' ', raw)
text = html.unescape(text)
lines = [re.sub(r'\s+', ' ', l).strip() for l in text.split('\n')]
lines = [l for l in lines if l]

print("========== FULL VISIBLE TEXT (dedup order) ==========")
seen = set()
for l in lines:
    if l not in seen:
        seen.add(l)
        print(l)

print("\n\n========== ALL LINKS (href -> text) ==========")
for m in re.finditer(r'<a\b[^>]*href="([^"]*)"[^>]*>(.*?)</a>', raw, flags=re.S|re.I):
    href = m.group(1)
    txt = re.sub(r'<[^>]+>', ' ', m.group(2))
    txt = re.sub(r'\s+', ' ', html.unescape(txt)).strip()
    if href.startswith('#'):
        continue
    print(f"{href}  ->  {txt}")
