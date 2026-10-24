import { z } from "zod";
export const sectionDefinitions = {
  parties: {
    label: "Parties & binding statement",
    required: true,
    heading: "คู่สัญญา • Parties",
  },
  asset: {
    label: "Asset specification",
    required: true,
    heading: "รายละเอียดสินค้า • Asset Specification",
  },
  paymentTerms: {
    label: "Payment terms",
    required: true,
    heading: "สรุปข้อมูลทางการเงิน • Contract Financial Summary",
  },
  legal: {
    label: "Legal declarations",
    required: true,
    heading: "ข้อกำหนด • Legal Declarations",
  },
  schedule: {
    label: "Installment schedule",
    required: false,
    heading: "ตารางชำระเงิน • Installment Schedule",
  },
  nationalId: {
    label: "National ID",
    required: false,
    heading: "ยืนยันตัวตน • Customer E-KYC",
  },
  paymentSystem: {
    label: "Payment system",
    required: false,
    heading: "ช่องทางชำระเงิน • Payment Channel",
  },
  commission: {
    label: "Commission",
    required: false,
    heading: "ค่าคอมมิชชั่น • Commission",
  },
} as const;
export type SectionKey = keyof typeof sectionDefinitions;
export const sectionKeys = Object.keys(sectionDefinitions) as SectionKey[];
export interface Section {
  key: SectionKey;
  visible: boolean;
}
export const defaultSections: Section[] = sectionKeys.map((key) => ({
  key,
  visible: key !== "commission",
}));
const percent = z.number().min(0).max(100);
const amount = z.number().min(0).max(100_000_000);
const term = z.object({
  months: z.number().int().min(1).max(60),
  ratePercent: percent,
});
export const templateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    description: z.string().max(500),
    type: z.enum(["fixed_rate", "free_rate"]),
    minDownPaymentPercent: percent,
    maxDownPaymentPercent: percent,
    maxLoanAmount: amount.positive(),
    maxPaymentAmount: amount.optional(),
    fixedRateTerms: z.array(term).max(12),
    title: z.string().trim().min(1, "Title is required").max(200),
    bindingStatement: z
      .string()
      .trim()
      .min(1, "Binding statement is required")
      .max(12000),
    legalDeclarations: z
      .string()
      .trim()
      .min(1, "Legal declarations are required")
      .max(24000),
    penalty: z.object({
      type: z.enum(["fixed_rate", "fixed_fee"]),
      ratePercent: percent.optional(),
      flatFeeAmount: amount.optional(),
      graceDays: z.number().int().min(0).max(365),
      maxCap: amount,
      legalText: z.string().max(12000),
    }),
    sections: z
      .array(
        z.object({
          key: z.enum(sectionKeys as [SectionKey, ...SectionKey[]]),
          visible: z.boolean(),
        }),
      )
      .length(sectionKeys.length),
    commission: z.object({ ratePercent: percent, text: z.string().max(2000) }),
  })
  .superRefine((v, ctx) => {
    const add = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    if (v.minDownPaymentPercent > v.maxDownPaymentPercent)
      add(
        ["minDownPaymentPercent"],
        "Minimum cannot exceed maximum down payment",
      );
    if (v.type === "fixed_rate" && !v.fixedRateTerms.length)
      add(["fixedRateTerms"], "Add at least one payment term");
    if (
      v.type === "fixed_rate" &&
      new Set(v.fixedRateTerms.map((t) => t.months)).size !==
        v.fixedRateTerms.length
    )
      add(["fixedRateTerms"], "Payment terms must have unique month counts");
    if (
      v.type === "free_rate" &&
      (!v.maxPaymentAmount || v.maxPaymentAmount <= 0)
    )
      add(["maxPaymentAmount"], "Set a positive maximum payment amount");
    if (v.penalty.type === "fixed_rate" && v.penalty.ratePercent === undefined)
      add(["penalty", "ratePercent"], "Penalty rate is required");
    if (v.penalty.type === "fixed_fee" && v.penalty.flatFeeAmount === undefined)
      add(["penalty", "flatFeeAmount"], "Penalty fee is required");
    if (new Set(v.sections.map((s) => s.key)).size !== sectionKeys.length)
      add(["sections"], "Each section must appear exactly once");
    for (const s of v.sections)
      if (sectionDefinitions[s.key].required && !s.visible)
        add(["sections"], "Required sections must remain visible");
  });
