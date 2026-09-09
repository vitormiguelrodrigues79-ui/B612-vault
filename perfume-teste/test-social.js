import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_KEY } from "../supabase-config.js";

const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const grid=document.getElementById('grid');
const empty=document.getElementById('empty');
const tabs=document.querySelector('.tabs');
const form=document.getElementById('perfumeForm');
const dialog=document.getElementById('perfumeDialog');
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#39;"}[c]));

function ensureStyles(){
  if(document.getElementById('friendsTestStyles')) return;
  const s=document.createElement('style');
  s.id='friendsTestStyles';
  s.textContent=`
    .friends-test-tab{border:0;background:transparent;color:inherit;padding:10px 12px;border-radius:12px;font:inherit;cursor:pointer}
    .friends-test-tab.active{background:var(--ink);color:var(--bg)}
    #friendsTestPanel{margin:18px 0;padding:22px;border:1px solid var(--line);border-radius:18px;background:var(--panel)}
    #friendsTestPanel h3{margin:0 0 8px}#friendsTestPanel p{color:var(--muted);line-height:1.5}
    #sharePerfumeBtn{border:1px solid var(--line);background:transparent;font-weight:750}
    .friend-add{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;margin:16px 0}.friend-add input{min-width:0}
    .friends-list{display:grid;gap:10px;margin-top:14px}.friend-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--line)}
    .friend-row small{display:block;color:var(--muted);margin-top:3px}.friend-actions{display:flex;gap:7px;flex-wrap:wrap}.friend-actions button{padding:7px 10px}
    #friendMsg{min-height:20px;font-size:.82rem;color:var(--muted)}
    .privacy-list{display:grid;gap:8px;margin:14px 0}.privacy-box{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:color-mix(in srgb,var(--panel) 94%,var(--ink) 6%)}
    .privacy-copy{display:grid;gap:3px}.privacy-copy strong{font-size:.86rem}.privacy-copy small{color:var(--muted)}.privacy-toggle{width:20px;height:20px;accent-color:var(--ink);flex:0 0 auto}
    #friendSharedView{margin-top:18px;border-top:1px solid var(--line);padding-top:18px}.friend-fav-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}.friend-fav-head h4{margin:0}
    .share-category-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 13px}.share-category-tabs button{padding:7px 10px}.share-category-tabs button.active{background:var(--ink);color:var(--bg)}
    .friend-fav-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}.friend-fav-card{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--panel)}
    .friend-fav-card img{width:100%;aspect-ratio:1/1;object-fit:cover;background:#eee}.friend-fav-card .body{padding:12px}.friend-fav-card h5{margin:0 0 3px;font-size:.95rem}.friend-fav-card p{margin:4px 0 0!important;font-size:.78rem}.friend-fav-card .score{display:inline-block;margin-top:8px;font-weight:800;font-size:.78rem}
    @media(max-width:560px){.friend-add{grid-template-columns:1fr}.friend-row{align-items:flex-start;flex-direction:column}.friend-actions{width:100%}.friend-actions button{flex:1}}
  `;
  document.head.appendChild(s);
}

