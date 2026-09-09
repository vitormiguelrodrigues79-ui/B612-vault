(()=>{
  const $=id=>document.getElementById(id);
  const nav=document.createElement('nav');
  nav.className='b612-bottom-nav';
  nav.innerHTML=`
    <button data-nav="home"><span class="nav-ico">⌂</span><span>Início</span></button>
    <button data-nav="collection"><span class="nav-ico">⌚</span><span>Coleção</span></button>
    <button data-nav="add" class="nav-add" aria-label="Adicionar"><span class="nav-ico">＋</span></button>
    <button data-nav="friends"><span class="nav-ico">♧</span><span>Amigos</span></button>
    <button data-nav="account"><span class="nav-ico">☁</span><span>Conta</span></button>`;
  document.body.appendChild(nav);

  const detail=document.createElement('section');
  detail.className='b612-detail hidden';
  detail.innerHTML=`<article class="b612-detail-card">
    <div class="b612-detail-hero"><img id="b612DetailImage" alt=""><button class="b612-detail-close" aria-label="Fechar">←</button></div>
    <div class="b612-detail-body">
      <div id="b612DetailBrand" class="b612-detail-brand"></div>
      <h2 id="b612DetailTitle" class="b612-detail-title"></h2>
      <div id="b612DetailSpecs" class="b612-detail-specs"></div>
      <div id="b612DetailTable" class="b612-detail-table"></div>
      <div class="b612-detail-actions"><button class="close">Fechar</button><button class="edit">Editar</button></div>
    </div>
  </article>`;
  document.body.appendChild(detail);

  let editAction=null;
  const clean=t=>(t||'').trim();
  const row=(label,value)=>value?`<div class="b612-detail-row"><span>${label}</span><strong>${value}</strong></div>`:'';

  function setActive(name){nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));}
  function trigger(sel){const el=document.querySelector(sel); if(el) el.click();}
  nav.addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b)return;
    const n=b.dataset.nav;
    if(n==='home'){trigger('[data-home]');setActive('home')}
    if(n==='collection'){trigger('[data-open-category="collection"]');setActive('collection')}
    if(n==='add'){$('addBtn')?.click()}
    if(n==='friends'){$('friendsHomeBtn')?.click();setActive('friends')}
    if(n==='account'){$('accountBtn')?.click();setActive('account')}
  });

  function enhanceCard(card){
    if(card.dataset.b612Enhanced)return;
    const btn=card.querySelector(':scope > button');
    if(!btn)return;
    card.dataset.b612Enhanced='1';
    const original=btn.onclick;
    btn.onclick=(ev)=>{
      ev.preventDefault();ev.stopPropagation();
      editAction=()=>original?.call(btn,ev);
      const img=card.querySelector('img');
      const brand=clean(card.querySelector('.brand')?.textContent);
      const title=clean(card.querySelector('h3')?.textContent);
      const spec=clean(card.querySelector('.spec')?.textContent);
      const costLabel=clean(card.querySelector('.cost span')?.textContent);
      const cost=clean(card.querySelector('.cost strong')?.textContent);
      $('b612DetailImage').src=img?.src||'../app-symbol.jpg';
      $('b612DetailBrand').textContent=brand;
      $('b612DetailTitle').textContent=title;
      const parts=spec.split('·').map(s=>s.trim()).filter(Boolean);
      $('b612DetailSpecs').innerHTML=parts.map(p=>`<span>${p}</span>`).join('');
      $('b612DetailTable').innerHTML=[
        row('Marca',brand),row('Modelo',title),row('Referência / ficha',spec),row(costLabel||'Custo',cost)
      ].join('');
      detail.classList.remove('hidden');
    };
  }

  const observer=new MutationObserver(()=>document.querySelectorAll('.watch-card').forEach(enhanceCard));
  observer.observe(document.body,{childList:true,subtree:true});
  document.querySelectorAll('.watch-card').forEach(enhanceCard);

  detail.querySelector('.b612-detail-close').onclick=()=>detail.classList.add('hidden');
  detail.querySelector('.close').onclick=()=>detail.classList.add('hidden');
  detail.querySelector('.edit').onclick=()=>{detail.classList.add('hidden');editAction?.()};
  detail.addEventListener('click',e=>{if(e.target===detail)detail.classList.add('hidden')});

  setActive('home');
  const version=$('versionInfo'); if(version) version.textContent='B612-Vault v6.3 STAGING';
})();
