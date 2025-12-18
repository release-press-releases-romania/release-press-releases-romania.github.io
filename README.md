# Release Press Releases in Romania

Central hub for press releases from Romania. Aggregates RSS feeds from over 100 Romanian publishers.

## Features

- 📰 Over 100 Romanian press release publishers
- 🔄 RSS feed aggregation
- 🏷️ Category organization
- 🔍 Search and filter functionality
- 📱 Mobile-responsive design
- ♿ Accessibility features

## Structure

- `index.html` - Homepage
- `publishers/` - All publishers listing
- `publisher/[slug]/` - Individual publisher pages
- `category/` - Category pages
- `feed.xml` - Aggregated RSS feed
- `data/sites.json` - Publisher data
- `tools/` - Python scripts for feed generation

## GitHub Actions

The RSS feed is automatically updated every 6 hours via GitHub Actions workflow (`.github/workflows/update-rss-feed.yml`).

## License

This project aggregates publicly available RSS feeds from Romanian publishers.
