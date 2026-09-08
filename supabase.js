import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://boyhtywhuumbayejfbse.supabase.co";
const SUPABASE_KEY = "sb_publishable_U3BQ__QzzsBOSq6w_2LGew_GczKnjhO";
const BUCKET = "watch-photos";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

export async function getSessionUser(){
  const {data,error}=await supabase.auth.getSession();
  if(error) throw error;
  return data.session?.user || null;
}
export function onAuth(callback){
  return supabase.auth.onAuthStateChange((event,session)=>callback(event,session?.user||null));
}
export async function loginGoogle(){
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const {error}=await supabase.auth.signInWithOAuth({
    provider:"google",
    options:{redirectTo}
  });
  if(error) throw error;
}
export async function logout(){
  const {error}=await supabase.auth.signOut();
  if(error) throw error;
}
export async function ensureProfile(user){
  const meta=user.user_metadata||{};
  const payload={
    user_id:user.id,
    email:user.email||"",
    display_name:meta.full_name||meta.name||(user.email||"").split("@")[0],
    avatar_url:meta.avatar_url||meta.picture||null,
    updated_at:new Date().toISOString()
  };
  const {error}=await supabase.from("profiles").update(payload).eq("user_id",user.id);
  if(error) throw error;
}
export async function getOwnProfile(userId){
  const {data,error}=await supabase.from("profiles").select("*").eq("user_id",userId).single();
  if(error) throw error;
  return data;
}
export async function updatePrivacy(userId,values){
  const {error}=await supabase.from("profiles").update({
    watches_collection_visibility:values.collection,
    watches_builds_visibility:values.build,
    watches_wishlist_visibility:values.wishlist,
    updated_at:new Date().toISOString()
  }).eq("user_id",userId);
  if(error) throw error;
}
export async function searchProfiles(term){
  const {data,error}=await supabase.rpc("search_b612_profiles",{search_term:term});
  if(error) throw error;
  return data||[];
}
export async function relatedProfile(userId){
  const {data,error}=await supabase.rpc("get_b612_related_profile",{target_user:userId});
  if(error) throw error;
  return data?.[0]||null;
}
export async function friendProfile(userId){
  const {data,error}=await supabase.rpc("get_b612_profile",{target_user:userId});
  if(error) throw error;
  return data?.[0]||null;
}
export async function getFriendships(userId){
  const {data,error}=await supabase.from("friendships").select("*")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("created_at",{ascending:false});
  if(error) throw error;
  return data||[];
}
export async function sendFriendRequest(targetUserId,userId){
  const {error}=await supabase.from("friendships").insert({
    requester_id:userId,addressee_id:targetUserId,status:"pending"
  });
  if(error) throw error;
}
export async function acceptFriendRequest(id){
  const {error}=await supabase.from("friendships").update({status:"accepted",updated_at:new Date().toISOString()}).eq("id",id);
  if(error) throw error;
}
export async function removeFriendship(id){
  const {error}=await supabase.from("friendships").delete().eq("id",id);
  if(error) throw error;
}
export async function loadWatches(ownerId=null){
  let q=supabase.from("watches").select("*").order("updated_at",{ascending:false});
  if(ownerId) q=q.eq("user_id",ownerId);
  const {data,error}=await q;
  if(error) throw error;
  return (data||[]).map(rowToItem);
}
export async function saveWatch(item,userId){
  const {error}=await supabase.from("watches").upsert(itemToRow(item,userId),{onConflict:"id"});
  if(error) throw error;
}
export async function deleteWatch(id){
  const {error}=await supabase.from("watches").delete().eq("id",id);
  if(error) throw error;
}
export async function signedPhoto(path,expires=3600){
  if(!path) return "";
  const {data,error}=await supabase.storage.from(BUCKET).createSignedUrl(path,expires);
  if(error) throw error;
  return data?.signedUrl||"";
}
export async function uploadPhoto(file,watchId,userId){
  const blob=await compressImage(file);
  const path=`${userId}/${watchId}/${Date.now()}.jpg`;
  const {error}=await supabase.storage.from(BUCKET).upload(path,blob,{contentType:"image/jpeg",cacheControl:"3600"});
  if(error) throw error;
  return path;
}
export async function deletePhoto(path){
  if(!path) return;
  const {error}=await supabase.storage.from(BUCKET).remove([path]);
  if(error) throw error;
}
function rowToItem(r){return{
  id:r.id,status:r.status,wishlistType:r.wishlist_type||"watch",brand:r.brand||"",model:r.model||"",
  reference:r.reference||"",movement:r.movement||"",diameter:r.diameter??"",year:r.year??"",
  purchasePrice:r.purchase_price??"",imageStoragePath:r.image_storage_path||"",link:r.link||"",
  casePart:r.case_part||"",dialPart:r.dial_part||"",handsPart:r.hands_part||"",strapPart:r.strap_part||"",
  notes:r.notes||"",updatedAt:r.updated_at?new Date(r.updated_at).getTime():Date.now(),userId:r.user_id
}}
function itemToRow(i,userId){return{
  id:i.id,user_id:userId,status:i.status,wishlist_type:i.wishlistType||null,brand:i.brand||null,model:i.model||null,
  reference:i.reference||null,movement:i.movement||null,diameter:i.diameter===""?null:i.diameter,
  year:i.year===""?null:i.year,purchase_price:i.purchasePrice===""?null:i.purchasePrice,current_value:null,
  image_storage_path:i.imageStoragePath||null,link:i.link||null,case_part:i.casePart||null,dial_part:i.dialPart||null,
  hands_part:i.handsPart||null,strap_part:i.strapPart||null,notes:i.notes||null,
  updated_at:new Date(i.updatedAt||Date.now()).toISOString()
}}
async function compressImage(file,max=1600,quality=.82){
  const bmp=await createImageBitmap(file);const ratio=Math.min(1,max/Math.max(bmp.width,bmp.height));
  const c=document.createElement("canvas");c.width=Math.round(bmp.width*ratio);c.height=Math.round(bmp.height*ratio);
  c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
  return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("Falha ao comprimir imagem")),"image/jpeg",quality));
}
