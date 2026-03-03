import assert from "node:assert/strict";
import test from "node:test";
import {
  getSupabaseServiceRoleEnvIssues,
  isPlaceholderSupabaseEnvValue,
} from "./supabase-env.ts";

test("isPlaceholderSupabaseEnvValue detects placeholder Supabase URL", () => {
  assert.equal(
    isPlaceholderSupabaseEnvValue(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://your-project.supabase.co"
    ),
    true
  );
  assert.equal(
    isPlaceholderSupabaseEnvValue("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co"),
    false
  );
});

test("isPlaceholderSupabaseEnvValue detects placeholder service-role key", () => {
  assert.equal(
    isPlaceholderSupabaseEnvValue("SUPABASE_SERVICE_ROLE_KEY", "your-service-role-key"),
    true
  );
  assert.equal(
    isPlaceholderSupabaseEnvValue("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_abc123"),
    false
  );
});

test("getSupabaseServiceRoleEnvIssues reports missing and placeholder values", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key";
    const issues = getSupabaseServiceRoleEnvIssues();
    assert.ok(issues.length >= 2);
  } finally {
    if (typeof previousUrl === "undefined") {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    }
    if (typeof previousServiceRole === "undefined") {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRole;
    }
  }
});
