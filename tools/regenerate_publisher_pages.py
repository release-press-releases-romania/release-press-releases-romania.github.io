#!/usr/bin/env python3
"""
Regenerate all publisher pages with English text.
This script reads sites.json and regenerates all publisher HTML pages with English content.
"""

import json
import os
from pathlib import Path
from html import escape
import random

ROOT = Path(__file__).parent.parent
SITES_JSON = ROOT / "data" / "sites.json"
BASE_URL = "https://release-press-releases-romania.github.io"

# Category name mapping (for display)
CATEGORY_NAMES = {
    "PR & Marketing": "PR & Marketing",
    "Health": "Health",
    "News & Society": "News & Society",
    "Technology & Energy": "Technology & Energy",
    "Business": "Business",
    "Tourism & Delta": "Tourism & Delta",
    "Construction & Home": "Construction & Home",
    "Miscellaneous": "Miscellaneous"
}

# Category slug mapping
CATEGORY_SLUGS = {
    "PR & Marketing": "pr-marketing",
    "Health": "health",
    "News & Society": "news-society",
    "Technology & Energy": "technology-energy",
    "Business": "business",
    "Tourism & Delta": "tourism-delta",
    "Construction & Home": "construction-home",
    "Miscellaneous": "miscellaneous"
}

def get_related_publishers(sites, current_site, category, limit=6):
    """Get related publishers from the same category."""
    related = [s for s in sites if s.get('category') == category and s.get('slug') != current_site.get('slug')]
    random.shuffle(related)
    return related[:limit]

