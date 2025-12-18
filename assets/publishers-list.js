(async function(){
  const data = await loadJson("/data/sites.json");
  const sites = data.sites || [];
  const byCat = new Map();
  let withSocial = 0;

  for(const s of sites){
    const c = s.category || "Miscellaneous";
    byCat.set(c, (byCat.get(c)||0)+1);
    if(s.mastodon) withSocial++;
  }

  const total = sites.length;

  // category filter options (categories are now in English)
  const cats = Array.from(byCat.keys()).sort((a,b)=>a.localeCompare(b));
  const sel = q("#category");
  if(sel) {
    for(const c of cats){
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = `${c} (${byCat.get(c)})`;
      sel.appendChild(opt);
    }
  }

  // render list
  const list = q("#list");
  if(!list) return;

  function card(s){
    const hasSocial = !!s.mastodon;
    const url = `/publisher/${encodeURIComponent(s.slug)}/`;
    const category = escapeHtml(s.category || "Miscellaneous");
    
    // Category slug mapping
    function getCategorySlug(cat) {
      const slugMap = {
        "PR & Marketing": "pr-marketing",
        "Health": "health",
        "News & Society": "news-society",
        "Technology & Energy": "technology-energy",
        "Business": "business",
        "Tourism & Delta": "tourism-delta",
        "Construction & Home": "construction-home",
        "Miscellaneous": "miscellaneous"
      };
      return slugMap[cat] || cat.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "").replace(/[^a-z0-9-]/g, "");
    }
    
    // Make tags clickable with mix of dofollow/nofollow
    const rssRel = s.rss ? (Math.random() < 0.2 ? 'nofollow noopener' : 'noopener') : '';
    const mastodonRel = hasSocial ? (Math.random() < 0.3 ? 'nofollow noopener' : 'noopener') : '';
    const categoryUrl = `/category/${getCategorySlug(s.category || "Miscellaneous")}/`;
    
    const tags = `
      ${s.rss ? `<a href="${escapeHtml(s.rss)}" target="_blank" class="tag rss" aria-label="RSS feed for ${escapeHtml(s.url ? (s.url.replace(/^https?:\/\//,"").replace(/\/$/,"")) : s.slug.replace(/-ro$/, ".ro"))}" rel="${rssRel}">RSS</a>` : '<span class="tag rss" aria-label="Has RSS feed">RSS</span>'}
      ${hasSocial ? `<a href="${escapeHtml(s.mastodon)}" target="_blank" class="tag social" aria-label="Mastodon profile for ${escapeHtml(s.url ? (s.url.replace(/^https?:\/\//,"").replace(/\/$/,"")) : s.slug.replace(/-ro$/, ".ro"))}" rel="${mastodonRel}">Mastodon</a>` : ''}
      <a href="${categoryUrl}" class="tag" aria-label="Category: ${category}" rel="bookmark">${category}</a>
    `;
    
    // Extract domain from URL - convert slug to domain format if URL missing
    let domainName = "";
    if(s.url) {
      domainName = (s.url||"").replace(/^https?:\/\//,"").replace(/\/$/,"");
    } else if(s.slug) {
      // Convert slug to domain format: "partizani-ro" -> "partizani.ro", "top-clinici-ro" -> "top-clinici.ro"
      // Only replace "-ro" at the end with ".ro", keep other hyphens
      domainName = s.slug.replace(/-ro$/, ".ro");
    } else {
      domainName = s.slug || "";
    }
    domainName = escapeHtml(domainName);
    
    // Generate description without site name reference
    // Use description_long_en or description_short_en, but remove site name references
    let desc = s.description_long_en || s.description_short_en || s.description_long || s.description_short || "";
    
    // Remove site name references from description
    if(desc) {
      const siteNamePattern = new RegExp(`\\b${escapeRegex(s.name || s.slug)}\\b`, 'gi');
      desc = desc.replace(siteNamePattern, 'This platform');
      
      // Also remove common patterns like "The platform", "The site" at start if redundant
      desc = desc.replace(/^(This platform|The platform|The site|This site)\s+/i, '');
      
      // If description is too short or empty, generate generic description based on category
      if(desc.length < 50) {
        desc = generateGenericDescription(category, s.url);
      }
    } else {
      desc = generateGenericDescription(category, s.url);
    }
    
    const siteDesc = escapeHtml(desc);
    
    // Helper function to escape regex special characters
    function escapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Generate generic description based on category
    function generateGenericDescription(cat, url) {
      const categoryDescriptions = {
        "PR & Marketing": "A platform offering press release distribution services, public relations solutions, and marketing communications for businesses and organizations. Access professional PR services, press release distribution, and marketing resources.",
        "Health": "A platform providing medical information, health recommendations, treatment options, and healthcare resources. Find articles on preventive medicine, medical treatments, and public health information.",
        "News & Society": "A news platform covering local and national events, social issues, political developments, and cultural news. Access community journalism, civic engagement information, and social initiatives.",
        "Technology & Energy": "A platform focused on technological innovations, IT solutions, digital transformation, and energy efficiency. Find information about software development, renewable energy, and technological advancements.",
        "Business": "A platform dedicated to entrepreneurship, business strategies, investments, and corporate news. Access resources for startups, business management, investment opportunities, and market analysis.",
        "Tourism & Delta": "A platform covering tourist destinations, travel information, cultural attractions, and natural landmarks. Find travel guides, tourism events, and information about Romania's tourist destinations.",
        "Construction & Home": "A platform focused on construction projects, home renovations, interior design, and building solutions. Access information about construction materials, renovation projects, and architectural innovations.",
        "Miscellaneous": "A platform offering diverse content covering multiple topics and interests. Find articles, guides, and resources on various subjects for the general public."
      };
      return categoryDescriptions[cat] || "A platform providing press releases and content across various topics. Access RSS feeds for the latest updates and information.";
    }
    
    // Get category icon
    const categoryIcons = {
      "PR & Marketing": "icon-pr",
      "Health": "icon-health",
      "News & Society": "icon-news",
      "Technology & Energy": "icon-tech",
      "Business": "icon-business",
      "Tourism & Delta": "icon-tourism",
      "Construction & Home": "icon-construction",
      "Miscellaneous": "icon-misc"
    };
    const iconId = categoryIcons[category] || "icon-misc";
    
    // Mix of text and image links for natural distribution
    // External link to publisher website (30% nofollow, 70% dofollow)
    const externalRel = s.url ? (Math.random() < 0.3 ? 'nofollow noopener' : 'noopener') : '';
    
    return `
      <article class="site" itemscope itemtype="https://schema.org/Organization">
        <div class="site-header">
          <div class="site-image-wrapper">
            <svg class="site-icon" aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <use href="/assets/icons/category-icons.svg#${iconId}"></use>
            </svg>
          </div>
          ${s.url ? `
            <a href="${escapeHtml(s.url)}" target="_blank" class="site-external-link" aria-label="Visit ${domainName} website" rel="${externalRel}" title="Visit ${domainName}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          ` : ''}
        </div>
        <a href="${url}" itemprop="url" rel="bookmark" aria-label="View ${domainName} publisher page and press releases" class="site-link">
          <h3 class="site-name" itemprop="name">${domainName}</h3>
          ${siteDesc ? `<p class="site-desc" itemprop="description">${siteDesc}</p>` : ''}
        </a>
        <div class="site-meta" aria-label="Publisher metadata">${tags}</div>
        <meta itemprop="category" content="${category}">
        ${s.url ? `<link itemprop="sameAs" href="${escapeHtml(s.url)}">` : ''}
        ${s.rss ? `<link itemprop="rss" href="${escapeHtml(s.rss)}">` : ''}
      </article>
    `;
  }

  // Randomization function for SEO - different order each visit
  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function apply(){
    const term = (q("#search")?.value || "").trim().toLowerCase();
    const cat = q("#category")?.value || "";
    const socialOnly = q("#socialOnly")?.checked || false;

    const filtered = sites.filter(s=>{
      if(cat && (s.category||"") !== cat) return false;
      if(socialOnly && !s.mastodon) return false;

      if(!term) return true;
      // Search only in description_short for publishers page
      const hay = `${s.name||""} ${s.url||""} ${s.slug||""} ${s.category||""} ${s.description_short_en||""} ${s.description_short||""}`.toLowerCase();
      return hay.includes(term);
    });

    // Randomize filtered results for SEO - different order each visit
    const shuffledFiltered = shuffleArray(filtered);

    const countEl = q("#count");
    if(countEl) countEl.textContent = filtered.length;
    if(list) list.innerHTML = shuffledFiltered.map(card).join("");
  }

  const searchEl = q("#search");
  const categoryEl = q("#category");
  const socialOnlyEl = q("#socialOnly");

  if(searchEl) searchEl.addEventListener("input", apply);
  if(categoryEl) categoryEl.addEventListener("change", apply);
  if(socialOnlyEl) socialOnlyEl.addEventListener("change", apply);

  // Randomization function for SEO - different order each visit
  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // initial render - randomized for SEO
  const countEl = q("#count");
  if(countEl) countEl.textContent = total;
  if(list) {
    const shuffledSites = shuffleArray(sites);
    list.innerHTML = shuffledSites.map(card).join("");
  }
})();

