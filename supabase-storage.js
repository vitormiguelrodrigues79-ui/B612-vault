import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_BUCKET } from "./supabase-config.js";

let supabase = null;
let currentUser = null;
let readyPromise = null;

export function supabaseConfigured() {
  return SUPABASE_URL &&
         SUPABASE_KEY &&
         !SUPABASE_URL.includes("COLOCA_AQUI") &&
         !SUPABASE_KEY.includes("COLOCA_AQUI");
}

export async function initSupabase() {
  if (!supabaseConfigured()) throw new Error("Supabase ainda não configurado.");
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    if (!sessionData?.session) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      currentUser = data.user;
    } else {
      currentUser = sessionData.session.user;
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) currentUser = session.user;
    });

    return currentUser;
  })();

  return readyPromise;
}

export async function getCurrentUser() {
  await initSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  currentUser = data.user;
  return currentUser;
}

export async function attachEmailToCurrentUser(email) {
  await initSupabase();
  const { data, error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
  currentUser = data.user;
  return data.user;
}

export async function signInWithEmail(email) {
  await initSupabase();
  const redirect = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirect, shouldCreateUser: false }
  });
  if (error) throw error;
}

export async function signOut() {
  await initSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  currentUser = null;
  readyPromise = null;
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
    currentValue: r.current_value ?? "",
    imageStoragePath: r.image_storage_path || "",
    link: r.link || "",
    casePart: r.case_part || "",
    dialPart: r.dial_part || "",
    handsPart: r.hands_part || "",
    strapPart: r.strap_part || "",
    notes: r.notes || "",
    updatedAt: new Date(r.updated_at).getTime()
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
    current_value: item.currentValue === "" ? null : item.currentValue,
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

export async function syncWatches(localItems) {
  await initSupabase();
  const user = await getCurrentUser();

  const { data: rows, error } = await supabase
    .from("watches")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const cloudItems = (rows || []).map(rowToItem);
  const localMap = new Map(localItems.map(x => [x.id, x]));
  const cloudMap = new Map(cloudItems.map(x => [x.id, x]));
  const merged = new Map();

  for (const item of cloudItems) merged.set(item.id, item);

  const toUpload = [];
  for (const item of localItems) {
    const cloud = cloudMap.get(item.id);
    if (!cloud || (item.updatedAt || 0) > (cloud.updatedAt || 0)) {
      merged.set(item.id, item);
      toUpload.push(itemToRow(item, user.id));
    }
  }

  if (toUpload.length) {
    const { error: upsertError } = await supabase
      .from("watches")
      .upsert(toUpload, { onConflict: "id" });
    if (upsertError) throw upsertError;
  }

  return Array.from(merged.values());
}

export async function saveWatch(item) {
  await initSupabase();
  const user = await getCurrentUser();
  const { error } = await supabase
    .from("watches")
    .upsert(itemToRow(item, user.id), { onConflict: "id" });
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
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error("Falha ao comprimir imagem.")),
      "image/jpeg",
      quality
    );
  });
}

export async function uploadWatchPhoto(file, watchId, onStatus = () => {}) {
  await initSupabase();
  const user = await getCurrentUser();

  onStatus("A preparar foto…");
  const blob = await compressImage(file);
  const filePath = `${user.id}/${watchId}/${Date.now()}.jpg`;

  onStatus("A enviar para Supabase…");
  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(filePath, blob, {
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

  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) throw error;
  return data?.signedUrl || "";
}

export async function deleteWatchPhoto(storagePath) {
  if (!storagePath || !supabaseConfigured()) return;
  await initSupabase();

  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .remove([storagePath]);

  if (error) throw error;
}
