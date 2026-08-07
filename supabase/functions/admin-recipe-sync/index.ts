import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const origins = new Set([
  "https://recipe-app-2026-one.vercel.app",
  "https://rylynnh.github.io",
  "http://localhost:5173",
]);
const cors = (origin: string | null) => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": origin && origins.has(origin) ? origin : "https://recipe-app-2026-one.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const respond = (body: unknown, status = 200, origin: string | null = null) => new Response(JSON.stringify(body), { status, headers: cors(origin) });

function dataUrlToBytes(url: string) {
  const match = url.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType: match[1], extension: match[1].split("/")[1].replace("jpeg", "jpg") };
}

async function persistImage(admin: ReturnType<typeof createClient>, image: unknown, id: string) {
  if (typeof image !== "string" || !image.startsWith("data:image/")) return image ?? null;
  const decoded = dataUrlToBytes(image);
  if (!decoded) throw new Error("Unsupported image format");
  const path = `recipes/${id}.${decoded.extension}`;
  const { error } = await admin.storage.from("recipe-images").upload(path, decoded.bytes, { contentType: decoded.contentType, upsert: true, cacheControl: "31536000" });
  if (error) throw error;
  return admin.storage.from("recipe-images").getPublicUrl(path).data.publicUrl;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return respond({ ok: false, error: "Method not allowed" }, 405, origin);
  if (origin && !origins.has(origin)) return respond({ ok: false, error: "Origin not allowed" }, 403, origin);
  try {
    const body = await req.json();
    const pin = typeof body.pin === "string" ? body.pin : "";
    if (pin.length < 6 || pin.length > 128) return respond({ ok: false, error: "Invalid PIN" }, 401, origin);
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: valid, error: verifyError } = await admin.rpc("verify_mise_admin_pin", { candidate: pin });
    if (verifyError || valid !== true) return respond({ ok: false, error: "Invalid PIN" }, 401, origin);
    if (body.action === "verify") return respond({ ok: true }, 200, origin);
    if (body.action === "delete" && typeof body.id === "string") {
      const { error } = await admin.from("recipes").delete().eq("id", body.id);
      if (error) throw error;
      return respond({ ok: true }, 200, origin);
    }
    if (body.action === "clear") {
      const { error } = await admin.from("recipes").delete().neq("id", "");
      if (error) throw error;
      return respond({ ok: true }, 200, origin);
    }
    if (body.action === "update-image" && typeof body.id === "string") {
      const imageUrl = await persistImage(admin, body.image, body.id);
      const { error } = await admin.from("recipes").update({ image: imageUrl, updated_at: Date.now() }).eq("id", body.id);
      if (error) throw error;
      return respond({ ok: true, imageUrl }, 200, origin);
    }

    if (body.action === "repair-image" && typeof body.id === "string") {
      const { data: existing, error: findError } = await admin.from("recipes").select("image").eq("id", body.id).single();
      if (findError) throw findError;
      const imageUrl = await persistImage(admin, existing.image, body.id);
      const { error } = await admin.from("recipes").update({ image: imageUrl, updated_at: Date.now() }).eq("id", body.id);
      if (error) throw error;
      return respond({ ok: true, imageUrl }, 200, origin);
    }
    if (body.action === "upsert" && body.recipe && typeof body.recipe === "object") {
      const r = body.recipe;
      const imageUrl = await persistImage(admin, r.image, r.id);
      const baseRow = { id: r.id, title: r.title, image: imageUrl, category: r.category, category_id: r.categoryId, base_servings: r.baseServings, ingredients: r.ingredients ?? [], steps: r.steps ?? [], source_type: r.sourceType, source_snapshot: r.sourceSnapshot ?? null, note: r.note ?? null, created_at: r.createdAt, updated_at: r.updatedAt, tags: r.structureTag ? [r.structureTag] : [] };
      const fullRow = { ...baseRow, structure_tag: r.structureTag, main_ingredient: r.mainIngredient ?? [], favorited: false };
      let { error } = await admin.from("recipes").upsert(fullRow);
      if (error && (error.code === "PGRST204" || error.message?.includes("column"))) ({ error } = await admin.from("recipes").upsert(baseRow));
      if (error) throw error;
      return respond({ ok: true, imageUrl }, 200, origin);
    }
    return respond({ ok: false, error: "Unsupported action" }, 400, origin);
  } catch (error) {
    console.error(error);
    return respond({ ok: false, error: "Sync failed" }, 500, origin);
  }
});
