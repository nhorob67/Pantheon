import {
  createAgentMailClient
} from "../../../../chunk-FNDDZUO5.mjs";
import {
  createTriggerAdminClient
} from "../../../../chunk-HT5RPO7D.mjs";
import {
  schedules_exports
} from "../../../../chunk-OGNGFKGT.mjs";
import "../../../../chunk-WWNEOE5T.mjs";
import "../../../../chunk-RLLQVKNR.mjs";
import {
  __name,
  init_esm
} from "../../../../chunk-262SQFPS.mjs";

// src/trigger/process-inbound-email.ts
init_esm();
import { createHash } from "node:crypto";

// src/lib/email/inbound-provider-adapters.ts
init_esm();

// src/lib/email/resend-receiving.ts
init_esm();
var DEFAULT_RESEND_API_BASE_URL = "https://api.resend.com";
function getResendApiBaseUrl() {
  return (process.env.RESEND_API_BASE_URL || DEFAULT_RESEND_API_BASE_URL).replace(/\/+$/, "");
}
__name(getResendApiBaseUrl, "getResendApiBaseUrl");
function getResendApiKey() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return apiKey;
}
__name(getResendApiKey, "getResendApiKey");
async function resendRequest(path, init = {}) {
  const url = `${getResendApiBaseUrl()}${path}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${getResendApiKey()}`);
  headers.set("User-Agent", "farmclaw-email-processor/1.0");
  const response = await fetch(url, {
    ...init,
    headers
  });
  return response;
}
__name(resendRequest, "resendRequest");
function unwrapPayload(payload) {
  if (payload && typeof payload === "object" && "data" in payload && payload.data && typeof payload.data === "object") {
    return payload.data;
  }
  if (payload && typeof payload === "object") {
    return payload;
  }
  throw new Error("Unexpected Resend payload shape");
}
__name(unwrapPayload, "unwrapPayload");
async function parseResendJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const bodyText = (await response.text()).slice(0, 500);
    throw new Error(
      `Unexpected Resend response content-type (${contentType || "none"}): ${bodyText}`
    );
  }
  return response.json();
}
__name(parseResendJsonResponse, "parseResendJsonResponse");
function errorFromFailedResponse(status, payload, fallbackMessage) {
  if (payload && typeof payload === "object") {
    const message = ("message" in payload && typeof payload.message === "string" ? payload.message : null) || ("error" in payload && typeof payload.error === "string" ? payload.error : null);
    if (message) {
      return new Error(`Resend API ${status}: ${message}`);
    }
  }
  return new Error(`${fallbackMessage} (status ${status})`);
}
__name(errorFromFailedResponse, "errorFromFailedResponse");
async function fetchResendReceivedEmail(emailId) {
  const response = await resendRequest(`/emails/${encodeURIComponent(emailId)}`);
  const payload = await parseResendJsonResponse(response);
  if (!response.ok) {
    throw errorFromFailedResponse(
      response.status,
      payload,
      "Failed to fetch inbound email from Resend"
    );
  }
  return unwrapPayload(payload);
}
__name(fetchResendReceivedEmail, "fetchResendReceivedEmail");
function asAttachmentRef(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value;
  const filename = typeof record.filename === "string" && record.filename || typeof record.name === "string" && record.name || null;
  if (!filename) {
    return null;
  }
  const attachmentId = typeof record.id === "string" && record.id || typeof record.attachment_id === "string" && record.attachment_id || null;
  const mimeType = typeof record.content_type === "string" && record.content_type || typeof record.mime_type === "string" && record.mime_type || typeof record.contentType === "string" && record.contentType || null;
  const size = typeof record.size === "number" ? record.size : typeof record.content_length === "number" ? record.content_length : null;
  const contentBase64 = typeof record.content === "string" && record.content || typeof record.base64 === "string" && record.base64 || null;
  return {
    id: attachmentId,
    filename,
    content_type: mimeType,
    size,
    content_base64: contentBase64
  };
}
__name(asAttachmentRef, "asAttachmentRef");
function extractResendAttachmentRefs(emailPayload) {
  const rawAttachments = emailPayload.attachments;
  if (!Array.isArray(rawAttachments)) {
    return [];
  }
  const refs = [];
  for (const rawAttachment of rawAttachments) {
    const attachment = asAttachmentRef(rawAttachment);
    if (attachment) {
      refs.push(attachment);
    }
  }
  return refs;
}
__name(extractResendAttachmentRefs, "extractResendAttachmentRefs");
async function fetchResendAttachmentList(emailId) {
  const response = await resendRequest(
    `/emails/${encodeURIComponent(emailId)}/attachments`
  );
  const payload = await parseResendJsonResponse(response);
  if (!response.ok) {
    throw errorFromFailedResponse(
      response.status,
      payload,
      "Failed to fetch inbound attachment list from Resend"
    );
  }
  const data = unwrapPayload(payload);
  const candidates = (Array.isArray(data) ? data : null) || (Array.isArray(data.attachments) ? data.attachments : null) || (Array.isArray(data.data) ? data.data : null);
  if (!Array.isArray(candidates)) {
    return [];
  }
  const refs = [];
  for (const candidate of candidates) {
    const attachment = asAttachmentRef(candidate);
    if (attachment) {
      refs.push(attachment);
    }
  }
  return refs;
}
__name(fetchResendAttachmentList, "fetchResendAttachmentList");
function base64ToBuffer(value) {
  const base64 = value.includes(",") ? value.split(",").pop() || value : value;
  return Buffer.from(base64, "base64");
}
__name(base64ToBuffer, "base64ToBuffer");
function tryExtractBufferFromJsonPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload;
  const candidates = [
    record.content,
    record.base64,
    record.data,
    "data" in record && record.data && typeof record.data === "object" ? record.data.content : null,
    "data" in record && record.data && typeof record.data === "object" ? record.data.base64 : null
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      try {
        return base64ToBuffer(candidate);
      } catch {
        continue;
      }
    }
  }
  return null;
}
__name(tryExtractBufferFromJsonPayload, "tryExtractBufferFromJsonPayload");
async function fetchResendAttachmentBinary(emailId, attachmentId) {
  const response = await resendRequest(
    `/emails/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(
      attachmentId
    )}`
  );
  if (!response.ok) {
    let payload = null;
    try {
      payload = await parseResendJsonResponse(response);
    } catch {
      payload = null;
    }
    throw errorFromFailedResponse(
      response.status,
      payload,
      "Failed to fetch inbound attachment from Resend"
    );
  }
  const contentType = response.headers.get("content-type");
  const arrayBuffer = await response.arrayBuffer();
  const bodyBuffer = Buffer.from(arrayBuffer);
  if (contentType?.includes("application/json")) {
    try {
      const parsed = JSON.parse(bodyBuffer.toString("utf8"));
      const decoded = tryExtractBufferFromJsonPayload(parsed);
      if (decoded) {
        return {
          buffer: decoded,
          contentType: "application/octet-stream"
        };
      }
    } catch {
    }
  }
  return {
    buffer: bodyBuffer,
    contentType
  };
}
__name(fetchResendAttachmentBinary, "fetchResendAttachmentBinary");

