import { readFile, writeFile, mkdir } from "node:fs/promises";
import { buildPdf } from "../src/features/contracts/lib/pdf";
import {
  standardTemplate,
  demoDraft,
} from "../src/features/contracts/domain/fixtures";
import {
  toContractRequest,
  toTemplateRequest,
} from "../src/features/contracts/domain/contracts";
const font = await readFile(
  new URL("../public/fonts/ContractSans-Regular.ttf", import.meta.url),
);
const fontData = font.buffer.slice(
  font.byteOffset,
  font.byteOffset + font.byteLength,
) as ArrayBuffer;
const bold = await readFile(
  new URL("../public/fonts/ContractSans-Bold.ttf", import.meta.url),
);
const fonts = {
  regular: fontData,
  bold: bold.buffer.slice(
    bold.byteOffset,
    bold.byteOffset + bold.byteLength,
  ) as ArrayBuffer,
};
await mkdir("examples", { recursive: true });
const standard = await buildPdf(standardTemplate, demoDraft, fonts);
await writeFile("examples/hire-purchase-agreement.pdf", standard.bytes);
await writeFile(
  "examples/create-contract-request.json",
  JSON.stringify(toContractRequest(demoDraft, standardTemplate), null, 2),
);
await writeFile(
  "examples/template-request.json",
  JSON.stringify(toTemplateRequest(standardTemplate), null, 2),
);
const long = structuredClone(standardTemplate);
long.legalDeclarations =
  "The Lessee agrees to the conditions of this contract. ข้อตกลงและเงื่อนไขสัญญาเช่าซื้อ\n".repeat(
    140,
  );
long.fixedRateTerms = [{ months: 60, ratePercent: 1.75 }];
const d = structuredClone(demoDraft);
d.financing.termMonths = 60;
const stress = await buildPdf(long, d, fonts);
await writeFile("examples/long-60-month-contract.pdf", stress.bytes);
console.log(
  "Default and long-form Thai/English PDFs generated.",
  standard.bytes.length,
  stress.bytes.length,
);
