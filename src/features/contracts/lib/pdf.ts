import {
  Box,
  Document,
  Footer,
  Header,
  Image,
  Line,
  Page,
  Row,
  Spacer,
  Stack,
  Svg,
  Table,
  Text,
  renderToTemplate,
} from "@pdfme/jsx";
import type { PdfJsxChild, TextProps } from "@pdfme/jsx";
import { generate } from "@pdfme/generator";
import { text, table, image, svg, line, rectangle } from "@pdfme/schemas";
import type { Font } from "@pdfme/common";
import dayjs from "dayjs";
import { quote, schedule } from "../domain/contracts";
import type {
  ContractDraft,
  TemplateValues,
  SectionKey,
} from "../domain/contracts";
import { contractPage, demoDocumentContext } from "./document-layout";
import type { DocumentContext } from "./document-layout";
const color = {
  text: "#242424",
  secondary: "#666666",
  light: "#999999",
  fill: "#f5f5f5",
  line: "#a3a3a3",
};
const label = (value: string, props: Partial<TextProps> = {}) =>
  Text({
    size: 9,
    lineHeight: 1.6,
    color: color.text,
    children: value,
    ...props,
  });
const muted = (value: string) => label(value, { color: color.secondary });
const column = (children: PdfJsxChild[], width?: number) =>
  Stack({
    gap: 0,
    ...(width === undefined ? { flex: 1 } : { width }),
    children,
  });
const row = (children: PdfJsxChild[], gap = 6.35) =>
  Row({ gap, alignItems: "start", children });
const datum = (name: string, value: string) => label(`${name}  ${value}`);
const heading = (value: string) =>
  label(value, { font: "ContractSansBold", margin: { bottom: 2.1 } });
const emptyImage = (title: string, width: number, height: number) =>
  Box({
    width,
    height,
    borderColor: "#c9c9c9",
    borderWidth: 0.25,
    radius: 1.5,
    background: "#fafafa",
    children: Stack({
      height,
      justifyContent: "center",
      children: label(title, { size: 8, color: color.light, align: "center" }),
    }),
  });
const picture = (
  src: string | undefined,
  title: string,
  width: number,
  height: number,
) => (src ? Image({ src, width, height }) : emptyImage(title, width, height));
const money = (minor: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    minor / 100,
  );