def generate_publisher_page(site, all_sites):
    """Generate HTML page for a publisher."""
    slug = site['slug']
    name = site.get('name', slug)
    url = site.get('url', '')
    rss = site.get('rss', '')
    mastodon = site.get('mastodon') or ''
    mastodon_rss = site.get('mastodon_rss') or ''
    category = site.get('category', 'Miscellaneous')
    category_slug = CATEGORY_SLUGS.get(category, category.lower().replace(' ', '-'))
    
    # Use English descriptions
    description_long = site.get('description_long_en', site.get('description_long', ''))
    description_short = site.get('description_short_en', site.get('description_short', ''))
    description_small = site.get('description_small_en', site.get('description_small', ''))
    
    # Keywords (should be in English now)
    keywords_list = site.get('keywords', [])
    keywords_str = ', '.join(keywords_list[:10]) if keywords_list else ''
    
    # Generate title and meta description
    title = f"{name} — Release Press Releases | {category} | Release Press Releases in Romania"
    meta_description = description_short or description_small or f"{name} - press releases from {category.lower()} category."
    
    # Get related publishers
    related = get_related_publishers(all_sites, site, category)
    
    # Build related publishers HTML with better internal linking
    related_html = ''
    if related:
        related_items = []
        for rel_site in related[:6]:  # Show more related publishers
            rel_name = rel_site.get('name', rel_site.get('slug', ''))
            rel_slug = rel_site.get('slug', '')
            rel_desc = rel_site.get('description_short_en', rel_site.get('description_short', rel_site.get('description_small_en', rel_site.get('description_small', ''))))
            related_items.append(f'''
        <a class="site" href="/publisher/{rel_slug}/" style="display: block; padding: 16px; border: 1px solid var(--border); border-radius: 8px; text-decoration: none; transition: all 0.2s;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <p style="margin: 0 0 8px 0; font-weight: 600; color: var(--text);">{escape(rel_name)}</p>
              <p style="margin: 0; font-size: 14px; color: var(--muted); line-height: 1.5;">{escape(rel_desc[:120] + '...' if len(rel_desc) > 120 else rel_desc)}</p>
            </div>
          </div>
        </a>''')
        
        related_html = f'''
  <section class="card" style="margin-top:20px">
    <div class="card-head">
      <h2>Other Press Release Publishers from {escape(CATEGORY_NAMES.get(category, category))}</h2>
      <small><a href="/category/{category_slug}/" style="color: var(--accent);">View all {len(related)} publishers in this category →</a></small>
    </div>
    <div class="card-body">
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
        {''.join(related_items[:6])}
      </div>
      <div style="margin-top: 20px; text-align: center;">
        <a href="/category/{category_slug}/" class="btn" style="padding: 10px 20px;">View all {escape(CATEGORY_NAMES.get(category, category))} publishers</a>
        <a href="/publishers/" class="btn" style="padding: 10px 20px; margin-left: 12px;">Browse all publishers</a>
      </div>
    </div>
  </section>'''
    
    # Build HTML
    html = f'''<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(meta_description)}">
  <meta name="keywords" content="{escape(keywords_str)}">
  <link rel="canonical" href="{BASE_URL}/publisher/{slug}/">
  <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{escape(name)} — Release Press Releases">
  <meta property="og:description" content="{escape(meta_description)}">
  <meta property="og:url" content="{BASE_URL}/publisher/{slug}/">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#6d5efc">
  <link rel="stylesheet" href="/assets/styles.css">
  <script type="application/ld+json">{{
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "{escape(name)} — Release Press Releases",
    "url": "{BASE_URL}/publisher/{slug}/",
    "description": "{escape(meta_description)}",
    "inLanguage": "en",
    "isPartOf": {{
      "@type": "WebSite",
      "name": "Release Press Releases in Romania",
      "url": "{BASE_URL}"
    }},
    "about": {{
      "@type": "Organization",
      "name": "{escape(name)}",
      "url": "{escape(url)}"
    }},
    "keywords": "{escape(keywords_str)}",
    "breadcrumb": {{
      "@type": "BreadcrumbList",
      "itemListElement": [
        {{"@type": "ListItem", "position": 1, "name": "Home", "item": "{BASE_URL}/"}},
        {{"@type": "ListItem", "position": 2, "name": "Publishers", "item": "{BASE_URL}/publishers/"}},
        {{"@type": "ListItem", "position": 3, "name": "{escape(name)}", "item": "{BASE_URL}/publisher/{slug}/"}}
      ]
    }}
  }}</script>
</head>

<body class="publisher" style="--accent-h:196; --accent2-h:154;" data-slug="{slug}" data-site-url="{escape(url)}" data-rss="{escape(rss)}" data-mastodon="{escape(mastodon or '')}" data-mastodon-rss="{escape(mastodon_rss or '')}">
<div class="nav">
  <div class="nav-inner">
    <a class="brand" href="/" aria-label="Release Press Releases in Romania homepage">
      <img src="/assets/images/logo.svg" alt="Release Press Releases in Romania" width="36" height="36" class="brand-logo" loading="eager">
      <span>Release Press Releases in Romania</span>
    </a>
    <div class="nav-links">
      <a href="/publishers/">Publishers</a>
      <a href="/category/">Categories</a>
      <a href="/feed.xml">RSS Feed</a>
      <a href="/sitemap.xml">Sitemap</a>
      <a href="https://social.5th.ro/" target="_blank" rel="noopener nofollow">Mastodon</a>
    </div>
  </div>
</div>

  <div class="container">
  <div class="breadcrumb">
    <a href="/">Home</a> <span>›</span> <a href="/publishers/">Publishers</a> <span>›</span> <a href="/category/{category_slug}/">{escape(CATEGORY_NAMES.get(category, category))}</a> <span>›</span> <span>{escape(name)}</span>
  </div>

  <div class="hero" style="padding:28px 24px">
    <h1 class="h-title" style="font-size:clamp(24px,3.5vw,36px); margin-bottom:12px">{escape(name)}</h1>
    <p class="h-sub" style="max-width:90ch; font-size:17px; line-height:1.8; margin-bottom:20px">
      {escape(description_long or description_short or description_small or f"{name} provides press releases and news from the {category.lower()} category. Access the latest press releases, news updates, and media content through our RSS feed integration and online platform.")}
    </p>
    <div class="pills" style="margin-top:16px">
      <span class="pill"><i></i>{escape(CATEGORY_NAMES.get(category, category))}</span>
      {''.join([f'<span class="pill green"><i></i>{escape(kw)}</span>' for kw in keywords_list[:4]]) if keywords_list else ''}
    </div>
  </div>
  
  <section class="card" style="margin-top:20px">
    <div class="card-head">
      <h2>About {escape(name)}</h2>
      <small><a href="/category/{category_slug}/" style="color: var(--accent);">View category {escape(CATEGORY_NAMES.get(category, category))}</a></small>
    </div>
    <div class="card-body">
      <p style="line-height:1.85; color: rgba(17,20,37,.85); margin:0; font-size:16px;">
        {escape(description_long or description_short or description_small or f"{name} is a platform providing press releases and news from the {category.lower()} category in Romania. The platform offers comprehensive coverage of industry developments, news updates, and press releases relevant to this sector. Access the latest content through RSS feeds, browse articles by topic, and stay informed about developments in this field.")}
      </p>
      <div style="margin-top:20px; padding-top:20px; border-top:1px solid var(--border);">
        <p style="margin:0 0 12px 0; font-size:15px; color: var(--muted);">
          <strong>Website:</strong> <a href="{escape(url)}" target="_blank" rel="noopener" style="color: var(--accent); text-decoration: underline;">{escape(url.replace('https://', '').replace('http://', '').rstrip('/'))}</a> | 
          <strong>Category:</strong> <a href="/category/{category_slug}/" style="color: var(--accent); text-decoration: underline;">{escape(CATEGORY_NAMES.get(category, category))}</a> | 
          <strong>RSS Feed:</strong> <a href="{escape(rss)}" target="_blank" rel="nofollow noopener" style="color: var(--accent); text-decoration: underline;">Subscribe</a>
        </p>
        <p style="margin:0; font-size:14px; color: var(--muted); line-height:1.6;">
          Explore more publishers in the <a href="/category/{category_slug}/" style="color: var(--accent); text-decoration: underline;">{escape(CATEGORY_NAMES.get(category, category))} category</a>, browse our <a href="/publishers/" style="color: var(--accent); text-decoration: underline;">complete publisher directory</a>, or return to the <a href="/" style="color: var(--accent); text-decoration: underline;">homepage</a> to discover more press release sources from Romania.
        </p>
      </div>
    </div>
  </section>
{related_html}
  <p class="page-sub" style="margin-top:12px">
    <a id="siteLink" href="{escape(url)}" target="_blank" rel="noopener">{escape(url.replace('https://', '').replace('http://', '').rstrip('/'))}</a>
    <span style="opacity:.65">·</span>
    <span id="updatedAt">Last update: pending</span>
  </p>

  <div id="status" style="margin-top:10px"></div>

  <div class="columns">
    <section class="card">
      <div class="card-head">
        <h2>Recent Press Releases (RSS)</h2>
        <small><a id="rssLink" href="{escape(rss)}" target="_blank" rel="nofollow noopener">{escape(rss)}</a></small>
      </div>
      <div class="card-body">
        <div class="notice">
          For complete details about press releases, open the article directly on the site.
        </div>
        <div id="siteFeed">
          <div class="notice">Loading press releases…</div>
        </div>
      </div>
    </section>

    <section class="card" id="mastodonBlock" style="display:none">
      <div class="card-head">
        <h2>Mastodon</h2>
        <small>
          <a id="mastodonLink" href="{escape(mastodon)}" target="_blank" rel="nofollow noopener">{escape((mastodon or '').replace('https://', '').replace('http://', ''))}</a>
          <span style="opacity:.65">·</span>
          <a id="mastodonRss" href="{escape(mastodon_rss)}" target="_blank" rel="nofollow noopener">RSS</a>
        </small>
      </div>
      <div class="card-body">
        <div id="mastodonFeed">
          <div class="notice">Loading Mastodon posts…</div>
        </div>
      </div>
    </section>
  </div>
</div>

<script src="/assets/utils.js"></script>
<script src="/assets/publisher.js"></script>
<script src="/assets/engagement-tracker.js"></script>
</body>
</html>'''
    
    return html

def main():
    """Main function."""
    print("Regenerating publisher pages with English text...\n")
    
    # Load sites
    with open(SITES_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    sites = data.get('sites', [])
    print(f"Found {len(sites)} sites\n")
    
    # Generate pages
    generated = 0
    for site in sites:
        slug = site.get('slug')
        if not slug:
            continue
        
        page_dir = ROOT / 'publisher' / slug
        page_dir.mkdir(parents=True, exist_ok=True)
        
        html = generate_publisher_page(site, sites)
        
        page_file = page_dir / 'index.html'
        with open(page_file, 'w', encoding='utf-8') as f:
            f.write(html)
        
        generated += 1
        if generated % 10 == 0:
            print(f"  Generated {generated}/{len(sites)} pages...")
    
    print(f"\n✅ Generated {generated} publisher pages with English text")
    return 0

if __name__ == '__main__':
    import sys
    sys.exit(main())

