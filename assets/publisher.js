(async function(){
  const el = document.body;
  const slug = el.getAttribute("data-slug");
  const siteUrl = el.getAttribute("data-site-url");
  const rssUrl = el.getAttribute("data-rss");
  const mdUrl = el.getAttribute("data-mastodon");
  const mdRss = el.getAttribute("data-mastodon-rss");

  // Mix dofollow/nofollow: ~70% dofollow, ~30% nofollow for external links
  // Internal links are always dofollow
  const useNofollow = Math.random() < 0.3; // 30% chance for nofollow
  const relAttr = useNofollow ? "nofollow noopener" : "noopener";
  
  const siteLinkEl = q("#siteLink");
  if(siteLinkEl) {
    siteLinkEl.href = siteUrl;
    siteLinkEl.textContent = siteUrl.replace(/^https?:\/\//,"").replace(/\/$/,"");
    siteLinkEl.setAttribute("rel", relAttr);
  }

  const rssLinkEl = q("#rssLink");
  if(rssLinkEl) {
    rssLinkEl.href = rssUrl;
    rssLinkEl.textContent = rssUrl;
    rssLinkEl.setAttribute("rel", "nofollow noopener"); // RSS links are nofollow
  }

  if(mdUrl){
    q("#mastodonBlock").style.display = "";
    const mastodonLinkEl = q("#mastodonLink");
    if(mastodonLinkEl) {
      mastodonLinkEl.href = mdUrl;
      mastodonLinkEl.textContent = mdUrl.replace(/^https?:\/\//,"");
      mastodonLinkEl.setAttribute("rel", "nofollow noopener");
    }
    const mastodonRssEl = q("#mastodonRss");
    if(mastodonRssEl) {
      mastodonRssEl.href = mdRss;
      mastodonRssEl.setAttribute("rel", "nofollow noopener");
    }
  } else {
    q("#mastodonBlock").style.display = "none";
  }

  let feed;
  try{
    feed = await loadJson(`/data/feeds/${encodeURIComponent(slug)}.json`);
  }catch(err){
    q("#status").innerHTML = `<div class="notice">Feed file not found yet for this publisher. Run the <b>Update feeds</b> workflow in GitHub Actions and reload the page.</div>`;
    return;
  }

  const updated = feed.updated_at ? fmtDate(feed.updated_at) : "";
  q("#updatedAt").textContent = updated ? `Last update: ${updated}` : "Last update: pending";

  function renderItems(items, targetId){
    const box = q(targetId);
    if(!items || !items.length){
      box.innerHTML = `<div class="notice">No articles in cache yet. They should appear a few minutes after the first update.</div>`;
      return;
    }
    // Rate limiting: Show first 5 items, then load more
    const INITIAL_ITEMS = 5;
    const itemsToShow = items.slice(0, INITIAL_ITEMS);
    
    // Mix dofollow/nofollow for external article links with natural variation
    box.innerHTML = itemsToShow.map((it, idx)=>{
      const title = escapeHtml(it.title || "Articol");
      const link = escapeHtml(it.link || "#");
      const when = escapeHtml(it.published_human || "");
      const source = it.source ? escapeHtml(it.source) : "";
      const sum = escapeHtml(it.summary || "").slice(0, 340);
      
      // Natural variation: First 2 items dofollow, rest have chance of nofollow
      // Also vary based on content quality (longer summaries = more valuable)
      const isHighValue = (it.summary || "").length > 200;
      const useNofollow = idx >= 2 && !isHighValue && Math.random() < 0.5;
      const relAttr = useNofollow ? "nofollow noopener" : "noopener";
      
      // Vary anchor text naturally - never repeat, always dynamic
      // Multiple variations to avoid pattern detection
      const anchorVariations = [
        title.length > 60 ? title.slice(0, 60) + "…" : title,
        title.length > 55 ? title.slice(0, 55) + "…" : title,
        title.length > 65 ? title.slice(0, 65) + "…" : title,
        title
      ];
      // Use different variation based on index and random for natural distribution
      const anchorText = anchorVariations[(idx + Math.floor(Math.random() * anchorVariations.length)) % anchorVariations.length];
      
      // Mix of text and image links for external articles (30% chance for image link)
      const useImageLink = Math.random() < 0.3 && idx > 0; // Don't use image for first item
      const linkClass = useImageLink ? "feed-title-image" : "feed-title-text";
      
      return `
        <div class="feed-item">
          ${useImageLink ? `
            <a href="${link}" target="_blank" rel="${relAttr}" class="${linkClass}" aria-label="Read article: ${escapeHtml(title)}">
              <img src="/assets/images/logo.svg" alt="${escapeHtml(title)}" width="24" height="24" style="vertical-align: middle; margin-right: 8px; opacity: 0.7;">
              <span>${anchorText}</span>
            </a>
          ` : `
            <a href="${link}" target="_blank" rel="${relAttr}" class="${linkClass}">${anchorText}</a>
          `}
          <div class="meta">
            ${when ? `<span>🗓️ ${when}</span>` : ""}
            ${source ? `<span>🔗 ${source}</span>` : ""}
          </div>
          ${sum ? `<div class="sum">${sum}${it.summary && it.summary.length>340 ? "…" : ""}</div>` : ""}
        </div>
      `;
    }).join("");
    
    // Add "Load more" if there are more items
    if(items.length > INITIAL_ITEMS) {
      const loadMoreBtn = document.createElement("button");
      loadMoreBtn.className = "btn";
      loadMoreBtn.textContent = `Load more articles (${items.length - INITIAL_ITEMS} remaining)`;
      loadMoreBtn.style.marginTop = "12px";
      loadMoreBtn.style.width = "100%";
      let currentIndex = INITIAL_ITEMS;
      
      loadMoreBtn.addEventListener("click", () => {
        const nextBatch = items.slice(currentIndex, currentIndex + 5);
        nextBatch.forEach((it, idx) => {
          const title = escapeHtml(it.title || "Articol");
          const link = escapeHtml(it.link || "#");
          const when = escapeHtml(it.published_human || "");
          const source = it.source ? escapeHtml(it.source) : "";
          const sum = escapeHtml(it.summary || "").slice(0, 340);
          const useNofollow = Math.random() < 0.5;
          const relAttr = useNofollow ? "nofollow noopener" : "noopener";
          // Dynamic anchor text variations - never repeat
          const anchorVariations = [
            title.length > 60 ? title.slice(0, 60) + "…" : title,
            title.length > 55 ? title.slice(0, 55) + "…" : title,
            title.length > 65 ? title.slice(0, 65) + "…" : title,
            title
          ];
          const anchorText = anchorVariations[(currentIndex + idx + Math.floor(Math.random() * anchorVariations.length)) % anchorVariations.length];
          
          // Mix of text and image links (30% chance for image link)
          const useImageLink = Math.random() < 0.3;
          const linkClass = useImageLink ? "feed-title-image" : "feed-title-text";
          
          const itemHtml = `
            <div class="feed-item">
              ${useImageLink ? `
                <a href="${link}" target="_blank" rel="${relAttr}" class="${linkClass}" aria-label="Read article: ${escapeHtml(title)}">
                  <img src="/assets/images/logo.svg" alt="${escapeHtml(title)}" width="24" height="24" style="vertical-align: middle; margin-right: 8px; opacity: 0.7;">
                  <span>${anchorText}</span>
                </a>
              ` : `
                <a href="${link}" target="_blank" rel="${relAttr}" class="${linkClass}">${anchorText}</a>
              `}
              <div class="meta">
                ${when ? `<span>🗓️ ${when}</span>` : ""}
                ${source ? `<span>🔗 ${source}</span>` : ""}
              </div>
              ${sum ? `<div class="sum">${sum}${it.summary && it.summary.length>340 ? "…" : ""}</div>` : ""}
            </div>
          `;
          box.insertAdjacentHTML("beforeend", itemHtml);
        });
        
        currentIndex += 5;
        if(currentIndex >= items.length) {
          loadMoreBtn.remove();
        } else {
          loadMoreBtn.textContent = `Load more articles (${items.length - currentIndex} remaining)`;
        }
      });
      
      box.parentElement.appendChild(loadMoreBtn);
    }
  }

  renderItems(feed.items || [], "#siteFeed");

  if(mdUrl){
    renderItems((feed.social || []).map(x=>({...x, source: "Mastodon"})), "#mastodonFeed");
  }

  // Randomize related publishers links for SEO - different links each visit
  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Randomize related publishers in same category section
  // Show max 3 initially, then "Load more" for natural link distribution
  const relatedSection = document.querySelector('section.card .list');
  if(relatedSection) {
    const sites = Array.from(relatedSection.children);
    if(sites.length > 3) {
      // Shuffle and show max 3 random publishers initially
      const shuffled = shuffleArray(sites);
      relatedSection.innerHTML = '';
      shuffled.slice(0, 3).forEach(site => {
        relatedSection.appendChild(site);
      });
      
      // Add "Load more" button if there are more publishers
      if(shuffled.length > 3) {
        const loadMoreBtn = document.createElement("button");
        loadMoreBtn.className = "btn";
        loadMoreBtn.textContent = `Load more publishers from this category (${shuffled.length - 3} remaining)`;
        loadMoreBtn.style.marginTop = "12px";
        loadMoreBtn.style.width = "100%";
        let currentIndex = 3;
        
        loadMoreBtn.addEventListener("click", () => {
          const nextBatch = shuffled.slice(currentIndex, currentIndex + 3);
          nextBatch.forEach(site => {
            relatedSection.appendChild(site);
          });
          currentIndex += 3;
          if(currentIndex >= shuffled.length) {
            loadMoreBtn.remove();
          } else {
            loadMoreBtn.textContent = `Load more publishers (${shuffled.length - currentIndex} remaining)`;
          }
        });
        
        relatedSection.parentElement.appendChild(loadMoreBtn);
      }
    }
  }

  // Randomize footer links order (subtle randomization)
  const footer = document.querySelector('.footer');
  if(footer && footer.querySelectorAll('a').length > 2) {
    const links = Array.from(footer.querySelectorAll('a'));
    const shuffledLinks = shuffleArray(links);
    const separator = ' | ';
    const brMatch = footer.innerHTML.match(/<br>.*/);
    footer.innerHTML = shuffledLinks.map((link, i) => 
      i > 0 ? separator + link.outerHTML : link.outerHTML
    ).join('') + (brMatch ? brMatch[0] : '');
  }

  // Vary anchor text naturally for related publishers - never repeat
  const relatedLinks = document.querySelectorAll('section.card .list a');
  const usedVariations = new Set(); // Track used variations to avoid repetition
  
  relatedLinks.forEach((link, idx) => {
    const nameEl = link.querySelector('.site-name');
    if(nameEl) {
      const originalText = nameEl.textContent.trim();
      // Extended natural variations - more diverse
      const variations = [
        originalText,
        `View ${originalText}`,
        `${originalText} →`,
        `Access ${originalText}`,
        `Browse ${originalText}`,
        `Explore ${originalText}`,
        `${originalText} press releases`,
        `See ${originalText}`
      ];
      
      // Shuffle variations and pick one not used yet
      const shuffled = variations.sort(() => Math.random() - 0.5);
      let selectedVariation = originalText;
      
      for(const variation of shuffled) {
        if(!usedVariations.has(variation)) {
          selectedVariation = variation;
          usedVariations.add(variation);
          break;
        }
      }
      
      // Apply variation with 50% chance (more natural)
      if(selectedVariation !== originalText && Math.random() < 0.5) {
        nameEl.textContent = selectedVariation;
      }
    }
    
    // Also vary external links to publisher websites
    const externalLink = link.querySelector('a[href^="http"]');
    if(externalLink && !externalLink.href.includes(window.location.hostname)) {
      // Mix dofollow/nofollow for external publisher links
      const useNofollow = Math.random() < 0.3;
      externalLink.setAttribute('rel', useNofollow ? 'nofollow noopener' : 'noopener');
    }
  });
})();

// Load engagement tracker
(function(){
  if(typeof document !== 'undefined') {
    const script = document.createElement('script');
    script.src = '/assets/engagement-tracker.js';
    script.async = true;
    document.head.appendChild(script);
  }
})();
