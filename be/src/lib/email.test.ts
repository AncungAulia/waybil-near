import { it, expect, vi } from "vitest";
import { Emails, EmailFailure, ResendTransport } from "./email";
import { MemoryStore, MemoryLeases, testEnv } from "../test/support";

const message = { to: "sample@example.com", subject: "Sample message", text: "This is a test." };
it("deduplicates successful sends and retries ambiguous requests only inside the provider window", async () => {
  const store = new MemoryStore();
  const send = vi.fn().mockRejectedValueOnce(new EmailFailure(true)).mockResolvedValue("sample-id");
  let now = Date.now();
  const emails = new Emails(store, { enabled: () => true, send }, new MemoryLeases(), () => now);
  const event = await emails.queue("test-event", message);
  expect((await emails.deliver(event.id)).state).toBe("failed");
  expect((await emails.deliver(event.id)).state).toBe("sent");
  await emails.deliver(event.id);
  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls[0]![1]).toBe(send.mock.calls[1]![1]);
  send.mockRejectedValueOnce(new EmailFailure(true));
  const other = await emails.queue("ambiguous-event", message);
  await emails.deliver(other.id);
  now += 23 * 3600000;
  expect((await emails.deliver(other.id)).state).toBe("uncertain");
  expect(send).toHaveBeenCalledTimes(3);
});
it("keeps unconfigured email queued and sends the actual Resend idempotency header", async () => {
  const env = testEnv();
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify({ id: "sample-provider-id" }), { status: 200 }));
  const transport = new ResendTransport(env, request);
  const emails = new Emails(new MemoryStore(), transport, new MemoryLeases());
  const event = await emails.queue("sample", message);
  expect((await emails.deliver(event.id)).attempts).toBe(0);
  expect(request).not.toHaveBeenCalled();
  env.EMAIL_API_KEY = "sample-test-key";
  env.EMAIL_FROM = "sample@example.com";
  expect((await emails.deliver(event.id)).state).toBe("sent");
  expect(request.mock.calls[0]![1]!.headers).toMatchObject({ "Idempotency-Key": event.id });
});
it("suppresses stale queued mail and preserves uncertainty after any ambiguous attempt", async () => {
  const store = new MemoryStore();
  const send = vi
    .fn()
    .mockRejectedValueOnce(new EmailFailure(true))
    .mockRejectedValueOnce(new EmailFailure(false));
  let now = Date.now();
  const emails = new Emails(store, { enabled: () => true, send }, new MemoryLeases(), () => now);
  const cancelled = await emails.queue("stale-reminder", message);
  expect((await emails.deliver(cancelled.id, async () => false)).error).toBe("E_EMAIL_CANCELLED");
  await emails.deliver(cancelled.id);
  expect(send).not.toHaveBeenCalled();
  const ambiguous = await emails.queue("uncertain-late-mail", message);
  await emails.deliver(ambiguous.id);
  expect((await emails.deliver(ambiguous.id)).ambiguous).toBe(true);
  now += 23 * 3600000;
  expect((await emails.deliver(ambiguous.id)).state).toBe("uncertain");
  expect(send).toHaveBeenCalledTimes(2);
  expect((await emails.cancel(ambiguous.id)).state).toBe("uncertain");
});
