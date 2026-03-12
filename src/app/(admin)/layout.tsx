import { requireAdmin } from "@/lib/auth/admin-session";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-background text-[13px] tracking-[0.01em]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <AdminTopbar email={user.email} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
