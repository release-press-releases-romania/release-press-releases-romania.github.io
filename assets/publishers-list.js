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

  function card(s, index = 0){
    const hasSocial = !!s.mastodon;
    const url = `/publisher/${encodeURIComponent(s.slug)}/`;
    const category = escapeHtml(s.category || "Miscellaneous");
    
    // /publishers/ page: Use longer descriptions - combine short and long for more complete text
    const shortDesc = s.description_short_en || s.description_short || "";
    const longDesc = s.description_long_en || s.description_long || "";
    // Combine descriptions: if we have both, use short + part of long. Otherwise use what's available.
    let desc = "";
    if(shortDesc && longDesc && longDesc.length > shortDesc.length) {
      // Use short description + first sentence or 100 chars from long description
      const longExcerpt = longDesc.split('.')[0] || longDesc.substring(0, 100);
      desc = shortDesc + (longExcerpt && !shortDesc.includes(longExcerpt.substring(0, 30)) ? '. ' + longExcerpt : '');
    } else {
      desc = longDesc || shortDesc || "";
    }
    // Ensure minimum length - if too short, try to expand
    if(desc.length < 50 && longDesc) {
      desc = longDesc.substring(0, 200) + (longDesc.length > 200 ? '...' : '');
    }
    const name = s.name || s.slug;
    const siteName = escapeHtml(name);
    const siteDesc = escapeHtml(desc);
    
    // Category slug mapping (same as app.js)
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
    const rssRel = Math.random() < 0.2 ? 'nofollow noopener' : 'noopener';
    const mastodonRel = Math.random() < 0.3 ? 'nofollow noopener' : 'noopener';
    const categoryUrl = `/category/${getCategorySlug(s.category || "Miscellaneous")}/`;
    
    const tags = `
      ${s.rss ? `<a href="${escapeHtml(s.rss)}" target="_blank" class="tag rss" aria-label="RSS feed for ${siteName}" rel="${rssRel}">RSS</a>` : '<span class="tag rss" aria-label="Has RSS feed">RSS</span>'}
      ${hasSocial ? `<a href="${escapeHtml(s.mastodon)}" target="_blank" class="tag social" aria-label="Mastodon profile for ${siteName}" rel="${mastodonRel}">Mastodon</a>` : ''}
      <a href="${categoryUrl}" class="tag" aria-label="Category: ${category}" rel="bookmark">${category}</a>
    `;
    
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
    
    // SEO-optimized card with improved design
    return `
      <article class="site" itemscope itemtype="https://schema.org/Organization" aria-label="${siteName} publisher">
        <div class="site-header">
          <div class="site-image-wrapper">
            <svg class="site-icon" aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <use href="/assets/icons/category-icons.svg#${iconId}"></use>
            </svg>
          </div>
          ${s.url ? `
            <a href="${escapeHtml(s.url)}" target="_blank" class="site-external-link" aria-label="Visit ${siteName} website" 
               rel="${externalRel}" title="Visit ${siteName}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          ` : ''}
        </div>
        <a href="${url}" itemprop="url" rel="bookmark" aria-label="View ${siteName} publisher page and press releases" class="site-link">
          <h3 class="site-name" itemprop="name">${siteName}</h3>
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

  // Center last row items in grid
  function centerLastRow(){
    const grid = document.getElementById('list');
    if(!grid) return;
    
    const items = Array.from(grid.children);
    if(items.length === 0) return;
    
    // Get computed grid columns (approximate based on viewport)
    const gridStyle = window.getComputedStyle(grid);
    const gridWidth = grid.offsetWidth;
    const gap = parseInt(gridStyle.gap) || 24;
    const minColWidth = 300; // minmax(300px, 1fr)
    const columns = Math.max(1, Math.floor((gridWidth + gap) / (minColWidth + gap)));
    
    // Calculate items in last row
    const totalItems = items.length;
    const itemsInLastRow = totalItems % columns;
    
    if(itemsInLastRow === 0) {
      // Reset all items if full row
      items.forEach(item => {
        item.style.gridColumn = '';
        item.style.margin = '';
        item.style.maxWidth = '';
      });
      return;
    }
    
    // Reset all items
    items.forEach(item => {
      item.style.gridColumn = '';
      item.style.margin = '';
      item.style.maxWidth = '';
    });
    
    // Center last row items
    if(itemsInLastRow === 1){
      // Single item in last row - center it
      const lastItem = items[items.length - 1];
      lastItem.style.gridColumn = `span ${columns}`;
      lastItem.style.margin = '0 auto';
      lastItem.style.maxWidth = '300px';
    } else {
      // Multiple items in last row - center the group
      const startIndex = totalItems - itemsInLastRow;
      const offset = Math.floor((columns - itemsInLastRow) / 2);
      
      if(offset > 0){
        const firstLastRowItem = items[startIndex];
        firstLastRowItem.style.gridColumnStart = offset + 1;
      }
    }
  }

  const searchEl = q("#search");
  const categoryEl = q("#category");
  const socialOnlyEl = q("#socialOnly");

  if(searchEl) searchEl.addEventListener("input", () => { apply(); setTimeout(centerLastRow, 100); });
  if(categoryEl) categoryEl.addEventListener("change", () => { apply(); setTimeout(centerLastRow, 100); });
  if(socialOnlyEl) socialOnlyEl.addEventListener("change", () => { apply(); setTimeout(centerLastRow, 100); });

  // initial render - randomized for SEO
  const countEl = q("#count");
  if(countEl) countEl.textContent = total;
  if(list) {
    const shuffledSites = shuffleArray(sites);
    list.innerHTML = shuffledSites.map(card).join("");
    setTimeout(centerLastRow, 100); // Center last row after initial render
  }
  
  // Re-center on window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(centerLastRow, 250);
  });
})();

