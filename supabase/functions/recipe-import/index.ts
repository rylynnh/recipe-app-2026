import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { parseHTML } from "npm:linkedom@0.18.12";

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
const respond = (body: unknown, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(body), { status, headers: cors(origin) });

type Ingredient = { name: string; amount: number; unit: string };
type Step = { content: string; image?: string };

function clean(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isXiachufangUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "xiachufang.com" || hostname.endsWith(".xiachufang.com");
  } catch {
    return false;
  }
}

function absoluteUrl(value: string | null, baseUrl: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function imageFrom(element: Element | null, baseUrl: string): string | undefined {
  if (!element) return undefined;
  return absoluteUrl(
    element.getAttribute("data-src") || element.getAttribute("data-original") || element.getAttribute("src"),
    baseUrl,
  );
}

async function embedRemoteImage(sourceUrl: string | undefined): Promise<string | undefined> {
  if (!sourceUrl) return undefined;
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RecipeLibraryImporter/1.0)",
        "Referer": "https://www.xiachufang.com/",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (!response.ok || !contentType.startsWith("image/") || contentLength > 1_500_000) return sourceUrl;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 1_500_000) return sourceUrl;
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return `data:${contentType.split(";")[0]};base64,${btoa(binary)}`;
  } catch {
    return sourceUrl;
  }
}

function parseIngredient(text: string): Ingredient | null {
  const normalized = clean(text).replace(/\|/g, " ").replace(/[;,.\u3001\u3002\uff0c\uff1b]+$/g, "");
  if (!normalized) return null;
  const fractionMatch = normalized.match(/^(.+?)\s+(\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?)\s*(.*)$/);
  if (fractionMatch) {
    const parts = fractionMatch[2].split('/').map((part) => Number.parseFloat(part.trim()));
    const amount = parts[1] ? parts[0] / parts[1] : 0;
    return { name: clean(fractionMatch[1]), amount, unit: clean(fractionMatch[3]) };
  }
  const match = normalized.match(/^(.+?)\s+(\d+(?:\.\d+)?(?:\s*[-~～]\s*\d+(?:\.\d+)?)?)\s*(.*)$/);
  if (!match) return { name: normalized, amount: 0, unit: "适量" };
  const amount = Number.parseFloat(match[2]);
  return { name: clean(match[1]), amount: Number.isFinite(amount) ? amount : 0, unit: clean(match[3]) || "适量" };
}

function unique<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = key(item);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function firstText(document: Document, selectors: string[]): string | undefined {
  if (selectors.includes("h1")) {
    selectors = ["h1.page-title", ".recipe-title", ".recipe-name", ".recipe-header h1", ...selectors];
  }
  for (const selector of selectors) {
    const text = clean(document.querySelector(selector)?.textContent);
    if (text) return text;
  }
  return undefined;
}

function isLikelyIngredientText(content: string): boolean {
  const text = clean(content).replace(/^\d+[\s.)\u3001]+/, "");
  const stepPrefixes = ["加入", "放入", "倒入", "煮", "蒸", "炒", "炸", "烤", "煎", "拌", "将", "把", "用"];
  if (stepPrefixes.some((prefix) => text.startsWith(prefix))) return false;
  const ingredient = parseIngredient(text);
  return Boolean(ingredient && ingredient.amount > 0 && ingredient.name.length <= 30);
}

