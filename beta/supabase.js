import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_BUCKET } from "../supabase-config.js";
let supabase=null; let currentUser=null; let initPromise=null; const listeners=[];
export async function initSupabase(){
 if(initPromise) return initPromise;
 initPromise=(async()=>{
  supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  supabase.auth.onAuthStateChange((event,session)=>{currentUser=session?.user||null; setTimeout(()=>listeners.forEach(cb=>cb(event,currentUser)),0)});
  const {data,error}=await supabase.auth.getSession(); if(error) throw error; currentUser=data?.session?.user||null; return currentUser;
 })(); return initPromise;
}
export function listenAuth(cb){listeners.push(cb); if(currentUser) setTimeout(()=>cb("INITIAL_SESSION",currentUser),0)}
export async function getCurrentUser(){await initSupabase(); const {data,error}=await supabase.auth.getUser(); if(error) return null; currentUser=data.user; return currentUser}
export async function signInWithGoogle(){await initSupabase(); const redirectTo=`${window.location.origin}${window.location.pathname}`; const {data,error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo,queryParams:{prompt:"select_account"}}}); if(error) throw error; return data}
export async function signOut(){await initSupabase(); const {error}=await supabase.auth.signOut(); if(error) throw error; currentUser=null}
const rowToItem=r=>({id:r.id,status:r.status,wishlistType:r.wishlist_type||"",brand:r.brand||"",model:r.model||"",reference:r.reference||"",movement:r.movement||"",diameter:r.diameter??"",year:r.year??"",purchasePrice:r.purchase_price??"",imageStoragePath:r.image_storage_path||"",link:r.link||"",casePart:r.case_part||"",dialPart:r.dial_part||"",handsPart:r.hands_part||"",strapPart:r.strap_part||"",notes:r.notes||"",updatedAt:r.updated_at?new Date(r.updated_at).getTime():Date.now()});
const itemToRow=(x,uid)=>({id:x.id,user_id:uid,status:x.status,wishlist_type:x.wishlistType||null,brand:x.brand||null,model:x.model||null,reference:x.reference||null,movement:x.movement||null,diameter:x.diameter===""?null:x.diameter,year:x.year===""?null:x.year,purchase_price:x.purchasePrice===""?null:x.purchasePrice,current_value:null,image_storage_path:x.imageStoragePath||null,link:x.link||null,case_part:x.casePart||null,dial_part:x.dialPart||null,hands_part:x.handsPart||null,strap_part:x.strapPart||null,notes:x.notes||null,updated_at:new Date(x.updatedAt||Date.now()).toISOString()});
export async function fetchOwnWatches(){await initSupabase(); const {data,error}=await supabase.from("watches").select("*").order("updated_at",{ascending:false}); if(error) throw error; return (data||[]).map(rowToItem)}
export async function upsertWatch(item){const u=await getCurrentUser(); if(!u) throw new Error("Login necessário"); const {error}=await supabase.from("watches").upsert(itemToRow(item,u.id),{onConflict:"id"}); if(error) throw error}
export async function deleteWatchRecord(id){const {error}=await supabase.from("watches").delete().eq("id",id); if(error) throw error}
async function compressImage(file,max=1600,q=.82){const bm=await createImageBitmap(file); const ratio=Math.min(1,max/Math.max(bm.width,bm.height)); const c=document.createElement("canvas"); c.width=Math.round(bm.width*ratio); c.height=Math.round(bm.height*ratio); c.getContext("2d").drawImage(bm,0,0,c.width,c.height); return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("Falha a comprimir")),"image/jpeg",q))}
export async function uploadWatchPhoto(file,watchId,onStatus=()=>{}){const u=await getCurrentUser(); if(!u) throw new Error("Login necessário"); onStatus("A preparar foto…"); const blob=await compressImage(file); const path=`${u.id}/${watchId}/${Date.now()}.jpg`; onStatus("A enviar…"); const {error}=await supabase.storage.from(SUPABASE_BUCKET).upload(path,blob,{contentType:"image/jpeg"}); if(error) throw error; return path}
export async function getWatchPhotoUrl(path){if(!path)return""; const {data,error}=await supabase.storage.from(SUPABASE_BUCKET).createSignedUrl(path,3600); if(error) throw error; return data?.signedUrl||""}
export async function deleteWatchPhoto(path){if(!path)return; const {error}=await supabase.storage.from(SUPABASE_BUCKET).remove([path]); if(error) throw error}
export async function getFriendships(){const {data,error}=await supabase.rpc("friend_profiles"); if(error) throw error; return data||[]}
export async function findProfileByEmail(email){const {data,error}=await supabase.rpc("find_profile_by_email",{target_email:email}); if(error) throw error; return data?.[0]||null}
export async function sendFriendRequest(addresseeId){const u=await getCurrentUser(); const {error}=await supabase.from("friendships").insert({requester_id:u.id,addressee_id:addresseeId,status:"pending"}); if(error) throw error}
export async function acceptFriendRequest(id){const {error}=await supabase.from("friendships").update({status:"accepted",updated_at:new Date().toISOString()}).eq("id",id); if(error) throw error}
export async function removeFriendship(id){const {error}=await supabase.from("friendships").delete().eq("id",id); if(error) throw error}
export async function getMyWatchPrivacy(){const {data,error}=await supabase.rpc("my_watch_privacy"); if(error) throw error; return data?.[0]||{collection_visibility:"friends",builds_visibility:"friends",wishlist_visibility:"private"}}
export async function setWatchPrivacy(category,visibility){const {error}=await supabase.rpc("set_watch_privacy",{target_category:category,new_visibility:visibility}); if(error) throw error}
export async function getFriendWatches(userId,status){const {data,error}=await supabase.rpc("friend_watches",{target_user_id:userId,target_status:status}); if(error) throw error; return (data||[]).map(r=>({id:r.id,status:r.status,wishlistType:r.wishlist_type||"",brand:r.brand||"",model:r.model||"",reference:r.reference||"",movement:r.movement||"",diameter:r.diameter??"",year:r.year??"",imageStoragePath:r.image_storage_path||"",link:r.link||"",casePart:r.case_part||"",dialPart:r.dial_part||"",handsPart:r.hands_part||"",strapPart:r.strap_part||"",updatedAt:r.updated_at?new Date(r.updated_at).getTime():0}))}
