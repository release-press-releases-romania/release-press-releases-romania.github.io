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
  q("#kpiTotal").textContent = total;
  q("#kpiSocial").textContent = withSocial;
  q("#kpiCats").textContent = byCat.size;

  // category filter options (categories are now in English)
  const cats = Array.from(byCat.keys()).sort((a,b)=>a.localeCompare(b));
  const sel = q("#category");
  for(const c of cats){
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = `${c} (${byCat.get(c)})`;
    sel.appendChild(opt);
  }

  // render list
  const list = q("#list");
  function card(s, index = 0){
    const hasSocial = !!s.mastodon;
    const url = `/publisher/${encodeURIComponent(s.slug)}/`;
    const category = escapeHtml(s.category || "Miscellaneous");
    const tags = `
      <span class="tag rss" aria-label="Has RSS feed">RSS</span>
      ${hasSocial ? '<span class="tag social" aria-label="Has Mastodon profile">Mastodon</span>' : ''}
      <span class="tag" aria-label="Category: ${category}">${category}</span>
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
    // Use description_small_en or description_short_en, but remove site name references
    let desc = s.description_small_en || s.description_short_en || s.description_small || s.description_short || "";
    
    // Remove site name references from description
    if(desc) {
      const siteNamePattern = new RegExp(`\\b${escapeRegex(s.name || s.slug)}\\b`, 'gi');
      desc = desc.replace(siteNamePattern, 'This platform');
      
      // Also remove common patterns like "The platform", "The site" at start if redundant
      desc = desc.replace(/^(This platform|The platform|The site|This site)\s+/i, '');
      
      // If description is too short or empty, generate generic description based on category
      if(desc.length < 30) {
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
        "PR & Marketing": "Press release distribution and PR services.",
        "Health": "Medical information and health resources.",
        "News & Society": "Local and national news coverage.",
        "Technology & Energy": "Technology innovations and IT solutions.",
        "Business": "Business news and entrepreneurship resources.",
        "Tourism & Delta": "Tourism information and travel guides.",
        "Construction & Home": "Construction and home improvement content.",
        "Miscellaneous": "Diverse content and articles."
      };
      return categoryDescriptions[cat] || "Press releases and content.";
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
    
    // SEO-optimized card with semantic HTML, images, and structured data (Google 2025)
    // Mix of text and image links for natural link distribution
    return `
      <article class="site" itemscope itemtype="https://schema.org/Organization" aria-label="${domainName} publisher">
        <a href="${url}" itemprop="url" rel="bookmark" aria-label="View ${domainName} publisher page and press releases" class="site-link">
        <div class="site-top">
            <div class="site-image-wrapper">
              <svg class="site-icon" aria-hidden="true" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <use href="/assets/icons/category-icons.svg#${iconId}"></use>
              </svg>
            </div>
            <div class="site-content">
              <h3 class="site-name" itemprop="name">${domainName}</h3>
              ${siteDesc ? `<p class="site-desc" itemprop="description">${siteDesc}</p>` : ''}
              <div class="site-meta" aria-label="Publisher metadata">${tags}</div>
            </div>
          </div>
        </a>
        ${s.url ? `
          <a href="${escapeHtml(s.url)}" target="_blank" class="site-image-link" aria-label="Visit ${domainName} website" 
             rel="${Math.random() < 0.3 ? 'nofollow noopener' : 'noopener'}">
            <img src="/assets/images/logo.svg" alt="${domainName} - Press Releases" class="site-logo" loading="lazy" width="32" height="32" itemprop="logo">
          </a>
        ` : `
          <a href="${url}" class="site-image-link" aria-label="View ${domainName} press releases">
            <img src="/assets/images/logo.svg" alt="${domainName} - Press Releases" class="site-logo" loading="lazy" width="32" height="32" itemprop="logo">
          </a>
        `}
        <meta itemprop="category" content="${category}">
        ${s.url ? `<link itemprop="sameAs" href="${escapeHtml(s.url)}">` : ''}
        ${s.rss ? `<link itemprop="rss" href="${escapeHtml(s.rss)}">` : ''}
      </article>
    `;
  }

  function apply(){
    const term = (q("#search").value || "").trim().toLowerCase();
    const cat = q("#category").value;
    const socialOnly = q("#socialOnly").checked;

    const filtered = sites.filter(s=>{
      if(cat && (s.category||"") !== cat) return false;
      if(socialOnly && !s.mastodon) return false;

      if(!term) return true;
      // Homepage search: Use only description_small
      const hay = `${s.name||""} ${s.url||""} ${s.slug||""} ${s.category||""} ${s.description_small_en||""} ${s.description_small||""}`.toLowerCase();
      return hay.includes(term);
    });

    q("#count").textContent = filtered.length;
    const initialFiltered = filtered.slice(0, INITIAL_SHOW);
    renderSites(initialFiltered, false, 0);
    
    const existingBtn = list.parentElement.querySelector("button.btn");
    if(existingBtn) existingBtn.remove();
    
    if(filtered.length > INITIAL_SHOW) {
      const loadMoreBtn = document.createElement("button");
      loadMoreBtn.className = "btn";
      loadMoreBtn.textContent = `Load more (${filtered.length - INITIAL_SHOW} remaining)`;
      loadMoreBtn.style.marginTop = "20px";
      let currentIndex = INITIAL_SHOW;
      
      loadMoreBtn.addEventListener("click", () => {
        const nextBatch = filtered.slice(currentIndex, currentIndex + BATCH_SIZE);
        if(nextBatch.length > 0) {
          renderSites(nextBatch, true, currentIndex);
          currentIndex += BATCH_SIZE;
          if(currentIndex >= filtered.length) {
            loadMoreBtn.remove();
          } else {
            loadMoreBtn.textContent = `Load more (${filtered.length - currentIndex} remaining)`;
          }
        }
      });
      
      list.parentElement.appendChild(loadMoreBtn);
    }
  }

  q("#search").addEventListener("input", apply);
  q("#category").addEventListener("change", apply);
  q("#socialOnly").addEventListener("change", apply);

  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  const INITIAL_SHOW = 20;
  const BATCH_SIZE = 20;
  
  function renderSites(sitesToRender, append = false, startIndex = 0) {
    const shuffledSites = shuffleArray(sitesToRender);
    const html = shuffledSites.map((s, idx) => card(s, startIndex + idx)).join("");
    if(append) {
      list.innerHTML += html;
    } else {
      list.innerHTML = html;
    }
  }

  q("#count").textContent = total;
  const initialSites = sites.slice(0, INITIAL_SHOW);
  renderSites(initialSites);
  
  if(sites.length > INITIAL_SHOW) {
    const loadMoreBtn = document.createElement("button");
    loadMoreBtn.className = "btn";
    loadMoreBtn.textContent = `Load more (${sites.length - INITIAL_SHOW} remaining)`;
    loadMoreBtn.style.marginTop = "20px";
    let currentIndex = INITIAL_SHOW;
    
    loadMoreBtn.addEventListener("click", () => {
      const nextBatch = sites.slice(currentIndex, currentIndex + BATCH_SIZE);
      if(nextBatch.length > 0) {
        renderSites(nextBatch, true, currentIndex);
        currentIndex += BATCH_SIZE;
        if(currentIndex >= sites.length) {
          loadMoreBtn.remove();
        } else {
          loadMoreBtn.textContent = `Load more (${sites.length - currentIndex} remaining)`;
        }
      }
    });
    
    list.parentElement.appendChild(loadMoreBtn);
  }

  // Featured category chips (categories are now in English)
  const chips = q("#chips");
  const topCats = cats
    .map(c=>({c, n: byCat.get(c)}))
    .sort((a,b)=>b.n-a.n)
    .slice(0,5);

  chips.innerHTML = topCats.map(x=>`<a href="/category/${getCategorySlug(x.c)}/" class="pill ${x.c.includes("Technology") || x.c.includes("Energy")?'green':''}"><i></i>${escapeHtml(x.c)} <small>· ${x.n}</small></a>`).join("");

  // Category links with English slugs
  function getCategorySlug(category) {
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
    return slugMap[category] || category.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "").replace(/[^a-z0-9-]/g, "");
  }

  const categoryLinks = [
    {name: "PR & Marketing", url: "/category/pr-marketing/"},
    {name: "Health", url: "/category/health/"},
    {name: "News & Society", url: "/category/news-society/"},
    {name: "Technology & Energy", url: "/category/technology-energy/"},
    {name: "Business", url: "/category/business/"},
    {name: "Tourism & Delta", url: "/category/tourism-delta/"},
    {name: "Construction & Home", url: "/category/construction-home/"},
    {name: "Miscellaneous", url: "/category/miscellaneous/"}
  ];
  
  const shuffledCategories = shuffleArray(categoryLinks);
  const catLinksContainer = q("#categoryLinks");
  
  if(catLinksContainer) {
    shuffledCategories.forEach(cat => {
      const btn = document.createElement("a");
      btn.className = "category-btn";
      btn.href = cat.url;
      btn.textContent = cat.name;
      catLinksContainer.appendChild(btn);
    });
  }

  // Load latest 5 Mastodon posts (randomized) - Lazy loaded after page render
  async function loadLatestMastodon(){
    const container = q("#latestMastodon");
    if(!container) return;
    
    // Defer loading until after initial render to avoid blocking
    if('requestIdleCallback' in window) {
      requestIdleCallback(() => loadMastodonFeeds(container), { timeout: 2000 });
    } else {
      setTimeout(() => loadMastodonFeeds(container), 1000);
    }
  }
  
  async function loadMastodonFeeds(container){
    const mastodonSites = sites.filter(s => s.mastodon && s.mastodon_rss);
    if(mastodonSites.length === 0) {
      container.innerHTML = '<div class="notice">No Mastodon feeds available.</div>';
      return;
    }

    const allFeeds = [];
    // Reduced from 20 to 5 feeds for faster loading
    const maxFeeds = Math.min(5, mastodonSites.length);
    
    // Sequential loading with small delays to avoid blocking
    for(let i = 0; i < maxFeeds; i++){
      const site = mastodonSites[i];
      try {
        const feed = await loadJson(`/data/feeds/${encodeURIComponent(site.slug)}.json`);
        if(feed.mastodon && feed.social && feed.social.length > 0){
          // Get up to 2 latest posts from each feed for variety
          // Extract domain for display
          let siteDomain = "";
          if(site.url) {
            siteDomain = site.url.replace(/^https?:\/\//,"").replace(/\/$/,"");
          } else if(site.slug) {
            siteDomain = site.slug.replace(/-ro$/, ".ro");
          } else {
            siteDomain = site.slug || "";
          }
          
          const posts = feed.social.slice(0, 2).map(post => ({
            ...post,
            siteName: site.name,
            siteSlug: site.slug,
            siteDomain: siteDomain,
            mastodonUrl: site.mastodon
          }));
          allFeeds.push(...posts);
        }
        // Small delay to avoid blocking main thread
        if(i < maxFeeds - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch(err){
        continue;
      }
    }

    if(allFeeds.length === 0){
      q("#latestMastodon").innerHTML = '<div class="notice">No Mastodon posts available at the moment.</div>';
      return;
    }

    // Sort by date (newest first)
    allFeeds.sort((a, b) => {
      const dateA = a.published ? new Date(a.published) : new Date(0);
      const dateB = b.published ? new Date(b.published) : new Date(0);
      return dateB - dateA;
    });

    // Get top 10 newest, then randomize and take 5
    const topFeeds = allFeeds.slice(0, 10);
    const shuffledTop = shuffleArray(topFeeds);
    const selectedFeeds = shuffledTop.slice(0, 5);

    if(selectedFeeds.length === 0){
      q("#latestMastodon").innerHTML = '<div class="notice">No Mastodon posts available at the moment.</div>';
      return;
    }

    const postsHtml = selectedFeeds.map(post => {
      const title = escapeHtml(post.title || "Mastodon Post");
      const link = post.link || post.mastodonUrl || "#";
      const summaryText = (post.summary || "").slice(0, 100);
      const summary = escapeHtml(summaryText);
      const hasMore = post.summary && post.summary.length > 100;
      const when = post.published_human || "";
      const siteDomain = escapeHtml(post.siteDomain || post.siteSlug || "");
      const siteUrl = `/publisher/${encodeURIComponent(post.siteSlug)}/`;

      return `
        <div class="feed-item">
          <div class="feed-header">
            <span class="tag social">Mastodon</span>
            <small class="feed-site">${siteDomain}</small>
          </div>
          ${Math.random() < 0.2 ? `
            <a href="${link}" target="_blank" rel="nofollow noopener" class="feed-title-image" aria-label="Read Mastodon post: ${title}">
              <img src="/assets/images/logo.svg" alt="" width="20" height="20" style="vertical-align: middle; margin-right: 8px; opacity: 0.7;" aria-hidden="true">
              <span>${title}</span>
            </a>
          ` : `
            <a href="${link}" target="_blank" rel="nofollow noopener" class="feed-title">
              ${title}
            </a>
          `}
          ${summary ? `<a href="${link}" target="_blank" rel="nofollow noopener" class="feed-summary">${summary}${hasMore ? "…" : ""}</a>` : ""}
          <div class="feed-meta">
            ${when ? `<span class="feed-date">📅 ${when}</span>` : ""}
            <a href="${link}" target="_blank" rel="nofollow noopener" class="feed-link">Read on Mastodon →</a>
            <a href="${siteUrl}" class="feed-publisher">View publisher</a>
          </div>
        </div>
      `;
    }).join("");

    q("#latestMastodon").innerHTML = postsHtml;
  }

  loadLatestMastodon();
})();
