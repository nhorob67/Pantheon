export interface BridgeTenantAgentInput {
  id: string;
  customer_id: string;
  legacy_agent_id: string | null;
  agent_key: string;
  display_name: string;
  personality_preset: string;
  custom_personality: string | null;
  discord_channel_id: string | null;
  discord_channel_name: string | null;
  is_default: boolean;
  skills: string[];
  cron_jobs: Record<string, boolean>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LegacyAgentBridgeResponse {
  id: string;
  instance_id: string;
  customer_id: string;
  agent_key: string;
  display_name: string;
  personality_preset: string;
  custom_personality: string | null;
  discord_channel_id: string | null;
  discord_channel_name: string | null;
  is_default: boolean;
  skills: string[];
  cron_jobs: Record<string, boolean>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BridgeTenantKnowledgeInput {
  id: string;
  customer_id: string;
  legacy_knowledge_file_id: string | null;
  agent_id: string | null;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  parsed_size_bytes: number;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegacyKnowledgeBridgeResponse {
  id: string;
  customer_id: string;
  instance_id: string;
  agent_id: string | null;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  parsed_size_bytes: number;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface BridgeTenantMemorySettingsInput {
  instance_id: string;
  customer_id: string;
  mode: "native_only" | "hybrid_local_vault";
  capture_level: "conservative" | "standard" | "aggressive";
  retention_days: number;
  exclude_categories: unknown;
  auto_checkpoint: boolean;
  auto_compress: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegacyMemorySettingsBridgeResponse {
  instance_id: string;
  customer_id: string;
  mode: "native_only" | "hybrid_local_vault";
  capture_level: "conservative" | "standard" | "aggressive";
  retention_days: number;
  exclude_categories: string[];
  auto_checkpoint: boolean;
  auto_compress: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BridgeTenantMemoryOperationInput {
  id: string;
  operation_type: string;
  status: string;
  queued_at: string;
}

export interface LegacyMemoryOperationBridgeResponse {
  id: string;
  operation_type: "checkpoint" | "compress";
  status: "queued" | "running" | "completed" | "failed";
  queued_at: string;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeMemoryOperationType(value: string): "checkpoint" | "compress" {
  return value === "compress" ? "compress" : "checkpoint";
}

function normalizeMemoryOperationStatus(
  value: string
): "queued" | "running" | "completed" | "failed" {
  if (
    value === "queued" ||
    value === "running" ||
    value === "completed" ||
    value === "failed"
  ) {
    return value;
  }

  return "queued";
}

export function mapTenantAgentToLegacy(
  tenantAgent: BridgeTenantAgentInput,
  legacyInstanceId: string
): LegacyAgentBridgeResponse {
  return {
    id: tenantAgent.legacy_agent_id || tenantAgent.id,
    instance_id: legacyInstanceId,
    customer_id: tenantAgent.customer_id,
    agent_key: tenantAgent.agent_key,
    display_name: tenantAgent.display_name,
    personality_preset: tenantAgent.personality_preset,
    custom_personality: tenantAgent.custom_personality,
    discord_channel_id: tenantAgent.discord_channel_id,
    discord_channel_name: tenantAgent.discord_channel_name,
    is_default: tenantAgent.is_default,
    skills: tenantAgent.skills,
    cron_jobs: tenantAgent.cron_jobs,
    sort_order: tenantAgent.sort_order,
    created_at: tenantAgent.created_at,
    updated_at: tenantAgent.updated_at,
  };
}

export function mapTenantKnowledgeToLegacy(
  tenantKnowledge: BridgeTenantKnowledgeInput,
  legacyInstanceId: string
): LegacyKnowledgeBridgeResponse {
  return {
    id: tenantKnowledge.legacy_knowledge_file_id || tenantKnowledge.id,
    customer_id: tenantKnowledge.customer_id,
    instance_id: legacyInstanceId,
    agent_id: tenantKnowledge.agent_id,
    file_name: tenantKnowledge.file_name,
    file_type: tenantKnowledge.file_type,
    file_size_bytes: tenantKnowledge.file_size_bytes,
    parsed_size_bytes: tenantKnowledge.parsed_size_bytes,
    status: tenantKnowledge.status,
    error_message: tenantKnowledge.error_message,
    created_at: tenantKnowledge.created_at,
    updated_at: tenantKnowledge.updated_at,
  };
}

export function mapTenantMemorySettingsToLegacy(
  tenantMemorySettings: BridgeTenantMemorySettingsInput
): LegacyMemorySettingsBridgeResponse {
  return {
    instance_id: tenantMemorySettings.instance_id,
    customer_id: tenantMemorySettings.customer_id,
    mode: tenantMemorySettings.mode,
    capture_level: tenantMemorySettings.capture_level,
    retention_days: tenantMemorySettings.retention_days,
    exclude_categories: normalizeStringArray(tenantMemorySettings.exclude_categories),
    auto_checkpoint: tenantMemorySettings.auto_checkpoint,
    auto_compress: tenantMemorySettings.auto_compress,
    updated_by: tenantMemorySettings.updated_by,
    created_at: tenantMemorySettings.created_at,
    updated_at: tenantMemorySettings.updated_at,
  };
}

export function mapTenantMemoryOperationToLegacy(
  tenantMemoryOperation: BridgeTenantMemoryOperationInput
): LegacyMemoryOperationBridgeResponse {
  return {
    id: tenantMemoryOperation.id,
    operation_type: normalizeMemoryOperationType(
      tenantMemoryOperation.operation_type
    ),
    status: normalizeMemoryOperationStatus(tenantMemoryOperation.status),
    queued_at: tenantMemoryOperation.queued_at,
  };
}
