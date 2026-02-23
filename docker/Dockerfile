FROM node:22-slim

# --- Layer 1: System packages (most stable) ---
RUN apt-get update && apt-get install -y --no-install-recommends \
    # CLI essentials
    curl jq git \
    # Document conversion (Markdown ↔ DOCX, HTML, EPUB, etc.)
    pandoc \
    # PDF text extraction (pdftotext, pdfinfo)
    poppler-utils \
    # PDF structure ops (merge/split/rotate/encrypt)
    qpdf \
    # OCR pipeline support for scanned PDFs/images
    tesseract-ocr tesseract-ocr-eng ghostscript \
    # Lightweight SQL database
    sqlite3 \
    # CLI image manipulation & conversion
    imagemagick \
    # Graph/diagram generation from DOT language
    graphviz \
    # Python runtime
    python3 python3-pip python3-venv \
    # Fonts for professional document/chart rendering
    fonts-dejavu-core fonts-noto-core fonts-noto-mono \
    && rm -rf /var/lib/apt/lists/*

# --- Layer 2: Python venv + data/doc packages ---
RUN python3 -m venv /opt/farmclaw-py && \
    /opt/farmclaw-py/bin/pip install --no-cache-dir \
    pandas openpyxl \
    matplotlib \
    Pillow \
    python-docx \
    reportlab \
    pypdf \
    pdfplumber \
    pdf2image \
    pytesseract \
    pyyaml
ENV PATH="/opt/farmclaw-py/bin:$PATH"

# --- Layer 3: OpenClaw + Node.js doc-creation libraries ---
ARG OPENCLAW_VERSION=2026.2.9
RUN npm install -g openclaw@${OPENCLAW_VERSION}
RUN npm install -g \
    exceljs \
    docx \
    pdfkit \
    pdf-lib \
    csv-writer \
    marked \
    archiver

# --- Layer 3b: Pre-install MCP server packages ---
RUN npm install -g \
    @modelcontextprotocol/server-filesystem \
    mcp-sqlite \
    @modelcontextprotocol/server-memory

# --- Layer 3c: Data directory for SQLite ---
RUN mkdir -p /home/node/data && chown node:node /home/node/data

# --- Layer 4: Playwright + Chromium (heaviest, stable) ---
RUN npx playwright install --with-deps chromium

# --- Layer 5: Application files (change most often) ---
COPY skills/ /home/node/.openclaw/skills/
COPY templates/SOUL.md /home/node/.openclaw/SOUL.md
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
RUN chown -R node:node /home/node/.openclaw
RUN mkdir -p /home/node/workspace && chown node:node /home/node/workspace

WORKDIR /home/node
USER node
EXPOSE 18789
ENTRYPOINT ["/entrypoint.sh"]
