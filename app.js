import "./prod-core.js";

const APP_URL = "https://vitormiguelrodrigues79-ui.github.io/B612-vault/";
const VERSION = "B612-Vault v6.2";

function fixProductionBranding(){
  document.title = "B612-Vault";
  document.querySelectorAll(".staging-pill").forEach(el=>el.textContent="B612 · V6.2");
  document.querySelectorAll(".eyebrow").forEach(el=>{
    if(el.textContent.includes("B612-VAULT · STAGING")) el.textContent="B612-VAULT";
  });
  const version = document.getElementById("versionInfo");
  if(version) version.textContent = VERSION;

  document.querySelectorAll("img").forEach(img=>{
    if(img.src === "https://vitormiguelrodrigues79-ui.github.io/app-symbol.jpg" || img.getAttribute("src") === "../app-symbol.jpg"){
      img.src = "app-symbol.jpg";
    }
  });

  const favicon = document.querySelector('link[rel="icon"]');
  if(favicon) favicon.href = "icon-512.png";
  const apple = document.querySelector('link[rel="apple-touch-icon"]');
  if(apple) apple.href = "apple-touch-icon.png";
}

async function shareApp(){
  const data = {
    title: "B612-Vault",
    text: "Experimenta a B612-Vault — uma app privada para organizar e partilhar coleções de relógios com amigos.",
    url: APP_URL
  };
  try{
    if(navigator.share){
      await navigator.share(data);
      return;
    }
    await navigator.clipboard.writeText(APP_URL);
    alert("Link da B612-Vault copiado.");
  }catch(err){
    if(err?.name !== "AbortError"){
      try{
        await navigator.clipboard.writeText(APP_URL);
        alert("Link da B612-Vault copiado.");
      }catch{
        prompt("Copia este link para partilhar a B612-Vault:", APP_URL);
      }
    }
  }
}

function ensureShareButton(){
  const grid = document.querySelector("#friendsView .social-grid");
  if(!grid || document.getElementById("shareAppPanel")) return;

  const panel = document.createElement("section");
  panel.id = "shareAppPanel";
  panel.className = "panel span-2";
  panel.innerHTML = `
    <div class="eyebrow">PARTILHAR B612-VAULT</div>
    <h3>Convida um amigo</h3>
    <p class="muted">Envia o link da aplicação. Cada pessoa entra com a sua própria conta Google e mantém a sua coleção separada.</p>
    <button id="shareAppBtn" class="primary-btn full" type="button">Partilhar aplicação</button>
  `;
  grid.appendChild(panel);
  document.getElementById("shareAppBtn").addEventListener("click", shareApp);
}

window.addEventListener("error", event=>{
  const target = event.target;
  if(target?.tagName === "IMG" && (target.getAttribute("src") === "../app-symbol.jpg" || target.src.endsWith("/app-symbol.jpg"))){
    target.src = "app-symbol.jpg";
  }
}, true);

const observer = new MutationObserver(()=>{
  fixProductionBranding();
  ensureShareButton();
});
observer.observe(document.documentElement,{subtree:true,childList:true});

fixProductionBranding();
ensureShareButton();
setInterval(fixProductionBranding,1000);