// src/lib/email/inbound-provider-adapters.ts
function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value;
}
__name(asObject, "asObject");
function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}
__name(toNumber, "toNumber");
function toStringValue(value) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}
__name(toStringValue, "toStringValue");
function toAttachmentRef(value) {
  const record = asObject(value);
  if (!record) {
    return null;
  }
  const filename = toStringValue(record.filename) || toStringValue(record.file_name) || toStringValue(record.name);
  if (!filename) {
    return null;
  }
  const contentBase64 = toStringValue(record.content_base64) || toStringValue(record.base64) || toStringValue(record.content) || toStringValue(record.data);
  return {
    id: toStringValue(record.id) || toStringValue(record.attachment_id) || toStringValue(record.attachmentId),
    filename,
    content_type: toStringValue(record.content_type) || toStringValue(record.mime_type) || toStringValue(record.contentType) || toStringValue(record.type),
    size: toNumber(record.size) || toNumber(record.content_length) || toNumber(record.size_bytes),
    content_base64: contentBase64
  };
}
__name(toAttachmentRef, "toAttachmentRef");
function asInboundAttachmentRefList(values, fallbackProvider) {
  const items = [];
  for (const value of values) {
    const ref = toAttachmentRef(value);
    if (ref) {
      items.push(ref);
      continue;
    }
    if (fallbackProvider === "resend") {
      const resendRef = value;
      if (resendRef && typeof resendRef.filename === "string") {
        items.push({
          id: resendRef.id,
          filename: resendRef.filename,
          content_type: resendRef.content_type,
          size: resendRef.size,
          content_base64: resendRef.content_base64
        });
      }
    }
  }
  return items;
}
__name(asInboundAttachmentRefList, "asInboundAttachmentRefList");
function extractAgentMailAttachmentRefs(emailPayload) {
  const direct = Array.isArray(emailPayload.attachments) ? emailPayload.attachments : [];
  const message = asObject(emailPayload.message);
  const nested = message && Array.isArray(message.attachments) ? message.attachments : [];
  return asInboundAttachmentRefList([...direct, ...nested], "agentmail");
}
__name(extractAgentMailAttachmentRefs, "extractAgentMailAttachmentRefs");
function parseAgentMailAttachmentList(payload) {
  const candidates = [];
  if (Array.isArray(payload.data)) {
    candidates.push(...payload.data);
  }
  if (Array.isArray(payload.items)) {
    candidates.push(...payload.items);
  }
  if (Array.isArray(payload.attachments)) {
    candidates.push(...payload.attachments);
  }
  const dataObject = asObject(payload.data);
  if (dataObject && Array.isArray(dataObject.attachments)) {
    candidates.push(...dataObject.attachments);
  }
  return asInboundAttachmentRefList(candidates, "agentmail");
}
__name(parseAgentMailAttachmentList, "parseAgentMailAttachmentList");
var resendAdapter = {
  provider: "resend",
  fetchReceivedEmail: fetchResendReceivedEmail,
  extractAttachmentRefs: /* @__PURE__ */ __name((emailPayload) => asInboundAttachmentRefList(extractResendAttachmentRefs(emailPayload), "resend"), "extractAttachmentRefs"),
  fetchAttachmentList: /* @__PURE__ */ __name(async (providerEmailId) => asInboundAttachmentRefList(
    await fetchResendAttachmentList(providerEmailId),
    "resend"
  ), "fetchAttachmentList"),
  fetchAttachmentBinary: /* @__PURE__ */ __name(async (providerEmailId, attachmentId) => fetchResendAttachmentBinary(providerEmailId, attachmentId), "fetchAttachmentBinary")
};
var agentMailAdapter = {
  provider: "agentmail",
  fetchReceivedEmail: /* @__PURE__ */ __name(async (providerEmailId) => {
    const client = createAgentMailClient();
    return client.fetchMessage(providerEmailId);
  }, "fetchReceivedEmail"),
  extractAttachmentRefs: extractAgentMailAttachmentRefs,
  fetchAttachmentList: /* @__PURE__ */ __name(async (providerEmailId) => {
    const client = createAgentMailClient();
    const payload = await client.fetchMessageAttachments(providerEmailId);
    return parseAgentMailAttachmentList(payload);
  }, "fetchAttachmentList"),
  fetchAttachmentBinary: /* @__PURE__ */ __name(async (providerEmailId, attachmentId) => {
    const client = createAgentMailClient();
    const result = await client.fetchMessageAttachmentBinary(
      providerEmailId,
      attachmentId
    );
    return {
      buffer: result.bytes,
      contentType: result.contentType
    };
  }, "fetchAttachmentBinary")
};
function getInboundProviderAdapter(provider) {
  if (provider === "resend") {
    return resendAdapter;
  }
  if (provider === "agentmail") {
    return agentMailAdapter;
  }
  throw new Error(`Unsupported inbound provider: ${provider}`);
}
__name(getInboundProviderAdapter, "getInboundProviderAdapter");

