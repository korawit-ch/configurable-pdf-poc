import { describe, it, expect } from "vitest";
import {
  defaultSections,
  quote,
  schedule,
  templateSchema,
  templateSnapshot,
  toContractRequest,
  toTemplateRequest,
} from "./contracts";
import { demoDraft, standardTemplate } from "./fixtures";
describe("Contract request boundary", () => {
  it("validates the seeded template", () =>
    expect(templateSchema.safeParse(standardTemplate).success).toBe(true));
  it("keeps required sections visible and rejects duplicates", () => {
    const t = structuredClone(standardTemplate);
    t.sections[0].visible = false;
    expect(templateSchema.safeParse(t).success).toBe(false);
    t.sections = structuredClone(defaultSections);
    t.sections[1] = t.sections[0];
    expect(templateSchema.safeParse(t).success).toBe(false);
  });
  it("preserves section order and independent snapshots", () => {
    const t = structuredClone(standardTemplate);
    t.sections.reverse();
    t.sections.find((s) => s.key === "nationalId")!.visible = false;
    const snapshot = templateSnapshot(t);
    expect(snapshot.sections[0].key).toBe("commission");
    expect(snapshot.sections.find((s) => s.key === "nationalId")?.visible).toBe(
      false,
    );
    t.sections.reverse();
    t.penalty.legalText = "Changed after contract creation";
    expect(snapshot.sections[0].key).toBe("commission");
    expect(snapshot.penalty.legalText).not.toContain("Changed");
  });
  it("uses whole-baht installments and exposes their rounding adjustment", () => {
    const q = quote(demoDraft, standardTemplate);
    expect(q.installmentMinor).toBe(462000);
    expect(q.downPaymentMinor).toBe(509000);
    expect(q.totalContractValueMinor).toBe(6053000);
    expect(q.roundingAdjustmentMinor).toBe(990);
    expect(
      schedule(demoDraft, standardTemplate).reduce(
        (sum, r) => sum + r.amountMinor,
        0,
      ),
    ).toBe(q.totalContractValueMinor);
  });
  it("includes an unpaid down payment and clamps month-end dates", () => {
    const d = structuredClone(demoDraft);
    d.createdDate = "2027-01-31";
    d.financing.termMonths = 3;
    const rows = schedule(d, standardTemplate);
    expect(rows.map((r) => r.dueDate)).toEqual([
      "2027-01-31",
      "2027-02-28",
      "2027-03-31",
      "2027-04-30",
    ]);
    expect(rows.every((r) => r.status === "unpaid")).toBe(true);
  });
  it("maps nested penalty discriminators and removes irrelevant fields", () => {
    const t = structuredClone(standardTemplate);
    t.penalty.type = "fixed_fee";
    t.penalty.flatFeeAmount = 200;
    const req = JSON.parse(JSON.stringify(toTemplateRequest(t)));
    expect(req.penalty).not.toHaveProperty("ratePercent");
    expect(req.penalty.flatFeeAmount).toBe(200);
    expect(req).not.toHaveProperty("merchantId");
  });
  it("validates template bounds, term uniqueness and conditional fields", () => {
    for (const changes of [
      { minDownPaymentPercent: 90, maxDownPaymentPercent: 10 },
      { type: "free_rate", maxPaymentAmount: undefined },
      { fixedRateTerms: [] },
      {
        fixedRateTerms: [
          { months: 12, ratePercent: 1 },
          { months: 12, ratePercent: 2 },
        ],
      },
    ])
      expect(
        templateSchema.safeParse({ ...standardTemplate, ...changes }).success,
      ).toBe(false);
  });
  it("supports explicit free-rate payment totals", () => {
    const t = structuredClone(standardTemplate);
    t.type = "free_rate";
    t.maxPaymentAmount = 100000;
    const d = structuredClone(demoDraft);
    d.financing.totalPaymentMinor = 6000000;
    expect(quote(d, t).installmentMinor).toBe(500000);
    expect(toTemplateRequest(t).fixedRateTerms).toBeUndefined();
    d.financing.totalPaymentMinor = 1;
    expect(() => quote(d, t)).toThrow();
  });
  it("rejects unsupported financing and invalid dates", () => {
    const d = structuredClone(demoDraft);
    d.financing.termMonths = 5;
    expect(() => quote(d, standardTemplate)).toThrow();
    d.financing.termMonths = 12;
    d.createdDate = "2026-02-30";
    expect(() => schedule(d, standardTemplate)).toThrow();
  });
  it("requires matching merchant, active template and document references", () => {
    const d = structuredClone(demoDraft);
    const t = structuredClone(standardTemplate);
    t.status = "draft";
    expect(() => toContractRequest(d, t)).toThrow();
    t.status = "active";
    t.merchantId = "other";
    expect(() => toContractRequest(d, t)).toThrow();
    t.merchantId = d.merchantId;
    d.media.idCardFileId = "";
    expect(() => toContractRequest(d, t)).toThrow();
  });
  it("hands off a frozen unsigned payload with no UI or PDF objects", () => {
    const req = toContractRequest(demoDraft, standardTemplate);
    expect(req.signatureStatus).toBe("unsigned");
    expect(req.intent).toBe("submit_for_approval");
    expect(req.template.templateVersion).toBe(1);
    expect(req).not.toHaveProperty("pdf");
    expect(JSON.parse(JSON.stringify(req))).toEqual(req);
  });
});
