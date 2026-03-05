import Link from "next/link";

export default function DocsNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md px-6">
        <h1 className="font-headline text-6xl font-bold text-accent mb-4">
          404
        </h1>
        <h2 className="font-headline text-xl font-semibold text-text-primary mb-2">
          Documentation page not found
        </h2>
        <p className="text-text-secondary text-sm mb-8 leading-relaxed">
          The documentation page you&apos;re looking for doesn&apos;t exist or
          may have been moved.
        </p>
        <Link
          href="/docs"
          className="inline-flex items-center justify-center bg-accent hover:bg-accent-light text-bg-deep rounded-full px-6 py-3 text-sm font-semibold transition-colors"
        >
          Back to documentation
        </Link>
      </div>
    </div>
  );
}
