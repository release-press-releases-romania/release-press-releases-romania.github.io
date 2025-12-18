#!/usr/bin/env python3
"""
Optional: re-render publisher pages if sites.json changes.
In this repo, pages are already pre-rendered in the zip, but you can keep this
for future automation.
"""
from __future__ import annotations
import json, os, re
from datetime import datetime, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SITES_JSON = os.path.join(ROOT, "data", "sites.json")
BASE_URL = json.load(open(SITES_JSON, "r", encoding="utf-8")).get("base_url","").rstrip("/")

def safe(s:str)->str:
    return (s or "").replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;")

def write(path:str, content:str):
    full=os.path.join(ROOT, path.lstrip("/"))
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)

def page(site:dict)->str:
    title = f"{site.get('name')} — ultimele articole (RSS) | Release Press Romania"
    desc = f"Pagina publisher pentru {site.get('url')}: articole recente din RSS (WordPress)." + (" Include și update-uri din Mastodon." if site.get("mastodon") else "")
    canonical = f"{BASE_URL}/publisher/{site['slug']}/"
    return f"""<!doctype html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{safe(title)}</title>
  <meta name="description" content="{safe(desc)}">
  <link rel="canonical" href="{safe(canonical)}">
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body data-slug="{safe(site['slug'])}" data-site-url="{safe(site['url'])}" data-rss="{safe(site['rss'])}" data-mastodon="{safe(site.get('mastodon') or '')}" data-mastodon-rss="{safe(site.get('mastodon_rss') or '')}">
  <!-- Pages are prebuilt in this zip. Keep render_pages.py if you later want regeneration in Actions. -->
  <script>location.href="/publisher/{safe(site['slug'])}/";</script>
</body>
</html>
"""
def main():
    data=json.load(open(SITES_JSON,"r",encoding="utf-8"))
    for s in data.get("sites",[]):
        write(f"publisher/{s['slug']}/index.html", page(s))
    print("Re-rendered publisher pages.")
if __name__=="__main__":
    main()