// src/lib/email/processor-inputs.ts
init_esm();
var DEFAULT_MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
var MAX_ATTACHMENT_BYTES_HARD_LIMIT = 100 * 1024 * 1024;
var BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;
function resolveMaxAttachmentBytes(envValue) {
  if (!envValue) {
    return DEFAULT_MAX_ATTACHMENT_BYTES;
  }
  const parsed = Number(envValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_ATTACHMENT_BYTES;
  }
  return Math.min(Math.trunc(parsed), MAX_ATTACHMENT_BYTES_HARD_LIMIT);
}
__name(resolveMaxAttachmentBytes, "resolveMaxAttachmentBytes");
function maxBase64LengthForBytes(maxBytes) {
  return Math.ceil(maxBytes / 3) * 4;
}
__name(maxBase64LengthForBytes, "maxBase64LengthForBytes");
function stripBase64Prefix(contentBase64) {
  const payload = contentBase64.includes(",") ? contentBase64.split(",").pop() || contentBase64 : contentBase64;
  return payload.replace(/\s+/g, "");
}
__name(stripBase64Prefix, "stripBase64Prefix");
function decodeAttachmentBase64(contentBase64) {
  const normalized = stripBase64Prefix(contentBase64);
  if (!normalized) {
    throw new Error("Attachment content was empty");
  }
  if (normalized.length % 4 !== 0 || !BASE64_REGEX.test(normalized)) {
    throw new Error("Attachment content is not valid base64");
  }
  return Buffer.from(normalized, "base64");
}
__name(decodeAttachmentBase64, "decodeAttachmentBase64");

