import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_KEY } from "../supabase-config.js";

const STORES=[
  {name:"Worten Marketplace",host:"worten.pt"},
  {name:"Zaoud.it",host:"zaoud.it"},
  {name:"Koud.pt",host:"koud.pt"}
];
const STORAGE_KEY="b612_scent_vault_v1";
const $=id=>document.getElementById(id);
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

function ensureSearchUi(){
  const host=$("marketPrices"); if(!host||$("priceSearchBtn")) return;
  const wrap=document.createElement("div"); wrap.className="span2"; wrap.id="priceSearchTools";
  wrap.innerHTML=`<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:2px 0 10px"><button type="button" id="priceSearchBtn" class="primary">Procurar preços</button><span id="priceSearchStatus" style="font-size:12px;opacity:.72"></span></div>`;
  host.prepend(wrap);
  $("priceSearchBtn")?.addEventListener("click",searchPrices);
}

function enforce(){
  ensureSearchUi();
  STORES.forEach((s,idx)=>{
    const i=idx+1,input=$(`priceStore${i}`);if(!input)return;
    input.value=s.name;input.readOnly=true;input.setAttribute("aria-label",s.name);
    const label=input.closest("label");if(label){const text=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);if(text)text.textContent=s.name+" ";}
    const url=$(`priceUrl${i}`);if(url&&!url.placeholder.includes(s.host))url.placeholder=`https://${s.host}/...`;
  });
}

function setStatus(text){const s=$("priceSearchStatus");if(s)s.textContent=text||""}
function fillResult(index,result){
  const price=$(`priceValue${index}`),url=$(`priceUrl${index}`);
  if(!price||!url)return;
  if(result?.status==="found"&&Number.isFinite(Number(result.price))){price.value=Number(result.price).toFixed(2);url.value=result.url||"";price.dataset.live="1";url.dataset.live="1";}
  else {price.value="";url.value="";price.dataset.live="";url.dataset.live="";}
}
function currentOptions(){return STORES.map((s,idx)=>({store:s.name,price:(()=>{const v=$(`priceValue${idx+1}`)?.value;return v===""||v==null?null:Number(v)})(),url:$(`priceUrl${idx+1}`)?.value?.trim()||""})).filter(x=>x.price!==null||x.url)}
function persistLocalPrices(){
  const id=$("perfumeId")?.value; if(!id)return;
  try{
    const arr=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); if(!Array.isArray(arr))return;
    const i=arr.findIndex(x=>x?.id===id); if(i<0)return;
    arr[i]={...arr[i],priceOptions:currentOptions(),updatedAt:Date.now()};
    localStorage.setItem(STORAGE_KEY,JSON.stringify(arr));
    window.dispatchEvent(new CustomEvent("oud-haenir-prices-updated",{detail:{id,priceOptions:arr[i].priceOptions}}));
  }catch(e){console.warn("persist local prices",e)}
}

async function searchPrices(){
  const brand=$("brand")?.value?.trim()||"", name=$("name")?.value?.trim()||"";
  if(!name){setStatus("Preenche primeiro o nome do perfume.");return;}
  const btn=$("priceSearchBtn"); if(btn){btn.disabled=true;btn.textContent="A procurar…"}
  setStatus("A consultar Worten, Zaoud e Koud…");
  try{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setStatus("Entra na cloud para fazer a pesquisa de preços.");return;}
    const status=$("status")?.value||"";
    const rawSize=Number($("sizeMl")?.value||0);
    const targetMl=(status==="decant"||!Number.isFinite(rawSize)||rawSize<20)?100:rawSize;
    const {data,error}=await supabase.functions.invoke("perfume-price-search",{body:{brand,name,targetMl}});
    if(error)throw error;
    const results=Array.isArray(data?.results)?data.results:[];
    STORES.forEach((s,idx)=>fillResult(idx+1,results.find(r=>r?.store===s.name)));
    persistLocalPrices();
    const found=results.filter(r=>r?.status==="found"&&Number.isFinite(Number(r.price)));
    if(found.length){
      const best=[...found].sort((a,b)=>Number(a.price)-Number(b.price))[0];
      setStatus(`Atualizado agora · melhor preço ${Number(best.price).toFixed(2)} € · ${best.store}`);
    } else setStatus("Não encontrei este perfume nas três lojas.");
  }catch(e){console.warn("price search",e);setStatus("Não foi possível atualizar os preços agora.");}
  finally{if(btn){btn.disabled=false;btn.textContent="Procurar preços"}}
}

const dialog=$("perfumeDialog");if(dialog)new MutationObserver(()=>{enforce();setStatus("")}).observe(dialog,{attributes:true,attributeFilter:["open"],subtree:false});
document.addEventListener("click",e=>{if(e.target.closest(".edit")||e.target.closest("#addBtn")||e.target.closest("#floatingAdd"))setTimeout(()=>{enforce();setStatus("")},20)});
document.getElementById("perfumeForm")?.addEventListener("submit",enforce,{capture:true});
enforce();
