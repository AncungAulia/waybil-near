import { expect, it, vi } from "vitest";
import type { JsonRpcProvider } from "near-api-js";
import { UnknownTransactionError } from "near-api-js/rpc-errors";
import { txStatus } from "./near-tx";

it("learns at once that a transaction is unknown, without waiting for FINAL", async () => {
  const view = vi.fn().mockRejectedValueOnce(new UnknownTransactionError("tx-hash" as never));
  const provider = { viewTransactionStatus: view } as unknown as JsonRpcProvider;
  expect(await txStatus(provider, "relayer.testnet", "tx-hash")).toBeNull();
  expect(view).toHaveBeenCalledTimes(1);
  expect(view.mock.calls[0]![0]).toMatchObject({ waitUntil: "NONE" });
});

it("waits for FINAL once the transaction is known", async () => {
  const final = { final_execution_status: "FINAL" };
  const view = vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce(final);
  const provider = { viewTransactionStatus: view } as unknown as JsonRpcProvider;
  expect(await txStatus(provider, "relayer.testnet", "tx-hash")).toBe(final);
  expect(view.mock.calls[1]![0]).toMatchObject({ waitUntil: "FINAL" });
});