function ensureFriends(){
  if(!tabs || document.getElementById('friendsTestBtn')) return;
  const btn=document.createElement('button');
  btn.type='button';btn.id='friendsTestBtn';btn.className='friends-test-tab';btn.textContent='Amigos';tabs.appendChild(btn);

  const panel=document.createElement('section');
  panel.id='friendsTestPanel';panel.className='hidden';
  panel.innerHTML=`
    <h3>Amigos</h3>
    <p>Adiciona alguém através do email da conta Google que usa no Oud d’Haenir e vê apenas as categorias que cada amigo decidiu partilhar.</p>
    <div class="privacy-list" aria-label="Partilhas com amigos">
      <label class="privacy-box"><span class="privacy-copy"><strong>Favoritos</strong><small>Partilhar os perfumes marcados como favoritos</small></span><input class="privacy-toggle" type="checkbox" data-sharing-category="favorites"></label>
      <label class="privacy-box"><span class="privacy-copy"><strong>Tenho</strong><small>Partilhar os frascos da tua coleção</small></span><input class="privacy-toggle" type="checkbox" data-sharing-category="collection"></label>
      <label class="privacy-box"><span class="privacy-copy"><strong>Decants</strong><small>Partilhar os teus decants</small></span><input class="privacy-toggle" type="checkbox" data-sharing-category="decants"></label>
    </div>
    <div class="friend-add"><input id="friendEmail" type="email" autocomplete="email" placeholder="email@gmail.com"><button id="addFriendBtn" type="button" class="primary">Adicionar</button></div>
    <div id="friendMsg"></div>
    <div id="friendsList" class="friends-list"></div>
    <div id="friendSharedView" class="hidden"><div class="friend-fav-head"><h4 id="friendSharedTitle">Partilhas</h4><button id="closeFriendShared" type="button">Fechar</button></div><div class="share-category-tabs"><button type="button" data-share-view="favorites">Favoritos</button><button type="button" data-share-view="collection">Tenho</button><button type="button" data-share-view="decants">Decants</button></div><div id="friendSharedGrid" class="friend-fav-grid"></div></div>`;
  grid?.parentNode?.insertBefore(panel,grid);

  btn.addEventListener('click',async()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');grid?.classList.add('hidden');empty?.classList.add('hidden');panel.classList.remove('hidden');
    await Promise.all([loadFriends(),loadPrivacy()]);
  });
  document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{btn.classList.remove('active');panel.classList.add('hidden');grid?.classList.remove('hidden');}));
  document.getElementById('addFriendBtn')?.addEventListener('click',addFriendByEmail);
  document.getElementById('friendEmail')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addFriendByEmail();}});
  document.querySelectorAll('[data-sharing-category]').forEach(input=>input.addEventListener('change',savePrivacy));
  document.querySelectorAll('[data-share-view]').forEach(button=>button.addEventListener('click',()=>loadFriendShares(friendShareState.userId,friendShareState.name,button.dataset.shareView)));
  document.getElementById('closeFriendShared')?.addEventListener('click',()=>document.getElementById('friendSharedView')?.classList.add('hidden'));
}

async function sessionUser(){const {data}=await supabase.auth.getSession();return data.session?.user||null;}
function setFriendMsg(text){const el=document.getElementById('friendMsg');if(el)el.textContent=text||'';}

async function loadPrivacy(){
  const inputs=[...document.querySelectorAll('[data-sharing-category]')];if(!inputs.length)return;
  try{
    const {data,error}=await supabase.rpc('my_perfume_sharing');if(error)throw error;
    const settings=Array.isArray(data)?data[0]:data;if(!settings)return;
    inputs.forEach(input=>{input.checked=!!settings[input.dataset.sharingCategory];});
  }catch(err){console.warn('privacy load',err);setFriendMsg('Não foi possível carregar as definições de partilha.');}
}
async function savePrivacy(e){
  const input=e.currentTarget,category=input.dataset.sharingCategory,enabled=input.checked;input.disabled=true;setFriendMsg('A guardar privacidade…');
  try{const {error}=await supabase.rpc('set_perfume_sharing',{target_category:category,new_enabled:enabled});if(error)throw error;setFriendMsg(`${sharingLabels[category]}: partilha ${enabled?'ligada':'desligada'}.`);}
  catch(err){input.checked=!enabled;console.warn('privacy save',err);setFriendMsg('Não foi possível guardar a privacidade.');}
  finally{input.disabled=false;}
}

