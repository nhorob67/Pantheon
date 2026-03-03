import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectFileTypeFromBuffer,
  validateFileTypeMatchesMagicBytes,
} from "./detect-file-type.ts";

describe("detectFileTypeFromBuffer", () => {
  it("detects PDF from magic bytes", () => {
    const buf = Buffer.from("%PDF-1.7 rest of file", "ascii");
    assert.equal(detectFileTypeFromBuffer(buf), "pdf");
  });

  it("detects DOCX/ZIP from magic bytes", () => {
    const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    assert.equal(detectFileTypeFromBuffer(buf), "docx");
  });

  it("returns null for plain text", () => {
    const buf = Buffer.from("Hello world", "utf-8");
    assert.equal(detectFileTypeFromBuffer(buf), null);
  });

  it("returns null for empty buffer", () => {
    assert.equal(detectFileTypeFromBuffer(Buffer.alloc(0)), null);
  });
});

describe("validateFileTypeMatchesMagicBytes", () => {
  it("validates PDF magic bytes match claimed pdf type", () => {
    const buf = Buffer.from("%PDF-1.7 rest of file", "ascii");
    assert.equal(validateFileTypeMatchesMagicBytes(buf, "pdf"), true);
  });

  it("rejects non-PDF buffer claimed as pdf", () => {
    const buf = Buffer.from("Not a PDF", "ascii");
    assert.equal(validateFileTypeMatchesMagicBytes(buf, "pdf"), false);
  });

  it("validates DOCX magic bytes match claimed docx type", () => {
    const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    assert.equal(validateFileTypeMatchesMagicBytes(buf, "docx"), true);
  });

  it("rejects non-ZIP buffer claimed as docx", () => {
    const buf = Buffer.from("Not a DOCX", "ascii");
    assert.equal(validateFileTypeMatchesMagicBytes(buf, "docx"), false);
  });

  it("accepts plain text for txt type", () => {
    const buf = Buffer.from("Hello world\nLine 2", "utf-8");
    assert.equal(validateFileTypeMatchesMagicBytes(buf, "txt"), true);
  });

  it("accepts plain text for md type", () => {
    const buf = Buffer.from("# Heading\n\nSome markdown", "utf-8");
    assert.equal(validateFileTypeMatchesMagicBytes(buf, "md"), true);
  });

  it("rejects binary content claimed as txt", () => {
    const buf = Buffer.from([0x48, 0x65, 0x6c, 0x00, 0x6f]);
    assert.equal(validateFileTypeMatchesMagicBytes(buf, "txt"), false);
  });

  it("rejects binary content claimed as md", () => {
    const buf = Buffer.from([0x23, 0x20, 0x00, 0x48, 0x65]);
    assert.equal(validateFileTypeMatchesMagicBytes(buf, "md"), false);
  });
});
