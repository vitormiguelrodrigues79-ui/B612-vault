const grid=document.getElementById('grid');
const empty=document.getElementById('empty');
const tabs=document.querySelector('.tabs');
const form=document.getElementById('perfumeForm');
const dialog=document.getElementById('perfumeDialog');

function ensureStyles(){
  if(document.getElementById('friendsTestStyles')) return;
  const s=document.createElement('style');
  s.id='friendsTestStyles';
  s.textContent=`
    .friends-test-tab{border:0;background:transparent;color:inherit;padding:10px 12px;border-radius:12px;font:inherit;cursor:pointer}
    .friends-test-tab.active{background:var(--ink);color:var(--bg)}
    #friendsTestPanel{margin:18px 0;padding:22px;border:1px solid var(--line);border-radius:18px;background:var(--panel)}
    #friendsTestPanel h3{margin:0 0 8px}#friendsTestPanel p{margin:0;color:var(--muted);line-height:1.5}
    #sharePerfumeBtn{border:1px solid var(--line);background:transparent;font-weight:750}
  `;
  document.head.appendChild(s);
}

function ensureFriends(){
  if(!tabs || document.getElementById('friendsTestBtn')) return;
  const btn=document.createElement('button');
  btn.type='button';
  btn.id='friendsTestBtn';
  btn.className='friends-test-tab';
  btn.textContent='Amigos';
  tabs.appendChild(btn);

  const panel=document.createElement('section');
  panel.id='friendsTestPanel';
  panel.className='hidden';
  panel.innerHTML='<h3>Amigos</h3><p>Esta secção fica preparada para, numa fase seguinte, ligares outros utilizadores da app. Nesta versão de teste ainda não altera a base de dados.</p>';
  grid?.parentNode?.insertBefore(panel,grid);

  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    grid?.classList.add('hidden');
    empty?.classList.add('hidden');
    panel.classList.remove('hidden');
  });

  document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{
    btn.classList.remove('active');
    panel.classList.add('hidden');
    grid?.classList.remove('hidden');
  }));
}

function currentPerfume(){
  const id=document.getElementById('perfumeId')?.value||'';
  const brand=document.getElementById('brand')?.value?.trim()||'';
  const name=document.getElementById('name')?.value?.trim()||'';
  const concentration=document.getElementById('concentration')?.value?.trim()||'';
  const score=document.getElementById('overallScore')?.value||'';
  const profile=document.getElementById('profile')?.value?.trim()||'';
  return {id,brand,name,concentration,score,profile};
}

function shareText(p){
  const title=[p.brand,p.name].filter(Boolean).join(' — ');
  const lines=[title,p.concentration,p.profile,p.score?`Nota: ${p.score}/10`:'' ].filter(Boolean);
  return `${lines.join('\n')}\n\nPartilhado através do Oud d’Haenir.`;
}

async function shareCurrent(){
  const p=currentPerfume();
  if(!p.name){ alert('Abre primeiro uma ficha de perfume para partilhar.'); return; }
  const text=shareText(p);
  const url=location.origin+location.pathname.replace('/perfume-teste/','/perfume/');
  try{
    if(navigator.share){
      await navigator.share({title:`${p.brand} ${p.name}`.trim(),text,url});
    }else{
      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert('Ficha copiada. Já podes colar no WhatsApp ou email.');
    }
  }catch(err){
    if(err?.name!=='AbortError') console.warn('share',err);
  }
}

function ensureShare(){
  if(!form || document.getElementById('sharePerfumeBtn')) return;
  const actions=form.querySelector('.dialog-actions');
  if(!actions) return;
  const btn=document.createElement('button');
  btn.type='button';
  btn.id='sharePerfumeBtn';
  btn.textContent='Partilhar';
  btn.className='hidden';
  btn.addEventListener('click',shareCurrent);
  const spacer=actions.querySelector('span');
  actions.insertBefore(btn,spacer||actions.firstChild);

  const observer=new MutationObserver(()=>{
    const hasId=!!document.getElementById('perfumeId')?.value;
    btn.classList.toggle('hidden',!hasId || !dialog?.open);
  });
  observer.observe(dialog,{attributes:true,attributeFilter:['open']});
  form.addEventListener('input',()=>btn.classList.toggle('hidden',!document.getElementById('perfumeId')?.value));
}

ensureStyles();
ensureFriends();
ensureShare();
