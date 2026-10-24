import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Result, Space, Tag, Typography } from "antd";
import type { CreateContractRequest } from "../domain/contracts";
import { thb } from "../domain/contracts";
import { demoContractsApi } from "../lib/contracts-api";
import type {
  ContractsApi,
  CreateContractResponse,
} from "../lib/contracts-api";
import { download } from "../lib/pdf";
export function SubmissionReview({
  request,
  api = demoContractsApi,
}: {
  request: CreateContractRequest | null;
  api?: ContractsApi;
}) {
  const navigate = useNavigate(),
    [sending, setSending] = useState(false),
    [result, setResult] = useState<CreateContractResponse | null>(null),
    [error, setError] = useState("");
  if (!request)
    return (
      <Result
        title="No contract ready for review"
        subTitle="Complete the staff flow to prepare a validated request."
        extra={
          <Button onClick={() => navigate("/contracts/new")}>
            Create contract
          </Button>
        }
      />
    );
  const body = JSON.stringify(request, null, 2);
  async function submit() {
    if (!request) return;
    setSending(true);
    setError("");
    try {
      setResult(await api.createContract(request));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="submission-page">
      <div className="page-title">
        <div>
          <Typography.Text type="secondary">
            Contracts / Submission review
          </Typography.Text>
          <Typography.Title level={3}>Ready for the backend</Typography.Title>
          <Typography.Text type="secondary">
            A frozen template snapshot and validated request, passed from the
            contract wizard.
          </Typography.Text>
        </div>
        <Tag color="orange">DEMO API ADAPTER</Tag>
      </div>
      {error && <Alert type="error" title={error} />}{" "}
      {result ? (
        <Result
          status="success"
          title="Demo submission accepted"
          subTitle={`Status: ${result.status}. This result is simulated; no backend was contacted.`}
          extra={
            <Space>
              <Button
                onClick={() =>
                  download(
                    body,
                    "create-contract-request.json",
                    "application/json",
                  )
                }
              >
                Download request JSON
              </Button>
              <Button onClick={() => navigate("/settings/contract-templates")}>
                Back to template editor
              </Button>
            </Space>
          }
        />
      ) : (
        <Alert
          type="info"
          showIcon
          title="Proposed request contract"
          description="Money uses integer satang. Authentication, merchant access, template version, device availability and financing must be validated again by the backend."
        />
      )}
      <div className="submission-grid">
        <Card title="Submission summary">
          <dl className="review-summary">
            <dt>Customer</dt>
            <dd>{request.customer.fullName}</dd>
            <dt>Template snapshot</dt>
            <dd>
              {request.template.templateName} · v
              {request.template.templateVersion}
            </dd>
            <dt>Sections</dt>
            <dd>
              {request.template.sections.filter((s) => s.visible).length}{" "}
              visible
            </dd>
            <dt>Payment schedule</dt>
            <dd>{request.schedule.length - 1} installments + down payment</dd>
            <dt>Total value</dt>
            <dd>{thb(request.financing.totalContractValueMinor)}</dd>
            <dt>Rounding adjustment</dt>
            <dd>{thb(request.financing.roundingAdjustmentMinor)}</dd>
            <dt>Signature</dt>
            <dd>{request.signatureStatus}</dd>
          </dl>
          <Space wrap>
            <Button onClick={() => navigate("/contracts/new")}>
              Back to contract
            </Button>
            <Button
              onClick={() =>
                download(
                  body,
                  "create-contract-request.json",
                  "application/json",
                )
              }
            >
              Download JSON
            </Button>
            <Button
              type="primary"
              disabled={!!result}
              loading={sending}
              onClick={submit}
            >
              Submit for Approval (demo)
            </Button>
          </Space>
        </Card>
        <Card title="CreateContractRequest">
          <pre className="json-code">{body}</pre>
        </Card>
      </div>
    </div>
  );
}
