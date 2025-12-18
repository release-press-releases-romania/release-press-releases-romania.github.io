#!/usr/bin/env python3
"""
Update cached feed JSON for GitHub Pages.

- Reads data/sites.json
- Fetches RSS for each site (tries /feed/ then fallback to ?feed=rss2)
- Optionally fetches Mastodon RSS if present
- Writes data/feeds/<slug>.json
"""
from __future__ import annotations

import json
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import requests
import feedparser

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SITES_JSON = os.path.join(ROOT, "data", "sites.json")
OUT_DIR = os.path.join(ROOT, "data", "feeds")

UA = "ReleasePressRomaniaBot/1.0 (+https://release-press-releases-romania.github.io/)"
TIMEOUT = 20

def strip_html(s: str) -> str:
    s = s or ""
    s = re.sub(r"<(script|style)\b.*?>.*?</\1>", " ", s, flags=re.S|re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def parse_date(entry: Dict[str, Any]) -> Optional[str]:
    # feedparser returns various date formats; try common fields
    for k in ("published", "updated"):
        if entry.get(k):
            return entry[k]
    return None

def to_iso(dt_str: Optional[str]) -> Optional[str]:
    if not dt_str:
        return None
    # feedparser doesn't always give parseable; keep as is
    return dt_str

def human_date(dt_str: Optional[str]) -> str:
    if not dt_str:
        return ""
    # best-effort, keep short
    try:
        # if RFC822 etc, feedparser stores parsed tuple in published_parsed
        return dt_str[:16].strip()
    except Exception:
        return dt_str

def fetch_feed(url: str) -> Optional[feedparser.FeedParserDict]:
    try:
        r = requests.get(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/xml;q=0.9, */*;q=0.8"}, timeout=TIMEOUT)
        if r.status_code >= 400:
            return None
        return feedparser.parse(r.content)
    except Exception:
        return None

def best_site_feed(site_url: str, primary: str) -> List[str]:
    # Try primary, then a couple fallbacks
    base = site_url.rstrip("/")
    return [
        primary,
        base + "/?feed=rss2",
        base + "/feed/rss/",
        base + "/feed/atom/",
    ]

def entry_to_item(e: Dict[str, Any], source: str) -> Dict[str, Any]:
    title = strip_html(e.get("title", "")).strip() or "Update"
    link = e.get("link") or ""
    summary = strip_html(e.get("summary") or e.get("description") or "")
    dt = None
    if e.get("published_parsed"):
        try:
            dt = datetime(*e["published_parsed"][:6], tzinfo=timezone.utc).isoformat()
        except Exception:
            dt = None
    if not dt and e.get("updated_parsed"):
        try:
            dt = datetime(*e["updated_parsed"][:6], tzinfo=timezone.utc).isoformat()
        except Exception:
            dt = None
    if not dt:
        dt = to_iso(parse_date(e))

    return {
        "title": title[:180],
        "link": link,
        "summary": summary[:800],
        "published": dt,
        "published_human": human_date(dt or ""),
        "source": source,
    }

def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)

    with open(SITES_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    sites = data.get("sites", [])
    now = datetime.now(timezone.utc).isoformat()

    ok = 0
    for s in sites:
        slug = s.get("slug")
        site_name = s.get("name")
        site_url = s.get("url")
        rss = s.get("rss")
        cat = s.get("category")
        mastodon = s.get("mastodon")
        mastodon_rss = s.get("mastodon_rss")

        items: List[Dict[str, Any]] = []
        social: List[Dict[str, Any]] = []

        # Site feed
        feed_obj = None
        for candidate in best_site_feed(site_url, rss):
            feed_obj = fetch_feed(candidate)
            if feed_obj and getattr(feed_obj, "entries", None):
                rss = candidate
                break

        if feed_obj and feed_obj.entries:
            for e in feed_obj.entries[:12]:
                items.append(entry_to_item(e, source=site_url))
        else:
            # keep empty; allow later reruns
            items = []

        # Mastodon feed (optional)
        if mastodon and mastodon_rss:
            md = fetch_feed(mastodon_rss)
            if md and md.entries:
                for e in md.entries[:12]:
                    social.append(entry_to_item(e, source="Mastodon"))

        payload = {
            "slug": slug,
            "site": {"name": site_name, "url": site_url, "category": cat, "rss": rss},
            "mastodon": {"url": mastodon, "rss": mastodon_rss} if mastodon else None,
            "updated_at": now,
            "status": "ok" if items or social else "empty",
            "items": items,
            "social": social,
        }

        out = os.path.join(OUT_DIR, f"{slug}.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        ok += 1
        # be polite
        time.sleep(0.15)

    print(f"Updated {ok} feeds at {now}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
