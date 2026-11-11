import { afterEach, expect, test, vi } from "vitest";
import { api, ApiError } from "./api";
import { readAll, view } from "./near";

const reply = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

test("api parses an error into ApiError with the shared message", async () => {
  vi.stubGlobal("fetch", reply(429, { error: { code: "E_RATE_LIMIT", message: "x" } }));
  const error = await api("/invites").catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status: 429, code: "E_RATE_LIMIT", retryable: true });
  expect((error as ApiError).message).toBe("Please wait before trying again.");
});

test("api treats a 404 on the 'nothing yet' routes as null", async () => {
  vi.stubGlobal("fetch", reply(404, { error: { code: "E_NOT_FOUND", message: "x" } }));
  await expect(api("/applications/me")).resolves.toBeNull();
  await expect(api("/invites/abc")).rejects.toMatchObject({ code: "E_NOT_FOUND" });
});

test("api sends JSON through the proxy", async () => {
  const fetch = reply(200, { ok: true });
  vi.stubGlobal("fetch", fetch);
  await api("/credit/review", { body: {} });
  expect(fetch).toHaveBeenCalledWith(
    "/api/credit/review",
    expect.objectContaining({ method: "POST", body: "{}" }),
  );
});

test("view decodes the result bytes and surfaces contract errors", async () => {
  const bytes = [...new TextEncoder().encode('{"cash":"5"}')];
  vi.stubGlobal("fetch", reply(200, { result: { result: bytes } }));
  await expect(view("get_pool")).resolves.toEqual({ cash: "5" });
  vi.stubGlobal("fetch", reply(200, { result: { error: "wasm execution failed" } }));
  await expect(view("get_pool")).rejects.toThrow("wasm execution failed");
});

test("readAll pages by 50 until a short page", async () => {
  const page = vi.fn(async (from: number) => (from < 100 ? Array(50).fill(from) : [1]));
  expect(await readAll(page)).toHaveLength(101);
  expect(page.mock.calls.map(([from]) => from)).toEqual([0, 50, 100]);
});
