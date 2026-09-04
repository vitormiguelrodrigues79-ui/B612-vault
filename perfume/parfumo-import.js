import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_KEY } from "../supabase-config.js";

const STORAGE_KEY="b612_scent_vault_v1";
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let pendingImport=null;
let pendingSuggestion=null;

const $=id=>document.getElementById(id);
const norm=v=>String(v||"").trim();

function injectStyles(){
  if($("parfumoImportStyles"))return;
  const s=document.createElement("style");s.id="parfumoImportStyles";s.textContent=`
  .parfumo-import{grid-column:span 2;border:1px solid var(--line);border-radius:16px;padding:14px;background:color-mix(in srgb,var(--panel) 92%,var(--accent2) 8%);display:grid;gap:10px}
  .parfumo-import-head strong{font-size:.9rem}.parfumo-import-head span{font-size:.72rem;color:var(--muted)}
  .parfumo-import-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.parfumo-import-row input{margin:0!important}
  .parfumo-import-row button,.parfumo-import-actions button{padding:10px 13px;border-radius:12px;border:1px solid var(--line);font-weight:750}
  .parfumo-import-row button,.parfumo-import-actions .primary-import{background:var(--ink);color:var(--bg);border-color:var(--ink)}
  .parfumo-import-actions{display:flex;gap:8px;flex-wrap:wrap}.parfumo-status{font-size:.78rem;line-height:1.45;color:var(--muted)}
  .parfumo-status.ok{color:var(--accent)}.parfumo-status.error{color:var(--danger)}.parfumo-suggestions{display:grid;gap:8px}
  .parfumo-suggestion{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;text-align:left;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
  .parfumo-suggestion strong{display:block;font-size:.86rem}.parfumo-suggestion small{display:block;color:var(--muted);margin-top:2px}.parfumo-suggestion span:last-child{font-size:.72rem;font-weight:800;color:var(--accent)}
  .parfumo-preview{display:none;grid-template-columns:72px minmax(0,1fr);gap:12px;align-items:center}.parfumo-preview.show{display:grid}.parfumo-preview img{width:72px;height:82px;object-fit:contain;border:1px solid var(--line);border-radius:12px;background:#fff;padding:5px}
  .parfumo-preview strong{display:block}.parfumo-preview small{display:block;color:var(--muted);margin-top:3px;line-height:1.4}
  .import-note{font-size:.7rem;color:var(--muted);font-weight:500;margin-top:4px;display:block}
  @media(max-width:560px){.parfumo-import{grid-column:span 1}.parfumo-import-row{grid-template-columns:1fr}.parfumo-import-row button{width:100%}.parfumo-import-actions{display:grid;grid-template-columns:1fr 1fr}.parfumo-import-actions button{width:100%}}
  `;document.head.appendChild(s);
}

function ensureExtraFields(){
  const grid=$("name")?.closest(".form-grid"); if(!grid||$("releaseYear"))return;
  const concentration=$("concentration")?.closest("label");
  const year=document.createElement("label"); year.innerHTML='Ano<input id="releaseYear" type="number" min="1800" max="2100" step="1" placeholder="2025">';
  concentration?.after(year);
  const base=$("baseNotes")?.closest("label");
  const wrap=document.createElement("div");wrap.className="span2";wrap.innerHTML=`<div class="form-grid">
    <label>Similar a<input id="inspirationName" placeholder="Ex.: Naxos"></label>
    <label>Marca da referência<input id="inspirationHouse" placeholder="Ex.: Xerjoff"></label>
    <label class="span2">Link da referência<input id="inspirationUrl" type="url" placeholder="https://www.parfumo.com/..."><span class="import-note">Podes alterar estes campos manualmente depois da importação.</span></label>
  </div>`;
  base?.after(wrap);
}

function ensureUi(){
  ensureExtraFields(); if($("parfumoImport"))return;
  const name=$("name"),grid=name?.closest(".form-grid");if(!name||!grid)return;
  const box=document.createElement("div");box.id="parfumoImport";box.className="parfumo-import";
  box.innerHTML=`<div class="parfumo-import-head"><strong>Parfumo</strong><span> · pesquisar e preencher ficha</span></div>
  <div class="parfumo-import-row"><input id="parfumoUrl" type="url" inputmode="url" placeholder="URL da ficha Parfumo (opcional)"><button type="button" id="parfumoFetch">Importar URL</button></div>
  <div class="parfumo-import-actions"><button type="button" id="parfumoSearch" class="primary-import">Pesquisar nome / marca</button><button type="button" id="parfumoClear">Limpar</button></div>
  <div id="parfumoStatus" class="parfumo-status">Podes pesquisar só por nome, só por marca, ou pelos dois.</div><div id="parfumoSuggestions" class="parfumo-suggestions"></div>
  <div id="parfumoPreview" class="parfumo-preview"><img id="parfumoPreviewImg" alt=""><div><strong id="parfumoPreviewName"></strong><small id="parfumoPreviewMeta"></small></div></div>`;
  const label=name.closest("label");label?.nextSibling?grid.insertBefore(box,label.nextSibling):grid.appendChild(box);
  $("parfumoFetch")?.addEventListener("click",importByUrl);$("parfumoSearch")?.addEventListener("click",searchParfumo);$("parfumoClear")?.addEventListener("click",clearImport);
}

