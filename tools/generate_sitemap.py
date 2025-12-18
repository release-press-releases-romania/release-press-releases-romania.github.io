#!/usr/bin/env python3
"""
Generate sitemap.xml and robots.txt for GitHub Pages.
"""
from __future__ import annotations
import json
import os
from datetime import datetime, timezone
from xml.sax.saxutils import escape

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SITES_JSON = os.path.join(ROOT, "data", "sites.json")

BASE_URL = "https://release-press-releases-romania.github.io".rstrip("/")

def main() -> int:
    with open(SITES_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    sites = data.get("sites", [])

    # Get unique categories
    categories = set()
    for s in sites:
        cat = s.get("category", "Diverse")
        categories.add(cat)
    
    urls = [
        f"{BASE_URL}/",
        f"{BASE_URL}/publishers/",
        f"{BASE_URL}/en/",
        f"{BASE_URL}/en/publishers/",
    ]
    
    # Add category pages
    for cat in categories:
        cat_slug_ro = cat.lower().replace(" ", "-").replace("&", "").replace("ș", "s").replace("ț", "t").replace("ă", "a").replace("â", "a").replace("î", "i")
        cat_slug_en = cat.lower().replace(" ", "-").replace("&", "")
        urls.append(f"{BASE_URL}/categorie/{cat_slug_ro}/")
        urls.append(f"{BASE_URL}/en/category/{cat_slug_en}/")
    
    # Add publisher pages
    for s in sites:
        urls.append(f"{BASE_URL}/publisher/{s['slug']}/")
        urls.append(f"{BASE_URL}/en/publisher/{s['slug']}/")

    now = datetime.now(timezone.utc).date().isoformat()

    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sitemap.append("  <url>")
        sitemap.append(f"    <loc>{escape(u)}</loc>")
        sitemap.append(f"    <lastmod>{now}</lastmod>")
        sitemap.append("  </url>")
    sitemap.append("</urlset>")
    sitemap_xml = "\n".join(sitemap) + "\n"

    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(sitemap_xml)

    robots = f"User-agent: *\nAllow: /\nSitemap: {BASE_URL}/sitemap.xml\n"
    with open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(robots)

    print(f"Generated sitemap.xml with {len(urls)} URLs")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
