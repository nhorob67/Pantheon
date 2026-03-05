import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Test without password
  console.log("Testing createUser without password...");
  const { data: d1, error: e1 } = await sb.auth.admin.createUser({
    email: "test-probe@example.com",
    email_confirm: true,
  });
  console.log("No-password result:", e1?.message ?? `success id=${d1?.user?.id}`);

  // Test with password
  console.log("Testing createUser with password...");
  const { data: d2, error: e2 } = await sb.auth.admin.createUser({
    email: "test-probe2@example.com",
    password: "testpassword123",
    email_confirm: true,
  });
  console.log("With-password result:", e2?.message ?? `success id=${d2?.user?.id}`);

  // Clean up
  if (d1?.user) await sb.auth.admin.deleteUser(d1.user.id);
  if (d2?.user) await sb.auth.admin.deleteUser(d2.user.id);
  console.log("Cleaned up test users");
}

main().catch(console.error);
