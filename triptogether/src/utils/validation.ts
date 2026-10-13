/**
 * Validates that a string is a safe HTTP or HTTPS URL.
 * Rejects javascript:, data:, file:, etc.
 */
export function isValidHttpUrl(stringToTest: string): boolean {
  if (!stringToTest || typeof stringToTest !== 'string') return false;
  try {
    const url = new URL(stringToTest.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/**
 * Validates file image type and size.
 * Max 5MB, jpeg/png/webp/gif.
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPG, PNG, WEBP, and GIF images are allowed.' };
  }
  const maxBytes = 5 * 1024 * 1024; // 5MB
  if (file.size > maxBytes) {
    return { valid: false, error: 'Image size exceeds 5MB limit.' };
  }
  return { valid: true };
}

/**
 * Converts a File to Base64 data URL for fast client-side preview and storage.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Truncates and sanitizes text for display.
 */
export function sanitizeText(text: string, maxLength = 2000): string {
  if (!text) return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .slice(0, maxLength);
}
