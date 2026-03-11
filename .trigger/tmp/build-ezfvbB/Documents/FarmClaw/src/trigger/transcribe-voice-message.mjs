import {
  processRuntimeRun
} from "../../../../chunk-IKFPJALX.mjs";
import "../../../../chunk-5R2YARHQ.mjs";
import "../../../../chunk-6FHKRVG7.mjs";
import "../../../../chunk-YHJ4RCX5.mjs";
import {
  enqueueDiscordRuntimeRun
} from "../../../../chunk-5C7EBN2F.mjs";
import "../../../../chunk-FNDDZUO5.mjs";
import "../../../../chunk-XF5T4F7Q.mjs";
import "../../../../chunk-R2V4UDE3.mjs";
import "../../../../chunk-XSF42NVM.mjs";
import {
  createTriggerAdminClient
} from "../../../../chunk-HT5RPO7D.mjs";
import {
  task
} from "../../../../chunk-OGNGFKGT.mjs";
import "../../../../chunk-WWNEOE5T.mjs";
import "../../../../chunk-RLLQVKNR.mjs";
import {
  __name,
  init_esm
} from "../../../../chunk-262SQFPS.mjs";

// src/trigger/transcribe-voice-message.ts
init_esm();

// src/lib/ai/audio-transcriber.ts
init_esm();
var ALLOWED_AUDIO_ORIGINS = [
  "https://cdn.discordapp.com",
  "https://media.discordapp.net"
];
function validateAudioUrl(audioUrl) {
  let parsed;
  try {
    parsed = new URL(audioUrl);
  } catch {
    throw new Error("Invalid audio URL");
  }
  if (!ALLOWED_AUDIO_ORIGINS.includes(parsed.origin)) {
    throw new Error("Audio URL must point to Discord CDN");
  }
}
__name(validateAudioUrl, "validateAudioUrl");
async function transcribeAudio(audioUrl) {
  validateAudioUrl(audioUrl);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
  }
  const audioBlob = await audioResponse.blob();
  const formData = new FormData();
  formData.append("file", audioBlob, "voice-message.ogg");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  const whisperResponse = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData
    }
  );
  if (!whisperResponse.ok) {
    const errorText = await whisperResponse.text().catch(() => "Unknown error");
    throw new Error(`Whisper API error ${whisperResponse.status}: ${errorText}`);
  }
  const result = await whisperResponse.json();
  return {
    text: result.text,
    language: result.language || "en",
    duration_seconds: result.duration || 0
  };
}
__name(transcribeAudio, "transcribeAudio");

// src/trigger/transcribe-voice-message.ts
var transcribeVoiceMessage = task({
  id: "transcribe-voice-message",
  retry: { maxAttempts: 2 },
  run: /* @__PURE__ */ __name(async (payload) => {
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
        content: `[Voice message]: ${transcription.text}`
      },
      metadata: {
        voice_transcription: true,
        audio_url: payload.audioUrl,
        language: transcription.language,
        duration_seconds: transcription.duration_seconds
      }
    });
    await processRuntimeRun.trigger({ runId: run.id });
    return {
      runId: run.id,
      transcription: transcription.text,
      language: transcription.language,
      durationSeconds: transcription.duration_seconds
    };
  }, "run")
});
export {
  transcribeVoiceMessage
};
//# sourceMappingURL=transcribe-voice-message.mjs.map