function status(t,type=""){const e=$("parfumoStatus");if(e){e.textContent=t;e.className=`parfumo-status ${type}`.trim()}}
function clearSuggestions(){if($("parfumoSuggestions"))$("parfumoSuggestions").innerHTML=""}
function clearImport(){pendingImport=null;pendingSuggestion=null;$("parfumoPreview")?.classList.remove("show");if($("parfumoUrl"))$("parfumoUrl").value="";clearSuggestions();status("Podes pesquisar só por nome, só por marca, ou pelos dois.")}
async function ensureSession(){const {data}=await supabase.auth.getSession();if(data.session)return data.session;const {data:a,error}=await supabase.auth.signInAnonymously();if(error)throw error;return a.session}
async function invoke(body){await ensureSession();const {data,error}=await supabase.functions.invoke("parfumo-import",{body});if(error)throw new Error(error?.context?.body?.error||error?.message||"Falha ao consultar o Parfumo.");if(data?.error)throw new Error(data.error);return data}
function setBusy(v){["parfumoFetch","parfumoSearch"].forEach(id=>{const b=$(id);if(b)b.disabled=v})}

async function searchParfumo(){setBusy(true);clearSuggestions();status("A procurar opções no Parfumo…");try{const brand=norm($("brand")?.value),name=norm($("name")?.value);if(!brand&&!name)throw new Error("Escreve pelo menos parte do nome ou da marca.");const data=await invoke({brand,name,mode:"suggest"});const list=Array.isArray(data?.suggestions)?data.suggestions:[];if(!list.length){status("Não encontrei opções. Experimenta outra parte do nome/marca ou cola o URL da ficha.","error");return}renderSuggestions(list);status(`${list.length} opção${list.length===1?"":"ões"} encontrada${list.length===1?"":"s"}. Escolhe a ficha certa.`)}catch(e){status(e?.message||"Não foi possível pesquisar no Parfumo.","error")}finally{setBusy(false)}}
function renderSuggestions(list){const host=$("parfumoSuggestions");if(!host)return;host.innerHTML="";list.forEach(c=>{const b=document.createElement("button");b.type="button";b.className="parfumo-suggestion";b.innerHTML=`<span><strong>${esc(c.title||"Perfume")}</strong><small>${esc(c.brand||"Marca desconhecida")}</small></span><span>Selecionar</span>`;b.addEventListener("click",()=>loadSuggestion(c.url,c));host.appendChild(b)})}

