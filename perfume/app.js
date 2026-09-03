import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_KEY } from "../supabase-config.js";

const STORAGE_KEY = "b612_scent_vault_v1";
const THEME_KEY = "b612_scent_theme";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });

const seedTemplate = [
  {status:"collection",brand:"Armaf",name:"Club de Nuit Intense Man",concentration:"EDT/EDP",sizeMl:105,profile:"cítrico · frutado · amadeirado · fumado",seasons:["Primavera","Outono","Inverno"],times:["Dia","Noite"],notes:"Marcante e eficaz, mas pode cansar se usado muitos dias seguidos."},
  {status:"collection",brand:"Arabiyat Prestige",name:"Marwa",concentration:"EDP",sizeMl:100,profile:"fresco · aromático · amadeirado",seasons:["Primavera","Verão"],times:["Dia","Noite"],notes:"Mais corpo e duração do que alguns freshies."},
  {status:"collection",brand:"Yves Saint Laurent",name:"L’Homme",concentration:"EDT",sizeMl:100,profile:"gengibre · especiado · amadeirado · limpo",seasons:["Primavera","Outono"],times:["Dia","Noite"],notes:"Elegante, discreto e confortável."},
  {status:"collection",brand:"Volare",name:"Arctic Breeze",concentration:"EDP",sizeMl:100,profile:"cítrico · chá · gengibre · ambroxan",seasons:["Primavera","Verão"],times:["Dia"],longevityScore:5,overallScore:8.8,notes:"Abertura excelente. Muito clean. Duração percebida 4–6h."},
  {status:"collection",brand:"Maison Alhambra",name:"Jean Lowe Immortel",concentration:"EDP",sizeMl:100,profile:"cítrico · gengibre · âmbar · amadeirado",seasons:["Primavera","Verão","Outono"],times:["Dia","Noite"],overallScore:9,notes:"Versátil, adulto e elegante."},
  {status:"decant",brand:"Zimaya",name:"Inekas Luna",concentration:"EDP",sizeMl:5,profile:"íris · castanha · couro · âmbar",seasons:["Outono","Inverno"],times:["Dia","Noite"],notes:"Decant 5 ml. Candidato forte a frasco inteiro."},
  {status:"decant",brand:"Lattafa",name:"Liam Grey",concentration:"EDP",sizeMl:5,profile:"chá · figo · cardamomo · íris",seasons:["Outono","Inverno","Primavera"],times:["Dia","Noite"],notes:"Decant 5 ml. Sofisticado e discreto."},
  {status:"decant",brand:"French Avenue",name:"Spectre Ghost",concentration:"EDP",sizeMl:5,profile:"baunilha · gengibre · cardamomo · madeiras",seasons:["Outono","Inverno"],times:["Noite"],notes:"Decant 5 ml. Mais quente e perfumístico."},
  {status:"decant",brand:"Arabiyat Prestige",name:"Ramad Oriental",concentration:"EDP",sizeMl:2,profile:"incenso · resinas · especiarias · âmbar",seasons:["Outono","Inverno"],times:["Noite"],notes:"Decant 2 ml. O mais ousado e oriental do lote."}
];

const state = { data: loadLocal(), status:"all", search:"", season:"", time:"", sort:"updated", user:null, syncing:false };
const $ = id => document.getElementById(id);
const grid = $("grid");
const dialog = $("perfumeDialog");

applyTheme(); wire(); render(); boot();

