const STORES=[
  {name:"Worten Marketplace",host:"worten.pt"},
  {name:"Zaoud.it",host:"zaoud.it"},
  {name:"Koud.pt",host:"koud.pt"}
];
const $=id=>document.getElementById(id);
function enforce(){
  STORES.forEach((s,idx)=>{
    const i=idx+1,input=$(`priceStore${i}`);if(!input)return;
    input.value=s.name;input.readOnly=true;input.setAttribute("aria-label",s.name);
    const label=input.closest("label");if(label){const text=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);if(text)text.textContent=s.name+" ";}
    const url=$(`priceUrl${i}`);if(url&&!url.placeholder.includes(s.host))url.placeholder=`https://${s.host}/...`;
  });
}
const dialog=$("perfumeDialog");if(dialog)new MutationObserver(enforce).observe(dialog,{attributes:true,attributeFilter:["open"],subtree:false});
document.addEventListener("click",e=>{if(e.target.closest(".edit")||e.target.closest("#addBtn")||e.target.closest("#floatingAdd"))setTimeout(enforce,20)});
document.getElementById("perfumeForm")?.addEventListener("submit",enforce,{capture:true});
enforce();
