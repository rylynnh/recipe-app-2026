import { Recipe } from '../types';
import { resolveRecipeImage } from './recipeImage';
import { formatAmount } from './nutrition';

const CANVAS_WIDTH = 1080;
const PADDING = 64;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = '';
  for (const character of text) {
    const candidate = line + character;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = character;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

async function loadCoverImage(src?: string): Promise<ImageBitmap | null> {
  const resolved = resolveRecipeImage(src);
  if (!resolved) return null;
  try {
    const response = await fetch(resolved);
    if (!response.ok) return null;
    return await createImageBitmap(await response.blob());
  } catch {
    return null;
  }
}

function drawCover(ctx: CanvasRenderingContext2D, image: ImageBitmap | null, y: number) {
  const height = 640;
  if (!image) { ctx.fillStyle = '#E9E1D6'; ctx.fillRect(0, y, CANVAS_WIDTH, height); return y + height; }
  const width = image.width;
  const sourceHeight = image.height;
  const scale = Math.max(CANVAS_WIDTH / width, height / sourceHeight);
  const drawWidth = width * scale;
  const drawHeight = sourceHeight * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y, CANVAS_WIDTH, height);
  ctx.clip();
  ctx.drawImage(image, (CANVAS_WIDTH - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  ctx.restore();
  return y + height;
}

/** Creates a self-contained, phone-friendly long image for a recipe. */
export async function createRecipeShareImage(recipe: Recipe): Promise<Blob> {
  const previewCanvas = document.createElement('canvas');
  const previewContext = previewCanvas.getContext('2d');
  if (!previewContext) throw new Error('无法创建分享图片');
  const contentWidth = CANVAS_WIDTH - PADDING * 2;
  previewContext.font = '54px "Songti SC", "STSong", serif';
  const titleLines = wrapText(previewContext, recipe.title, contentWidth);
  previewContext.font = '32px "PingFang SC", "Microsoft YaHei", sans-serif';
  const ingredientLines = recipe.ingredients.flatMap((ingredient) => wrapText(previewContext, `${ingredient.name}${ingredient.amount || ingredient.unit ? `  ${ingredient.amount ? formatAmount(ingredient.amount) : ''}${ingredient.unit}` : ''}`, contentWidth));
  previewContext.font = '30px "PingFang SC", "Microsoft YaHei", sans-serif';
  const stepLines = recipe.steps.flatMap((step) => wrapText(previewContext, step.content, contentWidth - 68));
  const tagText = [recipe.structureTag, ...recipe.mainIngredient].filter(Boolean).join('  ·  ');

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = Math.max(1500, 640 + 360 + titleLines.length * 68 + ingredientLines.length * 48 + stepLines.length * 46 + recipe.steps.length * 38);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建分享图片');
  ctx.fillStyle = '#F8F6F2'; ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cover = await loadCoverImage(recipe.image);
  let y = drawCover(ctx, cover, 0) + 72;
  if (cover && 'close' in cover) cover.close();
  ctx.fillStyle = '#A87945'; ctx.font = '20px "Helvetica Neue", Arial, sans-serif'; ctx.letterSpacing = '3px'; ctx.fillText('MISE  /  RECIPE', PADDING, y); ctx.letterSpacing = '0px'; y += 64;
  ctx.fillStyle = '#242321'; ctx.font = '54px "Songti SC", "STSong", serif';
  for (const line of titleLines) { ctx.fillText(line, PADDING, y); y += 68; }
  y += 28; ctx.fillStyle = '#77726B'; ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif'; ctx.fillText(tagText, PADDING, y); y += 58;
  ctx.strokeStyle = '#DDD7CE'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PADDING, y); ctx.lineTo(CANVAS_WIDTH - PADDING, y); ctx.stroke(); y += 56;
  ctx.fillStyle = '#242321'; ctx.font = '30px "Songti SC", "STSong", serif'; ctx.fillText('食材', PADDING, y); y += 48;
  ctx.font = '28px "PingFang SC", "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#373431';
  recipe.ingredients.forEach((ingredient) => {
    const text = `${ingredient.name}${ingredient.amount || ingredient.unit ? `  ${ingredient.amount ? formatAmount(ingredient.amount) : ''}${ingredient.unit}` : ''}`;
    wrapText(ctx, text, contentWidth).forEach((line) => { ctx.fillText(line, PADDING, y); y += 44; });
  });
  y += 32; ctx.strokeStyle = '#DDD7CE'; ctx.beginPath(); ctx.moveTo(PADDING, y); ctx.lineTo(CANVAS_WIDTH - PADDING, y); ctx.stroke(); y += 56;
  ctx.fillStyle = '#242321'; ctx.font = '30px "Songti SC", "STSong", serif'; ctx.fillText('步骤', PADDING, y); y += 52;
  ctx.font = '28px "PingFang SC", "Microsoft YaHei", sans-serif';
  recipe.steps.forEach((step, index) => {
    ctx.fillStyle = '#A87945'; ctx.beginPath(); ctx.arc(PADDING + 16, y - 9, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFDF8'; ctx.font = '18px "Helvetica Neue", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(index + 1), PADDING + 16, y - 3); ctx.textAlign = 'left';
    ctx.fillStyle = '#373431'; ctx.font = '28px "PingFang SC", "Microsoft YaHei", sans-serif';
    wrapText(ctx, step.content, contentWidth - 68).forEach((line) => { ctx.fillText(line, PADDING + 62, y); y += 44; });
    y += 24;
  });
  ctx.fillStyle = '#A87945'; ctx.font = '20px "Helvetica Neue", Arial, sans-serif'; ctx.letterSpacing = '2px'; ctx.fillText('MISE  ·  EVERYTHING IN ITS PLACE', PADDING, canvas.height - 44); ctx.letterSpacing = '0px';
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('图片生成失败')), 'image/jpeg', 0.92));
}

export function downloadShareImage(blob: Blob, title: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title}-MISE菜谱.jpg`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