export type TemplateValues = z.infer<typeof templateSchema>;
export interface TemplateRecord extends TemplateValues {
  id: string;
  merchantId: string;
  version: number;
  status: "draft" | "active" | "archived";
}
export interface ContractDraft {
  merchantId: string;
  branchId: string;
  branchName: string;
  createdDate: string;
  device: {
    productId: string;
    unitId: string;
    brand: string;
    model: string;
    storage: string;
    color: string;
    condition: string;
    serialNumber: string;
    imei1: string;
    imei2: string;
    priceMinor: number;
  };
  customer: {
    fullName: string;
    nationalId: string;
    phone: string;
    dateOfBirth: string;
    email: string;
    idCardAddress: string;
    currentAddress: string;
    workplaceAddress: string;
  };
  media: {
    boxFrontFileId: string;
    imeiLabelFileId: string;
    idCardFileId: string;
    idCardWithOwnerFileId: string;
  };
  financing: {
    termMonths: number;
    downPaymentPercent: number;
    totalPaymentMinor?: number;
  };
}
export interface TemplateSnapshot {
  templateId: string;
  templateVersion: number;
  templateName: string;
  type: TemplateValues["type"];
  title: string;
  bindingStatement: string;
  legalDeclarations: string;
  penalty: TemplateValues["penalty"];
  sections: Section[];
  commission: TemplateValues["commission"];
}
export const thb = (minor: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(minor / 100);
// Round each installment up to a whole baht. Keep its rounding explicitly represented.
export function quote(draft: ContractDraft, template: TemplateValues) {
  const d = draft.device,
    f = draft.financing;
  if (!Number.isSafeInteger(d.priceMinor) || d.priceMinor <= 0)
    throw new Error("Device price must be a positive minor-unit amount");
  if (!Number.isInteger(f.termMonths) || f.termMonths < 1 || f.termMonths > 60)
    throw new Error("Term must be between 1 and 60 months");
  if (
    !Number.isFinite(f.downPaymentPercent) ||
    f.downPaymentPercent < template.minDownPaymentPercent ||
    f.downPaymentPercent > template.maxDownPaymentPercent
  )
    throw new Error("Down payment is outside this template’s range");
  const rate = template.fixedRateTerms.find((t) => t.months === f.termMonths);
  if (template.type === "fixed_rate" && !rate)
    throw new Error("Select a payment term supported by the template");
  const downPaymentMinor = Math.round(
      (d.priceMinor * f.downPaymentPercent) / 100,
    ),
    principalMinor = d.priceMinor - downPaymentMinor;
  if (principalMinor > Math.round(template.maxLoanAmount * 100))
    throw new Error("Loan exceeds the template’s maximum");
  const ratePercent = template.type === "fixed_rate" ? rate!.ratePercent : 0;
  const interestMinor =
    template.type === "fixed_rate"
      ? Math.round(((principalMinor * ratePercent) / 100) * f.termMonths)
      : 0;
  const targetMinor =
    template.type === "free_rate"
      ? f.totalPaymentMinor
      : principalMinor + interestMinor;
  if (
    targetMinor === undefined ||
    !Number.isSafeInteger(targetMinor) ||
    targetMinor < principalMinor
  )
    throw new Error("Total installments must cover the financed principal");
  if (
    template.type === "free_rate" &&
    targetMinor > Math.round((template.maxPaymentAmount ?? 0) * 100)
  )
    throw new Error("Total installments exceed the template’s maximum payment");
  const installmentMinor = Math.ceil(targetMinor / f.termMonths / 100) * 100;
  const installmentTotalMinor = installmentMinor * f.termMonths;
  return {
    devicePriceMinor: d.priceMinor,
    downPaymentPercent: f.downPaymentPercent,
    downPaymentMinor,
    principalMinor,
    ratePercent,
    termMonths: f.termMonths,
    installmentMinor,
    interestMinor: targetMinor - principalMinor,
    roundingAdjustmentMinor: installmentTotalMinor - targetMinor,
    installmentTotalMinor,
    totalContractValueMinor: downPaymentMinor + installmentTotalMinor,
  };
}
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function schedule(draft: ContractDraft, template: TemplateValues) {
  if (!validDate(draft.createdDate))
    throw new Error("Contract date is invalid");
  const q = quote(draft, template),
    [y, m, d] = draft.createdDate.split("-").map(Number);
  return Array.from({ length: q.termMonths + 1 }, (_, period) => {
    const lastDay = new Date(Date.UTC(y, m + period, 0)).getUTCDate();
    return {
      period,
      dueDate: new Date(Date.UTC(y, m - 1 + period, Math.min(d, lastDay)))
        .toISOString()
        .slice(0, 10),
      amountMinor: period === 0 ? q.downPaymentMinor : q.installmentMinor,
      label: period === 0 ? "Down payment" : `Installment ${period}`,
      status: "unpaid" as const,
    };
  });
}
export function templateSnapshot(template: TemplateRecord): TemplateSnapshot {
  const t = templateSchema.parse(template);
  return structuredClone({
    templateId: template.id,
    templateVersion: template.version,
    templateName: t.name,
    type: t.type,
    title: t.title,
    bindingStatement: t.bindingStatement,
    legalDeclarations: t.legalDeclarations,
    penalty: t.penalty,
    sections: t.sections,
    commission: t.commission,
  });
}
export function toTemplateRequest(values: TemplateValues) {
  const t = templateSchema.parse(values);
  return {
    ...t,
    maxPaymentAmount: t.type === "free_rate" ? t.maxPaymentAmount : undefined,
    fixedRateTerms: t.type === "fixed_rate" ? t.fixedRateTerms : undefined,
    penalty: {
      ...t.penalty,
      ratePercent:
        t.penalty.type === "fixed_rate" ? t.penalty.ratePercent : undefined,
      flatFeeAmount:
        t.penalty.type === "fixed_fee" ? t.penalty.flatFeeAmount : undefined,
    },
  };
}
export function toContractRequest(
  draft: ContractDraft,
  template: TemplateRecord,
) {
  if (template.status !== "active")
    throw new Error("Only an active template can create a contract");
  if (template.merchantId !== draft.merchantId)
    throw new Error("Template belongs to another merchant");
  for (const k of [
    "fullName",
    "nationalId",
    "phone",
    "dateOfBirth",
    "idCardAddress",
    "currentAddress",
  ] as const)
    if (!draft.customer[k]?.trim()) throw new Error(`${k} is required`);
  if (
    !validDate(draft.customer.dateOfBirth) ||
    draft.customer.dateOfBirth >= draft.createdDate
  )
    throw new Error(
      "Date of birth must be a valid date before the contract date",
    );
  if (
    !draft.device.unitId ||
    !draft.device.productId ||
    !draft.device.serialNumber ||
    !/^\d{15}$/.test(draft.device.imei1)
  )
    throw new Error("Device identifiers are incomplete");
  if (Object.values(draft.media).some((id) => !id?.trim()))
    throw new Error("Required document file IDs are missing");
  return structuredClone({
    schemaVersion: 1,
    currency: "THB",
    merchantId: draft.merchantId,
    branchId: draft.branchId,
    createdDate: draft.createdDate,
    intent: "submit_for_approval" as const,
    device: draft.device,
    customer: draft.customer,
    media: draft.media,
    template: templateSnapshot(template),
    financing: quote(draft, template),
    schedule: schedule(draft, template),
    signatureStatus: "unsigned" as const,
  });
}
export type CreateContractRequest = ReturnType<typeof toContractRequest>;
