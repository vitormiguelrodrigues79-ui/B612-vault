const APP_URL = "https://vitormiguelrodrigues79-ui.github.io/B612-vault/";
const SUPABASE_AUTH_URL = "https://boyhtywhuumbayejfbse.supabase.co/auth/v1/authorize";
const VERSION = "B612-Vault v6.3";

function googleAuthUrl(){
  const u = new URL(SUPABASE_AUTH_URL);
  u.searchParams.set("provider", "google");
  u.searchParams.set("redirect_to", APP_URL);
  return u.toString();
}

function wireDirectGoogleLogin(){
  const btn = document.getElementById("googleLoginBtn");
  if(!btn) return;
  btn.onclick = () => { window.location.assign(googleAuthUrl()); };
}

function fixProductionBranding(){
  document.title = "B612-Vault";
  document.querySelectorAll(".staging-pill").forEach(el=>el.textContent="B612 · V6.3");
  const version = document.getElementById("versionInfo");
  if(version) version.textContent = VERSION;
}

function loadApprovedUI(){
  if(!document.querySelector('link[data-b612-v63]')){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='theme-v7.css?v=63prod';link.dataset.b612V63='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-b612-v63]')){
    const script=document.createElement('script');
    script.src='ui-v7.js?v=63prod';script.defer=true;script.dataset.b612V63='1';
    document.body.appendChild(script);
  }
}

async function shareApp(){
  const data={title:"B612-Vault",text:"Experimenta a B612-Vault — uma app privada para organizar e partilhar coleções de relógios com amigos.",url:APP_URL};
  try{
    if(navigator.share){ await navigator.share(data); return; }
    await navigator.clipboard.writeText(APP_URL); alert("Link da B612-Vault copiado.");
  }catch(err){
    if(err?.name !== "AbortError"){
      try{ await navigator.clipboard.writeText(APP_URL); alert("Link da B612-Vault copiado."); }
      catch{ prompt("Copia este link para partilhar a B612-Vault:",APP_URL); }
    }
  }
}

function wireShare(){ const btn=document.getElementById("shareAppBtn"); if(btn) btn.onclick=shareApp; }

loadApprovedUI();
wireDirectGoogleLogin();
fixProductionBranding();
wireShare();

import("./prod-core.js?v=63prod").then(()=>{
  fixProductionBranding();
  wireDirectGoogleLogin();
  wireShare();
}).catch(err=>console.error("B612 production core failed to load",err));
