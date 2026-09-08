const STORAGE_KEY = "b612_scent_vault_v1";
const SHARE_HISTORY_KEY = "oud_haenir_share_history_v1";

const $ = id => document.getElementById(id);
const esc = (v="") => String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

function readCollection(){
  try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(data)?data:[];}catch{return [];}
}
function currentPerfume(){
  const id=$("perfumeId")?.value;
  if(!id)return null;
  return readCollection().find(x=>x.id===id)||null;
}
function shareText(item){
  if(!item)return "";
  const lines=[`${item.brand||""} ${item.name||""}`.trim()];
  if(item.concentration) lines.push(`Concentração: ${item.concentration}`);
  if(item.profile) lines.push(`Perfil: ${item.profile}`);
  if(item.overallScore!==null&&item.overallScore!==undefined&&item.overallScore!=="") lines.push(`Nota: ${Number(item.overallScore).toFixed(1)}/10`);
  if(item.inspirationName) lines.push(`Inspiração / similar: ${item.inspirationName}${item.inspirationHouse?` — ${item.inspirationHouse}`:""}`);
  if(item.parfumoUrl) lines.push(`Parfumo: ${item.parfumoUrl}`);
  lines.push("Partilhado a partir do Oud d’Haenir");
  return lines.join("\n");
}
function saveShare(item,channel){
  if(!item)return;
  let history=[];
  try{history=JSON.parse(localStorage.getItem(SHARE_HISTORY_KEY)||"[]");if(!Array.isArray(history))history=[];}catch{history=[];}
  history.unshift({name:item.name||"Perfume",brand:item.brand||"",channel,at:Date.now()});
  localStorage.setItem(SHARE_HISTORY_KEY,JSON.stringify(history.slice(0,20)));
  renderFriends();
}
function injectShareButtons(){
  const actions=document.querySelector("#perfumeForm .dialog-actions");
  if(!actions||$("sharePerfumeBtn"))return;
  const host=document.createElement("div");
  host.className="share-actions";
  host.id="shareActions";
  host.innerHTML=`<button type="button" id="sharePerfumeBtn">Partilhar</button><div id="shareChannels" class="share-channels hidden"><button type="button" id="shareWhatsApp">WhatsApp</button><button type="button" id="shareEmail">Email</button></div>`;
  actions.parentNode.insertBefore(host,actions);
  $("sharePerfumeBtn").addEventListener("click",()=>{
    const item=currentPerfume();
    if(!item){alert("Guarda primeiro o perfume para poderes partilhar a ficha.");return;}
    $("shareChannels").classList.toggle("hidden");
  });
  $("shareWhatsApp").addEventListener("click",()=>{
    const item=currentPerfume(); if(!item)return;
    const url=`https://wa.me/?text=${encodeURIComponent(shareText(item))}`;
    saveShare(item,"WhatsApp"); window.open(url,"_blank","noopener");
  });
  $("shareEmail").addEventListener("click",()=>{
    const item=currentPerfume(); if(!item)return;
    const subject=`Oud d’Haenir — ${item.brand||""} ${item.name||""}`.trim();
    const url=`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareText(item))}`;
    saveShare(item,"Email"); window.location.href=url;
  });
}
function injectStyles(){
  if($("socialStyles"))return;
  const s=document.createElement("style");s.id="socialStyles";s.textContent=`
    .share-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:16px 0 6px}.share-actions>button{font-weight:750}.share-channels{display:flex;gap:8px;flex-wrap:wrap}.share-channels.hidden{display:none}
    .friends-panel{max-width:1280px;margin:18px auto 0;padding:0 22px}.friends-card{border:1px solid var(--line);background:var(--panel);border-radius:18px;padding:20px}.friends-card h3{margin:4px 0 8px}.friends-card p{margin:0;color:var(--muted);line-height:1.5}.friends-history{display:grid;gap:9px;margin-top:16px}.friends-share-row{display:flex;justify-content:space-between;gap:14px;padding:10px 0;border-top:1px solid var(--line);font-size:.86rem}.friends-share-row small{color:var(--muted)}
  `;document.head.appendChild(s);
}
function injectFriends(){
  const tabs=document.querySelector(".tabs"); if(!tabs||$("friendsTab"))return;
  const btn=document.createElement("button");btn.type="button";btn.className="tab";btn.id="friendsTab";btn.textContent="Amigos";tabs.appendChild(btn);
  const main=document.querySelector("main"); if(!main)return;
  const panel=document.createElement("section");panel.id="friendsPanel";panel.className="friends-panel hidden";
  panel.innerHTML=`<div class="friends-card"><div class="eyebrow">SOCIAL</div><h3>Amigos</h3><p>Partilha fichas de perfumes por WhatsApp ou email. Aqui ficam também as tuas partilhas recentes.</p><div id="friendsHistory" class="friends-history"></div></div>`;
  main.appendChild(panel);
  btn.addEventListener("click",e=>{
    e.preventDefault();e.stopImmediatePropagation();
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));btn.classList.add("active");
    $("friendsPanel").classList.remove("hidden");
    $("grid").classList.add("hidden");$("empty").classList.add("hidden");
    document.querySelector(".filters")?.classList.add("hidden");
    renderFriends();
  },true);
  document.querySelectorAll(".tab:not(#friendsTab)").forEach(tab=>tab.addEventListener("click",()=>{
    $("friendsPanel")?.classList.add("hidden");$("grid")?.classList.remove("hidden");document.querySelector(".filters")?.classList.remove("hidden");
  },true));
}
function renderFriends(){
  const host=$("friendsHistory"); if(!host)return;
  let history=[];try{history=JSON.parse(localStorage.getItem(SHARE_HISTORY_KEY)||"[]");if(!Array.isArray(history))history=[];}catch{history=[];}
  if(!history.length){host.innerHTML=`<small>Ainda não partilhaste nenhuma ficha.</small>`;return;}
  host.innerHTML=history.map(x=>`<div class="friends-share-row"><span><strong>${esc(x.brand)}</strong> ${esc(x.name)}</span><small>${esc(x.channel)} · ${new Date(x.at).toLocaleDateString("pt-PT")}</small></div>`).join("");
}
function removeBestPriceFromCards(){
  document.querySelectorAll("#grid .card").forEach(card=>{
    const name=card.querySelector("h3")?.textContent||"";
    const item=readCollection().find(x=>(x.name||"").trim().toLowerCase()===name.trim().toLowerCase());
    const first=card.querySelector(".card-foot>div:first-child");
    if(first){first.innerHTML=`<small>Concentração</small><strong>${esc(item?.concentration||"—")}</strong>`;}
  });
}
function watchCards(){
  const grid=$("grid"); if(!grid)return;
  removeBestPriceFromCards();
  new MutationObserver(()=>removeBestPriceFromCards()).observe(grid,{childList:true,subtree:true});
}

injectStyles();
injectShareButtons();
injectFriends();
watchCards();