// src/trigger/process-inbound-email.ts
var RAW_BUCKET = "email-raw";
var ATTACHMENTS_BUCKET = "email-attachments";
var BATCH_SIZE = 5;
var MAX_RETRIES = 5;
var MIN_RETRY_DELAY_SECONDS = 30;
var MAX_RETRY_DELAY_SECONDS = 3600;
var MAX_ERROR_LENGTH = 2e3;
var MAX_ATTACHMENT_BYTES = resolveMaxAttachmentBytes(
  process.env.EMAIL_MAX_ATTACHMENT_BYTES
);
function sanitizeFilename(filename) {
  const normalized = filename.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return normalized || "attachment.bin";
}
__name(sanitizeFilename, "sanitizeFilename");
function errorToMessage(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}
__name(errorToMessage, "errorToMessage");
function computeRetryDelaySeconds(retryCount) {
  const exponentialDelay = MIN_RETRY_DELAY_SECONDS * 2 ** Math.max(retryCount - 1, 0);
  return Math.min(exponentialDelay, MAX_RETRY_DELAY_SECONDS);
}
__name(computeRetryDelaySeconds, "computeRetryDelaySeconds");
function jsonBuffer(payload) {
  return Buffer.from(JSON.stringify(payload, null, 2), "utf8");
}
__name(jsonBuffer, "jsonBuffer");
function sha256Hex(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
__name(sha256Hex, "sha256Hex");
function mergeMetadata(existing, patch) {
  return {
    ...existing || {},
    phase2_processor: {
      ...(existing || {}).phase2_processor,
      ...patch
    }
  };
}
__name(mergeMetadata, "mergeMetadata");
async function persistAttachment(admin, inbound, adapter, attachment, index) {
  let fileBuffer;
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
  const storagePath = `${inbound.customer_id}/${inbound.id}/${String(index + 1).padStart(3, "0")}-${safeFilename}`;
  const hash = sha256Hex(fileBuffer);
  const { error: uploadError } = await admin.storage.from(ATTACHMENTS_BUCKET).upload(storagePath, fileBuffer, {
    contentType: detectedContentType || "application/octet-stream",
    upsert: true
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
      source: attachment.content_base64 ? "payload_base64" : `${adapter.provider}_download`,
      provider_email_id: inbound.provider_email_id
    }
  });
  if (insertError && insertError.code !== "23505") {
    throw new Error(insertError.message);
  }
}
__name(persistAttachment, "persistAttachment");
async function processInboundEmail(admin, inbound) {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const adapter = getInboundProviderAdapter(inbound.provider);
    const emailPayload = await adapter.fetchReceivedEmail(
      inbound.provider_email_id
    );
    const rawStoragePath = `${inbound.customer_id}/${inbound.id}/source.json`;
    const { error: rawUploadError } = await admin.storage.from(RAW_BUCKET).upload(rawStoragePath, jsonBuffer(emailPayload), {
      contentType: "application/json",
      upsert: true
    });
    if (rawUploadError) {
      throw new Error(rawUploadError.message);
    }
    let attachments = adapter.extractAttachmentRefs(emailPayload);
    if (attachments.length === 0 && inbound.attachment_count > 0) {
      attachments = await adapter.fetchAttachmentList(
        inbound.provider_email_id
      );
    }
    let attachmentsPersisted = 0;
    for (let i = 0; i < attachments.length; i++) {
      await persistAttachment(admin, inbound, adapter, attachments[i], i);
      attachmentsPersisted++;
    }
    const { error: updateError } = await admin.from("email_inbound").update({
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
        retries: inbound.retry_count
      })
    }).eq("id", inbound.id);
    if (updateError) {
      throw new Error(updateError.message);
    }
    return { attachmentsPersisted, status: "processed" };
  } catch (error) {
    const errorMessage = errorToMessage(error);
    const retryCount = inbound.retry_count + 1;
    const retryDelaySeconds = computeRetryDelaySeconds(retryCount);
    const nextAttemptAt = new Date(
      Date.now() + retryDelaySeconds * 1e3
    ).toISOString();
    const isPoison = retryCount >= MAX_RETRIES;
    await admin.from("email_inbound").update({
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
        poison: isPoison
      })
    }).eq("id", inbound.id);
    return { attachmentsPersisted: 0, status: "failed" };
  }
}
__name(processInboundEmail, "processInboundEmail");
var processInboundEmailTask = schedules_exports.task({
  id: "process-inbound-email",
  cron: "*/1 * * * *",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2e3,
    maxTimeoutInMs: 15e3,
    factor: 2
  },
  run: /* @__PURE__ */ __name(async () => {
    const admin = createTriggerAdminClient();
    const { data: claimedData, error: claimError } = await admin.rpc(
      "claim_email_inbound_jobs",
      {
        p_limit: BATCH_SIZE,
        p_max_retries: MAX_RETRIES
      }
    );
    if (claimError) {
      throw new Error(`Failed to claim inbound jobs: ${claimError.message}`);
    }
    const claimed = claimedData || [];
    if (claimed.length === 0) {
      return { claimed: 0, processed: 0, failed: 0, attachments_persisted: 0 };
    }
    const inboundIds = claimed.map((item) => item.id);
    const { data: inboundRows, error: selectError } = await admin.from("email_inbound").select(
      "id, customer_id, instance_id, provider, provider_email_id, attachment_count, retry_count, metadata"
    ).in("id", inboundIds).order("received_at", { ascending: true });
    if (selectError) {
      throw new Error(`Failed to load inbound emails: ${selectError.message}`);
    }
    const rows = inboundRows || [];
    let processedCount = 0;
    let failedCount = 0;
    let attachmentsPersisted = 0;
    for (const inbound of rows) {
      const result = await processInboundEmail(admin, inbound);
      attachmentsPersisted += result.attachmentsPersisted;
      if (result.status === "processed") {
        processedCount++;
      } else {
        failedCount++;
      }
    }
    return {
      claimed: rows.length,
      processed: processedCount,
      failed: failedCount,
      attachments_persisted: attachmentsPersisted
    };
  }, "run")
});
export {
  processInboundEmailTask
};
//# sourceMappingURL=process-inbound-email.mjs.map