function stripArabic(s){return norm(s).replace(/[\u0600-\u06ff]+/g," ").replace(/\s+/g," ").trim()}
function extractYear(...vals){for(const v of vals){const m=String(v||"").match(/\b(19|20)\d{2}\b/);if(m)return Number(m[0])}return null}
function escRe(s){return String(s||"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
function cleanIdentity(p,hint={}){
  let brand=norm(p.brand)||norm(hint.brand);
  let raw=norm(p.name)||norm(p.title)||norm(hint.title);
  let year=Number(p.year)||extractYear(raw,hint.title);
  raw=stripArabic(raw).replace(/\b(19|20)\d{2}\b/g," ").replace(/\s+/g," ").trim();
  if(brand){raw=raw.replace(new RegExp(`(?:^|\\s)${escRe(brand)}(?:$|\\s)`,`ig`)," ").replace(/\s+/g," ").trim()}
  if(!brand&&hint.title){const cleaned=stripArabic(hint.title).replace(/\b(19|20)\d{2}\b/g,"").trim();const parts=cleaned.split(/\s{2,}|\s[-–—]\s/);if(parts.length>1){raw=parts[0].trim();brand=parts.slice(1).join(" ").trim()}}
  return {brand,name:raw||norm(p.title)||norm(hint.title),year};
}
function parseConcentration(p){const direct=norm(p.concentration||p.type);if(direct)return direct;const t=[p.title,p.subtitle,p.description].join(" ");const m=t.match(/\b(Eau de Parfum|Eau de Toilette|Extrait de Parfum|Parfum|EDP|EDT|Extrait)\b/i);return m?m[0]:""}
function profileFrom(p){if(Array.isArray(p.accords)&&p.accords.length)return p.accords.slice(0,6).join(" · ");const notes=[...(p.topNotes||[]),...(p.heartNotes||[]),...(p.baseNotes||[])].filter(Boolean);return [...new Set(notes)].slice(0,6).join(" · ")}

function recommendedUse(p){
  if((Array.isArray(p.seasons)&&p.seasons.length)||(Array.isArray(p.times)&&p.times.length))return {seasons:p.seasons||[],times:p.times||[]};
  const txt=[...(p.accords||[]),...(p.topNotes||[]),...(p.heartNotes||[]),...(p.baseNotes||[])].join(" ").toLowerCase();
  const count=words=>words.reduce((n,w)=>n+(txt.includes(w)?1:0),0);
  const fresh=count(["citrus","bergamot","lemon","lime","grapefruit","orange","mandarin","aquatic","marine","ozonic","mint","tea","green","neroli","lavender","aromatic","fresh"]);
  const floral=count(["floral","jasmine","rose","iris","violet","orange blossom"]);
  const warm=count(["vanilla","amber","tobacco","oud","leather","incense","benzoin","tonka","cinnamon","coffee","cacao","honey","rum","cognac","resin","spicy","woody","patchouli","sandalwood"]);
  let seasons=[],times=[];
  if(fresh>=warm+2){seasons=["Primavera","Verão"];times=["Dia"]}
  else if(warm>=fresh+3){seasons=["Outono","Inverno"];times=["Noite"]}
  else if(warm>fresh){seasons=["Outono","Inverno"];times=["Dia","Noite"]}
  else if(fresh>0||floral>0){seasons=["Primavera","Verão","Outono"];times=["Dia","Noite"]}
  else {seasons=["Primavera","Outono"];times=["Dia","Noite"]}
  return {seasons,times};
}
function setChecks(name,values){const vals=new Set(values||[]);document.querySelectorAll(`input[name="${name}"]`).forEach(cb=>cb.checked=vals.has(cb.value))}
function setValue(id,v,overwrite=true){const e=$(id);if(!e||v===undefined||v===null)return;if(overwrite||!norm(e.value))e.value=String(v)}

async function loadSuggestion(url,hint=null){setBusy(true);pendingSuggestion=hint||null;status("A carregar a ficha selecionada…");try{const data=await invoke({url});if(!data?.perfume)throw new Error("A ficha selecionada não pôde ser lida.");pendingImport=data.perfume;showPreview(pendingImport,hint);if(confirm(`Encontrei “${cleanIdentity(pendingImport,hint||{}).name}”.\n\nQueres substituir os dados da ficha pelos dados do Parfumo?`))applyImport(pendingImport,hint||{});else status("Ficha encontrada. Não alterei os campos.")}catch(e){status(e?.message||"Não foi possível abrir esta ficha.","error")}finally{setBusy(false)}}
async function importByUrl(){const url=norm($("parfumoUrl")?.value);if(!url){status("Cola primeiro o URL da ficha do Parfumo.","error");return}await loadSuggestion(url,null)}
function showPreview(p,hint={}){const ident=cleanIdentity(p,hint);$("parfumoPreview")?.classList.add("show");const img=$("parfumoPreviewImg");if(img){img.src=p.image||"icon.svg";img.alt=`Frasco de ${ident.name||"perfume"}`;img.onerror=()=>{img.src="icon.svg"}}if($("parfumoPreviewName"))$("parfumoPreviewName").textContent=ident.name||"Perfume";const sim=p.similarities?.[0];if($("parfumoPreviewMeta"))$("parfumoPreviewMeta").textContent=[ident.brand,ident.year?String(ident.year):"",p.rating?`Parfumo ${p.rating}/10`:"",sim?`Similar a ${sim.title}`:""].filter(Boolean).join(" · ")}

function applyImport(p,hint={}){
  const ident=cleanIdentity(p,hint),sim=p.similarities?.[0]||null,use=recommendedUse(p);
  setValue("brand",ident.brand||"");setValue("name",ident.name||"");setValue("releaseYear",ident.year||"");
  setValue("concentration",parseConcentration(p)||"");setValue("profile",profileFrom(p)||"");
  setValue("topNotes",(p.topNotes||[]).join(", "));setValue("heartNotes",(p.heartNotes||[]).join(", "));setValue("baseNotes",(p.baseNotes||[]).join(", "));
  setValue("sourceUrl",p.url||"");setValue("inspirationName",sim?.title||"");setValue("inspirationHouse",sim?.brand||"");setValue("inspirationUrl",sim?.url||"");
  setChecks("season",use.seasons);setChecks("time",use.times);
  window.dispatchEvent(new CustomEvent("oud-haenir-parfumo-import",{detail:{name:ident.name,parfumoUrl:p.url,inspiration:sim?{match:sim.title,house:sim.brand,url:sim.url,source:"Parfumo",note:"Principal correspondência encontrada em ‘Smells similar’ no Parfumo."}:null}}));
  status("Ficha substituída pelos dados do Parfumo. Estações/altura são sugestões e podem ser alteradas.","ok");
}

function findLocalItem(){try{const arr=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");if(!Array.isArray(arr))return {arr:[],item:null};const id=norm($("perfumeId")?.value),name=norm($("name")?.value),brand=norm($("brand")?.value);let item=id?arr.find(x=>x.id===id):null;if(!item)item=[...arr].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).find(x=>norm(x.name)===name&&norm(x.brand)===brand);return {arr,item}}catch{return {arr:[],item:null}}}
async function patchSavedMetadata(){
  const snapshot={year:Number($("releaseYear")?.value)||null,inspirationName:norm($("inspirationName")?.value),inspirationHouse:norm($("inspirationHouse")?.value),inspirationUrl:norm($("inspirationUrl")?.value),imageUrl:pendingImport?.image||"",parfumoUrl:pendingImport?.url||norm($("sourceUrl")?.value)};
  setTimeout(async()=>{try{const {arr,item}=findLocalItem();if(!item)return;if(snapshot.year)item.releaseYear=snapshot.year;else delete item.releaseYear;item.inspirationName=snapshot.inspirationName;item.inspirationHouse=snapshot.inspirationHouse;item.inspirationUrl=snapshot.inspirationUrl;if(snapshot.imageUrl)item.imageUrl=snapshot.imageUrl;if(snapshot.parfumoUrl)item.parfumoUrl=snapshot.parfumoUrl;item.updatedAt=Date.now();localStorage.setItem(STORAGE_KEY,JSON.stringify(arr));const {data}=await supabase.auth.getSession();if(data.session?.user&&item.id){await supabase.from("perfumes").update({release_year:item.releaseYear||null,image_url:item.imageUrl||null,parfumo_url:item.parfumoUrl||null,inspiration_name:item.inspirationName||null,inspiration_house:item.inspirationHouse||null,inspiration_url:item.inspirationUrl||null,updated_at:new Date(item.updatedAt).toISOString()}).eq("id",item.id)}window.dispatchEvent(new CustomEvent("oud-haenir-metadata-updated",{detail:{id:item.id,name:item.name}}));window.dispatchEvent(new CustomEvent("oud-haenir-image-updated",{detail:{id:item.id,name:item.name,imageUrl:item.imageUrl||""}}))}catch(e){console.warn("metadata patch",e)}},300)
}

async function hydrateDialogMetadata(){
  const id=norm($("perfumeId")?.value),name=norm($("name")?.value);let item=null;
  try{const arr=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");if(Array.isArray(arr))item=id?arr.find(x=>x.id===id):arr.find(x=>norm(x.name)===name)}catch{}
  if(!item&&id){try{const {data}=await supabase.from("perfumes").select("release_year,inspiration_name,inspiration_house,inspiration_url,parfumo_url").eq("id",id).maybeSingle();item=data}catch{}}
  setValue("releaseYear",item?.releaseYear??item?.release_year??"",true);setValue("inspirationName",item?.inspirationName??item?.inspiration_name??"",true);setValue("inspirationHouse",item?.inspirationHouse??item?.inspiration_house??"",true);setValue("inspirationUrl",item?.inspirationUrl??item?.inspiration_url??"",true);if($("parfumoUrl"))$("parfumoUrl").value=item?.parfumoUrl??item?.parfumo_url??"";
}
function resetForDialog(){pendingImport=null;pendingSuggestion=null;$("parfumoPreview")?.classList.remove("show");clearSuggestions();status("Podes pesquisar só por nome, só por marca, ou pelos dois.");setTimeout(hydrateDialogMetadata,40)}
function esc(v=""){return String(v).replace(/[&<>']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;"}[c]))}
function init(){injectStyles();ensureUi();$("perfumeForm")?.addEventListener("submit",patchSavedMetadata,true);document.addEventListener("click",e=>{if(e.target.closest("#addBtn")||e.target.closest("#floatingAdd")||e.target.closest(".edit"))setTimeout(resetForDialog,35)})}
init();
