export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-deep px-4 text-[13px] tracking-[0.01em]">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
