export function isPlaceholderSupabaseEnvValue(name: string, value: string): boolean {
  if (!value || value.trim().length === 0) {
    return true;
  }

  if (name === "NEXT_PUBLIC_SUPABASE_URL") {
    return value.includes("your-project.supabase.co");
  }

  if (name === "SUPABASE_SERVICE_ROLE_KEY" || name === "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
    return value.includes("your-") || value.includes("example");
  }

  return false;
}

export function getSupabaseServiceRoleEnvIssues(): string[] {
  const issues: string[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (isPlaceholderSupabaseEnvValue("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl)) {
    issues.push(
      "NEXT_PUBLIC_SUPABASE_URL is missing or still set to placeholder 'https://your-project.supabase.co'"
    );
  }

  if (isPlaceholderSupabaseEnvValue("SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey)) {
    issues.push("SUPABASE_SERVICE_ROLE_KEY is missing or still set to a placeholder value");
  }

  return issues;
}
