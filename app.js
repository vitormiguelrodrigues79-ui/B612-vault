import {
  initSupabase,
  listenAuth,
  getCurrentUser,
  isAnonymousUser,
  attachEmailToCurrentUser,
  signInWithMagicLink,
  signOutToAnonymous,
  syncWithCloud,
  upsertWatch,
  deleteWatchRecord,
  uploadWatchPhoto,
  getWatchPhotoUrl,
  deleteWatchPhoto
} from "./supabase.js";

const APP_VERSION = "B612-Vault v5.1";
const VERSION_UPDATED = "16/08/2026 · 16:58";
const STORAGE_KEY = "b612_vault_data_v51";
const views = {
  home: document.getElementById("homeView"),
  list: document.getElementById("listView"),
  cloud: document.getElementById("cloudView")
};
const state = {
  route: "home",
  category: "collection",
  data: loadData(),
  search: "",
  sort: "updated",
  authReady: false,
  user: null,
  syncing: false
};
const CATEGORY_META = {
  collection: {
    title: "Coleção",
    eyebrow: "PRIVATE COLLECTION",
    intro: "A tua seleção principal, relógios que estão contigo e merecem presença de palco.",
    info: "Aqui vivem os relógios que já fazem parte da coleção.",
    countLabel: n => `${n} relógio${n===1?"":"s"}`
  },
  build: {
    title: "Build",
    eyebrow: "PROJECT WATCHES",
    intro: "Projetos montados, em curso ou simplesmente à espera daquele empurrãozinho mental.",
    info: "Tudo o que está a ser construído ou afinado entra aqui.",
    countLabel: n => `${n} build${n===1?"":"s"}`
  },
  wishlist: {
    title: "Wishlist",
    eyebrow: "RADAR",
    intro: "Relógios específicos e marcas que queres seguir sem perder o norte.",
    info: "A tua shortlist de tentações e marcas para acompanhar.",
    countLabel: n => `${n} item${n===1?"":"s"}`
  }
};
const iconMarkup = {
  plus: `<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
  cloud: `<svg viewBox="0 0 24 24"><path d="M7 18a4 4 0 1 1 .8-7.92A5.5 5.5 0 0 1 18.5 12a3.5 3.5 0 1 1 .5 6H7z"/></svg>`,
  home: `<svg viewBox="0 0 24 24"><path d="M3 10.5 12 4l9 6.5"/><path d="M5 9.5V20h14V9.5"/></svg>`,
  close: `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  watch: `<svg viewBox="0 0 24 24"><rect x="7" y="6" width="10" height="12" rx="5"/><path d="M9 2h6v3H9zM9 19h6v3H9z"/><path d="M12 9v3l2 1.5"/></svg>`,
  build: `<svg viewBox="0 0 24 24"><rect x="4.5" y="6" width="9" height="12" rx="4.5"/><path d="M6.5 2h5v3h-5zM6.5 19h5v3h-5z"/><path d="m15.5 7 1.8-1.8 1.5 1.5L17 8.5"/><path d="m14 10 4.8-4.8 2 2L16 12"/><path d="M17.5 16.5l3 3"/></svg>`,
  wishlist: `<svg viewBox="0 0 24 24"><path d="M12 20s-6.5-4.35-8.5-8A5.3 5.3 0 0 1 12 5.8 5.3 5.3 0 0 1 20.5 12C18.5 15.65 12 20 12 20z"/></svg>`
};

applyIcons();
wireStaticEvents();
startClock();
renderAll();
boot();