function parseRecipe(html: string, sourceUrl: string) {
  const { document } = parseHTML(html);
  const meta = (property: string) =>
    document.querySelector(`meta[property="${property}"], meta[name="${property}"]`)?.getAttribute("content") || undefined;
  const title = firstText(document, ["h1.page-title", "h1"]) || clean(meta("og:title") || document.title).replace(/的做法.*$/, "");
  if (!title) throw new Error("未识别到菜谱标题");

  const author = firstText(document, [".author-name", ".author a", ".author", "a[href*='/cook/']"]);
  const description = firstText(document, [".desc", ".recipe-desc", ".intro", ".story"])
    || clean(meta("description") || meta("og:description"));
  const tips = firstText(document, [
    ".tips", ".tips-text", ".recipe-tips", ".recipe-tip", ".tips-container", "[itemprop='recipeNotes']",
  ]);
  const coverImage = absoluteUrl(meta("og:image"), sourceUrl)
    || imageFrom(document.querySelector(".cover img, .recipe-cover img, .recipe img"), sourceUrl);

  const ingredientRows = Array.from(document.querySelectorAll(
    ".ings tr, .ingredients tr, .ingredient-list tr, .ings li, .ingredients li, .ingredient-list li, .recipe-ingredient .ing-line, [itemprop='recipeIngredient'], .ingredient",
  ));
  const extractedIngredients = unique(
    ingredientRows.map((row) => parseIngredient(clean(row.textContent))).filter((item): item is Ingredient => Boolean(item?.name)),
    (item) => `${item.name}|${item.amount}|${item.unit}`,
  );

  const stepNodes = Array.from(document.querySelectorAll(
    ".steps li, .steps .step, .recipe-steps li, .recipe-steps .step, .step-list li, [itemprop='recipeInstructions'], .step",
  ));
  const rawSteps = unique(
    stepNodes.map((node) => {
      const content = clean(node.querySelector("p, .text")?.textContent || node.textContent).replace(/^\d+[\.、\s]+/, "");
      return content ? { content, image: imageFrom(node.querySelector("img"), sourceUrl) } : null;
    }).filter((item): item is Step => Boolean(item?.content)),
    (item) => item.content,
  );
  // Some legacy Xiachufang templates use the generic `.step` class for the
  // last ingredient rows. Move only quantity-shaped rows back to ingredients.
  const misplacedIngredients = rawSteps
    .filter((step) => isLikelyIngredientText(step.content))
    .map((step) => parseIngredient(step.content))
    .filter((item): item is Ingredient => Boolean(item?.name));
  const ingredients = unique(
    [...extractedIngredients, ...misplacedIngredients],
    (item) => `${item.name}|${item.amount}|${item.unit}`,
  );
  const steps = rawSteps.filter((step) => !isLikelyIngredientText(step.content));

  if (ingredients.length === 0 || steps.length === 0) throw new Error("该页面未包含可导入的公开食材或步骤");
  return { sourceUrl, title, author, description, tips, coverImage, ingredients, steps };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return respond({ ok: false, error: "Method not allowed" }, 405, origin);
  if (origin && !origins.has(origin)) return respond({ ok: false, error: "Origin not allowed" }, 403, origin);
  try {
    const body = await req.json();
    const pin = typeof body.pin === "string" ? body.pin : "";
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (pin.length < 6 || pin.length > 128) return respond({ ok: false, error: "请先开启管理模式" }, 401, origin);
    if (!isXiachufangUrl(url)) return respond({ ok: false, error: "仅支持下厨房公开菜谱链接" }, 400, origin);

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: valid, error: verifyError } = await admin.rpc("verify_mise_admin_pin", { candidate: pin });
    if (verifyError || valid !== true) return respond({ ok: false, error: "管理密码不正确" }, 401, origin);

    // The desktop site intermittently returns an Aliyun slider challenge to
    // server-side requests. The mobile recipe page exposes the same public
    // recipe HTML without requiring a browser session.
    const targetUrl = new URL(url);
    targetUrl.hostname = "m.xiachufang.com";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18_000);
    let page: Response;
    try {
      page = await fetch(targetUrl.toString(), {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RecipeLibraryImporter/1.0; +https://recipe-app-2026-one.vercel.app)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9",
          "Referer": "https://www.xiachufang.com/",
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!page.ok) return respond({ ok: false, error: "下厨房页面无法访问或已删除" }, 422, origin);
    if (!isXiachufangUrl(page.url)) return respond({ ok: false, error: "链接未跳转到下厨房公开菜谱页" }, 400, origin);
    const recipe = parseRecipe(await page.text(), page.url);
    recipe.sourceUrl = url;
    recipe.coverImage = await embedRemoteImage(recipe.coverImage);
    return respond({ ok: true, recipe }, 200, origin);
  } catch (error) {
    console.error(error);
    return respond({ ok: false, error: error instanceof Error ? error.message : "下厨房链接导入失败" }, 422, origin);
  }
});
