import { defaultSections } from "./contracts";
import type { TemplateRecord, ContractDraft } from "./contracts";
export const standardTemplate: TemplateRecord = {
  id: "tmpl-fixed-1",
  merchantId: "merchant-demo",
  version: 1,
  status: "active",
  name: "Standard Fixed Rate",
  description: "Fixed monthly rates for mobile hire purchase.",
  type: "fixed_rate",
  minDownPaymentPercent: 10,
  maxDownPaymentPercent: 50,
  maxLoanAmount: 100000,
  fixedRateTerms: [
    { months: 3, ratePercent: 1.25 },
    { months: 6, ratePercent: 1.5 },
    { months: 12, ratePercent: 1.75 },
    { months: 24, ratePercent: 2 },
  ],
  title: "Hire Purchase Agreement",
  bindingStatement:
    "This agreement is made between the Lessor and the Lessee, and both parties agree to the terms specified below.",
  legalDeclarations:
    "The Lessee acknowledges and agrees to pay according to the installment schedule below. Ownership transfers only after all payments have cleared.",
  penalty: {
    type: "fixed_rate",
    ratePercent: 1.5,
    graceDays: 3,
    maxCap: 3000,
    legalText:
      "If payment is late beyond the grace period, the Lessee agrees to pay a penalty at the specified rate, not to exceed the stated maximum cap.",
  },
  sections: structuredClone(defaultSections),
  commission: { ratePercent: 0, text: "" },
};
export const demoDraft: ContractDraft = {
  merchantId: "merchant-demo",
  branchId: "branch-demo",
  branchName: "Main Branch",
  createdDate: "2026-10-21",
  device: {
    productId: "product-demo-phone",
    unitId: "unit-demo-001",
    brand: "Sample Brand",
    model: "Demo Phone",
    storage: "512GB",
    color: "Silver",
    condition: "New",
    serialNumber: "DEMO-DEVICE-001",
    imei1: "352417000000175",
    imei2: "352417000000176",
    priceMinor: 5090000,
  },
  customer: {
    fullName: "Demo Customer",
    nationalId: "DEMO-PASSPORT-001",
    phone: "000-000-0000",
    dateOfBirth: "1995-01-01",
    email: "demo@example.com",
    idCardAddress: "Demo address, Sample City 00000",
    currentAddress: "Demo address, Sample City 00000",
    workplaceAddress: "",
  },
  media: {
    boxFrontFileId: "demo-file-box",
    imeiLabelFileId: "demo-file-imei",
    idCardFileId: "demo-file-id",
    idCardWithOwnerFileId: "demo-file-owner",
  },
  financing: { termMonths: 12, downPaymentPercent: 10 },
};
