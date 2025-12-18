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

  // category filter options
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
    const tags = `
      <span class="tag rss">RSS</span>
      ${hasSocial ? '<span class="tag social">Mastodon</span>' : ''}
      <span class="tag">${escapeHtml(s.category || "Diverse")}</span>
    `;
    // Use description_short for publishers page (more detailed)
    const desc = s.description_short || s.description_small || "";
    return `
      <a class="site" href="${url}">
        <div class="site-top">
          <div>
            <p class="site-name">${escapeHtml(s.name || s.slug)}</p>
            ${desc ? `<p class="site-desc">${escapeHtml(desc)}</p>` : ''}
            <div class="site-meta">${tags}</div>
          </div>
          <small>${escapeHtml((s.url||"").replace(/^https?:\/\//,"").replace(/\/$/,""))}</small>
        </div>
      </a>
    `;
  }

  function apply(){
    const term = (q("#search")?.value || "").trim().toLowerCase();
    const cat = q("#category")?.value || "";
    const socialOnly = q("#socialOnly")?.checked || false;

    const filtered = sites.filter(s=>{
      if(cat && (s.category||"") !== cat) return false;
      if(socialOnly && !s.mastodon) return false;

      if(!term) return true;
      const hay = `${s.name||""} ${s.url||""} ${s.slug||""} ${s.category||""} ${s.description_small||""} ${s.description_short||""}`.toLowerCase();
      return hay.includes(term);
    });

    const countEl = q("#count");
    if(countEl) countEl.textContent = filtered.length;
    if(list) list.innerHTML = filtered.map(card).join("");
  }

  const searchEl = q("#search");
  const categoryEl = q("#category");
  const socialOnlyEl = q("#socialOnly");

  if(searchEl) searchEl.addEventListener("input", apply);
  if(categoryEl) categoryEl.addEventListener("change", apply);
  if(socialOnlyEl) socialOnlyEl.addEventListener("change", apply);

  // initial render
  const countEl = q("#count");
  if(countEl) countEl.textContent = total;
  if(list) list.innerHTML = sites.map(card).join("");
})();

