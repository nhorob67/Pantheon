import type { DocumentContent } from "@/types/file-creation";

/**
 * Generate a PDF buffer from document content using PDFKit.
 *
 * PDFKit is imported dynamically to keep the module tree-shakeable
 * for routes that don't need PDF generation.
 */
export async function generatePdf(content: DocumentContent): Promise<Buffer> {
  // Dynamic import so the 2 MB pdfkit bundle only loads when needed
  const PDFDocument = (await import("pdfkit")).default;

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: content.title || "Document",
        Creator: "Pantheon",
      },
    });

    doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Title
    if (content.title) {
      doc.fontSize(22).font("Helvetica-Bold").text(content.title);
      doc.moveDown(1);
    }

    // Sections
    for (let i = 0; i < content.sections.length; i++) {
      const section = content.sections[i];

      if (section.heading) {
        doc.fontSize(16).font("Helvetica-Bold").text(section.heading);
        doc.moveDown(0.3);
      }

      if (section.body) {
        doc.fontSize(11).font("Helvetica").text(section.body, {
          lineGap: 2,
          paragraphGap: 6,
        });
      }

      if (i < content.sections.length - 1) {
        doc.moveDown(0.8);
      }
    }

    doc.end();
  });
}
