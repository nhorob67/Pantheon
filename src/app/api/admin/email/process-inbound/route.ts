import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/auth/admin";
import { constantTimeTokenInSet } from "@/lib/security/constant-time";
import {
  getInboundProviderAdapter,
  type InboundAttachmentRef,
  type InboundProviderAdapter,
} from "@/lib/email/inbound-provider-adapters";
import {
  decodeAttachmentBase64,
  maxBase64LengthForBytes,
  parseProcessInboundQueryParams,
  resolveMaxAttachmentBytes,
  type ProcessInboundBody,
} from "@/lib/email/processor-inputs";
import { safeErrorMessage } from "@/lib/security/safe-error";

export const runtime = "nodejs";

const RAW_BUCKET = "email-raw";
const ATTACHMENTS_BUCKET = "email-attachments";
const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;
const DEFAULT_MAX_RETRIES = 5;
const MAX_MAX_RETRIES = 20;
const MIN_RETRY_DELAY_SECONDS = 30;
const MAX_RETRY_DELAY_SECONDS = 3600;
const MAX_ERROR_LENGTH = 2000;
const MAX_ATTACHMENT_BYTES = resolveMaxAttachmentBytes(
  process.env.EMAIL_MAX_ATTACHMENT_BYTES
);

interface ClaimedInboundJob {
  id: string;
}

interface EmailInboundRow {
  id: string;
  customer_id: string;
  instance_id: string | null;
  provider: string;
  provider_email_id: string;
  attachment_count: number;
  retry_count: number;
  metadata: Record<string, unknown> | null;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const parsed = Math.trunc(value);
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

async function parseBody(request: Request): Promise<ProcessInboundBody> {
  try {
    const body = (await request.json()) as ProcessInboundBody;
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

function parseQueryParams(request: Request): ProcessInboundBody {
  try {
    return parseProcessInboundQueryParams(request.url);
  } catch {
    return {};
  }
}

function sanitizeFilename(filename: string): string {
  const normalized = filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "attachment.bin";
}

function errorToMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}

function computeRetryDelaySeconds(retryCount: number): number {
  const exponentialDelay = MIN_RETRY_DELAY_SECONDS * 2 ** Math.max(retryCount - 1, 0);
  return Math.min(exponentialDelay, MAX_RETRY_DELAY_SECONDS);
}

function jsonBuffer(payload: unknown): Buffer {
  return Buffer.from(JSON.stringify(payload, null, 2), "utf8");
}

function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function mergeMetadata(
  existing: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...(existing || {}),
    phase2_processor: {
      ...((existing || {}).phase2_processor as Record<string, unknown> | undefined),
      ...patch,
    },
  };
}

interface AuthorizationOptions {
  allowSessionAuth: boolean;
}

async function isAuthorized(
  request: Request,
  options: AuthorizationOptions
): Promise<boolean> {
  const expectedTokens = [
    process.env.EMAIL_PROCESSOR_TOKEN,
    process.env.CRON_SECRET,
  ].filter((value): value is string => !!value && value.trim().length > 0);
  const bearerHeader = request.headers.get("authorization");
  const bearerToken =
    bearerHeader && bearerHeader.toLowerCase().startsWith("bearer ")
      ? bearerHeader.slice(7).trim()
      : null;
  const headerToken = request.headers.get("x-email-processor-token");
  const providedToken = headerToken || bearerToken;

  if (providedToken && constantTimeTokenInSet(providedToken, expectedTokens)) {
    return true;
  }

  if (!options.allowSessionAuth) {
    return false;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return !!(user && isAdmin(user.email));
}

async function persistAttachment(
  inbound: EmailInboundRow,
  adapter: InboundProviderAdapter,
  attachment: InboundAttachmentRef,
  index: number
): Promise<void> {
  let fileBuffer: Buffer;
  let detectedContentType = attachment.content_type;
  const maxBase64Length = maxBase64LengthForBytes(MAX_ATTACHMENT_BYTES) + 2048;

  if (attachment.size && attachment.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `Attachment ${attachment.filename} exceeds max size of ${MAX_ATTACHMENT_BYTES} bytes`
    );
  }

  if (attachment.content_base64) {
    if (attachment.content_base64.length > maxBase64Length) {
      throw new Error(
        `Attachment ${attachment.filename} base64 payload exceeds max size limit`
      );
    }

    fileBuffer = decodeAttachmentBase64(attachment.content_base64);
  } else if (attachment.id) {
    const downloaded = await adapter.fetchAttachmentBinary(
      inbound.provider_email_id,
      attachment.id
    );
    fileBuffer = downloaded.buffer;
    detectedContentType = detectedContentType || downloaded.contentType;
  } else {
    throw new Error(
      `Attachment ${attachment.filename} has neither content nor provider attachment id`
    );
  }

  if (fileBuffer.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `Attachment ${attachment.filename} exceeds max size of ${MAX_ATTACHMENT_BYTES} bytes`
    );
  }

  const safeFilename = sanitizeFilename(attachment.filename);
  const storagePath = `${inbound.customer_id}/${inbound.id}/${String(index + 1).padStart(
    3,
    "0"
  )}-${safeFilename}`;
  const hash = sha256Hex(fileBuffer);

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: detectedContentType || "application/octet-stream",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: insertError } = await admin.from("email_inbound_attachments").insert({
    inbound_id: inbound.id,
    customer_id: inbound.customer_id,
    instance_id: inbound.instance_id,
    provider: inbound.provider,
    provider_attachment_id: attachment.id,
    filename: attachment.filename,
    mime_type: detectedContentType,
    size_bytes: fileBuffer.byteLength,
    sha256: hash,
    storage_bucket: ATTACHMENTS_BUCKET,
    storage_path: storagePath,
    metadata: {
      source: attachment.content_base64
        ? "payload_base64"
        : `${adapter.provider}_download`,
      provider_email_id: inbound.provider_email_id,
    },
  });

  if (insertError && insertError.code !== "23505") {
    throw new Error(insertError.message);
  }
}

