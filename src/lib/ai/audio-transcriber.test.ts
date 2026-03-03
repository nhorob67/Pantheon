import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateAudioUrl } from "./audio-transcriber.ts";

describe("validateAudioUrl", () => {
  it("accepts cdn.discordapp.com URLs", () => {
    assert.doesNotThrow(() =>
      validateAudioUrl("https://cdn.discordapp.com/attachments/123/456/voice.ogg")
    );
  });

  it("accepts media.discordapp.net URLs", () => {
    assert.doesNotThrow(() =>
      validateAudioUrl("https://media.discordapp.net/attachments/123/456/voice.ogg")
    );
  });

  it("rejects non-Discord URLs", () => {
    assert.throws(
      () => validateAudioUrl("https://evil.com/steal-data"),
      { message: "Audio URL must point to Discord CDN" }
    );
  });

  it("rejects localhost URLs", () => {
    assert.throws(
      () => validateAudioUrl("http://localhost:8080/internal"),
      { message: "Audio URL must point to Discord CDN" }
    );
  });

  it("rejects invalid URLs", () => {
    assert.throws(
      () => validateAudioUrl("not-a-url"),
      { message: "Invalid audio URL" }
    );
  });

  it("rejects file:// protocol", () => {
    assert.throws(
      () => validateAudioUrl("file:///etc/passwd"),
      { message: "Audio URL must point to Discord CDN" }
    );
  });

  it("rejects internal IP addresses", () => {
    assert.throws(
      () => validateAudioUrl("http://169.254.169.254/latest/meta-data"),
      { message: "Audio URL must point to Discord CDN" }
    );
  });
});
