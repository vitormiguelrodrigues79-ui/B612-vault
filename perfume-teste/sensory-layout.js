const icon = {
  collection: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20H4Z"/><path d="M9 20v-6h6v6"/></svg>',
  friends: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-4 2.2-6 5.5-6s5 2 5.5 6"/><path d="M15 6.5a3 3 0 0 1 0 5.8M16 14c2.5.4 3.9 2 4.3 5"/></svg>',
  add: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  suppliers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6Z"/><path d="M8 8a4 4 0 0 1 8 0"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>'
};

function dockContent(button, symbol, label){
  button.innerHTML=`${symbol}<small>${label}</small>`;
}

function activate(active, buttons){
  buttons.forEach(button=>{
    const selected=button===active;
    button.classList.toggle('active',selected);
    button.setAttribute('aria-current',selected?'page':'false');
  });
}

function buildSensoryDock(){
  if(document.getElementById('sensoryDock'))return;
  const friends=document.getElementById('friendsTestBtn');
  const suppliers=document.getElementById('suppliersTestBtn');
  const theme=document.getElementById('themeBtn');
  const add=document.getElementById('addBtn');
  const collectionTab=document.querySelector('.tab[data-status="all"]');
  if(!friends||!suppliers||!theme||!add||!collectionTab){
    window.setTimeout(buildSensoryDock,50);
    return;
  }

  const dock=document.createElement('nav');
  dock.id='sensoryDock';dock.className='sensory-dock';dock.setAttribute('aria-label','Navegação principal');
  const collection=document.createElement('button');
  collection.type='button';collection.id='sensoryCollectionBtn';collection.title='Ver coleção';
  const addDock=document.createElement('button');
  addDock.type='button';addDock.className='dock-add';addDock.title='Adicionar perfume';addDock.setAttribute('aria-label','Adicionar perfume');

  dockContent(collection,icon.collection,'Coleção');
  dockContent(friends,icon.friends,'Amigos');
  dockContent(addDock,icon.add,'Adicionar');
  dockContent(suppliers,icon.suppliers,'Lojas');
  dock.append(collection,friends,addDock,suppliers,theme);
  document.body.appendChild(dock);

  const destinations=[collection,friends,suppliers];
  activate(collection,destinations);
  collection.addEventListener('click',()=>{collectionTab.click();activate(collection,destinations);window.scrollTo({top:0,behavior:'smooth'});});
  friends.addEventListener('click',()=>activate(friends,destinations));
  suppliers.addEventListener('click',()=>activate(suppliers,destinations));
  addDock.addEventListener('click',()=>add.click());
  document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>activate(collection,destinations)));

  const themeMeta=document.querySelector('meta[name="theme-color"]');
  const refreshTheme=()=>{
    const dark=document.documentElement.classList.contains('dark');
    dockContent(theme,dark?icon.moon:icon.sun,dark?'Noite':'Dia');
    theme.title=dark?'Mudar para modo dia':'Mudar para modo noite';
    theme.setAttribute('aria-label',theme.title);
    themeMeta?.setAttribute('content',dark?'#080b0a':'#eee9df');
  };
  refreshTheme();
  new MutationObserver(refreshTheme).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildSensoryDock,{once:true});
else buildSensoryDock();
