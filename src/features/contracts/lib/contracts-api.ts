import type { CreateContractRequest } from "../domain/contracts";
export interface CreateContractResponse {
  id: string;
  status: "pending_approval";
  mode: "demo";
}
export interface ContractsApi {
  createContract(
    request: CreateContractRequest,
  ): Promise<CreateContractResponse>;
}
// Dependency injection point. Replace this adapter with your application’s HTTP client once its API contract is available.
export const demoContractsApi: ContractsApi = {
  async createContract(request) {
    if (
      request.intent !== "submit_for_approval" ||
      request.signatureStatus !== "unsigned"
    )
      throw new Error("Invalid draft transition");
    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      id: `demo-${crypto.randomUUID()}`,
      status: "pending_approval",
      mode: "demo",
    };
  },
};
