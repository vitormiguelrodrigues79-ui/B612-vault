import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_KEY } from "../supabase-config.js";

const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

try{
  const {data:{session}}=await supabase.auth.getSession();
  if(session?.user?.is_anonymous){
    await supabase.auth.signOut();
  }
}catch(e){
  console.warn("auth guard",e);
}

if(!window.__oudAnonGuard){
  window.__oudAnonGuard=true;
  const original=window.fetch.bind(window);
  window.fetch=async (input,init={})=>{
    const url=typeof input==="string"?input:(input?.url||"");
    if(url.includes("/auth/v1/signup")){
      throw new Error("Anonymous cloud sessions are disabled for Oud d’Haenir");
    }
    return original(input,init);
  };
}