async function addFriendByEmail(){
  const input=document.getElementById('friendEmail');const email=(input?.value||'').trim().toLowerCase();
  if(!email){setFriendMsg('Indica o email Gmail do teu amigo.');return;}
  const user=await sessionUser();if(!user){setFriendMsg('Faz login com Google antes de adicionar amigos.');return;}
  setFriendMsg('A procurar utilizador…');
  try{
    const {data:found,error:findError}=await supabase.rpc('find_profile_by_email',{target_email:email});if(findError)throw findError;
    const profile=Array.isArray(found)?found[0]:null;if(!profile){setFriendMsg('Não encontrei uma conta Oud d’Haenir com esse email.');return;}
    const {error}=await supabase.from('friendships').insert({requester_id:user.id,addressee_id:profile.user_id,status:'pending'});
    if(error){if(error.code==='23505')setFriendMsg('Já existe um pedido ou amizade com esta pessoa.');else throw error;}
    else{setFriendMsg(`Pedido enviado para ${profile.display_name||'o utilizador'}.`);if(input)input.value='';}
    await loadFriends();
  }catch(err){console.warn('friend add',err);setFriendMsg('Não foi possível enviar o pedido. Tenta novamente.');}
}

async function loadFriends(){
  const host=document.getElementById('friendsList');if(!host)return;
  const user=await sessionUser();if(!user){host.innerHTML='<small>Entra com Google para usar Amigos.</small>';return;}
  host.innerHTML='<small>A carregar…</small>';
  try{
    const {data,error}=await supabase.rpc('friend_profiles');if(error)throw error;const rows=Array.isArray(data)?data:[];
    if(!rows.length){host.innerHTML='<small>Ainda não tens amigos nem pedidos pendentes.</small>';return;}
    host.innerHTML=rows.map(r=>{
      const incoming=r.status==='pending'&&r.direction==='incoming',outgoing=r.status==='pending'&&r.direction==='outgoing',accepted=r.status==='accepted';
      const state=accepted?'Amigo':incoming?'Pedido recebido':outgoing?'Pedido enviado':'Recusado';
      const actions=incoming?`<div class="friend-actions"><button type="button" data-accept="${r.friendship_id}">Aceitar</button><button type="button" data-reject="${r.friendship_id}">Recusar</button></div>`:accepted?`<div class="friend-actions"><button type="button" data-shared="${r.other_user_id}" data-name="${esc(r.display_name||'Utilizador')}">Ver partilhas</button><button type="button" data-remove="${r.friendship_id}">Remover</button></div>`:'';
      return `<div class="friend-row"><div><strong>${esc(r.display_name||'Utilizador')}</strong><small>${esc(state)}</small></div>${actions}</div>`;
    }).join('');
    host.querySelectorAll('[data-accept]').forEach(b=>b.addEventListener('click',()=>respondFriend(b.dataset.accept,'accepted')));
    host.querySelectorAll('[data-reject]').forEach(b=>b.addEventListener('click',()=>respondFriend(b.dataset.reject,'rejected')));
    host.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>removeFriend(b.dataset.remove)));
    host.querySelectorAll('[data-shared]').forEach(b=>b.addEventListener('click',()=>loadFriendShares(b.dataset.shared,b.dataset.name,'favorites')));
  }catch(err){console.warn('friends load',err);host.innerHTML='<small>Não foi possível carregar os amigos.</small>';}
}

