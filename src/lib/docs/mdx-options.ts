import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { createHighlighter, type Highlighter } from "shiki";
import { visit } from "unist-util-visit";
import type { CompileOptions } from "@mdx-js/mdx";
import type { Element, Root } from "hast";

let highlighterPromise: Promise<Highlighter> | null = null;

type MdxCompileOptions = Omit<
  CompileOptions,
  "outputFormat" | "providerImportSource"
> & {
  useDynamicImport?: boolean;
};

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark-default"],
      langs: [
        "typescript",
        "javascript",
        "bash",
        "json",
        "yaml",
        "sql",
        "tsx",
        "jsx",
        "css",
        "markdown",
        "text",
      ],
    });
  }
  return highlighterPromise;
}

function rehypeShiki() {
  return async (tree: Root) => {
    const highlighter = await getHighlighter();
    const nodesToProcess: { node: Element; lang: string; code: string }[] = [];

    visit(tree, "element", (node: Element) => {
      if (
        node.tagName === "pre" &&
        node.children.length === 1 &&
        (node.children[0] as Element).tagName === "code"
      ) {
        const codeEl = node.children[0] as Element;
        const className = (codeEl.properties?.className as string[]) || [];
        const langClass = className.find((c: string) =>
          c.startsWith("language-")
        );
        const lang = langClass ? langClass.replace("language-", "") : "text";
        const code =
          (codeEl.children[0] as { value?: string })?.value?.trimEnd() || "";
        nodesToProcess.push({ node, lang, code });
      }
    });

    for (const { node, lang, code } of nodesToProcess) {
      const hast = highlighter.codeToHast(code, {
        lang,
        theme: "github-dark-default",
      });

      // codeToHast returns a root with a single <pre> element
      const preEl = hast.children[0] as Element;

      node.tagName = "div";
      node.properties = {
        className: ["code-block-wrapper"],
        "data-language": lang,
      };
      node.children = [preEl];
    }
  };
}

export function getMdxOptions(): MdxCompileOptions {
  return {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "wrap" as const,
          properties: {
            className: ["heading-anchor"],
          },
        },
      ],
      rehypeShiki,
    ],
  };
}
