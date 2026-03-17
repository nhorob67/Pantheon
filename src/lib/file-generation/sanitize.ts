const MAX_FILENAME_LENGTH = 255;

const UNSAFE_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;
const CONSECUTIVE_DOTS = /\.{2,}/g;
const LEADING_TRAILING_DOTS = /^\.+|\.+$/g;

/**
 * Sanitize a user-provided filename to prevent path traversal and
 * ensure it has the correct extension.
 */
export function sanitizeFilename(raw: string, expectedExtension: string): string {
  // Strip path components
  let name = raw.replace(/^.*[\\/]/, "");

  // Remove unsafe characters
  name = name.replace(UNSAFE_CHARS, "_");
  name = name.replace(CONSECUTIVE_DOTS, ".");
  name = name.replace(LEADING_TRAILING_DOTS, "");

  // Trim whitespace
  name = name.trim();

  // Ensure non-empty
  if (!name || name === expectedExtension) {
    name = "file";
  }

  // Remove existing extension if it matches, then re-add to normalize
  const ext = expectedExtension.toLowerCase();
  if (name.toLowerCase().endsWith(ext)) {
    name = name.slice(0, -ext.length);
  }

  // Truncate to limit (leaving room for extension)
  const maxBase = MAX_FILENAME_LENGTH - ext.length;
  if (name.length > maxBase) {
    name = name.slice(0, maxBase);
  }

  return `${name}${ext}`;
}
