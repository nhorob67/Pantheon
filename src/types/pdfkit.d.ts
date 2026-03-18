declare module "pdfkit" {
  class PDFDocument {
    constructor(options?: Record<string, unknown>);
    fontSize(size: number): this;
    font(name: string): this;
    text(text: string, options?: Record<string, unknown>): this;
    text(text: string, x: number, y: number, options?: Record<string, unknown>): this;
    moveDown(lines?: number): this;
    addPage(options?: Record<string, unknown>): this;
    end(): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, callback: (...args: any[]) => void): this;
    pipe(destination: NodeJS.WritableStream): NodeJS.WritableStream;
  }
  export default PDFDocument;
}
