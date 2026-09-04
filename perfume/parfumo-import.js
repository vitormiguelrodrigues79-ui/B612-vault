import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_KEY } from "../supabase-config.js";

const STORAGE_KEY = "b612_scent_vault_v1";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
let pendingImport = null;

function injectStyles(){
  if(document.getElementById("parfumoImportStyles")) return;
  const style=document.createElement("style");
  style.id="parfumoImportStyles";
  style.textContent=`
    .parfumo-import{grid-column:span 2;border:1px solid var(--line);border-radius:16px;padding:14px;background:color-mix(in srgb,var(--panel) 92%,var(--accent2) 8%);display:grid;gap:10px}
    .parfumo-import-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.parfumo-import-head strong{font-size:.9rem}.parfumo-import-head span{font-size:.72rem;color:var(--muted)}
    .parfumo-import-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}.parfumo-import-row input{margin:0!important}.parfumo-import-row button{padding:10px 13px;border-radius:12px;border:1px solid var(--ink);background:var(--ink);color:var(--bg);font-weight:750;white-space:nowrap}
    .parfumo-import-actions{display:flex;gap:8px;flex-wrap:wrap}.parfumo-import-actions button{padding:9px 12px;border-radius:12px;border:1px solid var(--line);background:var(--panel);font-weight:700}.parfumo-import-actions .primary-import{background:var(--ink);color:var(--bg);border-color:var(--ink)}
    .parfumo-status{font-size:.78rem;line-height:1.45;color:var(--muted);min-height:1.1em}.parfumo-status.ok{color:var(--accent)}.parfumo-status.error{color:var(--danger)}
    .parfumo-preview{display:none;grid-template-columns:72px minmax(0,1fr);gap:12px;align-items:center;padding-top:4px}.parfumo-preview.show{display:grid}.parfumo-preview img{width:72px;height:82px;object-fit:contain;border:1px solid var(--line);border-radius:12px;background:#fff;padding:5px}.parfumo-preview strong{display:block}.parfumo-preview small{display:block;color:var(--muted);margin-top:3px;line-height:1.4}
    @media(max-width:560px){.parfumo-import{grid-column:span 1}.parfumo-import-row{grid-template-columns:1fr}.parfumo-import-row button{width:100%}.parfumo-import-actions{display:grid;grid-template-columns:1fr 1fr}.parfumo-import-actions button{width:100%}}
  `;
  document.head.appendChild(style);
}

function ensureUi(){
  if(document.getElementById("parfumoImport")) return;
  const name=document.getElementById("name");
  const formGrid=name?.closest(".form-grid");
  if(!name||!formGrid) return;
  const box=document.createElement("div");
  box.id="parfumoImport";
  box.className="parfumo-import";
  box.innerHTML=`
    <div class="parfumo-import-head"><div><strong>Parfumo</strong><span> · preencher ficha automaticamente</span></div></div>
    <div class="parfumo-import-row"><input id="parfumoUrl" type="url" inputmode="url" placeholder="URL da ficha Parfumo (opcional)" /><button type="button" id="parfumoFetch">Buscar</button></div>
    <div class="parfumo-import-actions"><button type="button" id="parfumoSearch" class="primary-import">Buscar por nome + marca</button><button type="button" id="parfumoClear">Limpar resultado</button></div>
    <div id="parfumoStatus" class="parfumo-status">Escreve primeiro o nome e a marca, ou cola o link da ficha.</div>
    <div id="parfumoPreview" class="parfumo-preview"><img id="parfumoPreviewImg" alt=""><div><strong id="parfumoPreviewName"></strong><small id="parfumoPreviewMeta"></small></div></div>`;
  const nameLabel=name.closest("label");
  if(nameLabel?.nextSibling) formGrid.insertBefore(box,nameLabel.nextSibling); else formGrid.appendChild(box);
  document.getElementById("parfumoFetch")?.addEventListener("click",()=>fetchFromParfumo(true));
  document.getElementById("parfumoSearch")?.addEventListener("click",()=>fetchFromParfumo(false));
  document.getElementById("parfumoClear")?.addEventListener("click",clearImport);
}

function status(text,type=""){
  const el=document.getElementById("parfumoStatus");
  if(!el) return;
  el.textContent=text;
  el.className=`parfumo-status ${type}`.trim();
}

function clearImport(){
  pendingImport=null;
  const preview=document.getElementById("parfumoPreview");
  preview?.classList.remove("show");
  const url=document.getElementById("parfumoUrl");
  if(url) url.value="";
  status("Resultado limpo. Podes fazer uma nova pesquisa.");
}

async function ensureSession(){
  const {data}=await supabase.auth.getSession();
  if(data.session) return data.session;
  const {data:anon,error}=await supabase.auth.signInAnonymously();
  if(error) throw error;
  return anon.session;
}

