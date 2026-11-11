import { expect, it, vi } from "vitest";
import { logError } from "./logger";
it("logs diagnostic metadata without exception text or arbitrary provider fields", () => {
  const output = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const error = Object.assign(new Error("private-token-and-document-content"), {
      code: "E_RPC",
      headers: { authorization: "private-key" },
    });
    logError("relay_reconcile", error, { route: "/relay", txHash: "test-hash" });
    const value = String(output.mock.calls[0]![0]);
    expect(JSON.parse(value)).toMatchObject({
      operation: "relay_reconcile",
      error: "Error",
      code: "E_RPC",
      txHash: "test-hash",
    });
    expect(value).not.toContain("private");
    expect(value).not.toContain("headers");
  } finally {
    output.mockRestore();
  }
});
