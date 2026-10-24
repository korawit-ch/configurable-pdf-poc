import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  App as AntApp,
  ConfigProvider,
  Layout,
  Menu,
  Tag,
  Typography,
  theme,
} from "antd";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { FileText, LayoutTemplate, Settings, ShieldCheck } from "lucide-react";
import {
  standardTemplate,
  demoDraft,
} from "./features/contracts/domain/fixtures";
import type {
  CreateContractRequest,
  TemplateRecord,
  TemplateValues,
} from "./features/contracts/domain/contracts";
import { TemplateEditor } from "./features/contracts/components/TemplateEditor";
import { ContractWizard } from "./features/contracts/components/ContractWizard";
import { SubmissionReview } from "./features/contracts/components/SubmissionReview";
import "./styles.css";
function Workspace() {
  const [template, setTemplate] = useState<TemplateRecord>(
      structuredClone(standardTemplate),
    ),
    [draft, setDraft] = useState(structuredClone(demoDraft)),
    [request, setRequest] = useState<CreateContractRequest | null>(null);
  const navigate = useNavigate(),
    location = useLocation();
  const editor = location.pathname.startsWith("/settings");
  function save(values: TemplateValues) {
    setTemplate((prev) => ({
      ...values,
      id: prev.id,
      merchantId: prev.merchantId,
      version: prev.version + 1,
      status: prev.status,
    }));
  }
  return (
    <Layout className="workspace">
      <Layout.Sider
        width={210}
        breakpoint="lg"
        collapsedWidth={64}
        className="sidebar"
      >
        <a className="workspace-brand" href="/settings/contract-templates">
          <span className="logo-mark">P</span>
          <span>PDF Prototype</span>
        </a>
        <div className="sidebar-caption">WORKSPACE</div>
        <Menu
          mode="inline"
          selectedKeys={[editor ? "templates" : "contracts"]}
          onClick={({ key }) =>
            navigate(
              key === "templates"
                ? "/settings/contract-templates"
                : "/contracts/new",
            )
          }
          items={[
            {
              key: "contracts",
              icon: <FileText size={17} />,
              label: "Contracts",
            },
            { type: "divider" },
            {
              key: "templates",
              icon: <LayoutTemplate size={17} />,
              label: "Contract Templates",
            },
          ]}
        />
        <div className="sidebar-user">
          <ShieldCheck size={18} />
          <span>
            {editor ? "Template Admin" : "Demo Staff"}
            <small>
              {editor ? "Template configuration" : "Staff · Main Branch"}
            </small>
          </span>
        </div>
      </Layout.Sider>
      <Layout>
        <Layout.Header className="workspace-header">
          <div>
            <Settings size={15} />
            <Typography.Text strong>
              {editor ? "Contract Templates" : "Create Contract"}
            </Typography.Text>
          </div>
          <Tag>PROTOTYPE</Tag>
        </Layout.Header>
        <Layout.Content>
          <Routes>
            <Route
              path="/settings/contract-templates"
              element={
                <TemplateEditor
                  template={template}
                  onSave={save}
                  onUse={() => navigate("/contracts/new")}
                />
              }
            />
            <Route
              path="/contracts/new"
              element={
                <ContractWizard
                  template={template}
                  draft={draft}
                  onChange={setDraft}
                  onReview={setRequest}
                />
              }
            />
            <Route
              path="/contracts/new/review"
              element={<SubmissionReview request={request} />}
            />
            <Route
              path="*"
              element={<Navigate to="/settings/contract-templates" replace />}
            />
          </Routes>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 7,
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
          fontSize: 13,
          colorBgLayout: "#f6f7f9",
          colorText: "#262b33",
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <Workspace />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
