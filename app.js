
const STORAGE_KEY = "watchVaultData_v1";

const demoData = [
  {
    id: crypto.randomUUID(),
    status: "build",
    brand: "Custom",
    model: "Fox Kiko Explorer 39",
    reference: "",
    movement: "VH31",
    diameter: 39,
    year: 2026,
    purchasePrice: 126,
    currentValue: 126,
    image: "",
    link: "",
    casePart: "Explorer 39 mm",
    dialPart: "Preto",
    handsPart: "Mercedes VH31",
    strapPart: "Aço / FKM",
    notes: "Exemplo editável. Podes apagar ou substituir pelos teus dados.",
    updatedAt: Date.now()
  }
];

let data = loadData();
let currentView = "collection";

// Migração v2: a secção "Vendidos" foi removida.
// Registos antigos marcados como "sold" passam para a Coleção para não ficarem invisíveis.
let migratedSold = false;
data = data.map(item => {
  if (item.status === "sold") {
    migratedSold = true;
    return { ...item, status: "collection", updatedAt: Date.now() };
  }
  return item;
});
if (migratedSold) saveData();


function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : demoData;
  } catch {
    return demoData;
  }
}
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function money(value) {
  if (value === "" || value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("pt-PT", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(Number(value));
}
function statusLabel(status) {
  return ({collection:"Coleção",wishlist:"Wishlist",build:"Build"})[status] || status;
}
function placeholderSvg() {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
      <rect width="600" height="450" fill="#111316"/>
      <circle cx="300" cy="225" r="108" fill="none" stroke="#3a3f46" stroke-width="18"/>
      <circle cx="300" cy="225" r="82" fill="#181b1f"/>
      <line x1="300" y1="225" x2="300" y2="160" stroke="#f3f1eb" stroke-width="10" stroke-linecap="round"/>
      <line x1="300" y1="225" x2="350" y2="255" stroke="#b2212c" stroke-width="7" stroke-linecap="round"/>
      <rect x="262" y="55" width="76" height="70" rx="20" fill="#24282e"/>
      <rect x="262" y="325" width="76" height="70" rx="20" fill="#24282e"/>
    </svg>
  `)}`;
}

function renderSummary() {
  const collection = data.filter(x => x.status === "collection");
  const wishlist = data.filter(x => x.status === "wishlist");
  const builds = data.filter(x => x.status === "build");
  const totalValue = collection.reduce((s,x)=>s+(Number(x.currentValue)||Number(x.purchasePrice)||0),0);
  const items = [
    ["Na coleção", collection.length],
    ["Wishlist", wishlist.length],
    ["Builds", builds.length],
    ["Valor coleção", money(totalValue)]
  ];
  document.getElementById("summaryGrid").innerHTML = items.map(([l,v]) => `
    <div class="summary-card"><div class="summary-label">${l}</div><div class="summary-value">${v}</div></div>`).join("");
}

function renderCards() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const sort = document.getElementById("sortSelect").value;
  let items = data.filter(x => x.status === currentView).filter(x => {
    const hay = [x.brand,x.model,x.reference,x.movement,x.notes,x.casePart,x.dialPart,x.handsPart,x.strapPart].join(" ").toLowerCase();
    return hay.includes(q);
  });

  items.sort((a,b)=>{
    if (sort === "name") return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`);
    if (sort === "priceHigh") return (Number(b.currentValue)||0)-(Number(a.currentValue)||0);
    if (sort === "priceLow") return (Number(a.currentValue)||0)-(Number(b.currentValue)||0);
    return (b.updatedAt||0)-(a.updatedAt||0);
  });

  const grid = document.getElementById("watchGrid");
  grid.innerHTML = "";
  if (!items.length) {
    grid.innerHTML = `<div class="empty">Ainda não tens relógios nesta secção.</div>`;
    return;
  }
  const template = document.getElementById("cardTemplate");
  for (const item of items) {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".watch-card");
    const img = node.querySelector(".watch-image");
    img.src = item.image || placeholderSvg();
    img.alt = `${item.brand || ""} ${item.model || ""}`.trim();
    if (!item.image) img.classList.add("fallback");
    img.onerror = () => { img.src = placeholderSvg(); img.classList.add("fallback"); };

    node.querySelector(".status-pill").textContent = statusLabel(item.status);
    node.querySelector(".brand").textContent = item.brand || "Sem marca";
    node.querySelector(".model").textContent = item.model || "Sem nome";
    node.querySelector(".specs").textContent = [item.movement, item.diameter ? `${item.diameter} mm` : "", item.year].filter(Boolean).join(" · ");
    node.querySelector(".price-label").textContent = item.status === "wishlist" ? "Preço alvo" : "Valor";
    node.querySelector(".price").textContent = money(item.currentValue || item.purchasePrice);
    node.querySelector(".card-hit").addEventListener("click", ()=>openDialog(item.id));
    grid.appendChild(node);
  }
}

function render() {
  renderSummary();
  renderCards();
}

const dialog = document.getElementById("watchDialog");
const form = document.getElementById("watchForm");
const fields = ["status","brand","model","reference","movement","diameter","year","purchasePrice","currentValue","image","link","casePart","dialPart","handsPart","strapPart","notes"];
function openDialog(id=null) {
  form.reset();
  document.getElementById("watchId").value = id || "";
  document.getElementById("dialogTitle").textContent = id ? "Editar relógio" : "Novo relógio";
  document.getElementById("deleteBtn").classList.toggle("hidden", !id);
  if (id) {
    const item = data.find(x=>x.id===id);
    if (item) for (const f of fields) document.getElementById(f).value = item[f] ?? "";
  } else {
    document.getElementById("status").value = currentView;
  }
  dialog.showModal();
}
function closeDialog(){ dialog.close(); }

form.addEventListener("submit", e=>{
  e.preventDefault();
  const id = document.getElementById("watchId").value;
  const obj = { id: id || crypto.randomUUID(), updatedAt: Date.now() };
  for (const f of fields) obj[f] = document.getElementById(f).value.trim();
  ["diameter","year","purchasePrice","currentValue"].forEach(f => obj[f] = obj[f] === "" ? "" : Number(obj[f]));
  if (id) data = data.map(x => x.id === id ? obj : x);
  else data.unshift(obj);
  saveData();
  currentView = obj.status;
  setActiveTab();
  closeDialog();
  render();
});

document.getElementById("deleteBtn").addEventListener("click", ()=>{
  const id = document.getElementById("watchId").value;
  if (!id) return;
  if (confirm("Eliminar este relógio?")) {
    data = data.filter(x=>x.id!==id);
    saveData(); closeDialog(); render();
  }
});

function setActiveTab() {
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active", t.dataset.view===currentView));
}
document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{
  currentView = tab.dataset.view; setActiveTab(); renderCards();
}));
document.getElementById("searchInput").addEventListener("input", renderCards);
document.getElementById("sortSelect").addEventListener("change", renderCards);
document.getElementById("addBtn").addEventListener("click", ()=>openDialog());
document.getElementById("closeDialog").addEventListener("click", closeDialog);
document.getElementById("cancelBtn").addEventListener("click", closeDialog);

document.getElementById("exportBtn").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `watch-vault-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("importInput").addEventListener("change", async e=>{
  const file = e.target.files?.[0]; if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error("Formato inválido");
    data = imported; saveData(); render();
  } catch(err) {
    alert("Não foi possível importar este backup.");
  } finally { e.target.value = ""; }
});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
render();
