export interface DiscordAttachment {
  url: string;
  filename: string;
  content_type: string;
  size: number;
}

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const AUDIO_TYPES = new Set([
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
]);

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const AUDIO_EXTENSIONS = new Set(["ogg", "mp3", "mp4", "wav", "webm", "oga"]);

function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export function isImageAttachment(att: DiscordAttachment): boolean {
  if (IMAGE_TYPES.has(att.content_type)) return true;
  return IMAGE_EXTENSIONS.has(getExtension(att.filename));
}

export function isAudioAttachment(att: DiscordAttachment): boolean {
  if (AUDIO_TYPES.has(att.content_type)) return true;
  return AUDIO_EXTENSIONS.has(getExtension(att.filename));
}

export function parseAttachmentsFromPayload(
  payload: Record<string, unknown>
): DiscordAttachment[] {
  const raw = payload.attachments;
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (a): a is Record<string, unknown> =>
        typeof a === "object" && a !== null && typeof (a as Record<string, unknown>).url === "string"
    )
    .map((a) => ({
      url: String(a.url),
      filename: String(a.filename || "unknown"),
      content_type: String(a.content_type || "application/octet-stream"),
      size: typeof a.size === "number" ? a.size : 0,
    }));
}
