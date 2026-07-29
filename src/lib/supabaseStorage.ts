import { supabase } from './supabase';

const BUCKET_NAME = 'recipe-images';

async function getHouseholdId(): Promise<string | null> {
  const { data, error } = await supabase.rpc('current_household_id');
  if (error || !data) return null;
  return data;
}

async function createImageUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (error) {
    console.error('Failed to create image URL:', error);
    return null;
  }
  return data.signedUrl;
}

function getObjectPath(imageUrl: string): string | null {
  const signedMarker = `/object/sign/${BUCKET_NAME}/`;
  const publicMarker = `/object/public/${BUCKET_NAME}/`;
  const marker = imageUrl.includes(signedMarker) ? signedMarker : publicMarker;
  const start = imageUrl.indexOf(marker);
  if (start === -1) return null;
  return imageUrl.slice(start + marker.length).split('?')[0];
}

export async function uploadRecipeImage(file: File | Blob, recipeId: string): Promise<string | null> {
  try {
    const householdId = await getHouseholdId();
    if (!householdId) {
      console.error('No household access for image upload');
      return null;
    }
    const fileName = `${householdId}/${recipeId}/${Date.now()}.jpg`;
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

    return createImageUrl(fileName);
  } catch (e) {
    console.error('Upload image error:', e);
    return null;
  }
}

export async function deleteRecipeImage(imageUrl: string): Promise<boolean> {
  try {
    const fileName = getObjectPath(imageUrl);
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
  return url.includes('supabase.co/storage/v1/object/public') || url.includes('supabase.co/storage/v1/object/sign');
}
