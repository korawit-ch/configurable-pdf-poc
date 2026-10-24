import { useEffect, useRef, useState } from "react";
import { Alert, Button, Space, Spin, Tag, Typography } from "antd";
import { Download, FileText } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { sectionAnchors } from "../lib/document-layout";
import type {
  ContractDraft,
  TemplateValues,
  SectionKey,
} from "../domain/contracts";
import { buildPdf, loadFont, download } from "../lib/pdf";
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
interface Props {
  values: TemplateValues;
  draft: ContractDraft;
  activeSection: SectionKey | null;
}
interface Mark {
  key: SectionKey;
  top: number;
  bottom: number;
}
function PdfPage({
  page,
  activeSection,
  legalAnchor,
}: {
  page: PDFPageProxy;
  legalAnchor: string;
  activeSection: SectionKey | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    [marks, setMarks] = useState<Mark[]>([]);
  useEffect(() => {
    const viewport = page.getViewport({ scale: 1.5 }),
      el = canvas.current!;
    el.width = viewport.width;
    el.height = viewport.height;
    const task = page.render({ canvas: el, viewport });
    let cancelled = false;
    void page.getTextContent().then((content) => {
      if (cancelled) return;
      const found: Mark[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        for (const [key, definition] of Object.entries(sectionAnchors)) {
          if (
            definition.some((anchor) => item.str.includes(anchor)) ||
            (key === "legal" &&
              legalAnchor.length > 0 &&
              item.str.includes(legalAnchor))
          )
            found.push({
              key: key as SectionKey,
              top: Math.max(
                0,
                ((page.getViewport({ scale: 1 }).height -
                  item.transform[5] -
                  14) /
                  page.getViewport({ scale: 1 }).height) *
                  100,
              ),
              bottom: 90,
            });
        }
      }
      found.sort((a, b) => a.top - b.top);
      found.forEach((m, i) => (m.bottom = found[i + 1]?.top ?? 89));
      setMarks(found);
    });
    task.promise.catch((e) => {
      if (e.name !== "RenderingCancelledException") console.error(e);
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [page, legalAnchor]);
  return (
    <div className="pdf-page" aria-label={`PDF page ${page.pageNumber}`}>
      <canvas ref={canvas} />
      {marks.map((m, i) => (
        <div
          key={`${m.key}-${i}`}
          data-contract-section={m.key}
          className={`section-indicator ${activeSection === m.key ? "visible" : ""}`}
          style={{
            top: `${m.top}%`,
            height: `${Math.max(2, m.bottom - m.top)}%`,
          }}
        />
      ))}
    </div>
  );
}
export function PdfPreview({ values, draft, activeSection }: Props) {
  const [pages, setPages] = useState<PDFPageProxy[]>([]),
    [bytes, setBytes] = useState<Uint8Array | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false,
      doc: PDFDocumentProxy | undefined;
    setBusy(true);
    setError("");
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const result = await buildPdf(values, draft, await loadFont());
          if (cancelled) return;
          doc = await pdfjs.getDocument({
            data: result.bytes.slice(),
            useSystemFonts: false,
          }).promise;
          if (cancelled) {
            await doc.destroy();
            return;
          }
          const list = await Promise.all(
            Array.from({ length: doc.numPages }, (_, i) => doc!.getPage(i + 1)),
          );
          if (!cancelled) {
            setPages(list);
            setBytes(result.bytes);
            setBusy(false);
          }
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : "Unable to render PDF");
            setBusy(false);
            setBytes(null);
            setPages([]);
          }
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (doc) void doc.destroy();
    };
  }, [values, draft]);
  useEffect(() => {
    if (activeSection)
      ref.current
        ?.querySelector(`[data-contract-section="${activeSection}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeSection, pages]);
  return (
    <section className="preview-panel" aria-label="Live contract PDF">
      <div className="preview-toolbar">
        <Space size={8}>
          <FileText size={16} />
          <Typography.Text strong>Live PDF preview</Typography.Text>
          <Tag>{pages.length || "…"} pages</Tag>
        </Space>
        <Button
          size="small"
          icon={<Download size={14} />}
          disabled={busy || !bytes || !!error}
          onClick={() =>
            bytes &&
            download(
              bytes.slice().buffer,
              "hire-purchase-agreement.pdf",
              "application/pdf",
            )
          }
        >
          PDF
        </Button>
      </div>
      <div className="preview-info">
        <span>US Legal · THB · Thai + English</span>
        <span role="status">
          {busy
            ? "Updating PDF…"
            : error
              ? "Check configuration"
              : "Preview matches downloaded PDF"}
        </span>
      </div>
      <div className="pdf-scroll" ref={ref}>
        {error ? (
          <Alert
            type="warning"
            showIcon
            title="Preview needs valid data"
            description={error}
          />
        ) : (
          <Spin spinning={busy} tip="Rendering with pdfme">
            <div className="pdf-pages">
              {pages.map((page) => (
                <PdfPage
                  key={`${page.pageNumber}-${bytes?.byteLength}`}
                  page={page}
                  legalAnchor={values.legalDeclarations.trim().slice(0, 12)}
                  activeSection={activeSection}
                />
              ))}
              {!pages.length && (
                <div className="preview-placeholder">
                  Preparing your contract…
                </div>
              )}
            </div>
          </Spin>
        )}
      </div>
    </section>
  );
}
