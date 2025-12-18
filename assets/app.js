(async function(){
  const data = await loadJson("/data/sites.json");
  const sites = data.sites || [];
  const byCat = new Map();
  let withSocial = 0;

  for(const s of sites){
    const c = s.category || "Diverse";
    byCat.set(c, (byCat.get(c)||0)+1);
    if(s.mastodon) withSocial++;
  }

  const total = sites.length;
  q("#kpiTotal").textContent = total;
  q("#kpiSocial").textContent = withSocial;
  q("#kpiCats").textContent = byCat.size;

  // category filter options
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
    const tags = `
      <span class="tag rss">RSS</span>
      ${hasSocial ? '<span class="tag social">Mastodon</span>' : ''}
      <span class="tag">${escapeHtml(s.category || "Diverse")}</span>
    `;
    // Use description_short for index page (more detailed than small)
    const desc = s.description_short || s.description_small || "";
    
    // Natural anchor text variation - vary based on position for SEO
    const name = s.name || s.slug;
    const anchorVariations = [
      name,
      `Vezi ${name}`,
      `${name} - Release Press Releases`,
      `Accesează ${name}`
    ];
    // Use variation based on index, but keep it natural (not all varied)
    const useVariation = index % 4 === 0 && Math.random() < 0.25; // 25% chance
    const anchorText = useVariation ? anchorVariations[index % anchorVariations.length] : name;
    
    return `
      <a class="site" href="${url}">
        <div class="site-top">
          <div>
            <p class="site-name">${escapeHtml(anchorText)}</p>
            ${desc ? `<p class="site-desc">${escapeHtml(desc)}</p>` : ''}
            <div class="site-meta">${tags}</div>
          </div>
          <small>${escapeHtml((s.url||"").replace(/^https?:\/\//,"").replace(/\/$/,""))}</small>
        </div>
      </a>
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
      const hay = `${s.name||""} ${s.url||""} ${s.slug||""} ${s.category||""} ${s.description_small||""} ${s.description_short||""}`.toLowerCase();
      return hay.includes(term);
    });

    q("#count").textContent = filtered.length;
    // Show max 20 initially, with load more if needed
    const initialFiltered = filtered.slice(0, INITIAL_SHOW);
    renderSites(initialFiltered, false, 0);
    
    // Remove existing load more button
    const existingBtn = list.parentElement.querySelector("button.btn");
    if(existingBtn) existingBtn.remove();
    
    // Add load more if needed
    if(filtered.length > INITIAL_SHOW) {
      const loadMoreBtn = document.createElement("button");
      loadMoreBtn.className = "btn";
      loadMoreBtn.textContent = `Încarcă mai multe (${filtered.length - INITIAL_SHOW} rămase)`;
      loadMoreBtn.style.marginTop = "16px";
      loadMoreBtn.style.width = "100%";
      let currentIndex = INITIAL_SHOW;
      
      loadMoreBtn.addEventListener("click", () => {
        const nextBatch = filtered.slice(currentIndex, currentIndex + BATCH_SIZE);
        if(nextBatch.length > 0) {
          renderSites(nextBatch, true, currentIndex);
          currentIndex += BATCH_SIZE;
          if(currentIndex >= filtered.length) {
            loadMoreBtn.remove();
          } else {
            loadMoreBtn.textContent = `Încarcă mai multe (${filtered.length - currentIndex} rămase)`;
          }
        }
      });
      
      list.parentElement.appendChild(loadMoreBtn);
    }
  }

  q("#search").addEventListener("input", apply);
  q("#category").addEventListener("change", apply);
  q("#socialOnly").addEventListener("change", apply);

  // Randomize order for SEO - different links each visit
  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Rate limiting: Show initial batch, then load more on scroll/click
  const INITIAL_SHOW = 20; // Show first 20 publishers initially
  const BATCH_SIZE = 20; // Load 20 more at a time
  
  function renderSites(sitesToRender, append = false, startIndex = 0) {
    const shuffledSites = shuffleArray(sitesToRender);
    const html = shuffledSites.map((s, idx) => card(s, startIndex + idx)).join("");
    if(append) {
      list.innerHTML += html;
    } else {
      list.innerHTML = html;
    }
  }

  // Initial render - show limited number for natural link distribution
  q("#count").textContent = total;
  const initialSites = sites.slice(0, INITIAL_SHOW);
  renderSites(initialSites);
  
  // Add "Load more" button if there are more sites
  if(sites.length > INITIAL_SHOW) {
    const loadMoreBtn = document.createElement("button");
    loadMoreBtn.className = "btn";
    loadMoreBtn.textContent = `Încarcă mai multe (${sites.length - INITIAL_SHOW} rămase)`;
    loadMoreBtn.style.marginTop = "16px";
    loadMoreBtn.style.width = "100%";
    let currentIndex = INITIAL_SHOW;
    
      loadMoreBtn.addEventListener("click", () => {
        const nextBatch = sites.slice(currentIndex, currentIndex + BATCH_SIZE);
        if(nextBatch.length > 0) {
          renderSites(nextBatch, true, currentIndex);
          currentIndex += BATCH_SIZE;
        if(currentIndex >= sites.length) {
          loadMoreBtn.remove();
        } else {
          loadMoreBtn.textContent = `Încarcă mai multe (${sites.length - currentIndex} rămase)`;
        }
      }
    });
    
    list.parentElement.appendChild(loadMoreBtn);
  }

  // small featured chips
  const chips = q("#chips");
  const topCats = cats
    .map(c=>({c, n: byCat.get(c)}))
    .sort((a,b)=>b.n-a.n)
    .slice(0,5);

  chips.innerHTML = topCats.map(x=>`<span class="pill ${x.c.includes("Tehnologie")?'green':''}"><i></i>${escapeHtml(x.c)} <small>· ${x.n}</small></span>`).join("");

  // Randomize category links for SEO - different order each visit
  const categoryLinks = [
    {name: "PR & Marketing", url: "/categorie/pr--marketing/"},
    {name: "Sănătate", url: "/categorie/sanatate/"},
    {name: "Știri & Societate", url: "/categorie/stiri--societate/"},
    {name: "Tehnologie & Energie", url: "/categorie/tehnologie--energie/"},
    {name: "Afaceri", url: "/categorie/afaceri/"},
    {name: "Turism & Delta", url: "/categorie/turism--delta/"},
    {name: "Construcții & Casă", url: "/categorie/constructii--casa/"},
    {name: "Diverse", url: "/categorie/diverse/"}
  ];
  
  const shuffledCategories = shuffleArray(categoryLinks);
  const catLinks1 = q("#categoryLinks");
  const catLinks2 = q("#categoryLinks2");
  
  if(catLinks1 && catLinks2) {
    // Show first 3 categories in first row, rest in second
    shuffledCategories.slice(0, 3).forEach(cat => {
      const btn = document.createElement("a");
      btn.className = "btn";
      btn.href = cat.url;
      btn.textContent = cat.name;
      catLinks1.appendChild(btn);
    });
    
    shuffledCategories.slice(3, 5).forEach(cat => {
      const btn = document.createElement("a");
      btn.className = "btn";
      btn.href = cat.url;
      btn.textContent = cat.name;
      catLinks2.appendChild(btn);
    });
  }

  // Load latest Mastodon post
  async function loadLatestMastodon(){
    const mastodonSites = sites.filter(s => s.mastodon && s.mastodon_rss);
    if(mastodonSites.length === 0) {
      q("#latestMastodon").innerHTML = '<div class="notice">Nu există feed-uri Mastodon disponibile.</div>';
      return;
    }

    const feeds = [];
    const maxFeeds = Math.min(10, mastodonSites.length); // Check max 10 feeds for performance
    
    for(let i = 0; i < maxFeeds; i++){
      const site = mastodonSites[i];
      try {
        const feed = await loadJson(`/data/feeds/${encodeURIComponent(site.slug)}.json`);
        if(feed.mastodon && feed.social && feed.social.length > 0){
          const latest = feed.social[0];
          feeds.push({
            ...latest,
            siteName: site.name,
            siteSlug: site.slug,
            mastodonUrl: site.mastodon
          });
        }
      } catch(err){
        // Skip failed feeds
        continue;
      }
    }

    if(feeds.length === 0){
      q("#latestMastodon").innerHTML = '<div class="notice">Nu există postări Mastodon disponibile momentan.</div>';
      return;
    }

    // Find the most recent post
    feeds.sort((a, b) => {
      const dateA = a.published ? new Date(a.published) : new Date(0);
      const dateB = b.published ? new Date(b.published) : new Date(0);
      return dateB - dateA;
    });

    const latest = feeds[0];
    const title = escapeHtml(latest.title || "Post Mastodon");
    const link = latest.link || latest.mastodonUrl || "#";
    const summaryText = (latest.summary || "").slice(0, 100);
    const summary = escapeHtml(summaryText);
    const hasMore = latest.summary && latest.summary.length > 100;
    const when = latest.published_human || "";
    const siteName = escapeHtml(latest.siteName || "");
    const siteUrl = `/publisher/${encodeURIComponent(latest.siteSlug)}/`;

    q("#latestMastodon").innerHTML = `
      <div class="feed-item" style="margin-top:0; background: linear-gradient(135deg, rgba(231,255,252,.4), rgba(255,255,255,.9)); border-color: rgba(43,179,167,.2);">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px; flex-wrap:wrap;">
          <span class="tag social" style="margin:0;">Mastodon</span>
          <small style="color: var(--muted); font-weight:600;">${siteName}</small>
        </div>
        <a href="${link}" target="_blank" rel="nofollow noopener" style="font-weight:800; font-size:15px; line-height:1.4; display:block; margin-bottom:10px; color: var(--text); text-decoration:none;">
          ${title}
        </a>
        ${summary ? `<a href="${link}" target="_blank" rel="nofollow noopener" style="text-decoration:none; color: inherit;"><div class="sum" style="margin-top:10px; font-size:14px; line-height:1.6; color: rgba(17,20,37,.8); cursor:pointer;">${summary}${hasMore ? "…" : ""}</div></a>` : ""}
        <div class="meta" style="margin-top:12px; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
          ${when ? `<span style="color: var(--muted); font-size:12.5px;">🗓️ ${when}</span>` : ""}
          <a href="${link}" target="_blank" rel="nofollow noopener" style="color: var(--accent); font-weight:600; font-size:13px;">Citește pe Mastodon →</a>
          <a href="${siteUrl}" style="color: var(--muted); font-size:12.5px;">Vezi publisher</a>
        </div>
      </div>
    `;
  }

  loadLatestMastodon();

  // Load engagement tracker
  (function(){
    const script = document.createElement('script');
    script.src = '/assets/engagement-tracker.js';
    script.async = true;
    document.head.appendChild(script);
  })();
})();