async function fetchFromParfumo(useUrl){
  const btns=[document.getElementById("parfumoFetch"),document.getElementById("parfumoSearch")].filter(Boolean);
  btns.forEach(b=>b.disabled=true);
  status("A consultar o Parfumo…");
  try{
    await ensureSession();
    const url=(document.getElementById("parfumoUrl")?.value||"").trim();
    const brand=(document.getElementById("brand")?.value||"").trim();
    const name=(document.getElementById("name")?.value||"").trim();
    if(useUrl&&!url) throw new Error("Cola primeiro o URL da ficha do Parfumo.");
    if(!useUrl&&!brand&&!name) throw new Error("Escreve a marca e/ou o nome do perfume.");
    const {data,error}=await supabase.functions.invoke("parfumo-import",{body:useUrl?{url}:{brand,name}});
    if(error) throw error;
    if(data?.error) throw new Error(data.error);
    if(!data?.perfume) throw new Error("O Parfumo não devolveu uma ficha utilizável.");
    pendingImport=data.perfume;
    showPreview(pendingImport);
    const ok=confirm(`Encontrei “${pendingImport.title}”${pendingImport.brand?` de ${pendingImport.brand}`:""}.\n\nQueres preencher a ficha com estes dados?`);
    if(ok) applyImport(pendingImport);
    else status("Resultado encontrado, mas não alterei a ficha. Podes tentar outra pesquisa.");
  }catch(err){
    console.warn("parfumo import",err);
    status(`${err?.message||"Não foi possível consultar o Parfumo."} Se a pesquisa por nome falhar, cola o URL direto da ficha.`,"error");
  }finally{ btns.forEach(b=>b.disabled=false); }
}

function showPreview(p){
  document.getElementById("parfumoPreview")?.classList.add("show");
  const img=document.getElementById("parfumoPreviewImg");
  if(img){img.src=p.image||"icon.svg";img.alt=`Frasco de ${p.title||"perfume"}`;img.onerror=()=>{img.src="icon.svg";};}
  const title=document.getElementById("parfumoPreviewName"); if(title) title.textContent=p.title||"Perfume";
  const meta=document.getElementById("parfumoPreviewMeta"); if(meta) meta.textContent=[p.brand,p.year?String(p.year):"",p.rating?`Parfumo ${p.rating}/10`:""].filter(Boolean).join(" · ");
}

function setValue(id,value,overwrite=false){
  const el=document.getElementById(id);
  if(!el||value===undefined||value===null||value==="") return;
  if(overwrite||!String(el.value||"").trim()) el.value=value;
}

function applyImport(p){
  setValue("brand",p.brand);
  setValue("name",p.title,true);
  if(Array.isArray(p.accords)&&p.accords.length) setValue("profile",p.accords.join(" · "));
  if(Array.isArray(p.topNotes)&&p.topNotes.length) setValue("topNotes",p.topNotes.join(", "));
  if(Array.isArray(p.heartNotes)&&p.heartNotes.length) setValue("heartNotes",p.heartNotes.join(", "));
  if(Array.isArray(p.baseNotes)&&p.baseNotes.length) setValue("baseNotes",p.baseNotes.join(", "));
  if(!document.getElementById("sourceUrl")?.value?.trim()) setValue("sourceUrl",p.url);
  status("Ficha preenchida. Mantive as tuas avaliações pessoais e campos já preenchidos.","ok");
}

function patchSavedImage(){
  if(!pendingImport?.image) return;
  const id=document.getElementById("perfumeId")?.value||"";
  const name=(document.getElementById("name")?.value||"").trim();
  const brand=(document.getElementById("brand")?.value||"").trim();
  const imageUrl=pendingImport.image;
  const parfumoUrl=pendingImport.url||"";
  setTimeout(async()=>{
    try{
      const arr=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
      if(!Array.isArray(arr)) return;
      let item=id?arr.find(x=>x.id===id):null;
      if(!item) item=[...arr].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).find(x=>String(x.name||"").trim()===name&&String(x.brand||"").trim()===brand);
      if(!item) return;
      item.imageUrl=imageUrl;
      item.parfumoUrl=parfumoUrl;
      localStorage.setItem(STORAGE_KEY,JSON.stringify(arr));
      const {data}=await supabase.auth.getSession();
      if(data.session?.user&&item.id){ await supabase.from("perfumes").update({image_url:imageUrl}).eq("id",item.id); }
      window.dispatchEvent(new CustomEvent("oud-haenir-image-updated",{detail:{id:item.id,name:item.name,imageUrl}}));
    }catch(err){console.warn("save imported image",err);}
  },250);
}

function resetForDialog(){
  pendingImport=null;
  const preview=document.getElementById("parfumoPreview"); preview?.classList.remove("show");
  const url=document.getElementById("parfumoUrl"); if(url) url.value="";
  status("Escreve primeiro o nome e a marca, ou cola o link da ficha.");
}

function init(){
  injectStyles();
  ensureUi();
  document.getElementById("perfumeForm")?.addEventListener("submit",patchSavedImage,true);
  document.addEventListener("click",e=>{
    if(e.target.closest("#addBtn")||e.target.closest("#floatingAdd")||e.target.closest(".edit")) setTimeout(resetForDialog,30);
  });
}

init();