async function boot(){
  try{
    const { data } = await supabase.auth.getSession();
    state.user = data.session?.user || null;
    if (!state.user && !hasAuthCallback()) {
      const { data:anon, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      state.user = anon?.user || null;
    }
    if (state.user) await syncCloud();
    if (!state.data.length) {
      const now=Date.now();
      state.data=seedTemplate.map((x,i)=>({id:crypto.randomUUID(),createdAt:now-i*1000,updatedAt:now-i*1000,favorite:false,...x}));
      saveLocal(); render();
      if(state.user) await syncCloud();
    }
  }catch(err){ console.warn("boot",err); if(!state.data.length){ const now=Date.now(); state.data=seedTemplate.map((x,i)=>({id:crypto.randomUUID(),createdAt:now-i*1000,updatedAt:now-i*1000,favorite:false,...x})); saveLocal(); render(); } }
  supabase.auth.onAuthStateChange(async (_event,session)=>{ state.user=session?.user||null; refreshCloud(); if(state.user) await syncCloud(); });
  refreshCloud();
}

function hasAuthCallback(){ const u=new URL(location.href); return u.searchParams.has("code") || location.hash.includes("access_token") || location.hash.includes("refresh_token"); }
function loadLocal(){ try{ const raw=localStorage.getItem(STORAGE_KEY); const parsed=raw?JSON.parse(raw):[]; return Array.isArray(parsed)?parsed:[]; }catch{return [];} }
function saveLocal(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data)); }
function applyTheme(){ if(localStorage.getItem(THEME_KEY)==="dark" || (!localStorage.getItem(THEME_KEY)&&matchMedia("(prefers-color-scheme: dark)").matches)) document.documentElement.classList.add("dark"); }
function toggleTheme(){ document.documentElement.classList.toggle("dark"); localStorage.setItem(THEME_KEY,document.documentElement.classList.contains("dark")?"dark":"light"); }

function wire(){
  document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));btn.classList.add("active");state.status=btn.dataset.status;renderCards();}));
  $("searchInput").addEventListener("input",e=>{state.search=e.target.value.trim().toLowerCase();renderCards();});
  $("seasonFilter").addEventListener("change",e=>{state.season=e.target.value;renderCards();});
  $("timeFilter").addEventListener("change",e=>{state.time=e.target.value;renderCards();});
  $("sortSelect").addEventListener("change",e=>{state.sort=e.target.value;renderCards();});
  $("addBtn").addEventListener("click",()=>openForm()); $("floatingAdd").addEventListener("click",()=>openForm());
  $("closeDialog").addEventListener("click",()=>dialog.close()); $("cancelBtn").addEventListener("click",()=>dialog.close());
  $("perfumeForm").addEventListener("submit",savePerfume); $("deleteBtn").addEventListener("click",deletePerfume);
  $("themeBtn").addEventListener("click",toggleTheme);
  $("syncBtn").addEventListener("click",()=>{ $("cloudPanel").classList.toggle("hidden"); refreshCloud(); });
  $("closeCloud").addEventListener("click",()=>$("cloudPanel").classList.add("hidden"));
  $("googleLoginBtn").addEventListener("click",loginGoogle); $("logoutBtn").addEventListener("click",logout);
}

function render(){ renderStats(); renderCards(); }
function renderStats(){
  $("countCollection").textContent=state.data.filter(x=>x.status==="collection").length;
  $("countDecant").textContent=state.data.filter(x=>x.status==="decant").length;
  $("countWishlist").textContent=state.data.filter(x=>x.status==="wishlist").length;
  const vals=state.data.map(x=>Number(x.overallScore)).filter(x=>Number.isFinite(x)&&x>0);
  $("avgScore").textContent=vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1):"—";
}
function visible(){
  let a=[...state.data];
  if(state.status!=="all") a=a.filter(x=>x.status===state.status);
  if(state.search) a=a.filter(x=>[x.brand,x.name,x.profile,x.notes].join(" ").toLowerCase().includes(state.search));
  if(state.season) a=a.filter(x=>(x.seasons||[]).includes(state.season));
  if(state.time) a=a.filter(x=>(x.times||[]).includes(state.time));
  a.sort((x,y)=> state.sort==="name" ? `${x.brand} ${x.name}`.localeCompare(`${y.brand} ${y.name}`,"pt") : state.sort==="score" ? (Number(y.overallScore)||-1)-(Number(x.overallScore)||-1) : (y.updatedAt||0)-(x.updatedAt||0));
  return a;
}
function renderCards(){
  const items=visible(); grid.innerHTML=""; $("empty").classList.toggle("hidden",!!items.length);
  for(const item of items){
    const card=document.createElement("article"); card.className="card";
    const score=item.overallScore!==undefined&&item.overallScore!==null&&item.overallScore!==""?Number(item.overallScore).toFixed(1):"—";
    const label=item.status==="collection"?"Tenho":item.status==="decant"?`Decant${item.sizeMl?` · ${item.sizeMl} ml`:""}`:"Wishlist";
    const chips=[...(item.seasons||[]),...(item.times||[])].map(v=>`<span class="chip">${esc(v)}</span>`).join("");
    card.innerHTML=`<button class="edit" aria-label="Editar ${esc(item.name)}"></button><div class="card-content"><div class="card-head"><div><div class="brand">${esc(item.brand||"Sem marca")}</div><h3>${esc(item.name)}</h3><div class="status">${esc(label)} ${item.favorite?' <span class="favorite">★</span>':''}</div></div><div class="score">${score}</div></div><p class="profile">${esc(item.profile||"Perfil por preencher")}</p><div class="chips">${chips}</div><div class="card-foot"><div><small>Concentração</small><strong>${esc(item.concentration||"—")}</strong></div><div><small>Decisão</small><strong>${item.status==="wishlist"?"No radar":score==="—"?"Testar":"Avaliado"}</strong></div></div></div>`;
    card.querySelector(".edit").addEventListener("click",()=>openForm(item.id)); grid.appendChild(card);
  }
}

