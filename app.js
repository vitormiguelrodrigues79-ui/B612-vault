import { loginGoogle } from "./supabase.js";

const APP_URL = "https://vitormiguelrodrigues79-ui.github.io/B612-vault/";

function wireLogin(){
  const btn=document.getElementById("googleLoginBtn");
  if(!btn) return;
  btn.onclick=async()=>{
    try{
      await loginGoogle();
    }catch(e){
      console.error("Google login error",e);
      alert(e?.message || "Não foi possível iniciar sessão com Google.");
    }
  };
}

async function shareApp(){
  const data={
    title:"B612-Vault",
    text:"Experimenta a B612-Vault — uma app privada para organizar e partilhar coleções de relógios com amigos.",
    url:APP_URL
  };
  try{
    if(navigator.share){ await navigator.share(data); return; }
    await navigator.clipboard.writeText(APP_URL);
    alert("Link da B612-Vault copiado.");
  }catch(err){
    if(err?.name!=="AbortError"){
      try{
        await navigator.clipboard.writeText(APP_URL);
        alert("Link da B612-Vault copiado.");
      }catch{
        prompt("Copia este link para partilhar a B612-Vault:",APP_URL);
      }
    }
  }
}

function ensureShareButton(){
  const grid=document.querySelector("#friendsView .social-grid");
  if(!grid || document.getElementById("shareAppPanel")) return;
  const panel=document.createElement("section");
  panel.id="shareAppPanel";
  panel.className="panel span-2";
  panel.innerHTML=`<div class="eyebrow">PARTILHAR B612-VAULT</div><h3>Convida um amigo</h3><p class="muted">Envia o link da aplicação. Cada pessoa entra com a sua própria conta Google e mantém a sua coleção separada.</p><button id="shareAppBtn" class="primary-btn full" type="button">Partilhar aplicação</button>`;
  grid.appendChild(panel);
  document.getElementById("shareAppBtn").addEventListener("click",shareApp);
}

wireLogin();
ensureShareButton();

import("./prod-core.js").then(()=>{
  wireLogin();
  ensureShareButton();
}).catch(err=>{
  console.error("B612 production bootstrap error",err);
  wireLogin();
});