const date = (value: string) => dayjs(value).format("D MMM YYYY");
export function sectionNode(
  key: SectionKey,
  t: TemplateValues,
  d: ContractDraft,
  context: DocumentContext,
): PdfJsxChild[] {
  const q = quote(d, t),
    m = context.merchant,
    c = d.customer,
    p = d.device;
  switch (key) {
    case "parties":
      return [
        row([
          column([
            heading("ผู้ให้เช่าซื้อ (LESSOR)"),
            datum("ร้านค้า", `${m.name} (${d.branchName})`),
            datum("ที่อยู่", m.legalAddress),
            datum("เบอร์โทร", m.phone),
          ]),
          column([
            heading("ผู้เช่าซื้อ (LESSEE)"),
            datum("ชื่อ-นามสกุล", c.fullName),
            datum("เลขบัตรประชาชน", c.nationalId),
            datum("ที่อยู่ / โทร", `${c.currentAddress} · ${c.phone}`),
          ]),
        ]),
        Line({
          color: color.line,
          height: 0.25,
          margin: { top: 4.2, bottom: 4.2 },
        }),
        label(t.bindingStatement || "No binding statement yet."),
      ];
    case "asset":
      return [
        heading("รายละเอียดสินค้า • Asset Specification"),
        row([
          column([
            datum("สภาพเครื่อง", p.condition),
            datum("สี", p.color),
            datum("IMEI 1", p.imei1),
          ]),
          column([
            datum("แบรนด์", p.brand),
            datum("สเปค", p.storage),
            datum("IMEI 2", p.imei2 || "—"),
          ]),
          column([
            datum("รุ่นสินค้า", p.model),
            datum("Serial Number", p.serialNumber),
          ]),
        ]),
      ];
    case "paymentTerms":
      return [
        Box({
          padding: 4.2,
          radius: 2,
          background: color.fill,
          children: Stack({
            gap: 0,
            children: [
              heading("สรุปข้อมูลทางการเงิน • Contract Financial Summary"),
              row([
                column([
                  datum("ราคาสินค้า", `${money(q.devicePriceMinor)} บาท`),
                  datum("แบ่งจ่ายเดือนละ", `${money(q.installmentMinor)} บาท`),
                ]),
                column([
                  datum("ชำระงวดแรก", `${money(q.downPaymentMinor)} บาท`),
                  datum("จำนวนเดือน", `${q.termMonths} เดือน`),
                ]),
              ]),
            ],
          }),
        }),
      ];
    case "legal":
      return [
        ...(t.legalDeclarations || "No legal declarations yet.").split(/\n+/),
        ...t.penalty.legalText.split(/\n+/),
      ]
        .filter(Boolean)
        .map((value) => label(value, { margin: { bottom: 2.1 } }));
    case "schedule":
      return [
        heading(
          `ตารางชำระเงิน • Installment Schedule (${q.termMonths} งวด • รวมงวดดาวน์)`,
        ),
        Table({
          head: ["งวดที่", "จำนวนเงิน (บาท)", "รายการ", "กำหนดชำระ", "สถานะ"],
          rows: schedule(d, t).map((r) => [
            String(r.period + 1),
            money(r.amountMinor),
            r.period === 0
              ? "เงินดาวน์ (Down Payment)"
              : `งวดผ่อนเดือนที่ ${r.period}`,
            date(r.dueDate),
            "รอชำระ",
          ]),
          columnWeights: [12, 22, 30, 22, 14],
          font: "ContractSans",
          fontSize: 9,
          repeatHead: true,
          tableStyles: { borderWidth: 0, borderColor: "#ffffff" },
          headStyles: {
            backgroundColor: "#ebebeb",
            fontColor: color.text,
            padding: { x: 2.1, y: 1.6 },
          },
          bodyStyles: {
            backgroundColor: "#f5f5f5",
            alternateBackgroundColor: "#f5f5f5",
            fontColor: color.secondary,
            padding: { x: 2.1, y: 1.6 },
            borderColor: "#ffffff",
            borderWidth: { bottom: 0.25 },
          },
        }),
      ];
    case "nationalId": {
      const w = (contractPage.width - 2 * contractPage.marginX - 6.35) / 2;
      return [
        heading("รูปบัตรประชาชน & ยืนยันตัวตน • Customer E-KYC Block"),
        row([
          column([
            label("สำเนาบัตรประชาชน • Thai ID Card", {
              margin: { bottom: 2.1 },
            }),
            picture(
              context.assets?.idCard,
              "ID CARD PHOTO",
              w,
              (w * 54) / 85.6,
            ),
            label(`ผู้ถือบัตร ${c.fullName}\nเลขบัตร ${c.nationalId}`, {
              margin: { top: 2.1 },
              color: color.secondary,
            }),
          ]),
          column([
            label("รูปถ่ายยืนยันตัวตน • Thai ID Card with Owner", {
              margin: { bottom: 2.1 },
            }),
            picture(
              context.assets?.idCardWithOwner,
              "ID CARD WITH OWNER",
              w,
              (w * 54) / 85.6,
            ),
          ]),
        ]),
      ];
    }
    case "paymentSystem":
      return [
        row(
          [
            label(`Payment Channel  ${context.payment.bankName}`),
            muted(`เลขบัญชี ${context.payment.accountNumber}`),
            muted(`ชื่อบัญชี ${context.payment.accountName}`),
          ],
          4.2,
        ),
      ];
    case "commission":
      return [
        heading("ค่าคอมมิชชั่น • Commission"),
        row([
          column([
            datum("อัตรา", `${t.commission.ratePercent}% ของราคาสินค้า`),
          ]),
          column([
            datum(
              "จำนวนเงิน",
              `${money(Math.round((q.devicePriceMinor * t.commission.ratePercent) / 100))} บาท`,
            ),
          ]),
        ]),
        ...(t.commission.text
          ? [label(t.commission.text, { margin: { top: 2.1 } })]
          : []),
      ];
  }
}
function header(t: TemplateValues, d: ContractDraft, context: DocumentContext) {
  const m = context.merchant;
  return Header({
    children: Stack({
      margin: { top: 12.7 },
      gap: 0,
      children: row(
        [
          ...(m.logoSvg
            ? [Svg({ svg: m.logoSvg, width: 14.8, height: 14.8 })]
            : []),
          column([
            label(`${m.name} (${d.branchName})`, { font: "ContractSansBold" }),
            muted(m.legalAddress),
            muted(m.phone),
          ]),
          column(
            [
              datum("วันที่เขียนสัญญา", date(d.createdDate)),
              datum("สัญญาเลขที่", context.contract.number || "—"),
              datum("สินค้าจากร้าน", `${m.name} (${d.branchName})`),
              label(t.title || "Untitled Template", {
                font: "ContractSansBold",
                size: 9.75,
                margin: { top: 2.1 },
              }),
            ],
            53,
          ),
        ],
        4.2,
      ),
    }),
  });
}
function footer(t: TemplateValues, d: ContractDraft, context: DocumentContext) {
  const showPayment = t.sections.some(
      (s) => s.key === "paymentSystem" && s.visible,
    ),
    n = showPayment ? 4 : 3,
    w = (contractPage.width - 2 * contractPage.marginX - (n - 1) * 4.2) / n;
  const signature = (name: string, role: string) =>
    column(
      [
        Spacer({ height: 19.05 }),
        Line({ color: color.line, height: 0.25 }),
        label(`(${name})`, { margin: { top: 2.1 } }),
        muted(`(${role})　วันที่ __ / __ / __`),
      ],
      w,
    );
  const qr = (src: string | undefined, title: string, caption: string) =>
    column(
      [
        picture(src, "QR", 19.05, 19.05),
        label(title, { margin: { top: 2.1 } }),
        label(caption, { size: 8.25, color: color.secondary }),
      ],
      w,
    );
  return Footer({
    children: Stack({
      gap: 0,
      children: [
        Line({ color: color.line, height: 0.25, margin: { bottom: 4.2 } }),
        row(
          [
            signature(d.customer.fullName, "ผู้เช่าซื้อ"),
            signature(context.merchant.name, "ผู้ให้เช่าซื้อ"),
            qr(
              context.assets?.lineQr,
              "LINE OA • แจ้งชำระ",
              "สแกนเพื่อยืนยันสลิป",
            ),
            ...(showPayment
              ? [
                  qr(
                    context.assets?.paymentQr,
                    "PromptPay • โอนเงิน",
                    `${context.payment.accountName} • ${context.payment.accountNumber}`,
                  ),
                ]
              : []),
          ],
          4.2,
        ),
        row(
          [
            label(
              `เอกสารนี้จัดทำโดยระบบ ${context.merchant.name} — ${date(d.createdDate)} · ทุกหน้าต้องลงลายมือชื่อทั้งสองฝ่าย`,
              { size: 8.25, color: color.light, flex: 1 },
            ),
            label("หน้า {currentPage} / {totalPages}", {
              size: 8.25,
              color: color.light,
              width: 22,
              align: "right",
            }),
          ],
          4.2,
        ),
      ],
    }),
  });
}
export interface ContractFontFiles {
  regular: ArrayBuffer;
  bold: ArrayBuffer;
}
let fontPromise: Promise<ContractFontFiles> | undefined;
export function loadFont() {
  return (fontPromise ??= Promise.all(
    ["Regular", "Bold"].map(async (weight) => {
      const response = await fetch(`/fonts/ContractSans-${weight}.ttf`);
      if (!response.ok)
        throw new Error("Unable to load bundled Thai / Latin font");
      return response.arrayBuffer();
    }),
  )
    .then(([regular, bold]) => ({ regular, bold }))
    .catch((error) => {
      fontPromise = undefined;
      throw error;
    }));
}
export async function buildPdf(
  t: TemplateValues,
  d: ContractDraft,
  fontData: ArrayBuffer | ContractFontFiles,
  context: DocumentContext = demoDocumentContext,
) {
  const regular = fontData instanceof ArrayBuffer ? fontData : fontData.regular;
  const bold = fontData instanceof ArrayBuffer ? fontData : fontData.bold;
  const font: Font = {
    ContractSans: { data: regular, fallback: true },
    ContractSansBold: { data: bold },
  };
  const children = t.sections
    .filter((s) => s.visible)
    .map((s) => Stack({ gap: 0, children: sectionNode(s.key, t, d, context) }));
  const margin = {
    x: contractPage.marginX,
    top: contractPage.bodyTop,
    bottom: contractPage.footerHeight,
  };
  // Measure each section using the same PDF layout engine and fonts. Keep ordinary
  // sections together; oversized text/tables retain pdfme's own dynamic splitting.
  const measured = await renderToTemplate(
    Document({
      size: contractPage.size,
      margin,
      font: "ContractSans",
      children: children.map((child) => Page({ children: child })),
    }),
    { font },
  );
  const capacity =
    contractPage.height - contractPage.bodyTop - contractPage.footerHeight - 1;
  const groups: PdfJsxChild[][] = [[]];
  let used = 0;
  children.forEach((child, index) => {
    const schemas = measured.template.schemas[index];
    const height = Math.max(
      0,
      ...schemas.map(
        (schema) => schema.position.y + schema.height - contractPage.bodyTop,
      ),
    );
    const gap = groups.at(-1)!.length ? contractPage.gap : 0;
    if (groups.at(-1)!.length && used + gap + height > capacity) {
      groups.push([]);
      used = 0;
    }
    groups.at(-1)!.push(child);
    used += (used ? contractPage.gap : 0) + height;
  });
  const tree = Document({
    size: contractPage.size,
    margin: {
      x: contractPage.marginX,
      top: contractPage.bodyTop,
      bottom: contractPage.footerHeight,
    },
    font: "ContractSans",
    children: [
      header(t, d, context),
      footer(t, d, context),
      ...groups.map((group) =>
        Page({ children: Stack({ gap: contractPage.gap, children: group }) }),
      ),
    ],
  });
  const compiled = await renderToTemplate(tree, { font });
  const bytes = await generate({
    ...compiled,
    plugins: { text, table, image, svg, line, rectangle },
    options: { font },
  });
  return { bytes, compiled };
}
export function download(data: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
