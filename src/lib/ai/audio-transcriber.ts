const ALLOWED_AUDIO_ORIGINS = [
  "https://cdn.discordapp.com",
  "https://media.discordapp.net",
];

export function validateAudioUrl(audioUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(audioUrl);
  } catch {
    throw new Error("Invalid audio URL");
  }

  if (!ALLOWED_AUDIO_ORIGINS.includes(parsed.origin)) {
    throw new Error("Audio URL must point to Discord CDN");
  }
}

export async function transcribeAudio(audioUrl: string): Promise<{
  text: string;
  language: string;
  duration_seconds: number;
}> {
  validateAudioUrl(audioUrl);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  // Fetch the audio file from Discord CDN
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
  }

  const audioBlob = await audioResponse.blob();

  // Send to OpenAI Whisper API
  const formData = new FormData();
  formData.append("file", audioBlob, "voice-message.ogg");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");

  const whisperResponse = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    }
  );

  if (!whisperResponse.ok) {
    const errorText = await whisperResponse.text().catch(() => "Unknown error");
    throw new Error(`Whisper API error ${whisperResponse.status}: ${errorText}`);
  }

  const result = (await whisperResponse.json()) as {
    text: string;
    language: string;
    duration: number;
  };

  return {
    text: result.text,
    language: result.language || "en",
    duration_seconds: result.duration || 0,
  };
}
