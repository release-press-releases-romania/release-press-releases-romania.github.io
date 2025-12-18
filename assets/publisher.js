(async function(){
  const el = document.body;
  const slug = el.getAttribute("data-slug");
  const siteUrl = el.getAttribute("data-site-url");
  const rssUrl = el.getAttribute("data-rss");
  const mdUrl = el.getAttribute("data-mastodon");
  const mdRss = el.getAttribute("data-mastodon-rss");

  q("#siteLink").href = siteUrl;
  q("#siteLink").textContent = siteUrl.replace(/^https?:\/\//,"").replace(/\/$/,"");

  q("#rssLink").href = rssUrl;
  q("#rssLink").textContent = rssUrl;

  if(mdUrl){
    q("#mastodonBlock").style.display = "";
    q("#mastodonLink").href = mdUrl;
    q("#mastodonLink").textContent = mdUrl.replace(/^https?:\/\//,"");
    q("#mastodonRss").href = mdRss;
  } else {
    q("#mastodonBlock").style.display = "none";
  }

  let feed;
  try{
    feed = await loadJson(`/data/feeds/${encodeURIComponent(slug)}.json`);
  }catch(err){
    q("#status").innerHTML = `<div class="notice">Nu am găsit încă fișierul de feed pentru acest publisher. Rulează workflow-ul <b>Update feeds</b> în GitHub Actions și reîncarcă pagina.</div>`;
    return;
  }

  const updated = feed.updated_at ? fmtDate(feed.updated_at) : "";
  q("#updatedAt").textContent = updated ? `Ultima actualizare: ${updated}` : "Ultima actualizare: în așteptare";

  function renderItems(items, targetId){
    const box = q(targetId);
    if(!items || !items.length){
      box.innerHTML = `<div class="notice">Nu există încă articole în cache. În câteva minute după primul update ar trebui să apară.</div>`;
      return;
    }
    box.innerHTML = items.slice(0,10).map(it=>{
      const title = escapeHtml(it.title || "Articol");
      const link = escapeHtml(it.link || "#");
      const when = escapeHtml(it.published_human || "");
      const source = it.source ? escapeHtml(it.source) : "";
      const sum = escapeHtml(it.summary || "").slice(0, 340);
      return `
        <div class="feed-item">
          <a href="${link}" target="_blank" rel="noopener">${title}</a>
          <div class="meta">
            ${when ? `<span>🗓️ ${when}</span>` : ""}
            ${source ? `<span>🔗 ${source}</span>` : ""}
          </div>
          ${sum ? `<div class="sum">${sum}${it.summary && it.summary.length>340 ? "…" : ""}</div>` : ""}
        </div>
      `;
    }).join("");
  }

  renderItems(feed.items || [], "#siteFeed");

  if(mdUrl){
    renderItems((feed.social || []).map(x=>({...x, source: "Mastodon"})), "#mastodonFeed");
  }
})();
