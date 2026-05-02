// Max 4 MB base64 payload (~3 MB actual image) — prevents sending huge files to the API
const MAX_BASE64_BYTES = 4 * 1024 * 1024;

// Rough check: a base64 JPEG starts with /9j/ and a PNG with iVBORw0K
const ALLOWED_PREFIXES = ['/9j/', 'iVBORw0K', '/9k=', 'UklGR'];

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImage(base64: string): ImageValidationResult {
  if (!base64 || base64.length === 0) {
    return { valid: false, error: 'Geen afbeelding geselecteerd.' };
  }

  if (base64.length > MAX_BASE64_BYTES) {
    const sizeMB = (base64.length / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Afbeelding is te groot (${sizeMB} MB). Maximaal 3 MB toegestaan.`,
    };
  }

  const hasValidPrefix = ALLOWED_PREFIXES.some((prefix) => base64.startsWith(prefix));
  if (!hasValidPrefix) {
    return { valid: false, error: 'Ongeldig bestandstype. Alleen JPEG en PNG zijn toegestaan.' };
  }

  return { valid: true };
}
