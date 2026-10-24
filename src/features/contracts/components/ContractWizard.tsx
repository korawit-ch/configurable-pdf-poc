import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Steps,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { quote, thb, toContractRequest } from "../domain/contracts";
import type {
  ContractDraft,
  CreateContractRequest,
  TemplateRecord,
} from "../domain/contracts";
import { demoDraft } from "../domain/fixtures";
import { PdfPreview } from "./PdfPreview";
interface Props {
  template: TemplateRecord;
  draft: ContractDraft;
  onChange: (draft: ContractDraft) => void;
  onReview: (request: CreateContractRequest) => void;
}
export function ContractWizard({ template, draft, onChange, onReview }: Props) {
  const [step, setStep] = useState(0),
    [error, setError] = useState("");
  const navigate = useNavigate();
  const update = <K extends keyof ContractDraft>(
    key: K,
    value: ContractDraft[K],
  ) => onChange({ ...draft, [key]: value });
  const device = draft.device,
    finance = draft.financing;
  const financing = useMemo(() => {
    try {
      return { value: quote(draft, template), error: "" };
    } catch (e) {
      return { value: null, error: (e as Error).message };
    }
  }, [draft, template]);
  function next() {
    try {
      if (step === 0 && (!device.unitId || !device.serialNumber))
        throw new Error("Select a unit");
      if (step === 1) quote(draft, template);
      if (
        step === 2 &&
        (!/^\d{15}$/.test(device.imei1) ||
          !device.serialNumber ||
          !draft.media.boxFrontFileId ||
          !draft.media.imeiLabelFileId)
      )
        throw new Error(
          "Provide serial, a 15-digit IMEI and both device photo file references",
        );
      if (step === 3) {
        toContractRequest(draft, template);
      }
      setError("");
      setStep((s) => s + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function review() {
    try {
      const request = toContractRequest(draft, template);
      onReview(request);
      navigate("/contracts/new/review");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const fields = (items: [keyof ContractDraft["customer"], string][]) =>
    items.map(([key, label]) => (
      <Form.Item
        key={key}
        label={label}
        required={!["email", "workplaceAddress"].includes(key)}
      >
        {key === "dateOfBirth" ? (
          <DatePicker
            aria-label={label}
            value={dayjs(draft.customer.dateOfBirth)}
            onChange={(d) =>
              update("customer", {
                ...draft.customer,
                dateOfBirth: d?.format("YYYY-MM-DD") ?? "",
              })
            }
          />
        ) : (
          <Input
            value={draft.customer[key]}
            aria-label={label}
            onChange={(e) =>
              update("customer", { ...draft.customer, [key]: e.target.value })
            }
          />
        )}
      </Form.Item>
    ));
  return (
    <div className="wizard-page">
      <div className="page-title">
        <div>
          <Typography.Text type="secondary">
            Contracts / New contract
          </Typography.Text>
          <Typography.Title level={3}>Create contract</Typography.Title>
        </div>
        <Space>
          <Tag color="blue">Staff · Demo Staff</Tag>
          <Tag>Main Branch</Tag>
        </Space>
      </div>
      <Steps
        current={step}
        size="small"
        items={[
          "Device",
          "Template & Terms",
          "Device Info & Photos",
          "Customer",
          "Preview",
        ].map((title) => ({ title }))}
      />
      <Alert
        type="info"
        showIcon
        title="Demo data only"
        description="This sample flow demonstrates contract creation. File IDs represent completed uploads; no identity documents are uploaded and no backend request is sent."
      />
      {error && <Alert type="error" showIcon title={error} />}
      <div className={step === 4 ? "wizard-preview" : "wizard-card"}>
        <Card>
          <Typography.Title level={4}>
            {
              [
                "Device",
                "Template & Terms",
                "Device Info & Photos",
                "Customer",
                "Preview",
              ][step]
            }
          </Typography.Title>
          <Form layout="vertical">
            {step === 0 && (
              <>
                <Typography.Paragraph type="secondary">
                  Browse by model, or scan the unit sticker or IMEI to find the
                  unit.
                </Typography.Paragraph>
                <Radio.Group
                  value="browse"
                  options={[{ label: "Browse by model", value: "browse" }]}
                />
                <div className="form-grid">
                  <Form.Item label="Brand">
                    <Select
                      value={device.brand}
                      options={[
                        { value: "Sample Brand", label: "Sample Brand" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item label="Model">
                    <Select
                      value={device.model}
                      options={[
                        {
                          value: "Demo Phone",
                          label: "Demo Phone",
                        },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item label="Storage">
                    <Select
                      value={device.storage}
                      options={[{ value: "512GB", label: "512GB" }]}
                    />
                  </Form.Item>
                  <Form.Item label="Color">
                    <Select
                      value={device.color}
                      options={[
                        {
                          value: "Silver",
                          label: "Silver",
                        },
                      ]}
                    />
                  </Form.Item>
                </div>
                <Form.Item label="Unit">
                  <Input
                    readOnly
                    value={`${device.serialNumber} · ${thb(device.priceMinor)}`}
                  />
                </Form.Item>
                <Typography.Text type="secondary">
                  One available demo unit is seeded for this integration POC.
                </Typography.Text>
              </>
            )}
            {step === 1 && (
              <>
                <Typography.Paragraph type="secondary">
                  Choose a contract template and set the down payment and term.
                </Typography.Paragraph>
                <Form.Item label="Contract Template">
                  <Select
                    value={template.id}
                    options={[
                      {
                        value: template.id,
                        label: template.name + " (Active)",
                      },
                    ]}
                  />
                </Form.Item>
                <Form.Item label="Payment Term">
                  <Radio.Group
                    value={finance.termMonths}
                    onChange={(e) =>
                      update("financing", {
                        ...finance,
                        termMonths: e.target.value,
                      })
                    }
                    optionType="button"
                    options={(template.type === "fixed_rate"
                      ? template.fixedRateTerms.map((t) => t.months)
                      : [3, 6, 12, 24]
                    ).map((months) => ({
                      label: `${months} mo`,
                      value: months,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  label="Down Payment (%)"
                  extra={`${template.minDownPaymentPercent}–${template.maxDownPaymentPercent}% for this template`}
                >
                  <InputNumber
                    aria-label="Down payment percent"
                    min={template.minDownPaymentPercent}
                    max={template.maxDownPaymentPercent}
                    value={finance.downPaymentPercent}
                    onChange={(n) =>
                      update("financing", {
                        ...finance,
                        downPaymentPercent: n ?? 0,
                      })
                    }
                  />
                </Form.Item>
                {template.type === "free_rate" && (
                  <Form.Item label="Total installment amount (฿)">
                    <InputNumber
                      aria-label="Total installment amount"
                      min={0}
                      value={(finance.totalPaymentMinor ?? 0) / 100}
                      onChange={(n) =>
                        update("financing", {
                          ...finance,
                          totalPaymentMinor: Math.round((n ?? 0) * 100),
                        })
                      }
                    />
                  </Form.Item>
                )}
                <Card size="small" className="quote-card">
                  {financing.value ? (
                    <>
                      <Typography.Text type="secondary">
                        Monthly installment
                      </Typography.Text>
                      <Typography.Title level={3}>
                        {thb(financing.value.installmentMinor)}
                      </Typography.Title>
                      <span>
                        {finance.termMonths} months ·{" "}
                        {financing.value.ratePercent}% / month · Down{" "}
                        {thb(financing.value.downPaymentMinor)}
                      </span>
                    </>
                  ) : (
                    <Typography.Text type="danger">
                      {financing.error}
                    </Typography.Text>
                  )}
                </Card>
              </>
            )}
            {step === 2 && (
              <>
                <Typography.Paragraph type="secondary">
                  Confirm the unit identifiers and provide references from the
                  media-upload service.
                </Typography.Paragraph>
                <Form.Item label="Serial Number">
                  <Input
                    aria-label="Serial Number"
                    value={device.serialNumber}
                    onChange={(e) =>
                      update("device", {
                        ...device,
                        serialNumber: e.target.value,
                      })
                    }
                  />
                </Form.Item>
                <div className="form-grid">
                  <Form.Item label="IMEI 1">
                    <Input
                      aria-label="IMEI 1"
                      value={device.imei1}
                      onChange={(e) =>
                        update("device", { ...device, imei1: e.target.value })
                      }
                    />
                  </Form.Item>
                  <Form.Item label="IMEI 2">
                    <Input
                      aria-label="IMEI 2"
                      value={device.imei2}
                      onChange={(e) =>
                        update("device", { ...device, imei2: e.target.value })
                      }
                    />
                  </Form.Item>
                  <Form.Item label="Box Front · uploaded file ID">
                    <Input
                      aria-label="Box Front file ID"
                      value={draft.media.boxFrontFileId}
                      onChange={(e) =>
                        update("media", {
                          ...draft.media,
                          boxFrontFileId: e.target.value,
                        })
                      }
                    />
                  </Form.Item>
                  <Form.Item label="IMEI Label · uploaded file ID">
                    <Input
                      aria-label="IMEI Label file ID"
                      value={draft.media.imeiLabelFileId}
                      onChange={(e) =>
                        update("media", {
                          ...draft.media,
                          imeiLabelFileId: e.target.value,
                        })
                      }
                    />
                  </Form.Item>
                </div>
                <Button
                  onClick={() => {
                    update("media", {
                      ...draft.media,
                      boxFrontFileId: demoDraft.media.boxFrontFileId,
                      imeiLabelFileId: demoDraft.media.imeiLabelFileId,
                    });
                    message.info("Demo file references loaded");
                  }}
                >
                  Fill demo file references
                </Button>
              </>
            )}
            {step === 3 && (
              <>
                <Typography.Paragraph type="secondary">
                  Customer data is kept in memory for this demo.
                </Typography.Paragraph>
                <div className="form-grid">
                  {fields([
                    ["nationalId", "National ID / Passport"],
                    ["fullName", "Full Name"],
                    ["phone", "Phone"],
                    ["dateOfBirth", "Date of Birth"],
                    ["email", "Email"],
                    ["idCardAddress", "ID Card’s Address"],
                    ["currentAddress", "Current Address"],
                    ["workplaceAddress", "Workplace Address"],
                  ])}
                  <Form.Item label="ID Card · uploaded file ID">
                    <Input
                      value={draft.media.idCardFileId}
                      onChange={(e) =>
                        update("media", {
                          ...draft.media,
                          idCardFileId: e.target.value,
                        })
                      }
                    />
                  </Form.Item>
                  <Form.Item label="ID Card with Owner · uploaded file ID">
                    <Input
                      value={draft.media.idCardWithOwnerFileId}
                      onChange={(e) =>
                        update("media", {
                          ...draft.media,
                          idCardWithOwnerFileId: e.target.value,
                        })
                      }
                    />
                  </Form.Item>
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <Typography.Paragraph type="secondary">
                  Review the actual generated PDF and continue with a frozen
                  template snapshot.
                </Typography.Paragraph>
                <dl className="review-summary">
                  <dt>Device</dt>
                  <dd>
                    {device.brand} {device.model} · {device.storage}
                  </dd>
                  <dt>Customer</dt>
                  <dd>{draft.customer.fullName}</dd>
                  <dt>Template</dt>
                  <dd>
                    {template.name} · v{template.version}
                  </dd>
                  <dt>Monthly payment</dt>
                  <dd>
                    {financing.value && thb(financing.value.installmentMinor)}
                  </dd>
                  <dt>Total including down payment</dt>
                  <dd>
                    {financing.value &&
                      thb(financing.value.totalContractValueMinor)}
                  </dd>
                </dl>
                <Alert
                  type="warning"
                  title="Unsigned draft"
                  description="Payment entries remain unpaid. Submitting for approval does not activate a contract or record consent."
                />
              </>
            )}
          </Form>
          <div className="wizard-actions">
            <Button
              disabled={step === 0}
              onClick={() => {
                setError("");
                setStep((s) => s - 1);
              }}
            >
              Back
            </Button>
            {step < 4 ? (
              <Button type="primary" onClick={next}>
                Next:{" "}
                {
                  [
                    "",
                    "Template & Terms",
                    "Device Info",
                    "Customer",
                    "Preview",
                  ][step + 1]
                }
              </Button>
            ) : (
              <Button type="primary" onClick={review}>
                Continue to submission →
              </Button>
            )}
          </div>
        </Card>
        {step === 4 && (
          <PdfPreview values={template} draft={draft} activeSection={null} />
        )}
      </div>
    </div>
  );
}
