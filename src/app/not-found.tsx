import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-deep">
      <div className="text-center max-w-md px-6">
        <h1 className="font-headline text-6xl font-bold text-accent mb-4">
          404
        </h1>
        <h2 className="font-headline text-xl font-semibold text-text-primary mb-2">
          Page not found
        </h2>
        <p className="text-text-secondary text-sm mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center bg-accent hover:bg-accent-light text-bg-deep rounded-full px-6 py-3 text-sm font-semibold transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
