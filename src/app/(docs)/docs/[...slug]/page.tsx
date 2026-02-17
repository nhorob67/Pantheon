import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getDocBySlug, getAllDocs } from "@/lib/docs/content";
import { extractHeadings } from "@/lib/docs/headings";
import { getAdjacentDocs } from "@/lib/docs/navigation";
import { getMdxOptions } from "@/lib/docs/mdx-options";
import { mdxComponents } from "@/components/docs/mdx-components";
import { TableOfContents } from "@/components/docs/table-of-contents";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { DocPagination } from "@/components/docs/doc-pagination";

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const docs = getAllDocs();
  return docs.map((doc) => ({
    slug: doc.slug.split("/"),
  }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const slugPath = slug.join("/");
  const doc = getDocBySlug(slugPath);
  if (!doc) return {};

  return {
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
  };
}

export default async function DocPage(props: PageProps) {
  const { slug } = await props.params;
  const slugPath = slug.join("/");
  const doc = getDocBySlug(slugPath);

  if (!doc) notFound();

  const headings = extractHeadings(doc.content);
  const { prev, next } = getAdjacentDocs(slugPath);
  const options = getMdxOptions();

  return (
    <div className="flex">
      <article className="flex-1 min-w-0 max-w-3xl mx-auto px-6 py-10 lg:px-8">
        <Breadcrumbs section={doc.frontmatter.section} title={doc.frontmatter.title} />

        <header className="mb-10">
          <h1
            className="text-[30px] font-bold tracking-tight"
            style={{ fontFamily: "var(--headline)" }}
          >
            {doc.frontmatter.title}
          </h1>
          <p className="mt-3 text-text-secondary text-lg leading-relaxed">
            {doc.frontmatter.description}
          </p>
        </header>

        <div className="docs-prose">
          <MDXRemote
            source={doc.content}
            components={mdxComponents}
            options={{ mdxOptions: options }}
          />
        </div>

        <DocPagination prev={prev} next={next} />
      </article>

      <TableOfContents headings={headings} />
    </div>
  );
}
