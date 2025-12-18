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
    const tags = `
      <span class="tag rss" aria-label="Has RSS feed">RSS</span>
      ${hasSocial ? '<span class="tag social" aria-label="Has Mastodon profile">Mastodon</span>' : ''}
      <span class="tag" aria-label="Category: ${category}">${category}</span>
    `;
    // /publishers/ page: Use description_short only (medium length, more detailed than homepage)
    const desc = s.description_short_en || s.description_short || "";
    const name = s.name || s.slug;
    const siteName = escapeHtml(name);
    const siteDesc = escapeHtml(desc);
    
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
    
    // SEO-optimized card similar to index page
    return `
      <article class="site" itemscope itemtype="https://schema.org/Organization" aria-label="${siteName} publisher">
        <a href="${url}" itemprop="url" rel="bookmark" aria-label="View ${siteName} publisher page and press releases" class="site-link">
          <div class="site-top">
            <div class="site-image-wrapper">
              <svg class="site-icon" aria-hidden="true" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <use href="/assets/icons/category-icons.svg#${iconId}"></use>
              </svg>
            </div>
            <div class="site-content">
              <h3 class="site-name" itemprop="name">${siteName}</h3>
              ${siteDesc ? `<p class="site-desc" itemprop="description">${siteDesc}</p>` : ''}
              <div class="site-meta" aria-label="Publisher metadata">${tags}</div>
            </div>
          </div>
        </a>
        ${s.url ? `
          <a href="${escapeHtml(s.url)}" target="_blank" class="site-image-link" aria-label="Visit ${siteName} website" 
             rel="${externalRel}">
            <img src="/assets/images/logo.svg" alt="${siteName} - Press Releases" class="site-logo" loading="lazy" width="32" height="32" itemprop="logo">
          </a>
        ` : `
          <a href="${url}" class="site-image-link" aria-label="View ${siteName} press releases">
            <img src="/assets/images/logo.svg" alt="${siteName} - Press Releases" class="site-logo" loading="lazy" width="32" height="32" itemprop="logo">
          </a>
        `}
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

