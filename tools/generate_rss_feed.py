#!/usr/bin/env python3
"""
Generate professional RSS feed aggregating all publisher feeds.
Optimized for SEO, fast indexing, and proper signal transmission without appearing as link-farm.
"""

import json
import requests
from datetime import datetime, timezone
from pathlib import Path
import time
from urllib.parse import urljoin, urlparse
import html
import xml.etree.ElementTree as ET
import re

# Configuration
SITES_JSON = Path(__file__).parent.parent / "data" / "sites.json"
OUTPUT_FILE = Path(__file__).parent.parent / "feed.xml"
BASE_URL = "https://release-press-releases-romania.github.io"
MAX_ITEMS_PER_FEED = 3  # Reduced to avoid link-farm appearance - quality over quantity
MAX_TOTAL_ITEMS = 150  # Optimal for RSS feed performance and SEO
REQUEST_TIMEOUT = 10
REQUEST_DELAY = 0.5  # More respectful delay

def clean_html(text):
    """Remove HTML tags and clean text."""
    if not text:
        return ""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode HTML entities
    text = html.unescape(text)
    # Clean whitespace
    text = ' '.join(text.split())
    return text.strip()

def parse_rss_feed(xml_content, url, max_items=MAX_ITEMS_PER_FEED):
    """Parse RSS/Atom feed XML with enhanced error handling."""
    items = []
    try:
        root = ET.fromstring(xml_content)
        
        # Handle RSS 2.0
        if root.tag == 'rss':
            channel = root.find('channel')
            if channel is not None:
                feed_title = channel.findtext('title', 'Unknown Feed')
                feed_link = channel.findtext('link', url)
                
                for item in channel.findall('item')[:max_items]:
                    title = clean_html(item.findtext('title', 'Untitled'))
                    link = item.findtext('link', '').strip()
                    description_raw = item.findtext('description', '')
                    pub_date_str = item.findtext('pubDate', '')
                    author = clean_html(item.findtext('author', ''))
                    
                    # Try to get content:encoded for better description
                    content_elem = item.find('{http://purl.org/rss/1.0/modules/content/}encoded')
                    if content_elem is not None and content_elem.text:
                        description_raw = content_elem.text
                    
                    # Clean description
                    description = clean_html(description_raw)
                    if len(description) > 400:  # Optimal length for RSS
                        description = description[:397] + "..."
                    
                    # Parse date
                    pub_date = parse_rss_date(pub_date_str)
                    
                    # Only add if we have valid title and link
                    if title and link:
                        items.append({
                            'title': title,
                            'link': link,
                            'description': description,
                            'published': pub_date,
                            'author': author,
                            'feed_title': feed_title,
                            'feed_link': feed_link
                        })
        
        # Handle Atom
        elif root.tag == '{http://www.w3.org/2005/Atom}feed':
            feed_title = root.findtext('{http://www.w3.org/2005/Atom}title', 'Unknown Feed')
            feed_link_elem = root.find('{http://www.w3.org/2005/Atom}link[@rel="alternate"]')
            feed_link = feed_link_elem.get('href', url) if feed_link_elem is not None else url
            
            for entry in root.findall('{http://www.w3.org/2005/Atom}entry')[:max_items]:
                title = clean_html(entry.findtext('{http://www.w3.org/2005/Atom}title', 'Untitled'))
                link_elem = entry.find('{http://www.w3.org/2005/Atom}link')
                link = link_elem.get('href', '').strip() if link_elem is not None else ''
                summary = clean_html(entry.findtext('{http://www.w3.org/2005/Atom}summary', ''))
                content_elem = entry.find('{http://www.w3.org/2005/Atom}content')
                content = clean_html(content_elem.text if content_elem is not None and content_elem.text else summary)
                updated = entry.findtext('{http://www.w3.org/2005/Atom}updated', '')
                author_elem = entry.find('{http://www.w3.org/2005/Atom}author')
                author = clean_html(author_elem.findtext('{http://www.w3.org/2005/Atom}name', '')) if author_elem is not None else ''
                
                pub_date = parse_rss_date(updated)
                
                description = content or summary
                if len(description) > 400:
                    description = description[:397] + "..."
                
                if title and link:
                    items.append({
                        'title': title,
                        'link': link,
                        'description': description,
                        'published': pub_date,
                        'author': author,
                        'feed_title': feed_title,
                        'feed_link': feed_link
                    })
    
    except ET.ParseError as e:
        print(f"  ⚠️  XML parsing error: {e}")
    except Exception as e:
        print(f"  ⚠️  Error parsing feed: {e}")
    
    return items