const sharingLabels={favorites:'Favoritos',collection:'Tenho',decants:'Decants'};
const friendShareState={userId:null,name:'',category:'favorites'};
async function loadFriendShares(userId,name,category='favorites'){
  const view=document.getElementById('friendSharedView'),host=document.getElementById('friendSharedGrid'),title=document.getElementById('friendSharedTitle');
  if(!view||!host||!userId)return;
  friendShareState.userId=userId;friendShareState.name=name||'amigo';friendShareState.category=category;
  view.classList.remove('hidden');title.textContent=`Partilhas de ${friendShareState.name}`;
  document.querySelectorAll('[data-share-view]').forEach(button=>button.classList.toggle('active',button.dataset.shareView===category));
  host.innerHTML=`<small>A carregar ${sharingLabels[category].toLowerCase()}…</small>`;view.scrollIntoView({behavior:'smooth',block:'nearest'});
  try{
    const {data,error}=await supabase.rpc('friend_shared_perfumes',{target_user_id:userId,target_category:category});if(error)throw error;const rows=Array.isArray(data)?data:[];
    if(friendShareState.userId!==userId||friendShareState.category!==category)return;
    if(!rows.length){host.innerHTML=`<small>Este amigo não está a partilhar ${sharingLabels[category].toLowerCase()} ou ainda não tem itens nesta categoria.</small>`;return;}
    host.innerHTML=rows.map(p=>`<article class="friend-fav-card">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy">`:''}<div class="body"><h5>${esc(p.brand||'')} ${esc(p.name||'')}</h5>${p.concentration?`<p>${esc(p.concentration)}</p>`:''}${p.profile?`<p>${esc(p.profile)}</p>`:''}${p.inspiration_name?`<p>Similar: ${esc(p.inspiration_name)}${p.inspiration_house?` · ${esc(p.inspiration_house)}`:''}</p>`:''}${p.overall_score!==null&&p.overall_score!==undefined?`<span class="score">★ ${Number(p.overall_score).toFixed(1)}/10</span>`:''}</div></article>`).join('');
  }catch(err){console.warn('friend shares',err);host.innerHTML='<small>Não foi possível carregar as partilhas deste amigo.</small>';}
}

async function respondFriend(id,status){
  setFriendMsg(status==='accepted'?'A aceitar pedido…':'A recusar pedido…');
  try{const {error}=await supabase.from('friendships').update({status,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;setFriendMsg(status==='accepted'?'Pedido aceite.':'Pedido recusado.');await loadFriends();}
  catch(err){console.warn('friend respond',err);setFriendMsg('Não foi possível atualizar o pedido.');}
}
async function removeFriend(id){
  try{const {error}=await supabase.from('friendships').delete().eq('id',id);if(error)throw error;setFriendMsg('Amizade removida.');document.getElementById('friendSharedView')?.classList.add('hidden');await loadFriends();}
  catch(err){console.warn('friend remove',err);setFriendMsg('Não foi possível remover a amizade.');}
}

function currentPerfume(){const id=document.getElementById('perfumeId')?.value||'',brand=document.getElementById('brand')?.value?.trim()||'',name=document.getElementById('name')?.value?.trim()||'',concentration=document.getElementById('concentration')?.value?.trim()||'',score=document.getElementById('overallScore')?.value||'',profile=document.getElementById('profile')?.value?.trim()||'';return{id,brand,name,concentration,score,profile};}
function shareText(p){const title=[p.brand,p.name].filter(Boolean).join(' — ');const lines=[title,p.concentration,p.profile,p.score?`Nota: ${p.score}/10`:'' ].filter(Boolean);return `${lines.join('\n')}\n\nPartilhado através do Oud d’Haenir.`;}
async function shareCurrent(){const p=currentPerfume();if(!p.name){alert('Abre primeiro uma ficha de perfume para partilhar.');return;}const text=shareText(p);const url=location.origin+location.pathname.replace('/perfume-teste/','/perfume/');try{if(navigator.share){await navigator.share({title:`${p.brand} ${p.name}`.trim(),text,url});}else{await navigator.clipboard.writeText(`${text}\n${url}`);alert('Ficha copiada. Já podes colar no WhatsApp ou email.');}}catch(err){if(err?.name!=='AbortError')console.warn('share',err);}}
function ensureShare(){if(!form||document.getElementById('sharePerfumeBtn'))return;const actions=form.querySelector('.dialog-actions');if(!actions)return;const btn=document.createElement('button');btn.type='button';btn.id='sharePerfumeBtn';btn.textContent='Partilhar';btn.className='hidden';btn.addEventListener('click',shareCurrent);const spacer=actions.querySelector('span');actions.insertBefore(btn,spacer||actions.firstChild);const observer=new MutationObserver(()=>{const hasId=!!document.getElementById('perfumeId')?.value;btn.classList.toggle('hidden',!hasId||!dialog?.open);});observer.observe(dialog,{attributes:true,attributeFilter:['open']});form.addEventListener('input',()=>btn.classList.toggle('hidden',!document.getElementById('perfumeId')?.value));}

ensureStyles();ensureFriends();ensureShare();
