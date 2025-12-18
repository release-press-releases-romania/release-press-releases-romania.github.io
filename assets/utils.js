function q(sel, root=document){ return root.querySelector(sel); }
function qa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function fmtDate(s){
  if(!s) return "";
  const d = new Date(s);
  if(Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {year:"numeric", month:"short", day:"2-digit"});
}

async function loadJson(url){
  const r = await fetch(url, {cache:"no-store"});
  if(!r.ok) throw new Error(`Failed ${r.status} for ${url}`);
  return await r.json();
}
