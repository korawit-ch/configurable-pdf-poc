import { beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { buildPdf } from "./pdf";
import { demoDraft, standardTemplate } from "../domain/fixtures";
let result: Awaited<ReturnType<typeof buildPdf>>;
const contents = (schema: unknown) =>
  String((schema as { content?: string }).content ?? "");
beforeAll(async () => {
  const buffers = await Promise.all(
    ["Regular", "Bold"].map((weight) =>
      readFile(
        new URL(
          `../../../../public/fonts/ContractSans-${weight}.ttf`,
          import.meta.url,
        ),
      ),
    ),
  );
  const [regular, bold] = buffers.map(
    (b) =>
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer,
  );
  result = await buildPdf(standardTemplate, demoDraft, { regular, bold });
}, 30000);
describe("Printed contract layout", () => {
  it("uses US Legal page proportions", () => {
    const base = result.compiled.template.basePdf;
    if (typeof base !== "object" || !("width" in base))
      throw new Error("Expected blank PDF");
    expect(base.width).toBe(215.9);
    expect(base.height).toBe(355.6);
  });
  it("places lessor and lessee next to each other", () => {
    const schemas = result.compiled.template.schemas[0];
    const a = schemas.find((s) => contents(s) === "ผู้ให้เช่าซื้อ (LESSOR)")!,
      b = schemas.find((s) => contents(s) === "ผู้เช่าซื้อ (LESSEE)")!;
    expect(a).toBeDefined();
    expect(b.position.y).toBe(a.position.y);
    expect(b.position.x - a.position.x).toBeGreaterThan(80);
  });
  it("keeps the identity heading and both image blocks on the same page", () => {
    const pages = result.compiled.template.schemas;
    const index = pages.findIndex((page) =>
      page.some((s) => contents(s).includes("Customer E-KYC Block")),
    );
    expect(index).toBeGreaterThan(0);
    expect(pages[index].some((s) => contents(s) === "ID CARD PHOTO")).toBe(
      true,
    );
    expect(pages[index].some((s) => contents(s) === "ID CARD WITH OWNER")).toBe(
      true,
    );
  });
  it("keeps repeated contract chrome in the fixed header and footer", () => {
    const base = result.compiled.template.basePdf;
    if (typeof base !== "object" || !("staticSchema" in base))
      throw new Error("Missing repeated chrome");
    const statics = base.staticSchema ?? [];
    const title = statics.find((s) => contents(s) === standardTemplate.title)!;
    expect(title.position.x).toBeGreaterThan(140);
    expect(
      statics.find((s) => contents(s) === "PromptPay • โอนเงิน")!.position.y,
    ).toBeGreaterThan(300);
    expect(
      statics.find((s) => contents(s) === "LINE OA • แจ้งชำระ"),
    ).toBeDefined();
  });
});
