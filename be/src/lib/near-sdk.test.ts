import { createServer } from "node:http";
import { once } from "node:events";
import { expect, it, vi } from "vitest";
import { sdkProvider, rpcCall } from "./near-sdk";
import { testEnv } from "../test/support";

it("the real SDK sends a JSON-RPC request instead of exhausting zero attempts", async () => {
  let calls = 0;
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const part of req) body += part;
    const payload = JSON.parse(body);
    calls++;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result: { chain_id: "testnet" } }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error();
    const provider = sdkProvider({
      ...testEnv(),
      NEAR_RPC_URL: `http://127.0.0.1:${address.port}`,
    });
    expect(await provider.sendJsonRpc("status", {})).toMatchObject({ chain_id: "testnet" });
    expect(calls).toBe(1);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});
it("bounds a hung RPC operation", async () => {
  vi.useFakeTimers();
  try {
    const pending = expect(rpcCall(() => new Promise(() => {}))).rejects.toMatchObject({
      code: "E_RPC_TIMEOUT",
    });
    await vi.advanceTimersByTimeAsync(15000);
    await pending;
  } finally {
    vi.useRealTimers();
  }
});
