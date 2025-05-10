/**
 * Returns the image object for a post theme, using image_id and imageMap.
 * Falls back to preview_image_url if no image_id or not found.
 */
export function getPostThemeImage(
  postTheme: { image_id?: string | null; preview_image_url?: string },
  imageMap: Record<string, { url: string; name?: string }>
): { url: string; name?: string } | null {
  if (postTheme?.image_id && imageMap[postTheme.image_id]) {
    return imageMap[postTheme.image_id];
  }
  if (postTheme?.preview_image_url) {
    return { url: postTheme.preview_image_url, name: 'Preview image' };
  }
  return null;
} 