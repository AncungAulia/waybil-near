import { logError } from "./logger";
import type { Env } from "../config/env";
import type { Store } from "../types/db";
import type { Leases } from "./leases";
import { sha256 } from "./storage";
import { conflict, requireValue } from "./errors";
import { assertLeases } from "./lease-context";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}
export interface EmailRecord {
  id: string;
  key: string;
  message: EmailMessage;
  state: "queued" | "sending" | "sent" | "failed" | "uncertain";
  attempts: number;
  firstAttemptAt: string | null;
  lastAttemptAt: string | null;
  ambiguous: boolean;
  providerId: string | null;
  error: string | null;
}
export interface EmailTransport {
  enabled(): boolean;
  send(message: EmailMessage, id: string): Promise<string>;
}
export class EmailFailure extends Error {
  constructor(
    public ambiguous: boolean,
    public retryable = ambiguous,
  ) {
    super("Email delivery failed.");
  }
}
export class ResendTransport implements EmailTransport {
  constructor(
    private env: Env,
    private request = fetch,
  ) {}
  enabled() {
    return Boolean(this.env.EMAIL_API_KEY && this.env.EMAIL_FROM);
  }
  async send(message: EmailMessage, id: string) {
    assertLeases();
    let response: Response;
    try {
      response = await this.request("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Bearer ${this.env.EMAIL_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": id,
        },
        body: JSON.stringify({
          from: this.env.EMAIL_FROM,
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }),
      });
    } catch {
      throw new EmailFailure(true);
    }
    if (!response.ok)
      throw new EmailFailure(
        response.status >= 500 || response.status === 409 || response.status === 408,
        response.status >= 500 ||
          response.status === 409 ||
          response.status === 429 ||
          response.status === 408,
      );
    let data: { id?: string };
    try {
      data = (await response.json()) as { id?: string };
    } catch {
      throw new EmailFailure(true);
    }
    if (typeof data.id !== "string" || !data.id) throw new EmailFailure(true);
    return data.id;
  }
}
export class Emails {
  constructor(
    private store: Store,
    private transport: EmailTransport,
    private leases: Leases,
    private now = () => Date.now(),
  ) {}
  async queue(key: string, message: EmailMessage): Promise<EmailRecord> {
    const id = sha256(key);
    return this.leases.run(`email:${id}`, async () => {
      const existing = await this.store.get<EmailRecord>("email_log", id);
      if (existing) {
        if (JSON.stringify(existing.value.message) !== JSON.stringify(message)) conflict();
        return existing.value;
      }
      const value: EmailRecord = {
        id,
        key,
        message,
        state: "queued",
        attempts: 0,
        firstAttemptAt: null,
        lastAttemptAt: null,
        ambiguous: false,
        providerId: null,
        error: null,
      };
      return (await this.store.insert("email_log", id, value)).value;
    });
  }
  async deliver(
    id: string,
    eligible: () => Promise<boolean> = async () => true,
  ): Promise<EmailRecord> {
    return this.leases.run(`email:${id}`, async () => {
      let row = requireValue(await this.store.get<EmailRecord>("email_log", id));
      if (
        row.value.state === "sent" ||
        row.value.state === "uncertain" ||
        row.value.error === "E_EMAIL_CANCELLED" ||
        row.value.error === "E_EMAIL_PERMANENT" ||
        row.value.error === "E_EMAIL_RETRIES"
      )
        return row.value;
      if (!(await eligible())) return this.cancelRow(row);
      if (!this.transport.enabled()) return row.value;
      if (
        (row.value.ambiguous || row.value.state === "sending") &&
        row.value.firstAttemptAt &&
        this.now() - Date.parse(row.value.firstAttemptAt) >= 23 * 3600000
      )
        return (
          await this.store.replace<EmailRecord>("email_log", id, row.version, {
            ...row.value,
            state: "uncertain",
            error: "E_EMAIL_UNCERTAIN",
          })
        ).value;
      if (row.value.attempts >= 5)
        return (
          await this.store.replace<EmailRecord>("email_log", id, row.version, {
            ...row.value,
            state: row.value.ambiguous || row.value.state === "sending" ? "uncertain" : "failed",
            error: "E_EMAIL_RETRIES",
          })
        ).value;
      const previousAmbiguous = row.value.ambiguous || row.value.state === "sending";
      const at = new Date(this.now()).toISOString();
      row = await this.store.replace<EmailRecord>("email_log", id, row.version, {
        ...row.value,
        state: "sending",
        attempts: row.value.attempts + 1,
        firstAttemptAt: row.value.firstAttemptAt ?? at,
        lastAttemptAt: at,
        ambiguous: true,
        error: null,
      });
      let providerId: string;
      try {
        providerId = await this.transport.send(row.value.message, id);
      } catch (error) {
        logError("email_delivery", error, {
          code:
            error instanceof EmailFailure && !error.retryable
              ? "E_EMAIL_PERMANENT"
              : "E_EMAIL_SEND",
        });
        return (
          await this.store.replace<EmailRecord>("email_log", id, row.version, {
            ...row.value,
            state:
              previousAmbiguous && error instanceof EmailFailure && !error.retryable
                ? "uncertain"
                : "failed",
            ambiguous:
              previousAmbiguous || (error instanceof EmailFailure ? error.ambiguous : true),
            error:
              error instanceof EmailFailure && !error.retryable
                ? "E_EMAIL_PERMANENT"
                : "E_EMAIL_SEND",
          })
        ).value;
      }
      return (
        await this.store.replace<EmailRecord>("email_log", id, row.version, {
          ...row.value,
          state: "sent",
          providerId,
          ambiguous: false,
        })
      ).value;
    });
  }
  async cancel(id: string): Promise<EmailRecord> {
    return this.leases.run(`email:${id}`, async () => {
      const row = requireValue(await this.store.get<EmailRecord>("email_log", id));
      if (
        row.value.state === "sent" ||
        row.value.state === "uncertain" ||
        row.value.error === "E_EMAIL_CANCELLED"
      )
        return row.value;
      return this.cancelRow(row);
    });
  }
  private async cancelRow(row: { value: EmailRecord; version: number }) {
    const ambiguous = row.value.ambiguous || row.value.state === "sending";
    return (
      await this.store.replace<EmailRecord>("email_log", row.value.id, row.version, {
        ...row.value,
        state: ambiguous ? "uncertain" : "failed",
        error: ambiguous ? "E_EMAIL_SUPERSEDED" : "E_EMAIL_CANCELLED",
      })
    ).value;
  }
}
