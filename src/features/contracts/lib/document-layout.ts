import type { SectionKey } from "../domain/contracts";
/** US Legal page geometry: 215.9 × 355.6 mm (816 × 1344 CSS px at 96 dpi). */
export const contractPage = {
  size: "Legal" as const,
  width: 215.9,
  height: 355.6,
  marginX: 12.7,
  bodyTop: 44,
  footerHeight: 55.7,
  fontSize: 9,
  lineHeight: 1.6,
  gap: 6.35,
};
export interface DocumentContext {
  merchant: {
    name: string;
    legalAddress: string;
    phone: string;
    logoSvg?: string;
  };
  contract: { number?: string };
  payment: { bankName: string; accountNumber: string; accountName: string };
  assets?: {
    idCard?: string;
    idCardWithOwner?: string;
    lineQr?: string;
    paymentQr?: string;
  };
}
export const demoDocumentContext: DocumentContext = {
  merchant: {
    name: "Sample Store",
    legalAddress: "123 Example Road, Sample City",
    phone: "000-000-0000",
    logoSvg:
      '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56"><rect width="56" height="56" rx="10" fill="#e6f0ff"/><path d="M16 10h16l9 9v27H16z" fill="#1677ff"/><path d="M32 10v10h9M22 28h13M22 34h13M22 40h9" fill="none" stroke="#fff" stroke-width="2.5"/></svg>',
  },
  contract: {},
  payment: {
    bankName: "Example Bank",
    accountNumber: "000-0-00000-0",
    accountName: "Sample Store Ltd.",
  },
};
export const sectionAnchors: Record<SectionKey, string[]> = {
  parties: ["ผู้ให้เช่าซื้อ (LESSOR)"],
  asset: ["Asset Specification"],
  paymentTerms: ["Contract Financial Summary"],
  legal: [],
  schedule: ["Installment Schedule"],
  nationalId: ["Customer E-KYC Block"],
  paymentSystem: ["Payment Channel"],
  commission: ["Commission"],
};
