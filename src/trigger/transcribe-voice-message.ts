import { task } from "@trigger.dev/sdk";
import { createTriggerAdminClient } from "./lib/supabase";
import { transcribeAudio } from "@/lib/ai/audio-transcriber";
import { enqueueDiscordRuntimeRun } from "@/lib/runtime/tenant-runtime-queue";
import { processRuntimeRun } from "./process-runtime-run";

export const transcribeVoiceMessage = task({
  id: "transcribe-voice-message",
  retry: { maxAttempts: 2 },
  run: async (payload: {
    audioUrl: string;
    tenantId: string;
    customerId: string;
    channelId: string;
    userId: string;
    guildId: string | null;
    messageId: string;
    requestTraceId: string;
  }) => {
    const transcription = await transcribeAudio(payload.audioUrl);

    const admin = createTriggerAdminClient();
    const run = await enqueueDiscordRuntimeRun(admin, {
      runKind: "discord_runtime",
      tenantId: payload.tenantId,
      customerId: payload.customerId,
      requestTraceId: payload.requestTraceId,
      idempotencyKey: `voice:${payload.messageId}`,
      payload: {
        channel_id: payload.channelId,
        user_id: payload.userId,
        guild_id: payload.guildId,
        message_id: payload.messageId,
        content: `[Voice message]: ${transcription.text}`,
      },
      metadata: {
        voice_transcription: true,
        audio_url: payload.audioUrl,
        language: transcription.language,
        duration_seconds: transcription.duration_seconds,
      },
    });

    await processRuntimeRun.trigger({ runId: run.id });

    return {
      runId: run.id,
      transcription: transcription.text,
      language: transcription.language,
      durationSeconds: transcription.duration_seconds,
    };
  },
});