def parse_rss_date(date_str):
    """Parse RSS date string to datetime with enhanced format support."""
    if not date_str:
        return datetime.now(timezone.utc)
    
    formats = [
        '%a, %d %b %Y %H:%M:%S %z',
        '%a, %d %b %Y %H:%M:%S %Z',
        '%Y-%m-%dT%H:%M:%S%z',
        '%Y-%m-%dT%H:%M:%SZ',
        '%Y-%m-%dT%H:%M:%S.%f%z',
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d'
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    
    return datetime.now(timezone.utc)

def fetch_feed(url, max_items=MAX_ITEMS_PER_FEED):
    """Fetch and parse an RSS feed with proper error handling."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; ReleasePressReleasesBot/1.0; +https://release-press-releases-romania.github.io/feed.xml)',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive'
        }
        
        try:
            response = requests.get(url, timeout=REQUEST_TIMEOUT, headers=headers, verify=True, allow_redirects=True)
        except requests.exceptions.SSLError:
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            response = requests.get(url, timeout=REQUEST_TIMEOUT, headers=headers, verify=False, allow_redirects=True)
        
        response.raise_for_status()
        
        # Check content type
        content_type = response.headers.get('Content-Type', '').lower()
        if 'xml' not in content_type and 'rss' not in content_type and 'atom' not in content_type:
            # Still try to parse - some feeds have wrong content-type
            pass
        
        items = parse_rss_feed(response.content, url, max_items)
        return items
    except requests.exceptions.Timeout:
        print(f"  ⚠️  Timeout")
        return []
    except requests.exceptions.RequestException as e:
        print(f"  ⚠️  Request error: {str(e)[:50]}")
        return []
    except Exception as e:
        print(f"  ⚠️  Error: {str(e)[:50]}")
        return []

def generate_rss_feed():
    """Generate the aggregated RSS feed optimized for SEO and indexing."""
    print("Generating optimized RSS feed...")
    
    # Load sites data
    with open(SITES_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Collect RSS feeds with diversity strategy (avoid link-farm pattern)
    all_items = []
    feeds_processed = 0
    feeds_by_category = {}
    
    sites_with_rss = [s for s in data['sites'] if s.get('rss')]
    print(f"Processing {len(sites_with_rss)} publishers with RSS feeds...")
    
    # Group by category for balanced distribution
    for site in sites_with_rss:
        cat = site.get('category', 'Miscellaneous')
        if cat not in feeds_by_category:
            feeds_by_category[cat] = []
        feeds_by_category[cat].append(site)
    
    # Process feeds with category diversity
    processed_sites = set()
    max_per_category = max(1, MAX_TOTAL_ITEMS // len(feeds_by_category)) if feeds_by_category else MAX_TOTAL_ITEMS
    
    # Round-robin through categories for diversity
    category_list = list(feeds_by_category.keys())
    category_index = 0
    
    while len(all_items) < MAX_TOTAL_ITEMS and feeds_processed < len(sites_with_rss):
        # Get next category
        if not category_list:
            break
        
        cat = category_list[category_index % len(category_list)]
        category_index += 1
        
        if not feeds_by_category[cat]:
            continue
        
        site = feeds_by_category[cat].pop(0)
        rss_url = site.get('rss')
        
        if not rss_url or site.get('slug') in processed_sites:
            continue
        
        site_name = site.get('name', site.get('slug', 'Unknown'))
        print(f"  [{feeds_processed + 1}/{len(sites_with_rss)}] {site_name} ({cat})...", end=' ', flush=True)
        
        items = fetch_feed(rss_url, MAX_ITEMS_PER_FEED)
        
        # Add site information to items
        for item in items:
            item['site_name'] = site_name
            item['site_slug'] = site.get('slug', '')
            item['category'] = site.get('category', 'Miscellaneous')
            item['site_url'] = site.get('url', '')
        
        all_items.extend(items)
        feeds_processed += 1
        processed_sites.add(site.get('slug'))
        
        if items:
            print(f"✓ ({len(items)} items)")
        else:
            print(f"⚠️  (0 items)")
        
        # Respectful delay
        time.sleep(REQUEST_DELAY)
        
        # Stop if we have enough items
        if len(all_items) >= MAX_TOTAL_ITEMS:
            break
    
    # Sort by publication date (newest first)
    all_items.sort(key=lambda x: x['published'], reverse=True)
    
    # Limit total items
    all_items = all_items[:MAX_TOTAL_ITEMS]
    
    print(f"  ✓ Processed {feeds_processed} feeds")
    print(f"  ✓ Collected {len(all_items)} items from {len(set(i['site_slug'] for i in all_items))} unique publishers")
    
    # Generate RSS XML with enhanced metadata
    now = datetime.now(timezone.utc)
    rss_date = now.strftime('%a, %d %b %Y %H:%M:%S %z')
    
    rss_xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:sy="http://purl.org/rss/1.0/modules/syndication/">
  <channel>
    <title>Release Press Releases in Romania - Aggregated Feed</title>
    <link>{BASE_URL}</link>
    <description>Aggregated RSS feed of press releases from over 100 Romanian publishers. Covering PR &amp; Marketing, Health, News &amp; Society, Technology, Business, Construction, Tourism, and more. Curated selection of quality press releases from trusted Romanian sources.</description>
    <language>en</language>
    <lastBuildDate>{rss_date}</lastBuildDate>
    <pubDate>{rss_date}</pubDate>
    <generator>Release Press Releases in Romania RSS Aggregator v2.0</generator>
    <webMaster>noreply@release-press-releases-romania.github.io (Release Press Releases)</webMaster>
    <managingEditor>noreply@release-press-releases-romania.github.io (Release Press Releases)</managingEditor>
    <atom:link href="{BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>{BASE_URL}/assets/images/logo.svg</url>
      <title>Release Press Releases in Romania</title>
      <link>{BASE_URL}</link>
      <width>144</width>
      <height>144</height>
    </image>
    <category>Press Releases</category>
    <category>Romania</category>
    <category>News</category>
    <category>Media</category>
    <category>RSS Feed</category>
    <ttl>60</ttl>
    <sy:updatePeriod>hourly</sy:updatePeriod>
    <sy:updateFrequency>1</sy:updateFrequency>
    <copyright>Copyright {now.year} Release Press Releases in Romania. Content belongs to respective publishers.</copyright>
    <docs>https://www.rssboard.org/rss-specification</docs>
'''
    
    # Add items with enhanced metadata
    for item in all_items:
        pub_date = item['published'].strftime('%a, %d %b %Y %H:%M:%S %z')
        title = html.escape(item['title'] or 'Untitled')
        link = html.escape(item['link'] or '')
        description = html.escape(item['description'] or '')
        author = html.escape(item.get('author') or item['site_name'] or 'Unknown')
        category = html.escape(item['category'] or 'Miscellaneous')
        site_name = html.escape(item['site_name'] or 'Unknown')
        site_slug = html.escape(item['site_slug'] or '')
        site_url = html.escape(item.get('site_url', ''))
        
        # Enhanced description with context
        enhanced_desc = description
        if site_name and site_name != 'Unknown':
            enhanced_desc = f"From {site_name}: {description}"
        
        # Use CDATA for description to handle special characters
        description_cdata = f"<![CDATA[{enhanced_desc}]]>"
        
        # Generate GUID (use link as permalink)
        guid = link if link else f"{BASE_URL}/publisher/{site_slug}/"
        
        rss_xml += f'''    <item>
      <title>{title}</title>
      <link>{link}</link>
      <description>{description_cdata}</description>
      <pubDate>{pub_date}</pubDate>
      <author>{author} ({BASE_URL}/publisher/{site_slug}/)</author>
      <dc:creator>{author}</dc:creator>
      <dc:date>{item['published'].isoformat()}</dc:date>
      <category domain="{BASE_URL}/category/">{category}</category>
      <guid isPermaLink="true">{guid}</guid>
      <source url="{BASE_URL}/publisher/{site_slug}/">{site_name}</source>
'''
        
        # Add content:encoded if we have longer description
        if len(description) > 200:
            content_encoded = html.escape(enhanced_desc)
            rss_xml += f'      <content:encoded><![CDATA[{enhanced_desc}]]></content:encoded>\n'
        
        # Add comments link if available
        if link:
            rss_xml += f'      <comments>{link}#comments</comments>\n'
        
        rss_xml += '    </item>\n'
    
    rss_xml += '''  </channel>
</rss>'''
    
    # Write to file
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(rss_xml)
    
    print(f"  ✓ RSS feed generated: {OUTPUT_FILE}")
    print(f"  ✓ Feed contains {len(all_items)} items from {len(set(i['site_slug'] for i in all_items))} publishers")
    print(f"  ✓ Categories represented: {len(set(i['category'] for i in all_items))}")
    
    return len(all_items), feeds_processed

if __name__ == '__main__':
    try:
        items_count, feeds_count = generate_rss_feed()
        print(f"\n✅ Success! Generated optimized RSS feed with {items_count} items from {feeds_count} feeds")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
