# Integration guide

Use the prototype as a feature module inside an existing React application. Keep the host application’s providers, theme, routing, authentication, and HTTP client.

## Files and dependencies

Copy `src/features/contracts/` into your feature directory and `public/fonts/` into your public assets. Include the feature styles from `src/styles.css`, adapting or scoping them to fit the host application. The standalone layout in `src/main.tsx` is optional.

Required libraries are listed in `package.json`. Reuse existing compatible React, Ant Design, React Router, dayjs, and Zod dependencies instead of installing duplicate versions.

## Components

| Component | Purpose |
| --- | --- |
| `TemplateEditor` | Edit document content, sections, financing, and penalty settings |
| `PdfPreview` | Display the generated PDF and download the same bytes |
| `ContractWizard` | Demonstrate collecting device, financing, document, and customer data |
| `SubmissionReview` | Inspect the serialized request and exercise an injected API adapter |

Replace fictional fixtures with your application’s data. `DocumentContext` supplies company details, contract number, bank details, a logo, and optional identity/QR images.

## Model and serialization

Required sections are `parties`, `asset`, `paymentTerms`, and `legal`. Optional sections are `schedule`, `nationalId`, `paymentSystem`, and `commission`. Their ordered `{ key, visible }[]` array controls the printed body. Headers and signature footers repeat on each US Legal page.

`toTemplateRequest(values)` maps editor values to nested template data and omits irrelevant financing and penalty fields. `templateSnapshot(template)` creates an independent copy of the version and terms used by a contract.

`toContractRequest(draft, template)` produces a JSON-safe envelope containing:

- Schema version, currency, company/branch IDs, date, and submission intent.
- Device/customer data and uploaded-media file IDs.
- Template ID/version, wording, penalty, ordered sections, and commission.
- Financial amounts in integer minor units and an unpaid payment schedule.
- An explicit unsigned status.

No React state objects, files, image data URLs, or PDF schemas are included in the request.

## API adapter

Replace `demoContractsApi` with an implementation of `ContractsApi` using your application’s HTTP client. Align the response type and DTO field names with your backend specification. Endpoint paths are intentionally not assumed. Make the template save callback await the server response before showing a successful save in a production integration.

The backend should validate authorization, company/branch membership, template version, device availability, and media references. Load authoritative pricing and recalculate financial values and schedules server-side. Generate final contract numbers and lifecycle/audit fields on the backend. Use a transaction and idempotency key for submission.

## Financial example

Template thresholds use baht; transaction fields ending in `Minor` use satang. The example policy rounds each monthly installment up to a whole baht and exposes the resulting adjustment so the contract total equals the sum of the schedule.

For a ฿50,900 device, 10% down, and 12 months at 1.75% flat monthly interest:

- Down payment: ฿5,090; financed principal: ฿45,810.
- Interest: ฿9,620.10; theoretical financed total: ฿55,430.10.
- Rounded installments: ฿4,620 × 12 = ฿55,440.
- Rounding adjustment: ฿9.90; total including the deposit: ฿60,530.

Choose and approve the rounding policy for your application before production use. All sample schedule entries remain unpaid until an actual payment is recorded.

## Rendering and assets

The renderer builds trusted pdfme JSX from structured content; do not evaluate user-supplied JSX. Ordinary sections are measured and kept together when possible. Long text and tables can flow across pages.

Supply authorized image data in `DocumentContext.assets` for ID photos, owner photos, and payment/contact QR codes. The sample renders empty placeholders when these are absent. Signature lines do not constitute electronic signatures or consent.

Keep the bundled font licenses when distributing the fonts. Validate shaping, wrapping, page breaks, permitted input lengths, and localization against your own documents.
