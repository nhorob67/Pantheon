import { z } from "zod";
import {
  WORKFLOW_NODE_TYPES,
  WORKFLOW_RUN_STATUSES,
  WORKFLOW_RUN_STEP_STATUSES,
} from "@/types/workflow";

const conversationActivityWebhookSchema = z.object({
  type: z.literal("conversation.activity"),
  data: z.object({
    agent_key: z.string().optional(),
    user_messages: z.number().int().min(0),
    assistant_messages: z.number().int().min(0),
    conversations_started: z.number().int().min(0),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});

const workflowRunStateWebhookSchema = z.object({
  type: z.literal("workflow.run.state"),
  data: z.object({
    run_id: z.string().uuid(),
    status: z.enum(WORKFLOW_RUN_STATUSES),
    runtime_correlation_id: z.string().max(200).optional(),
    started_at: z.string().optional(),
    completed_at: z.string().optional(),
    canceled_at: z.string().optional(),
    output_payload: z.record(z.string(), z.unknown()).optional(),
    error_message: z.string().max(2000).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});

const workflowRunStepStateWebhookSchema = z.object({
  type: z.literal("workflow.run.step.state"),
  data: z.object({
    run_id: z.string().uuid(),
    step_id: z.string().uuid().optional(),
    node_id: z.string().trim().min(1).max(120),
    node_type: z.enum(WORKFLOW_NODE_TYPES),
    step_index: z.number().int().min(0),
    attempt: z.number().int().min(1).default(1),
    status: z.enum(WORKFLOW_RUN_STEP_STATUSES),
    input_payload: z.record(z.string(), z.unknown()).optional(),
    output_payload: z.record(z.string(), z.unknown()).optional(),
    error_message: z.string().max(2000).optional(),
    started_at: z.string().optional(),
    completed_at: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});

const workflowRunArtifactWebhookSchema = z.object({
  type: z.literal("workflow.run.artifact"),
  data: z.object({
    run_id: z.string().uuid(),
    step_id: z.string().uuid().optional(),
    artifact_type: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(200),
    mime_type: z.string().trim().max(200).optional(),
    storage_bucket: z.string().trim().max(200).optional(),
    storage_path: z.string().trim().max(2000).optional(),
    payload: z.unknown().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
});

export const openclawWebhookPayloadSchema = z.union([
  conversationActivityWebhookSchema,
  workflowRunStateWebhookSchema,
  workflowRunStepStateWebhookSchema,
  workflowRunArtifactWebhookSchema,
]);

export type OpenClawWebhookPayload = z.infer<typeof openclawWebhookPayloadSchema>;
