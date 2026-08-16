import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_BUCKET } from "./supabase-config.js";

let supabase;
let currentUser = null;
let initPromise = null;
const listeners = [];

function hasAuthCallbackInUrl() {
  const url = new URL(window.location.href);
  const hash = window.location.hash || "";
  return url.searchParams.has("code") || url.searchParams.has("error") || hash.includes("access_token") || hash.includes("refresh_token") || hash.includes("type=") || hash.includes("error=");
}

function emitAuth(event, user) {
  listeners.forEach(cb => {
    try { cb(event, user); } catch (err) { console.warn("Auth listener", err); }
  });
}

export async function initSupabase() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    supabase.auth.onAuthStateChange((event, session) => {
      currentUser = session?.user || null;
      setTimeout(() => emitAuth(event, currentUser), 0);
    });

    // Give detectSessionInUrl a moment to process OAuth redirects before
    // deciding that there is no session and falling back to anonymous mode.
    if (hasAuthCallbackInUrl()) {
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          currentUser = data.session.user;
          history.replaceState({}, document.title, window.location.pathname);
          emitAuth("INITIAL_SESSION", currentUser);
          return currentUser;
        }
        await new Promise(r => setTimeout(r, 150));
      }
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data?.session?.user) {
      currentUser = data.session.user;
      emitAuth("INITIAL_SESSION", currentUser);
      return currentUser;
    }

    // Local/offline-style use still works through an anonymous Supabase user,
    // but only after we've made sure this isn't an OAuth callback.
    const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError) throw anonError;
    currentUser = anonData.user;
    emitAuth("INITIAL_SESSION", currentUser);
    return currentUser;
  })();
  return initPromise;
}

export function listenAuth(callback) {
  listeners.push(callback);
  if (currentUser) setTimeout(() => callback("INITIAL_SESSION", currentUser), 0);
}

export async function getCurrentUser() {
  await initSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  currentUser = data.user;
  return currentUser;
}

export function isAnonymousUser(user) {
  return !!user?.is_anonymous;
}

export async function signInWithGoogle() {
  await initSupabase();
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  // If the current session is anonymous, end it first so Google OAuth signs
  // into the permanent account instead of preserving the temporary context.
  if (currentUser?.is_anonymous) {
    await supabase.auth.signOut();
    currentUser = null;
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: { access_type: "offline", prompt: "select_account" }
    }
  });
  if (error) throw error;
  return data;
}

export async function signOutToAnonymous() {
  await initSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  currentUser = null;
  const { data, error: anonError } = await supabase.auth.signInAnonymously();
  if (anonError) throw anonError;
  currentUser = data.user;
  emitAuth("SIGNED_IN", currentUser);
  return currentUser;
}

function rowToItem(r) {
  return {
    id: r.id,
    status: r.status,
    wishlistType: r.wishlist_type || "",
    brand: r.brand || "",
    model: r.model || "",
    reference: r.reference || "",
    movement: r.movement || "",
    diameter: r.diameter ?? "",
    year: r.year ?? "",
    purchasePrice: r.purchase_price ?? "",
    imageStoragePath: r.image_storage_path || "",
    link: r.link || "",
    casePart: r.case_part || "",
    dialPart: r.dial_part || "",
    handsPart: r.hands_part || "",
    strapPart: r.strap_part || "",
    notes: r.notes || "",
    updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now()
  };
}
function itemToRow(item, userId) {
  return {
    id: item.id,
    user_id: userId,
    status: item.status,
    wishlist_type: item.wishlistType || null,
    brand: item.brand || null,
    model: item.model || null,
    reference: item.reference || null,
    movement: item.movement || null,
    diameter: item.diameter === "" ? null : item.diameter,
    year: item.year === "" ? null : item.year,
    purchase_price: item.purchasePrice === "" ? null : item.purchasePrice,
    current_value: null,
    image_storage_path: item.imageStoragePath || null,
    link: item.link || null,
    case_part: item.casePart || null,
    dial_part: item.dialPart || null,
    hands_part: item.handsPart || null,
    strap_part: item.strapPart || null,
    notes: item.notes || null,
    updated_at: new Date(item.updatedAt || Date.now()).toISOString()
  };
}

export async function syncWithCloud(localItems) {
  await initSupabase();
  const user = await getCurrentUser();
  const { data: rows, error } = await supabase.from("watches").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  const cloudItems = (rows || []).map(rowToItem);
  const cloudMap = new Map(cloudItems.map(item => [item.id, item]));
  const merged = new Map(cloudItems.map(item => [item.id, item]));
  const toUpsert = [];
  for (const item of localItems || []) {
    const cloud = cloudMap.get(item.id);
    if (!cloud || (item.updatedAt || 0) > (cloud.updatedAt || 0)) {
      merged.set(item.id, item);
      toUpsert.push(itemToRow(item, user.id));
    }
  }
  if (toUpsert.length) {
    const { error: upsertError } = await supabase.from("watches").upsert(toUpsert, { onConflict: "id" });
    if (upsertError) throw upsertError;
  }
  return Array.from(merged.values()).sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
}
export async function upsertWatch(item) {
  await initSupabase();
  const user = await getCurrentUser();
  const { error } = await supabase.from("watches").upsert(itemToRow(item, user.id), { onConflict: "id" });
  if (error) throw error;
}
export async function deleteWatchRecord(id) {
  await initSupabase();
  const { error } = await supabase.from("watches").delete().eq("id", id);
  if (error) throw error;
}

async function compressImage(file, maxDimension = 1600, quality = 0.82) {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  return await new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Falha ao comprimir imagem.")), "image/jpeg", quality);
  });
}

export async function uploadWatchPhoto(file, watchId, onStatus = () => {}) {
  await initSupabase();
  const user = await getCurrentUser();
  onStatus("A preparar foto…");
  const blob = await compressImage(file);
  const filePath = `${user.id}/${watchId}/${Date.now()}.jpg`;
  onStatus("A enviar para Supabase…");
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(filePath, blob, {
    contentType: "image/jpeg",
    cacheControl: "3600",
    upsert: false
  });
  if (error) throw error;
  return { storagePath: filePath };
}
export async function getWatchPhotoUrl(storagePath, expiresIn = 3600) {
  if (!storagePath) return "";
  await initSupabase();
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data?.signedUrl || "";
}
export async function deleteWatchPhoto(storagePath) {
  if (!storagePath) return;
  await initSupabase();
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove([storagePath]);
  if (error) throw error;
}
