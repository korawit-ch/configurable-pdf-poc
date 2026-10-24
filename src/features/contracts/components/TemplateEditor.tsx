import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Collapse,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ArrowDown,
  ArrowUp,
  Braces,
  Check,
  LockKeyhole,
  Plus,
  Trash2,
} from "lucide-react";
import {
  sectionDefinitions,
  templateSchema,
  toTemplateRequest,
} from "../domain/contracts";
import type {
  ContractDraft,
  Section,
  SectionKey,
  TemplateRecord,
  TemplateValues,
} from "../domain/contracts";
import { demoDraft } from "../domain/fixtures";
import { download } from "../lib/pdf";
import { PdfPreview } from "./PdfPreview";
interface Props {
  template: TemplateRecord;
  onSave: (values: TemplateValues) => void;
  onUse: () => void;
}
function SectionList({
  value = [],
  onChange,
  onPointAt,
}: {
  value?: Section[];
  onChange?: (value: Section[]) => void;
  onPointAt: (key: SectionKey | null) => void;
}) {
  function move(index: number, delta: number) {
    const next = [...value];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange?.(next);
    onPointAt(next[index + delta].key);
  }
  return (
    <div onMouseLeave={() => onPointAt(null)}>
      {value.map((s, i) => (
        <div
          className="section-row"
          key={s.key}
          onMouseEnter={() => onPointAt(s.key)}
          onFocus={() => onPointAt(s.key)}
        >
          <Space size={0}>
            <Button
              type="text"
              size="small"
              aria-label={`Move ${sectionDefinitions[s.key].label} up`}
              disabled={i === 0}
              icon={<ArrowUp size={15} />}
              onClick={() => move(i, -1)}
            />
            <Button
              type="text"
              size="small"
              aria-label={`Move ${sectionDefinitions[s.key].label} down`}
              disabled={i === value.length - 1}
              icon={<ArrowDown size={15} />}
              onClick={() => move(i, 1)}
            />
          </Space>
          <span className={!s.visible ? "muted" : ""}>
            {sectionDefinitions[s.key].label}
          </span>
          {sectionDefinitions[s.key].required ? (
            <Typography.Text type="secondary" className="required-label">
              <LockKeyhole size={11} /> Required
            </Typography.Text>
          ) : (
            <Switch
              size="small"
              aria-label={`Show ${sectionDefinitions[s.key].label}`}
              checked={s.visible}
              onChange={(visible) => {
                onChange?.(
                  value.map((x) => (x.key === s.key ? { ...x, visible } : x)),
                );
                onPointAt(visible ? s.key : null);
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
export function TemplateEditor({ template, onSave, onUse }: Props) {
  const [form] = Form.useForm<TemplateValues>();
  const [values, setValues] = useState<TemplateValues>(
    structuredClone(template),
  );
  const [active, setActive] = useState<SectionKey | null>(null),
    [json, setJson] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [saved, setSaved] = useState(false);
  const [sampleTerm, setSampleTerm] = useState(12);
  const previewDraft = useMemo<ContractDraft>(
    () => ({
      ...structuredClone(demoDraft),
      financing: {
        termMonths:
          values.type === "fixed_rate"
            ? (values.fixedRateTerms.find((t) => t.months === sampleTerm)
                ?.months ??
              values.fixedRateTerms[0]?.months ??
              12)
            : sampleTerm,
        downPaymentPercent: Math.max(
          values.minDownPaymentPercent,
          Math.min(20, values.maxDownPaymentPercent),
        ),
        totalPaymentMinor: values.type === "free_rate" ? 6000000 : undefined,
      },
    }),
    [values, sampleTerm],
  );
  function save() {
    void form
      .validateFields()
      .then(() => {
        const checked = templateSchema.safeParse(form.getFieldsValue(true));
        if (!checked.success) {
          setError(
            checked.error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("\n"),
          );
          form.setFields(
            checked.error.issues.map((i) => ({
              name: i.path as Parameters<
                typeof form.setFields
              >[0][number]["name"],
              errors: [i.message],
            })),
          );
          return;
        }
        onSave(checked.data);
        setValues(checked.data);
        setError("");
        setDirty(false);
        setSaved(true);
        message.success("Template saved in this demo session");
      })
      .catch(() => setError("Check the highlighted fields before saving."));
  }
  const numeric = (
    label: string,
    name: string | string[],
    options: { min?: number; max?: number; step?: number } = {},
  ) => (
    <Form.Item
      label={label}
      name={name}
      rules={[{ required: true, message: "Required" }]}
    >
      <InputNumber
        style={{ width: "100%" }}
        min={options.min ?? 0}
        max={options.max}
        step={options.step ?? 1}
      />
    </Form.Item>
  );
  const items = [
    {
      key: "details",
      label: "Details",
      children: (
        <>
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input placeholder="e.g. Standard Fixed Rate" maxLength={120} />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input placeholder="Shown in the template list" maxLength={500} />
          </Form.Item>
          <Form.Item label="Type" name="type">
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              options={[
                { value: "fixed_rate", label: "Fixed Rate" },
                { value: "free_rate", label: "Free Rate (Easy Mode)" },
              ]}
            />
          </Form.Item>
          <div className="field-pair">
            {numeric("Min Down Payment (%)", "minDownPaymentPercent", {
              max: 100,
            })}
            {numeric("Max Down Payment (%)", "maxDownPaymentPercent", {
              max: 100,
            })}
          </div>
          {numeric("Max Loan Amount (฿)", "maxLoanAmount", {
            min: 1,
            step: 1000,
          })}
          {values.type === "free_rate" ? (
            numeric("Max Payment Amount (฿)", "maxPaymentAmount", {
              min: 1,
              step: 1000,
            })
          ) : (
            <Form.Item label="Payment Terms & Rates">
              <Form.List name="fixedRateTerms">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field) => (
                      <div className="term-row" key={field.key}>
                        <Form.Item
                          name={[field.name, "months"]}
                          rules={[
                            { required: true, message: "Months required" },
                          ]}
                        >
                          <InputNumber
                            aria-label={`Months for term ${field.name + 1}`}
                            min={1}
                            max={60}
                            addonAfter="mo"
                          />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "ratePercent"]}
                          rules={[{ required: true, message: "Rate required" }]}
                        >
                          <InputNumber
                            aria-label={`Rate for term ${field.name + 1}`}
                            min={0}
                            max={100}
                            step={0.05}
                            addonAfter="%/mo"
                          />
                        </Form.Item>
                        <Button
                          type="text"
                          danger
                          aria-label={`Remove term ${field.name + 1}`}
                          icon={<Trash2 size={15} />}
                          onClick={() => remove(field.name)}
                        />
                      </div>
                    ))}
                    <Button
                      block
                      type="dashed"
                      disabled={fields.length >= 12}
                      icon={<Plus size={14} />}
                      onClick={() => add({ months: 6, ratePercent: 1.5 })}
                    >
                      Add Term
                    </Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
          )}
        </>
      ),
    },
    {
      key: "penalty",
      label: "Penalty",
      children: (
        <>
          <Typography.Paragraph type="secondary">
            Copied onto each new contract. Later template edits never change an
            existing contract.
          </Typography.Paragraph>
          <Form.Item label="Penalty Type" name={["penalty", "type"]}>
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              options={[
                { value: "fixed_rate", label: "Fixed Rate (%/mo)" },
                { value: "fixed_fee", label: "Fixed Fee (THB/mo)" },
              ]}
            />
          </Form.Item>
          {values.penalty.type === "fixed_rate"
            ? numeric("Penalty Rate (%/mo)", ["penalty", "ratePercent"], {
                max: 100,
                step: 0.1,
              })
            : numeric("Penalty Flat Fee (฿/mo)", ["penalty", "flatFeeAmount"])}
          <div className="field-pair">
            {numeric("Grace Period (days)", ["penalty", "graceDays"], {
              max: 365,
            })}
            {numeric("Max Penalty Cap (฿)", ["penalty", "maxCap"])}
          </div>
          <Form.Item label="Penalty Legal Text" name={["penalty", "legalText"]}>
            <Input.TextArea rows={3} maxLength={12000} />
          </Form.Item>
        </>
      ),
    },
    {
      key: "content",
      label: "Content",
      children: (
        <>
          <Form.Item
            label="Template Title"
            name="title"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item
            label="Binding Statement"
            name="bindingStatement"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input.TextArea rows={4} maxLength={12000} />
          </Form.Item>
          <Form.Item
            label="Legal Declarations"
            name="legalDeclarations"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input.TextArea rows={5} maxLength={24000} />
          </Form.Item>
        </>
      ),
    },
    {
      key: "sections",
      label: "Sections",
      children: (
        <>
          <Typography.Paragraph type="secondary">
            What the printed contract shows, and in what order. The header stays
            first; signatures repeat in the page footer.
          </Typography.Paragraph>
          <Form.Item name="sections">
            <SectionList onPointAt={setActive} />
          </Form.Item>
          {values.sections.some((s) => s.key === "commission" && s.visible) && (
            <>
              {numeric(
                "Commission Rate (% of device price)",
                ["commission", "ratePercent"],
                { max: 100, step: 0.5 },
              )}
              <Form.Item label="Commission Text" name={["commission", "text"]}>
                <Input.TextArea rows={3} maxLength={2000} />
              </Form.Item>
            </>
          )}
        </>
      ),
    },
  ];
  let request: string;
  try {
    request = JSON.stringify(toTemplateRequest(values), null, 2);
  } catch {
    request = "Save a valid template to inspect its request body.";
  }
  return (
    <div className="editor-page">
      <div className="page-title">
        <div>
          <Typography.Text type="secondary">
            Settings / Contract Templates
          </Typography.Text>
          <Typography.Title level={3}>Configure your contract</Typography.Title>
          <Typography.Text type="secondary">
            Edit the template on the left. The right panel renders the actual
            PDF.
          </Typography.Text>
        </div>
        <Space>
          <Tag color={dirty ? "orange" : "green"}>
            {dirty
              ? "Unsaved changes"
              : saved
                ? "Saved for this session"
                : `Template v${template.version}`}
          </Tag>
          <Button icon={<Braces size={15} />} onClick={() => setJson(true)}>
            Payload
          </Button>
        </Space>
      </div>
      {error && (
        <Alert
          type="error"
          showIcon
          title="Template needs attention"
          description={<span style={{ whiteSpace: "pre-wrap" }}>{error}</span>}
          closable
          onClose={() => setError("")}
        />
      )}
      <div className="editor-layout">
        <div className="form-panel">
          <div className="form-panel-heading">
            <Typography.Text strong>Template configuration</Typography.Text>
            <Tag>ADMIN</Tag>
          </div>
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={values}
            onValuesChange={(_, all) => {
              setValues(all);
              setDirty(true);
              setSaved(false);
              setError("");
            }}
          >
            <Collapse
              defaultActiveKey={["details", "penalty", "content", "sections"]}
              ghost
              items={items}
            />
          </Form>
        </div>
        <div className="preview-wrapper">
          <div className="sample-controls">
            <Typography.Text type="secondary">
              Sample contract data · preview only
            </Typography.Text>
            <Select
              aria-label="Sample payment term"
              size="small"
              value={previewDraft.financing.termMonths}
              onChange={setSampleTerm}
              options={(values.type === "fixed_rate"
                ? values.fixedRateTerms.map((t) => t.months)
                : [3, 6, 12, 24]
              ).map((months) => ({ label: `${months} months`, value: months }))}
            />
          </div>
          <PdfPreview
            values={values}
            draft={previewDraft}
            activeSection={active}
          />
        </div>
      </div>
      <div className="editor-actions">
        <Typography.Text type="secondary">
          Template changes are held in memory for this prototype.
        </Typography.Text>
        <Space>
          <Button type="primary" icon={<Check size={15} />} onClick={save}>
            Save template
          </Button>
          <Button disabled={dirty} onClick={onUse}>
            Use in staff contract →
          </Button>
        </Space>
      </div>
      <Drawer
        title="Template request payload"
        width={650}
        open={json}
        onClose={() => setJson(false)}
        extra={
          <Button
            disabled={request[0] !== "{"}
            onClick={() =>
              download(request, "template-request.json", "application/json")
            }
          >
            Download JSON
          </Button>
        }
      >
        <Alert
          title="Proposed API adapter"
          description="Template settings are exported as nested penalty and commission objects. No backend request is sent by the demo."
          type="info"
        />
        <pre className="json-code">{request}</pre>
      </Drawer>
    </div>
  );
}
