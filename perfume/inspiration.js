const PERFUME_REFERENCES = {
  "club de nuit intense man": { match: "Aventus", house: "Creed", source: "Parfumo", url: "https://www.parfumo.com/Perfumes/Armaf/club-de-nuit-intense-man-eau-de-toilette", note: "Aventus aparece entre os perfumes mais semelhantes no Parfumo." },
  "marwa": { match: "Imagination", house: "Louis Vuitton", source: "Parfumo", url: "https://www.parfumo.com/Perfumes/arabiyat-prestige/marwa-eau-de-parfum", note: "Imagination surge no topo das similaridades e é a comparação dominante nas reviews." },
  "l’homme": { match: "L’Homme Eau de Parfum / linha L’Homme", house: "Yves Saint Laurent", source: "Parfumo", url: "https://www.parfumo.com/Perfumes/Yves_Saint_Laurent/l-homme-eau-de-parfum", note: "É um original da própria linha YSL; a referência serve para comparação, não como clone." },
  "l'homme": { match: "L’Homme Eau de Parfum / linha L’Homme", house: "Yves Saint Laurent", source: "Parfumo", url: "https://www.parfumo.com/Perfumes/Yves_Saint_Laurent/l-homme-eau-de-parfum", note: "É um original da própria linha YSL; a referência serve para comparação, não como clone." },
  "arctic breeze": { match: "Imagination", house: "Louis Vuitton", source: "Parfumo", url: "https://www.parfumo.com/Fragrance_Note/Chinese_black_tea?current_page=2", note: "O Parfumo já cataloga Arctic Breeze no mesmo eixo de chá preto; a ficha de similaridade direta ainda não apareceu na pesquisa. A referência Imagination fica assinalada como inspiração conhecida, não como score oficial." },
  "jean lowe immortel": { match: "L’Immensité", house: "Louis Vuitton", source: "Parfumo", url: "https://www.parfumo.com/Perfumes/maison-alhambra/immortel-immortal", note: "L’Immensité é a primeira correspondência em ‘Smells similar’." },
  "inekas luna": { match: "Gentleman Givenchy Réserve Privée", house: "Givenchy", source: "Parfumo", url: "https://www.parfumo.com/Perfumes/zimaya/inekas-luna", note: "Réserve Privée surge como a principal similaridade no Parfumo." },
  "liam grey": { match: "Gris Charnel Eau de Parfum", house: "BDK Parfums", source: "Parfumo", url: "https://www.parfumo.com/Perfumes/Lattafa/liam", note: "Gris Charnel EDP é a principal referência de similaridade; o Extrait também aparece logo a seguir." },
  "spectre ghost": { match: "Ani Extrait de Parfum", house: "Nishane", source: "Parfumo", url: "https://www.parfumo.com/Perfumes/french-avenue/spectre-ghost", note: "Ani Extrait aparece no topo das similaridades." },
  "ramad oriental": { match: "Outlands", house: "Amouage", source: "Parfumo", url: "https://www.parfumo.com/Perfumes/arabiyat-prestige/ramad-oriental", note: "Outlands é a principal referência no Parfumo; reviews colocam-no na mesma direção, mas não como cópia 1:1." }
};

const STORAGE_KEY="b612_scent_vault_v1";
const normalize = value => (value || "").trim().toLowerCase();
let transientReference=null;

function storedReference(name){
  try{
    const arr=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
    const item=Array.isArray(arr)?arr.find(x=>normalize(x.name)===normalize(name)):null;
    if(!item?.inspirationName)return null;
    return {match:item.inspirationName,house:item.inspirationHouse||"",source:"Parfumo",url:item.inspirationUrl||item.parfumoUrl||"",note:"Principal correspondência importada de ‘Smells similar’ no Parfumo."};
  }catch{return null;}
}
function findReference(name){
  const key = normalize(name);
  if(transientReference?.name&&normalize(transientReference.name)===key)return transientReference.ref;
  return PERFUME_REFERENCES[key] || storedReference(name) || null;
}
function block(ref){
  if(!ref) return `<div class="similarity-card similarity-empty"><strong>Referência Parfumo</strong><span>Ainda sem correspondência registada nesta versão.</span></div>`;
  const link=ref.url?`<a href="${ref.url}" target="_blank" rel="noopener">Abrir no Parfumo ↗</a>`:"";
  return `<div class="similarity-card"><div><small>INSPIRAÇÃO / SIMILARIDADE · ${ref.source}</small><strong>${ref.match}</strong><span>${ref.house||""}</span></div><p>${ref.note||""}</p>${link}</div>`;
}
function enhanceCards(force=false){
  document.querySelectorAll("#grid .card").forEach(card => {
    const name = card.querySelector("h3")?.textContent || "";
    const content = card.querySelector(".card-content");
    if(!content)return;
    const existing=card.querySelector(".similarity-card");
    if(existing&&!force)return;
    if(existing)existing.remove();
    content.insertAdjacentHTML("beforeend", block(findReference(name)));
  });
}
function enhanceDialog(){
  const dialog=document.getElementById("perfumeDialog"),nameInput=document.getElementById("name");
  if(!dialog||!nameInput)return;
  let host=dialog.querySelector("#parfumoReference");
  if(!host){host=document.createElement("div");host.id="parfumoReference";host.className="span2";dialog.querySelector(".form-grid")?.appendChild(host)}
  host.innerHTML=block(findReference(nameInput.value));
}
function applyAppBranding(){
  document.title="Oud d’Haenir";
  let favicon=document.querySelector('link[rel="icon"]');
  if(!favicon){favicon=document.createElement("link");favicon.rel="icon";document.head.appendChild(favicon)}
  favicon.type="image/png";favicon.href="oud-haenir-icon-192.png?v=1.8";
  const touch=document.querySelector('link[rel="apple-touch-icon"]');if(touch)touch.href="oud-haenir-apple-touch-icon.png?v=1.8";
}
const observer=new MutationObserver(()=>enhanceCards());const grid=document.getElementById("grid");if(grid)observer.observe(grid,{childList:true,subtree:true});
document.addEventListener("click",e=>{if(e.target.closest(".edit")||e.target.closest("#addBtn")||e.target.closest("#floatingAdd")){transientReference=null;setTimeout(enhanceDialog,40)}});
document.getElementById("name")?.addEventListener("input",enhanceDialog);
window.addEventListener("oud-haenir-parfumo-import",e=>{const d=e.detail||{};transientReference=d.inspiration?{name:d.name,ref:d.inspiration}:null;enhanceDialog()});
window.addEventListener("oud-haenir-metadata-updated",()=>{transientReference=null;setTimeout(()=>{enhanceCards(true);enhanceDialog()},80)});
applyAppBranding();setTimeout(()=>{enhanceCards();enhanceDialog()},100);