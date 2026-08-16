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

    return currentUser;
  })();

  return readyPromise;
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

  onStatus("A preparar foto…");
  const blob = await compressImage(file);
  const filePath = `${currentUser.id}/${watchId}/${Date.now()}.jpg`;

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
