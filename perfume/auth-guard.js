import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_KEY } from "../supabase-config.js";

const STORAGE_KEY="b612_scent_vault_v1";
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

const norm=v=>String(v||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const key=x=>`${norm(x?.brand)}|${norm(x?.name)}`;
const has=v=>Array.isArray(v)?v.length>0:(v!==null&&v!==undefined&&v!=="");

function loadLocal(){try{const a=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(a)?a:[]}catch{return []}}
function saveLocal(a){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(a))}catch{}}
function fromRow(r){return {
  id:r.id,status:r.status,brand:r.brand||"",name:r.name||"",concentration:r.concentration||"",sizeMl:r.status==="decant"?(r.decant_size_ml??""):(r.bottle_size_ml??""),imageUrl:r.image_url||"",profile:r.profile||"",topNotes:r.top_notes||"",heartNotes:r.heart_notes||"",baseNotes:r.base_notes||"",seasons:r.seasons||[],times:r.times||[],openingNotes:r.opening_notes||"",evolution30m:r.evolution_30m||"",evolution2h:r.evolution_2h||"",evolution6h:r.evolution_6h||"",longevityScore:r.longevity_score,projectionScore:r.projection_score,eleganceScore:r.elegance_score,originalityScore:r.originality_score,fitScore:r.fit_score,overallScore:r.overall_score,purchasePrice:r.purchase_price,sourceUrl:r.source_url||"",favorite:!!r.favorite,notes:r.notes||"",priceOptions:Array.isArray(r.price_options)?r.price_options:[],finishedAt:r.finished_at?new Date(r.finished_at).getTime():null,releaseYear:r.release_year??null,parfumoUrl:r.parfumo_url||"",inspirationName:r.inspiration_name||r.parfumo_similar_name||"",inspirationHouse:r.inspiration_house||r.parfumo_similar_house||"",inspirationUrl:r.inspiration_url||r.parfumo_similar_url||"",createdAt:r.created_at?new Date(r.created_at).getTime():Date.now(),updatedAt:r.updated_at?new Date(r.updated_at).getTime():Date.now()
}}
function toRow(x,userId){return {
  id:x.id,user_id:userId,status:x.status||"wishlist",brand:x.brand||null,name:x.name||"Sem nome",concentration:x.concentration||null,bottle_size_ml:(x.status==="collection"||x.status==="past")?x.sizeMl:null,decant_size_ml:x.status==="decant"?x.sizeMl:null,image_url:x.imageUrl||null,profile:x.profile||null,top_notes:x.topNotes||null,heart_notes:x.heartNotes||null,base_notes:x.baseNotes||null,seasons:x.seasons||[],times:x.times||[],opening_notes:x.openingNotes||null,evolution_30m:x.evolution30m||null,evolution_2h:x.evolution2h||null,evolution_6h:x.evolution6h||null,longevity_score:x.longevityScore??null,projection_score:x.projectionScore??null,elegance_score:x.eleganceScore??null,originality_score:x.originalityScore??null,fit_score:x.fitScore??null,overall_score:x.overallScore??null,purchase_price:x.purchasePrice??null,source_url:x.sourceUrl||null,favorite:!!x.favorite,notes:x.notes||null,price_options:x.priceOptions||[],finished_at:x.finishedAt?new Date(x.finishedAt).toISOString():null,release_year:x.releaseYear||null,parfumo_url:x.parfumoUrl||null,inspiration_name:x.inspirationName||null,inspiration_house:x.inspirationHouse||null,inspiration_url:x.inspirationUrl||null,updated_at:new Date(x.updatedAt||Date.now()).toISOString()
}}
const fields=["status","brand","name","concentration","sizeMl","imageUrl","profile","topNotes","heartNotes","baseNotes","seasons","times","openingNotes","evolution30m","evolution2h","evolution6h","longevityScore","projectionScore","eleganceScore","originalityScore","fitScore","overallScore","purchasePrice","sourceUrl","favorite","notes","priceOptions","finishedAt","releaseYear","parfumoUrl","inspirationName","inspirationHouse","inspirationUrl"];
function richness(x){return fields.reduce((n,f)=>n+(has(x?.[f])?1:0),0)}
function merge(a,b){
  if(!a)return b;if(!b)return a;
  const newer=(b.updatedAt||0)>(a.updatedAt||0)?b:a, older=newer===a?b:a;
  const richer=richness(a)>=richness(b)?a:b;
  const out={...older,...newer};
  for(const f of fields){if(!has(out[f])&&has(richer[f]))out[f]=richer[f];if(!has(out[f])&&has(older[f]))out[f]=older[f]}
  out.createdAt=Math.min(a.createdAt||Date.now(),b.createdAt||Date.now());
  out.updatedAt=Math.max(a.updatedAt||0,b.updatedAt||0,Date.now()-1);
  return out;
}
function dedupe(list){const m=new Map();for(const x of list||[]){if(!x?.name)continue;const k=key(x);m.set(k,merge(m.get(k),x))}return [...m.values()]}

function blockAnonymousSignup(){
  if(window.__oudAnonGuard)return;window.__oudAnonGuard=true;
  const original=window.fetch.bind(window);
  window.fetch=async (input,init={})=>{
    const url=typeof input==="string"?input:(input?.url||"");
    if(url.includes("/auth/v1/signup")) throw new Error("Anonymous cloud sessions are disabled for Oud d’Haenir");
    return original(input,init);
  };
}

async function stabilize(){
  const {data:{session}}=await supabase.auth.getSession();
  if(session?.user?.is_anonymous){await supabase.auth.signOut();blockAnonymousSignup();return}
  if(!session?.user){blockAnonymousSignup();return}

  const userId=session.user.id;
  const {data:rows,error}=await supabase.from("perfumes").select("*").order("updated_at",{ascending:false});
  if(error)throw error;
  const cloudRaw=(rows||[]).map(fromRow), localRaw=loadLocal();
  const cloudBuckets=new Map();
  for(const x of cloudRaw){const k=key(x);const arr=cloudBuckets.get(k)||[];arr.push(x);cloudBuckets.set(k,arr)}
  const local=dedupe(localRaw), localMap=new Map(local.map(x=>[key(x),x]));
  const merged=[];const duplicateIds=[];
  for(const [k,bucket] of cloudBuckets){
    let c=bucket.reduce((a,b)=>merge(a,b),null);
    const canonical=[...bucket].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
    c.id=canonical.id;
    for(const x of bucket)if(x.id!==canonical.id)duplicateIds.push(x.id);
    const l=localMap.get(k);if(l){c=merge(c,l);c.id=canonical.id;localMap.delete(k)}
    merged.push(c);
  }
  for(const l of localMap.values())merged.push(l);
  const clean=dedupe(merged).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  if(duplicateIds.length)await supabase.from("perfumes").delete().in("id",duplicateIds);
  if(clean.length){const {error:e}=await supabase.from("perfumes").upsert(clean.map(x=>toRow(x,userId)),{onConflict:"id"});if(e)throw e}
  saveLocal(clean);
}

try{await stabilize()}catch(e){console.warn("Oud cloud guard",e)}
