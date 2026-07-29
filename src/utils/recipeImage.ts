export function resolveRecipeImage(image?: string): string | undefined {
  if (!image || /^(?:https?:|data:|blob:)/i.test(image)) return image;
  return image.startsWith('/')
    ? `${import.meta.env.BASE_URL}${image.slice(1)}`
    : image;
}
