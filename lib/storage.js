// Supabase Storage helper — uploads buffers to a public bucket and returns URLs.
import { supabase } from "./supbase.js";

const BUCKET = "uploads";
let bucketReady = false;

// Create the bucket on first use (idempotent). Uses the service-role key so it
// can manage storage. Safe to call repeatedly.
async function ensureBucket() {
  if (bucketReady) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET);
    if (!exists) {
      await supabase.storage.createBucket(BUCKET, { public: true });
    }
  } catch (err) {
    console.warn("ensureBucket warning:", err?.message || err);
  }
  bucketReady = true;
}

// Upload an array of multer files (memory storage). Returns public URLs.
export async function uploadFiles(files = []) {
  await ensureBucket();
  const urls = [];
  for (const file of files) {
    const safeName = String(file.originalname || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}
