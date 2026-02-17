import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import Image from "next/image";
import { Callout } from "./callout";

export const mdxComponents: MDXComponents = {
  h1: (props) => (
    <h1
      className="text-[30px] font-bold tracking-tight mt-12 mb-6"
      style={{ fontFamily: "var(--headline)" }}
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      className="text-2xl font-semibold mt-10 mb-4 pb-2 border-b border-border scroll-mt-20"
      style={{ fontFamily: "var(--headline)" }}
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      className="text-xl font-semibold mt-8 mb-3 scroll-mt-20"
      style={{ fontFamily: "var(--headline)" }}
      {...props}
    />
  ),
  h4: (props) => (
    <h4
      className="text-base font-semibold mt-6 mb-2 scroll-mt-20"
      style={{ fontFamily: "var(--headline)" }}
      {...props}
    />
  ),
  p: (props) => (
    <p className="text-text-secondary leading-7 mb-5" {...props} />
  ),
  a: ({ href, children, ...props }) => {
    if (href?.startsWith("/")) {
      return (
        <Link
          href={href}
          className="text-accent underline underline-offset-4 decoration-accent/30 hover:decoration-accent transition-colors"
          {...props}
        >
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent underline underline-offset-4 decoration-accent/30 hover:decoration-accent transition-colors"
        {...props}
      >
        {children}
      </a>
    );
  },
  ul: (props) => (
    <ul
      className="ml-6 mb-5 list-disc marker:text-accent/50 space-y-2"
      {...props}
    />
  ),
  ol: (props) => (
    <ol
      className="ml-6 mb-5 list-decimal marker:text-accent/50 space-y-2"
      {...props}
    />
  ),
  li: (props) => (
    <li className="text-text-secondary leading-7" {...props} />
  ),
  code: ({ children, ...props }) => {
    // Inline code (not in a pre block)
    return (
      <code
        className="bg-bg-card px-1.5 py-0.5 rounded text-sm font-mono text-accent-light border border-border"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: (props) => (
    <pre className="bg-bg-dark p-4 text-sm leading-6 overflow-x-auto" {...props} />
  ),
  blockquote: (props) => (
    <blockquote
      className="border-l-2 border-accent/40 pl-6 italic text-text-secondary my-6"
      {...props}
    />
  ),
  table: (props) => (
    <div className="overflow-x-auto my-6">
      <table
        className="w-full border border-border rounded-lg text-sm"
        {...props}
      />
    </div>
  ),
  thead: (props) => <thead className="bg-bg-card" {...props} />,
  th: (props) => (
    <th
      className="text-left px-4 py-3 text-text-primary font-semibold border-b border-border"
      {...props}
    />
  ),
  td: (props) => (
    <td
      className="px-4 py-3 text-text-secondary border-b border-border"
      {...props}
    />
  ),
  strong: (props) => (
    <strong className="text-text-primary font-semibold" {...props} />
  ),
  em: (props) => <em className="text-text-secondary" {...props} />,
  hr: () => <hr className="border-border my-10" />,
  img: (props) => {
    const { src, alt, width, height } =
      props as React.ImgHTMLAttributes<HTMLImageElement>;
    if (typeof src !== "string" || src.length === 0) return null;

    const parsedWidth = typeof width === "number" ? width : Number(width);
    const parsedHeight = typeof height === "number" ? height : Number(height);

    return (
      <Image
        src={src}
        alt={typeof alt === "string" ? alt : ""}
        width={Number.isFinite(parsedWidth) && parsedWidth > 0 ? parsedWidth : 1200}
        height={Number.isFinite(parsedHeight) && parsedHeight > 0 ? parsedHeight : 675}
        sizes="100vw"
        unoptimized
        className="rounded-xl border border-border my-6 max-w-full h-auto"
      />
    );
  },
  // Custom components for MDX
  Callout,
};
