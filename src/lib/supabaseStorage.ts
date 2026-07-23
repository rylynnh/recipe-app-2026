import { supabase } from './supabase';

const BUCKET_NAME = 'recipe-images';

export async function uploadRecipeImage(file: File | Blob, recipeId: string): Promise<string | null> {
  try {
    const fileName = `${recipeId}-${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Failed to upload image:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return urlData?.publicUrl || null;
  } catch (e) {
    console.error('Upload image error:', e);
    return null;
  }
}

export async function deleteRecipeImage(imageUrl: string): Promise<boolean> {
  try {
    const fileName = imageUrl.split('/').pop();
    if (!fileName) return false;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fileName]);

    if (error) {
      console.error('Failed to delete image:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Delete image error:', e);
    return false;
  }
}

export function isCloudImageUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes('supabase.co/storage/v1/object/public');
}