function openForm(id=null){
  $("perfumeForm").reset(); $("perfumeId").value=""; $("deleteBtn").classList.toggle("hidden",!id); $("dialogTitle").textContent=id?"Editar perfume":"Novo perfume";
  if(id){ const x=state.data.find(v=>v.id===id); if(!x)return; $("perfumeId").value=x.id; set("status",x.status); set("brand",x.brand); set("name",x.name); set("concentration",x.concentration); set("sizeMl",x.sizeMl); set("profile",x.profile); set("topNotes",x.topNotes); set("heartNotes",x.heartNotes); set("baseNotes",x.baseNotes); set("openingNotes",x.openingNotes); set("evolution30m",x.evolution30m); set("evolution2h",x.evolution2h); set("evolution6h",x.evolution6h); set("longevityScore",x.longevityScore); set("projectionScore",x.projectionScore); set("eleganceScore",x.eleganceScore); set("originalityScore",x.originalityScore); set("fitScore",x.fitScore); set("overallScore",x.overallScore); set("purchasePrice",x.purchasePrice); set("sourceUrl",x.sourceUrl); set("favorite",String(!!x.favorite)); set("notes",x.notes); document.querySelectorAll('input[name="season"]').forEach(cb=>cb.checked=(x.seasons||[]).includes(cb.value)); document.querySelectorAll('input[name="time"]').forEach(cb=>cb.checked=(x.times||[]).includes(cb.value)); }
  dialog.showModal();
}
function set(id,v){ $(id).value=v??""; }
function num(id){ const v=$(id).value; return v===""?null:Number(v); }
function picks(name){ return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(x=>x.value); }

async function savePerfume(e){
  e.preventDefault(); const id=$("perfumeId").value||crypto.randomUUID(); const prev=state.data.find(x=>x.id===id);
  const item={id,status:$("status").value,brand:$("brand").value.trim(),name:$("name").value.trim(),concentration:$("concentration").value.trim(),sizeMl:num("sizeMl"),profile:$("profile").value.trim(),seasons:picks("season"),times:picks("time"),topNotes:$("topNotes").value.trim(),heartNotes:$("heartNotes").value.trim(),baseNotes:$("baseNotes").value.trim(),openingNotes:$("openingNotes").value.trim(),evolution30m:$("evolution30m").value.trim(),evolution2h:$("evolution2h").value.trim(),evolution6h:$("evolution6h").value.trim(),longevityScore:num("longevityScore"),projectionScore:num("projectionScore"),eleganceScore:num("eleganceScore"),originalityScore:num("originalityScore"),fitScore:num("fitScore"),overallScore:num("overallScore"),purchasePrice:num("purchasePrice"),sourceUrl:$("sourceUrl").value.trim(),favorite:$("favorite").value==="true",notes:$("notes").value.trim(),createdAt:prev?.createdAt||Date.now(),updatedAt:Date.now()};
  state.data=prev?state.data.map(x=>x.id===id?item:x):[item,...state.data]; saveLocal(); render(); dialog.close(); await upsertCloud(item);
}
async function deletePerfume(){ const id=$("perfumeId").value;if(!id||!confirm("Apagar este perfume?"))return;state.data=state.data.filter(x=>x.id!==id);saveLocal();render();dialog.close();try{await supabase.from("perfumes").delete().eq("id",id);}catch(err){console.warn(err);} }

