const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return adminEmails.includes(email.toLowerCase());
}