async function processInboundEmail(
  inbound: EmailInboundRow,
  maxRetries: number
): Promise<{ attachmentsPersisted: number; status: "processed" | "failed" }> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  try {
    const adapter = getInboundProviderAdapter(inbound.provider);

    const emailPayload = await adapter.fetchReceivedEmail(inbound.provider_email_id);
    const rawStoragePath = `${inbound.customer_id}/${inbound.id}/source.json`;
    const { error: rawUploadError } = await admin.storage
      .from(RAW_BUCKET)
      .upload(rawStoragePath, jsonBuffer(emailPayload), {
        contentType: "application/json",
        upsert: true,
      });

    if (rawUploadError) {
      throw new Error(rawUploadError.message);
    }

    let attachments = adapter.extractAttachmentRefs(emailPayload);
    if (attachments.length === 0 && inbound.attachment_count > 0) {
      attachments = await adapter.fetchAttachmentList(inbound.provider_email_id);
    }

    let attachmentsPersisted = 0;
    for (let i = 0; i < attachments.length; i++) {
      await persistAttachment(inbound, adapter, attachments[i], i);
      attachmentsPersisted++;
    }

    const { error: updateError } = await admin
      .from("email_inbound")
      .update({
        status: "processed",
        processed_at: nowIso,
        failed_at: null,
        last_error: null,
        raw_storage_bucket: RAW_BUCKET,
        raw_storage_path: rawStoragePath,
        metadata: mergeMetadata(inbound.metadata, {
          status: "processed",
          processed_at: nowIso,
          attachments_persisted: attachmentsPersisted,
          retries: inbound.retry_count,
        }),
      })
      .eq("id", inbound.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return {
      attachmentsPersisted,
      status: "processed",
    };
  } catch (error) {
    const errorMessage = errorToMessage(error);
    const retryCount = inbound.retry_count + 1;
    const retryDelaySeconds = computeRetryDelaySeconds(retryCount);
    const nextAttemptAt = new Date(Date.now() + retryDelaySeconds * 1000).toISOString();
    const isPoison = retryCount >= maxRetries;

    await admin
      .from("email_inbound")
      .update({
        status: "failed",
        retry_count: retryCount,
        failed_at: nowIso,
        last_error: errorMessage,
        next_attempt_at: isPoison ? nowIso : nextAttemptAt,
        metadata: mergeMetadata(inbound.metadata, {
          status: "failed",
          failed_at: nowIso,
          error: errorMessage,
          retry_count: retryCount,
          next_attempt_at: isPoison ? null : nextAttemptAt,
          poison: isPoison,
        }),
      })
      .eq("id", inbound.id);

    return {
      attachmentsPersisted: 0,
      status: "failed",
    };
  }
}

interface ProcessInboundRequestOptions {
  body: ProcessInboundBody;
  allowSessionAuth: boolean;
}

async function processInboundRequest(
  request: Request,
  options: ProcessInboundRequestOptions
) {
  const authorized = await isAuthorized(request, {
    allowSessionAuth: options.allowSessionAuth,
  });
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = options.body;
  const batchSize = clampInt(
    body.batch_size,
    DEFAULT_BATCH_SIZE,
    1,
    MAX_BATCH_SIZE
  );
  const maxRetries = clampInt(
    body.max_retries,
    DEFAULT_MAX_RETRIES,
    1,
    MAX_MAX_RETRIES
  );

  const admin = createAdminClient();
  const { data: claimedData, error: claimError } = await admin.rpc(
    "claim_email_inbound_jobs",
    {
      p_limit: batchSize,
      p_max_retries: maxRetries,
    }
  );

  if (claimError) {
    return NextResponse.json(
      { error: safeErrorMessage(claimError, "Failed to claim inbound jobs") },
      { status: 500 }
    );
  }

  const claimed = (claimedData || []) as ClaimedInboundJob[];
  if (claimed.length === 0) {
    return NextResponse.json({
      claimed: 0,
      processed: 0,
      failed: 0,
      attachments_persisted: 0,
    });
  }

  const inboundIds = claimed.map((item) => item.id);
  const { data: inboundRows, error: selectError } = await admin
    .from("email_inbound")
    .select(
      "id, customer_id, instance_id, provider, provider_email_id, attachment_count, retry_count, metadata"
    )
    .in("id", inboundIds)
    .order("received_at", { ascending: true });

  if (selectError) {
    return NextResponse.json(
      { error: safeErrorMessage(selectError, "Failed to load inbound emails") },
      { status: 500 }
    );
  }

  const rows = (inboundRows || []) as EmailInboundRow[];
  let processedCount = 0;
  let failedCount = 0;
  let attachmentsPersisted = 0;

  for (const inbound of rows) {
    const result = await processInboundEmail(inbound, maxRetries);
    attachmentsPersisted += result.attachmentsPersisted;
    if (result.status === "processed") {
      processedCount++;
    } else {
      failedCount++;
    }
  }

  return NextResponse.json({
    claimed: rows.length,
    processed: processedCount,
    failed: failedCount,
    attachments_persisted: attachmentsPersisted,
  });
}

export async function POST(request: Request) {
  const body = await parseBody(request);
  return processInboundRequest(request, { body, allowSessionAuth: true });
}

export async function GET(request: Request) {
  const body = parseQueryParams(request);
  return processInboundRequest(request, { body, allowSessionAuth: false });
}