async function boot() {
  try {
    await initSupabase();
    state.authReady = true;
    state.user = await getCurrentUser();
    await syncFromCloud(true);
    refreshCloudUI();
  } catch (err) {
    console.warn("Supabase init:", err);
    setCloudMessage("Modo local ativo. A cloud não arrancou como devia.");
    refreshCloudUI();
  }

  listenAuth(async (event, user) => {
    state.user = user;
    refreshCloudUI();
    if (["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "INITIAL_SESSION"].includes(event)) {
      await syncFromCloud(true);
      if (event === "SIGNED_IN" && !isAnonymousUser(user)) {
        setCloudMessage(`Login feito com ${user.email || "conta permanente"}. Sincronização automática concluída.`);
      }
    }
    if (event === "SIGNED_OUT") {
      setCloudMessage("Sessão terminada. Voltaste ao modo local/anónimo.");
    }
  });
}

function applyIcons() {
  document.getElementById("homeCloudBtn").innerHTML = iconMarkup.cloud;
  document.getElementById("homeAddBtn").innerHTML = iconMarkup.plus;
  document.getElementById("listCloudBtn").innerHTML = iconMarkup.cloud;
  document.getElementById("listAddBtn").innerHTML = iconMarkup.plus;
  document.getElementById("goHomeBtn").innerHTML = iconMarkup.home;
  document.getElementById("cloudHomeBtn").innerHTML = iconMarkup.home;
  document.getElementById("closeDialog").innerHTML = iconMarkup.close;
  document.getElementById("entryCollectionIcon").innerHTML = iconMarkup.watch;
  document.getElementById("entryBuildIcon").innerHTML = iconMarkup.build;
  document.getElementById("entryWishlistIcon").innerHTML = iconMarkup.wishlist;
}

function wireStaticEvents() {
  document.querySelectorAll("[data-route-target]").forEach(btn => btn.addEventListener("click", () => openCategory(btn.dataset.routeTarget)));
  document.getElementById("homeCloudBtn").addEventListener("click", () => showRoute("cloud"));
  document.getElementById("listCloudBtn").addEventListener("click", () => showRoute("cloud"));
  document.getElementById("homeAddBtn").addEventListener("click", () => openDialog());
  document.getElementById("listAddBtn").addEventListener("click", () => openDialog());
  document.getElementById("goHomeBtn").addEventListener("click", () => showRoute("home"));
  document.getElementById("cloudHomeBtn").addEventListener("click", () => showRoute("home"));
  document.getElementById("searchInput").addEventListener("input", e => { state.search = e.target.value.trim().toLowerCase(); renderCards(); });
  document.getElementById("sortSelect").addEventListener("change", e => { state.sort = e.target.value; renderCards(); });

  document.getElementById("exportBtn").addEventListener("click", exportBackup);
  document.getElementById("importInput").addEventListener("change", importBackup);
  document.getElementById("syncNowBtn").addEventListener("click", async () => await syncFromCloud(true));
  document.getElementById("logoutBtn").addEventListener("click", handleLogOut);
  document.getElementById("claimEmailBtn").addEventListener("click", handleClaimEmail);
  document.getElementById("loginEmailBtn").addEventListener("click", handleMagicLink);

  document.getElementById("status").addEventListener("change", updateFormMode);
  document.getElementById("wishlistType").addEventListener("change", updateFormMode);
  document.getElementById("photoInput").addEventListener("change", handlePhotoPick);
  document.getElementById("removePhotoBtn").addEventListener("click", removePendingPhoto);
  document.getElementById("closeDialog").addEventListener("click", closeDialog);
  document.getElementById("cancelBtn").addEventListener("click", closeDialog);
  document.getElementById("deleteBtn").addEventListener("click", handleDeleteCurrent);
  document.getElementById("watchForm").addEventListener("submit", handleSaveWatch);
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function renderAll() {
  renderHomeCounts();
  renderListHeader();
  renderCards();
  refreshCloudUI();
}

function showRoute(route) {
  state.route = route;
  Object.entries(views).forEach(([key, el]) => el.classList.toggle("hidden", key !== route));
  if (route === "list") renderCards();
  if (route === "cloud") refreshCloudUI();
}

function openCategory(category) {
  state.category = category;
  state.search = "";
  document.getElementById("searchInput").value = "";
  renderListHeader();
  renderCards();
  showRoute("list");
}

function renderHomeCounts() {
  for (const status of ["collection", "build", "wishlist"]) {
    const count = state.data.filter(item => item.status === status).length;
    const label = CATEGORY_META[status].countLabel(count);
    document.getElementById(`count${capitalize(status)}`).textContent = label;
  }
}

function renderListHeader() {
  const meta = CATEGORY_META[state.category];
  document.getElementById("listEyebrow").textContent = meta.eyebrow;
  document.getElementById("listTitle").textContent = meta.title;
  document.getElementById("listIntro").textContent = meta.intro;
  const count = state.data.filter(item => item.status === state.category).length;
  document.getElementById("categoryBadge").textContent = String(count);
  document.getElementById("categoryCopy").textContent = `${meta.info} · ${meta.countLabel(count)} neste momento.`;
}

function visibleItems() {
  let items = state.data.filter(item => item.status === state.category);
  if (state.search) {
    items = items.filter(item => {
      const hay = [item.brand, item.model, item.reference, item.movement, item.notes].join(" ").toLowerCase();
      return hay.includes(state.search);
    });
  }
  items.sort((a,b) => {
    switch (state.sort) {
      case "name": return `${a.brand||""} ${a.model||""}`.localeCompare(`${b.brand||""} ${b.model||""}`, "pt");
      case "priceHigh": return (num(b.purchasePrice) - num(a.purchasePrice));
      case "priceLow": return (num(a.purchasePrice) - num(b.purchasePrice));
      default: return (b.updatedAt||0) - (a.updatedAt||0);
    }
  });
  return items;
}

function renderCards() {
  const grid = document.getElementById("watchGrid");
  const empty = document.getElementById("emptyState");
  grid.innerHTML = "";
  const items = visibleItems();
  if (!items.length) {
    empty.classList.remove("hidden");
    empty.innerHTML = `<strong>${CATEGORY_META[state.category].title}</strong><br>Sem registos por aqui. Toca no + e trata disso.`;
    return;
  }
  empty.classList.add("hidden");
  const tpl = document.getElementById("cardTemplate");
  items.forEach(item => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector(".card-hit").addEventListener("click", () => openDialog(item.id));
    node.querySelector(".status-pill").textContent = pillLabel(item);
    const img = node.querySelector(".watch-image");
    img.src = placeholderSvg();
    img.classList.add("fallback");
    img.alt = `${item.brand || ""} ${item.model || ""}`.trim();
    if (item.imageStoragePath) applyPrivateImage(img, item.imageStoragePath);

    const brandOnly = item.status === "wishlist" && item.wishlistType === "brand";
    node.querySelector(".brand").textContent = brandOnly ? "MARCA A ACOMPANHAR" : (item.brand || "Sem marca");
    node.querySelector(".model").textContent = brandOnly ? (item.brand || "Marca") : (item.model || item.brand || "Sem nome");
    node.querySelector(".specs").textContent = brandOnly
      ? "Wishlist · acompanhar lançamentos"
      : [item.reference, item.movement, item.diameter ? `${item.diameter} mm` : "", item.year].filter(Boolean).join(" · ");

    const priceLabel = node.querySelector(".price-label");
    const price = node.querySelector(".price");
    if (brandOnly) {
      priceLabel.textContent = "Estado";
      price.textContent = "No radar";
    } else if (item.status === "wishlist") {
      priceLabel.textContent = "Preço alvo";
      price.textContent = money(item.purchasePrice);
    } else {
      priceLabel.textContent = "Custo aquisição";
      price.textContent = money(item.purchasePrice);
    }

    grid.appendChild(node);
  });
}

async function applyPrivateImage(imgEl, storagePath) {
  try {
    const url = await getWatchPhotoUrl(storagePath);
    if (url) {
      imgEl.src = url;
      imgEl.classList.remove("fallback");
    }
  } catch (err) {
    console.warn("Photo:", err);
  }
}

function openDialog(id = null) {
  resetPhotoState();
  const dialog = document.getElementById("watchDialog");
  const form = document.getElementById("watchForm");
  form.reset();
  document.getElementById("watchId").value = "";
  document.getElementById("imageStoragePath").value = "";
  document.getElementById("deleteBtn").classList.toggle("hidden", !id);
  document.getElementById("dialogTitle").textContent = id ? "Editar registo" : "Novo registo";
  document.getElementById("status").value = id ? "collection" : state.category;
  document.getElementById("wishlistType").value = "watch";
  if (id) {
    const item = state.data.find(x => x.id === id);
    if (item) {
      document.getElementById("watchId").value = item.id;
      document.getElementById("status").value = item.status || "collection";
      document.getElementById("wishlistType").value = item.wishlistType || "watch";
      for (const field of ["brand","model","reference","movement","diameter","year","purchasePrice","link","casePart","dialPart","handsPart","strapPart","notes","imageStoragePath"]) {
        const el = document.getElementById(field);
        if (el) el.value = item[field] ?? "";
      }
      loadDialogPhoto(item.imageStoragePath || "");
    }
  }
  updateFormMode();
  dialog.showModal();
}

function closeDialog() {
  document.getElementById("watchDialog").close();
}

let pendingPhotoFile = null;
let pendingPhotoObjectUrl = "";
let removedExistingPhoto = false;

function resetPhotoState() {
  pendingPhotoFile = null;
  if (pendingPhotoObjectUrl) URL.revokeObjectURL(pendingPhotoObjectUrl);
  pendingPhotoObjectUrl = "";
  removedExistingPhoto = false;
  renderPhotoPreview("");
  setPhotoStatus("Escolhe uma fotografia da biblioteca ou câmara.");
  document.getElementById("photoInput").value = "";
}
function setPhotoStatus(text) { document.getElementById("photoStatus").textContent = text; }
function renderPhotoPreview(url = "") {
  const preview = document.getElementById("photoPreview");
  const removeBtn = document.getElementById("removePhotoBtn");
  if (url) {
    preview.src = url;
    preview.classList.remove("hidden");
    removeBtn.classList.remove("hidden");
  } else {
    preview.removeAttribute("src");
    preview.classList.add("hidden");
    removeBtn.classList.add("hidden");
  }
}
async function loadDialogPhoto(storagePath) {
  if (!storagePath) return;
  setPhotoStatus("A carregar fotografia…");
  try {
    const url = await getWatchPhotoUrl(storagePath);
    renderPhotoPreview(url);
    setPhotoStatus("Fotografia guardada no Supabase.");
  } catch {
    setPhotoStatus("Não foi possível carregar a fotografia.");
  }
}
function handlePhotoPick(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  pendingPhotoFile = file;
  if (pendingPhotoObjectUrl) URL.revokeObjectURL(pendingPhotoObjectUrl);
  pendingPhotoObjectUrl = URL.createObjectURL(file);
  removedExistingPhoto = false;
  renderPhotoPreview(pendingPhotoObjectUrl);
  setPhotoStatus("Foto pronta. Será comprimida e enviada ao guardar.");
}
function removePendingPhoto() {
  pendingPhotoFile = null;
  if (pendingPhotoObjectUrl) URL.revokeObjectURL(pendingPhotoObjectUrl);
  pendingPhotoObjectUrl = "";
  removedExistingPhoto = true;
  renderPhotoPreview("");
  setPhotoStatus("Foto removida. Guarda para confirmar.");
}

function updateFormMode() {
  const isWishlist = document.getElementById("status").value === "wishlist";
  document.getElementById("wishlistTypeWrap").classList.toggle("hidden", !isWishlist);
  const brandOnly = isWishlist && document.getElementById("wishlistType").value === "brand";
  document.getElementById("purchaseLabel").firstChild.textContent = isWishlist && !brandOnly ? "Preço alvo (€)" : "Custo aquisição (€)";
  const modelInput = document.getElementById("model");
  modelInput.placeholder = brandOnly ? "Opcional" : "Ex.: Black Bay 58";
}

async function handleSaveWatch(e) {
  e.preventDefault();
  const btn = e.submitter;
  const oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "A guardar…";
  try {
    const id = document.getElementById("watchId").value || crypto.randomUUID();
    const obj = {
      id,
      status: document.getElementById("status").value,
      wishlistType: document.getElementById("wishlistType").value,
      brand: document.getElementById("brand").value.trim(),
      model: document.getElementById("model").value.trim(),
      reference: document.getElementById("reference").value.trim(),
      movement: document.getElementById("movement").value.trim(),
      diameter: numOrEmpty(document.getElementById("diameter").value),
      year: intOrEmpty(document.getElementById("year").value),
      purchasePrice: numOrEmpty(document.getElementById("purchasePrice").value),
      imageStoragePath: document.getElementById("imageStoragePath").value.trim(),
      link: document.getElementById("link").value.trim(),
      casePart: document.getElementById("casePart").value.trim(),
      dialPart: document.getElementById("dialPart").value.trim(),
      handsPart: document.getElementById("handsPart").value.trim(),
      strapPart: document.getElementById("strapPart").value.trim(),
      notes: document.getElementById("notes").value.trim(),
      updatedAt: Date.now()
    };

    const isWishlist = obj.status === "wishlist";
    const brandOnly = isWishlist && obj.wishlistType === "brand";
    if (!obj.brand && !obj.model) throw new Error("Indica pelo menos uma marca ou um modelo.");
    if (!isWishlist && !obj.model) throw new Error("Indica o modelo ou nome do relógio.");
    if (brandOnly && !obj.brand) throw new Error("Para acompanhar uma marca, indica o nome da marca.");

    const oldItem = state.data.find(x => x.id === id);
    const oldPath = oldItem?.imageStoragePath || "";
    if (removedExistingPhoto && oldPath) {
      try { await deleteWatchPhoto(oldPath); } catch {}
      obj.imageStoragePath = "";
    }
    if (pendingPhotoFile) {
      const uploaded = await uploadWatchPhoto(pendingPhotoFile, obj.id, setPhotoStatus);
      if (oldPath && oldPath !== uploaded.storagePath) {
        try { await deleteWatchPhoto(oldPath); } catch {}
      }
      obj.imageStoragePath = uploaded.storagePath;
    }

    const idx = state.data.findIndex(x => x.id === id);
    if (idx >= 0) state.data[idx] = obj;
    else state.data.unshift(obj);
    saveData();
    renderAll();
    closeDialog();
    try { await upsertWatch(obj); } catch (err) { console.warn("Cloud save", err); setCloudMessage("Guardado localmente. A cloud não alinhou já já."); }
  } catch (err) {
    alert(err.message || "Não foi possível guardar.");
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

async function handleDeleteCurrent() {
  const id = document.getElementById("watchId").value;
  if (!id) return;
  if (!confirm("Eliminar este registo?")) return;
  const item = state.data.find(x => x.id === id);
  if (item?.imageStoragePath) {
    try { await deleteWatchPhoto(item.imageStoragePath); } catch {}
  }
  state.data = state.data.filter(x => x.id !== id);
  saveData();
  renderAll();
  closeDialog();
  try { await deleteWatchRecord(id); } catch (err) { console.warn("Cloud delete", err); }
}

async function handleClaimEmail() {
  const email = document.getElementById("claimEmail").value.trim();
  if (!email) return alert("Indica o teu email.");
  try {
    setCloudMessage("A associar email…");
    await attachEmailToCurrentUser(email);
    setCloudMessage("Email enviado. Confirma-o e volta a abrir o B612-Vault no mesmo browser.");
  } catch (err) {
    setCloudMessage(err?.message?.includes("already") || err?.message?.includes("exists")
      ? "Esse email já existe. Usa o Magic Link para entrar nessa conta."
      : "Não foi possível associar este email.");
  }
}

async function handleMagicLink() {
  const email = document.getElementById("loginEmail").value.trim();
  if (!email) return alert("Indica o teu email.");
  try {
    setCloudMessage("A enviar Magic Link…");
    await signInWithMagicLink(email);
    setCloudMessage("Magic Link enviado. Abre o email e usa o link no mesmo browser.");
  } catch (err) {
    setCloudMessage(`Não foi possível enviar o link. ${err.message || ""}`.trim());
  }
}

async function handleLogOut() {
  if (!confirm("Fazer log off da conta atual?")) return;
  try {
    await signOutToAnonymous();
    state.user = await getCurrentUser();
    refreshCloudUI();
    setCloudMessage("Log off concluído. Voltaste ao modo local/anónimo.");
  } catch (err) {
    setCloudMessage("Não foi possível fazer log off.");
  }
}

async function syncFromCloud(showMessage = false) {
  if (state.syncing) return;
  state.syncing = true;
  if (showMessage) setCloudMessage("A sincronizar…");
  try {
    const merged = await syncWithCloud(state.data);
    state.data = merged;
    saveData();
    renderAll();
    if (showMessage) setCloudMessage("Sincronização concluída.");
  } catch (err) {
    console.warn(err);
    if (showMessage) setCloudMessage("Erro ao sincronizar: " + (err.message || ""));
  } finally {
    state.syncing = false;
  }
}

function refreshCloudUI() {
  const badge = document.getElementById("cloudStatusBadge");
  const userValue = document.getElementById("cloudUserValue");
  const stateText = document.getElementById("cloudStateText");
  const connectCard = document.getElementById("connectCard");
  const user = state.user;
  if (!user) {
    badge.className = "pill warn";
    badge.textContent = "Sessão local";
    userValue.textContent = "Sessão indisponível";
    stateText.textContent = "A app está a trabalhar localmente.";
    connectCard.classList.remove("hidden");
    return;
  }
  if (isAnonymousUser(user)) {
    badge.className = "pill warn";
    badge.textContent = "Ainda neste dispositivo";
    userValue.textContent = "Sessão anónima";
    stateText.textContent = "Podes usar a app assim, mas convém ligares isto a um email.";
    connectCard.classList.remove("hidden");
  } else {
    badge.className = "pill ok";
    badge.textContent = "Login feito";
    userValue.textContent = user.email || user.id;
    stateText.textContent = "Conta ligada. Sincronização cloud disponível.";
    connectCard.classList.add("hidden");
  }
}

function setCloudMessage(message) {
  document.getElementById("cloudMessage").textContent = message || "";
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `b612-vault-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importBackup(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Ficheiro inválido.");
    state.data = parsed;
    saveData();
    renderAll();
    await syncFromCloud(true);
  } catch (err) {
    alert(err.message || "Não foi possível importar o backup.");
  } finally {
    e.target.value = "";
  }
}

function startClock() {
  const nowInfo = document.getElementById("nowInfo");
  const versionInfo = document.getElementById("versionInfo");
  versionInfo.textContent = `${APP_VERSION} · atualizado em ${VERSION_UPDATED}`;
  const update = () => {
    const now = new Date();
    const day = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(now);
    const time = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit" }).format(now);
    nowInfo.textContent = `${capitalize(day)} · ${time}`;
  };
  update();
  setInterval(update, 30000);
}

function money(value) {
  if (value === "" || value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value));
}
function pillLabel(item) {
  if (item.status === "build") return "BUILD";
  if (item.status === "wishlist") return item.wishlistType === "brand" ? "MARCA" : "WISHLIST";
  return "COLEÇÃO";
}
function placeholderSvg() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220"><rect width="220" height="220" rx="30" fill="#111317"/><g stroke="#c9ced5" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="68" y="52" width="84" height="116" rx="40"/><path d="M84 28h52v24H84zM84 168h52v24H84z"/><path d="M110 82v28l18 12"/></g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
function num(v) { const n = Number(v || 0); return Number.isFinite(n) ? n : 0; }
function numOrEmpty(v) { return v === "" ? "" : Number(v); }
function intOrEmpty(v) { return v === "" ? "" : Number.parseInt(v, 10); }
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ""; }


if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
