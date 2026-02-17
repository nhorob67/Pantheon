import { buildNavigation } from "@/lib/docs/navigation";
import { DocsNav } from "@/components/docs/docs-nav";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { SearchProvider } from "@/components/docs/search-provider";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigation = buildNavigation();

  return (
    <SearchProvider>
      <div className="min-h-screen bg-bg-deep">
        <DocsNav />
        <div className="flex pt-16">
          <DocsSidebar navigation={navigation} />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </SearchProvider>
  );
}