function toRow(x,userId){ return {id:x.id,user_id:userId,status:x.status,brand:x.brand||null,name:x.name,concentration:x.concentration||null,bottle_size_ml:x.status==="collection"?x.sizeMl:null,decant_size_ml:x.status==="decant"?x.sizeMl:null,profile:x.profile||null,top_notes:x.topNotes||null,heart_notes:x.heartNotes||null,base_notes:x.baseNotes||null,seasons:x.seasons||[],times:x.times||[],opening_notes:x.openingNotes||null,evolution_30m:x.evolution30m||null,evolution_2h:x.evolution2h||null,evolution_6h:x.evolution6h||null,longevity_score:x.longevityScore,projection_score:x.projectionScore,elegance_score:x.eleganceScore,originality_score:x.originalityScore,fit_score:x.fitScore,overall_score:x.overallScore,purchase_price:x.purchasePrice,source_url:x.sourceUrl||null,favorite:!!x.favorite,notes:x.notes||null,updated_at:new Date(x.updatedAt||Date.now()).toISOString()}; }
function fromRow(r){ return {id:r.id,status:r.status,brand:r.brand||"",name:r.name||"",concentration:r.concentration||"",sizeMl:r.status==="decant"?(r.decant_size_ml??""):(r.bottle_size_ml??""),profile:r.profile||"",topNotes:r.top_notes||"",heartNotes:r.heart_notes||"",baseNotes:r.base_notes||"",seasons:r.seasons||[],times:r.times||[],openingNotes:r.opening_notes||"",evolution30m:r.evolution_30m||"",evolution2h:r.evolution_2h||"",evolution6h:r.evolution_6h||"",longevityScore:r.longevity_score,projectionScore:r.projection_score,eleganceScore:r.elegance_score,originalityScore:r.originality_score,fitScore:r.fit_score,overallScore:r.overall_score,purchasePrice:r.purchase_price,sourceUrl:r.source_url||"",favorite:!!r.favorite,notes:r.notes||"",createdAt:r.created_at?new Date(r.created_at).getTime():Date.now(),updatedAt:r.updated_at?new Date(r.updated_at).getTime():Date.now()}; }
async function upsertCloud(item){ if(!state.user)return; try{ const {error}=await supabase.from("perfumes").upsert(toRow(item,state.user.id),{onConflict:"id"}); if(error)throw error; }catch(err){console.warn("cloud",err);} }
async function syncCloud(){ if(!state.user||state.syncing)return; state.syncing=true; refreshCloud(); try{ const {data:rows,error}=await supabase.from("perfumes").select("*").order("updated_at",{ascending:false}); if(error)throw error; const cloud=(rows||[]).map(fromRow); const cloudMap=new Map(cloud.map(x=>[x.id,x])); const merged=new Map(cloud.map(x=>[x.id,x])); const pending=[]; for(const local of state.data){ const c=cloudMap.get(local.id); if(!c||(local.updatedAt||0)>(c.updatedAt||0)){merged.set(local.id,local);pending.push(toRow(local,state.user.id));}} if(pending.length){const {error:e}=await supabase.from("perfumes").upsert(pending,{onConflict:"id"});if(e)throw e;} state.data=[...merged.values()].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));saveLocal();render(); }catch(err){console.warn("sync",err);} finally{state.syncing=false;refreshCloud();} }

async function loginGoogle(){
  try{
    if(state.user?.is_anonymous){ await supabase.auth.signOut(); state.user=null; }
    const redirectTo=`${location.origin}${location.pathname}`;
    const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo,queryParams:{access_type:"offline",prompt:"select_account"}}});
    if(error) throw error;
  }catch(err){ alert(`Não foi possível iniciar o login: ${err.message}`); }
}
async function logout(){ await supabase.auth.signOut(); state.user=null; refreshCloud(); }
function refreshCloud(){ const p=$("cloudStatus"); if(state.syncing)p.textContent="A sincronizar perfumes…"; else if(!state.user)p.textContent="Modo local. Entra com Google para sincronizar entre dispositivos."; else if(state.user.is_anonymous)p.textContent="Sessão anónima ativa. Os dados locais funcionam; entra com Google para os fixar na tua conta."; else p.textContent=`Ligado a ${state.user.email||"conta Google"}. ${state.data.length} registos disponíveis.`; $("googleLoginBtn").classList.toggle("hidden",!!state.user&&!state.user.is_anonymous); $("logoutBtn").classList.toggle("hidden",!state.user||state.user.is_anonymous); }
function esc(v=""){return String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
