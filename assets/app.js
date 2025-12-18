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
  function card(s){
    const hasSocial = !!s.mastodon;
    const url = `/publisher/${encodeURIComponent(s.slug)}/`;
    const tags = `
      <span class="tag rss">RSS</span>
      ${hasSocial ? '<span class="tag social">Mastodon</span>' : ''}
      <span class="tag">${escapeHtml(s.category || "Diverse")}</span>
    `;
    return `
      <a class="site" href="${url}">
        <div class="site-top">
          <div>
            <p class="site-name">${escapeHtml(s.name || s.slug)}</p>
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
      const hay = `${s.name||""} ${s.url||""} ${s.slug||""} ${s.category||""}`.toLowerCase();
      return hay.includes(term);
    });

    q("#count").textContent = filtered.length;
    list.innerHTML = filtered.map(card).join("");
  }

  q("#search").addEventListener("input", apply);
  q("#category").addEventListener("change", apply);
  q("#socialOnly").addEventListener("change", apply);

  // initial
  q("#count").textContent = total;
  list.innerHTML = sites.map(card).join("");

  // small featured chips
  const chips = q("#chips");
  const topCats = cats
    .map(c=>({c, n: byCat.get(c)}))
    .sort((a,b)=>b.n-a.n)
    .slice(0,5);

  chips.innerHTML = topCats.map(x=>`<span class="pill ${x.c.includes("Tehnologie")?'green':''}"><i></i>${escapeHtml(x.c)} <small>· ${x.n}</small></span>`).join("");
})();
