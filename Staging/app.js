import {
  getSessionUser,onAuth,loginGoogle,logout,ensureProfile,getOwnProfile,updatePrivacy,
  searchProfiles,relatedProfile,friendProfile,getFriendships,sendFriendRequest,
  acceptFriendRequest,removeFriendship,loadWatches,saveWatch,deleteWatch,
  signedPhoto,uploadPhoto,deletePhoto
} from "./supabase.js";

const VERSION="B612-Vault v6.1 STAGING";
const views=["homeView","categoryView","friendsView","friendProfileView","accountView"];
const state={user:null,profile:null,watches:[],friendships:[],friends:[],category:"collection",friendTarget:null,friendCategory:"collection",friendWatches:[],search:"",sort:"updated"};
let pendingPhoto=null, removeExistingPhoto=false;

const $=id=>document.getElementById(id);
const money=v=>(v===""||v==null)? "—":new Intl.NumberFormat("pt-PT",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(v));
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

boot();

async function boot(){
  wire();
  tick();setInterval(tick,30000);
  const user=await getSessionUser();
  if(user) await enterApp(user); else showLogin();
  onAuth(async(event,user)=>{
    if(event==="SIGNED_IN" && user) await enterApp(user);
    if(event==="SIGNED_OUT") showLogin();
  });
}
function wire(){
  $("googleLoginBtn").onclick=()=>loginGoogle().catch(e=>alert(e.message));
  $("logoutBtn").onclick=()=>logout().catch(e=>alert(e.message));
  $("syncBtn").onclick=syncAll;$("accountSyncBtn").onclick=syncAll;
  $("accountBtn").onclick=()=>showView("accountView");
  $("addBtn").onclick=()=>openWatch();$("categoryAddBtn").onclick=()=>openWatch();
  document.querySelectorAll("[data-home]").forEach(b=>b.onclick=()=>showView("homeView"));
  document.querySelectorAll("[data-open-category]").forEach(b=>b.onclick=()=>openCategory(b.dataset.openCategory));
  $("friendsHomeBtn").onclick=()=>openFriends();
  $("backFriendsBtn").onclick=()=>showView("friendsView");
  $("searchInput").oninput=e=>{state.search=e.target.value.toLowerCase();renderWatches()};
  $("sortSelect").onchange=e=>{state.sort=e.target.value;renderWatches()};
  $("friendSearchBtn").onclick=doFriendSearch;
  $("friendSearchInput").onkeydown=e=>{if(e.key==="Enter")doFriendSearch()};
  $("savePrivacyBtn").onclick=savePrivacy;
  $("copyFriendCode").onclick=copyFriendCode;
  document.querySelectorAll("[data-friend-category]").forEach(b=>b.onclick=()=>openFriendCategory(b.dataset.friendCategory));
  $("closeWatchDialog").onclick=closeWatch;$("cancelWatchBtn").onclick=closeWatch;
  $("watchForm").onsubmit=saveWatchForm;
  $("status").onchange=updateWishlistMode;
  $("photoInput").onchange=e=>{pendingPhoto=e.target.files?.[0]||null;removeExistingPhoto=false;previewPending()};
  $("removePhotoBtn").onclick=()=>{pendingPhoto=null;removeExistingPhoto=true;$("photoPreview").classList.add("hidden");$("removePhotoBtn").classList.add("hidden");$("photoStatus").textContent="Foto será removida ao guardar."};
  $("deleteWatchBtn").onclick=deleteCurrentWatch;
}
function showLogin(){
  state.user=null;state.profile=null;state.watches=[];
  $("appShell").classList.add("hidden");$("loginGate").classList.remove("hidden");
}
async function enterApp(user){
  state.user=user;
  $("loginGate").classList.add("hidden");$("appShell").classList.remove("hidden");
  await ensureProfile(user);
  await syncAll();
  showView("homeView");
}
async function syncAll(){
  if(!state.user)return;
  try{
    [state.profile,state.watches,state.friendships]=await Promise.all([
      getOwnProfile(state.user.id),loadWatches(state.user.id),getFriendships(state.user.id)
    ]);
    await buildFriends();
    renderHome();renderProfile();renderAccount();renderWatches();
  }catch(e){console.error(e);alert("Erro de sincronização: "+e.message)}
}
function showView(id){views.forEach(v=>$(v).classList.toggle("hidden",v!==id))}
function renderHome(){
  const meta=state.user.user_metadata||{};
  $("welcomeName").textContent=state.profile?.display_name||meta.full_name||state.user.email||"Utilizador";
  $("welcomeEmail").textContent=state.user.email||"";
  const avatar=state.profile?.avatar_url||meta.avatar_url||meta.picture;
  if(avatar){$("welcomeAvatar").src=avatar;$("welcomeAvatar").classList.remove("hidden")}else $("welcomeAvatar").classList.add("hidden");
  $("countCollection").textContent=state.watches.filter(w=>w.status==="collection").length;
  $("countBuild").textContent=state.watches.filter(w=>w.status==="build").length;
  $("countWishlist").textContent=state.watches.filter(w=>w.status==="wishlist").length;
  $("countFriends").textContent=state.friends.length;
}
function openCategory(cat){state.category=cat;state.search="";$("searchInput").value="";const m={collection:["PRIVATE COLLECTION","Coleção"],build:["PROJECT WATCHES","Build"],wishlist:["RADAR","Wishlist"]}[cat];$("categoryEyebrow").textContent=m[0];$("categoryTitle").textContent=m[1];renderWatches();showView("categoryView")}
function ownVisibleWatches(){
  let a=state.watches.filter(w=>w.status===state.category);
  if(state.search)a=a.filter(w=>[w.brand,w.model,w.reference,w.movement,w.notes].join(" ").toLowerCase().includes(state.search));
  return a.sort((x,y)=>{
    if(state.sort==="name")return `${x.brand} ${x.model}`.localeCompare(`${y.brand} ${y.model}`,"pt");
    if(state.sort==="costHigh")return Number(y.purchasePrice||0)-Number(x.purchasePrice||0);
    if(state.sort==="costLow")return Number(x.purchasePrice||0)-Number(y.purchasePrice||0);
    return (y.updatedAt||0)-(x.updatedAt||0);
  });
}
function renderWatches(){renderWatchArray(ownVisibleWatches(),$("watchGrid"),$("emptyState"),true)}
function renderWatchArray(items,grid,empty,editable){
  if(!grid)return;grid.innerHTML="";
  empty.classList.toggle("hidden",items.length>0);
  items.forEach(w=>{
    const card=document.createElement("article");card.className="watch-card";
    card.innerHTML=`<img alt=""><div class="body"><div class="brand">${escapeHtml(w.brand||"Sem marca")}</div><h3>${escapeHtml(w.model||w.brand||"Sem nome")}</h3><div class="spec">${escapeHtml([w.reference,w.movement,w.diameter?`${w.diameter} mm`:"",w.year].filter(Boolean).join(" · "))}</div><div class="cost"><span>${w.status==="wishlist"?"Preço alvo":"Custo aquisição"}</span><strong>${money(w.purchasePrice)}</strong></div></div>${editable?'<button aria-label="Abrir"></button>':""}`;
    const img=card.querySelector("img");img.src="../app-symbol.jpg";if(w.imageStoragePath)signedPhoto(w.imageStoragePath).then(u=>{if(u)img.src=u}).catch(()=>{});
    if(editable)card.querySelector("button").onclick=()=>openWatch(w.id);
    grid.appendChild(card);
  });
}
async function openFriends(){
  await syncAll();renderSocial();showView("friendsView");
}
async function buildFriends(){
  state.friends=[];
  const accepted=state.friendships.filter(f=>f.status==="accepted");
  for(const f of accepted){
    const other=f.requester_id===state.user.id?f.addressee_id:f.requester_id;
    const p=await relatedProfile(other).catch(()=>null);
    if(p)state.friends.push({...p,friendshipId:f.id});
  }
}
function renderProfile(){
  if(!state.profile)return;
  $("profileDisplayName").textContent=state.profile.display_name||state.user.email;
  $("copyFriendCode").textContent=state.profile.friend_code||"—";
  if(state.profile.avatar_url){$("profileAvatar").src=state.profile.avatar_url;$("profileAvatar").classList.remove("hidden")}else $("profileAvatar").classList.add("hidden");
  $("privacyCollection").value=state.profile.watches_collection_visibility||"friends";
  $("privacyBuilds").value=state.profile.watches_builds_visibility||"friends";
  $("privacyWishlist").value=state.profile.watches_wishlist_visibility||"private";
}
function renderSocial(){
  renderProfile();
  const pending=state.friendships.filter(f=>f.status==="pending"&&f.addressee_id===state.user.id);
  $("pendingRequests").innerHTML="";
  if(!pending.length)$("pendingRequests").innerHTML='<div class="muted">Sem pedidos pendentes.</div>';
  pending.forEach(async f=>{
    const p=await relatedProfile(f.requester_id).catch(()=>null);if(!p)return;
    const row=personRow(p);
    const actions=document.createElement("div");actions.className="person-actions";
    const yes=document.createElement("button");yes.className="mini-btn ok";yes.textContent="Aceitar";yes.onclick=async()=>{await acceptFriendRequest(f.id);await openFriends()};
    const no=document.createElement("button");no.className="mini-btn danger";no.textContent="Recusar";no.onclick=async()=>{await removeFriendship(f.id);await openFriends()};
    actions.append(yes,no);row.append(actions);$("pendingRequests").append(row);
  });
  $("friendsList").innerHTML="";
  if(!state.friends.length)$("friendsList").innerHTML='<div class="muted">Ainda sem amigos.</div>';
  state.friends.forEach(p=>{
    const b=document.createElement("button");b.className="friend-card";b.innerHTML=`${avatarHtml(p)}<div><strong>${escapeHtml(p.display_name||"Utilizador")}</strong><div class="muted">#${escapeHtml(p.friend_code||"")}</div></div>`;
    b.onclick=()=>openFriendProfile(p.user_id);$("friendsList").append(b);
  });
}
function personRow(p){
  const row=document.createElement("div");row.className="person-row";
  const main=document.createElement("div");main.className="person-main";main.innerHTML=`${avatarHtml(p)}<div><strong>${escapeHtml(p.display_name||"Utilizador")}</strong><div class="muted">#${escapeHtml(p.friend_code||"")}</div></div>`;
  row.append(main);return row;
}
function avatarHtml(p){return p.avatar_url?`<img class="avatar" src="${escapeHtml(p.avatar_url)}" alt="">`:`<div class="avatar"></div>`}
async function doFriendSearch(){
  const q=$("friendSearchInput").value.trim();if(!q)return;
  const results=await searchProfiles(q).catch(e=>{alert(e.message);return[]});
  $("friendSearchResults").innerHTML="";
  if(!results.length){$("friendSearchResults").innerHTML='<div class="muted">Nenhum utilizador encontrado.</div>';return}
  results.forEach(p=>{
    const row=personRow(p);const btn=document.createElement("button");btn.className="mini-btn";btn.textContent="Adicionar";
    const existing=state.friendships.find(f=>[f.requester_id,f.addressee_id].includes(p.user_id));
    if(existing){btn.textContent=existing.status==="accepted"?"Já é amigo":"Pedido enviado";btn.disabled=true}
    btn.onclick=async()=>{await sendFriendRequest(p.user_id,state.user.id);btn.textContent="Pedido enviado";btn.disabled=true;await syncAll()};
    row.append(btn);$("friendSearchResults").append(row);
  });
}
async function savePrivacy(){
  await updatePrivacy(state.user.id,{collection:$("privacyCollection").value,build:$("privacyBuilds").value,wishlist:$("privacyWishlist").value});
  state.profile=await getOwnProfile(state.user.id);renderProfile();alert("Privacidade atualizada.");
}
async function copyFriendCode(){const code=state.profile?.friend_code;if(!code)return;await navigator.clipboard.writeText(code);$("copyFriendCode").textContent="Copiado";setTimeout(()=>$("copyFriendCode").textContent=code,1200)}
async function openFriendProfile(userId){
  state.friendTarget=await friendProfile(userId).catch(()=>null);
  if(!state.friendTarget){alert("Este perfil não está disponível.");return}
  $("friendProfileName").textContent=state.friendTarget.display_name||"Amigo";
  if(state.friendTarget.avatar_url){$("friendProfileAvatar").src=state.friendTarget.avatar_url;$("friendProfileAvatar").classList.remove("hidden")}else $("friendProfileAvatar").classList.add("hidden");
  state.friendWatches=await loadWatches(userId);
  openFriendCategory("collection");showView("friendProfileView");
}
function openFriendCategory(cat){
  state.friendCategory=cat;document.querySelectorAll("[data-friend-category]").forEach(b=>b.classList.toggle("active",b.dataset.friendCategory===cat));
  const a=state.friendWatches.filter(w=>w.status===cat);renderWatchArray(a,$("friendWatchGrid"),$("friendEmpty"),false);
}
function renderAccount(){$("accountEmail").textContent=state.user?.email||"—"}
function updateWishlistMode(){$("wishlistTypeWrap").classList.toggle("hidden",$("status").value!=="wishlist")}
function openWatch(id=null){
  pendingPhoto=null;removeExistingPhoto=false;$("watchForm").reset();$("watchId").value="";$("imageStoragePath").value="";$("photoPreview").classList.add("hidden");$("removePhotoBtn").classList.add("hidden");$("deleteWatchBtn").classList.toggle("hidden",!id);
  $("watchDialogTitle").textContent=id?"Editar relógio":"Novo relógio";$("status").value=id?"collection":state.category;
  if(id){
    const w=state.watches.find(x=>x.id===id);if(!w)return;
    $("watchId").value=w.id;$("status").value=w.status;$("wishlistType").value=w.wishlistType||"watch";
    ["brand","model","reference","movement","diameter","year","purchasePrice","link","casePart","dialPart","handsPart","strapPart","notes","imageStoragePath"].forEach(k=>$(k).value=w[k]??"");
    if(w.imageStoragePath)signedPhoto(w.imageStoragePath).then(u=>{if(u){$("photoPreview").src=u;$("photoPreview").classList.remove("hidden");$("removePhotoBtn").classList.remove("hidden")}}).catch(()=>{});
  }
  updateWishlistMode();$("watchDialog").showModal();
}
function closeWatch(){$("watchDialog").close()}
function previewPending(){if(!pendingPhoto)return;const u=URL.createObjectURL(pendingPhoto);$("photoPreview").src=u;$("photoPreview").classList.remove("hidden");$("removePhotoBtn").classList.remove("hidden");$("photoStatus").textContent="Foto pronta para enviar."}
async function saveWatchForm(e){
  e.preventDefault();const id=$("watchId").value||crypto.randomUUID();const old=state.watches.find(w=>w.id===id);
  const item={id,status:$("status").value,wishlistType:$("wishlistType").value,brand:$("brand").value.trim(),model:$("model").value.trim(),reference:$("reference").value.trim(),movement:$("movement").value.trim(),diameter:$("diameter").value?Number($("diameter").value):"",year:$("year").value?Number($("year").value):"",purchasePrice:$("purchasePrice").value?Number($("purchasePrice").value):"",imageStoragePath:$("imageStoragePath").value,link:$("link").value.trim(),casePart:$("casePart").value.trim(),dialPart:$("dialPart").value.trim(),handsPart:$("handsPart").value.trim(),strapPart:$("strapPart").value.trim(),notes:$("notes").value.trim(),updatedAt:Date.now()};
  if(!item.brand&&!item.model){alert("Indica pelo menos marca ou modelo.");return}
  try{
    if(removeExistingPhoto&&old?.imageStoragePath){await deletePhoto(old.imageStoragePath).catch(()=>{});item.imageStoragePath=""}
    if(pendingPhoto){const newPath=await uploadPhoto(pendingPhoto,id,state.user.id);if(old?.imageStoragePath)await deletePhoto(old.imageStoragePath).catch(()=>{});item.imageStoragePath=newPath}
    await saveWatch(item,state.user.id);closeWatch();await syncAll();openCategory(item.status);
  }catch(err){alert(err.message)}
}
async function deleteCurrentWatch(){
  const id=$("watchId").value;if(!id||!confirm("Eliminar este relógio?"))return;const w=state.watches.find(x=>x.id===id);
  try{if(w?.imageStoragePath)await deletePhoto(w.imageStoragePath).catch(()=>{});await deleteWatch(id);closeWatch();await syncAll()}catch(e){alert(e.message)}
}
function tick(){
  const d=new Date();$("versionInfo").textContent=VERSION;$("clockInfo").textContent=new Intl.DateTimeFormat("pt-PT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(d);
}


// PWA install support (Android + iOS/iPadOS)
let deferredInstallPrompt = null;

function isStandaloneMode(){
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIOSDevice(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function updateInstallButton(){
  const btn = $("installAppBtn");
  const hint = $("installHint");
  if(!btn) return;
  if(isStandaloneMode()){
    btn.textContent = "App instalada";
    btn.disabled = true;
    if(hint) hint.textContent = "B612-Vault já está instalada neste dispositivo.";
    return;
  }
  btn.disabled = false;
  btn.textContent = isIOSDevice() ? "Instalar no iPhone / iPad" : "Instalar app";
}
async function installApp(){
  if(isStandaloneMode()) return;
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    try{ await deferredInstallPrompt.userChoice; }catch(_e){}
    deferredInstallPrompt = null;
    updateInstallButton();
    return;
  }
  if(isIOSDevice()){
    alert("Para instalar a B612-Vault no iPhone/iPad:\n\n1. Abre esta página no Safari.\n2. Toca no botão Partilhar.\n3. Escolhe ‘Adicionar ao ecrã principal’.\n4. Confirma em ‘Adicionar’.\n\nA app ficará no ecrã principal como uma aplicação normal.");
    return;
  }
  alert("Se o botão de instalação do navegador ainda não apareceu, abre o menu do navegador e escolhe ‘Instalar app’ ou ‘Adicionar ao ecrã principal’. Em Chrome/Android esta opção aparece quando a PWA já está pronta para instalar.");
}
window.addEventListener('beforeinstallprompt', (event)=>{
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButton();
});
window.addEventListener('appinstalled', ()=>{
  deferredInstallPrompt = null;
  updateInstallButton();
});
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch((err)=>console.warn('Service worker:', err));
  });
}
window.addEventListener('DOMContentLoaded', ()=>{
  const btn = $("installAppBtn");
  if(btn) btn.addEventListener('click', installApp);
  updateInstallButton();
});
