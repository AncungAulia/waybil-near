import { createHash } from "node:crypto";
import { encodeDelegateAction, type SignedDelegate } from "near-api-js";
import type { Principal, RelayResponse, Shipment, Destination } from "@waybil/shared";
import type { Store, Snapshot } from "../../types/db";
import type { Chain } from "../../lib/near";
import type { Leases } from "../../lib/leases";
import { allowed, ApiException, requireValue, unavailable } from "../../lib/errors";
import { parse } from "../../middlewares/validate";
import type { Identity } from "../auth/auth.service";
import { decodeDelegate, pickupArgs, deliveryArgs } from "./relay.schema";
import type { RelayProvider } from "./relay.provider";

interface RelayRecord extends RelayResponse {
  digest: string;
  accountId: string;
  bytes: string;
  failedAttempts?: Array<{ txHash: string; bytes: string }>;
}
export type ReportValidator = (shipment: Shipment, hash: string, goodQty: number) => Promise<void>;
export class RelayService {
  constructor(
    private store: Store,
    private chain: Chain,
    private provider: RelayProvider,
    private leases: Leases,
    private contract: string,
    private report: ReportValidator = async () => unavailable(),
  ) {}
  async relay(actor: Principal, encoded: string): Promise<RelayResponse> {
    allowed(actor.authMethod === "google" && ["driver", "warehouse"].includes(actor.role));
    const signed = decodeDelegate(encoded);
    allowed(signed.delegateAction.senderId === actor.accountId);
    this.signature(signed);
    const digest = createHash("sha256").update(Buffer.from(encoded, "base64")).digest("hex");
    return this.leases.run("signer:relayer", async () => {
      const existing = await this.store.get<RelayRecord>("relay_requests", digest);
      if (existing) return this.response(await this.reconcile(existing));
      await this.settlePending();
      await this.validate(actor, signed);
      const prepared = await this.provider.prepare(signed);
      const value: RelayRecord = {
        ...prepared,
        digest,
        accountId: actor.accountId,
        status: "pending",
        proofUrl: `https://testnet.nearblocks.io/txns/${prepared.txHash}`,
      };
      const row = await this.store.insert("relay_requests", digest, value);
      return this.response(await this.reconcile(row));
    });
  }
  async markLate(id: number): Promise<RelayResponse | null> {
    const digest = createHash("sha256").update(`waybil-job:mark-late:${id}`).digest("hex");
    return this.leases.run("signer:relayer", async () => {
      let existing = await this.store.get<RelayRecord>("relay_requests", digest);
      if (existing) {
        existing = await this.reconcile(existing);
        if (existing.value.status !== "failed") return this.response(existing);
      }
      await this.settlePending();
      const shipment = requireValue(await this.chain.view<Shipment | null>("get_shipment", { id }));
      if (shipment.status !== "Paid" || shipment.marked_late) return null;
      const prepared = await (this.provider.prepareLate?.(id) ?? unavailable());
      const value: RelayRecord = {
        ...prepared,
        digest,
        accountId: "internal:mark_late",
        ...(existing
          ? {
              failedAttempts: [
                ...(existing.value.failedAttempts ?? []),
                { txHash: existing.value.txHash, bytes: existing.value.bytes },
              ],
            }
          : {}),
        status: "pending",
        proofUrl: `https://testnet.nearblocks.io/txns/${prepared.txHash}`,
      };
      const row = existing
        ? await this.store.replace("relay_requests", digest, existing.version, value)
        : await this.store.insert("relay_requests", digest, value);
      return this.response(await this.reconcile(row));
    });
  }
  private async settlePending() {
    for (const pending of await this.store.list<RelayRecord>("relay_requests", {
      status: "pending",
    })) {
      if ((await this.reconcile(pending)).value.status === "pending")
        throw new ApiException(
          503,
          "E_RELAY_PENDING",
          "A delivery request is still being recorded. Please try again shortly.",
        );
    }
  }
  private signature(signed: SignedDelegate) {
    const hash = createHash("sha256").update(encodeDelegateAction(signed.delegateAction)).digest();
    if (!signed.delegateAction.publicKey.verify(hash, signed.signature.data))
      throw new ApiException(400, "E_SIGNATURE", "This delivery request could not be verified.");
  }
  private async validate(actor: Principal, signed: SignedDelegate) {
    const d = signed.delegateAction;
    allowed(d.receiverId === this.contract);
    const identity = requireValue(
      (await this.store.list<Identity>("auth_identities", { accountId: actor.accountId }))[0],
    );
    allowed(identity.value.ready && identity.value.devicePublicKey === d.publicKey.toString());
    const call = d.actions[0]!.functionCall!;
    const method = actor.role === "driver" ? "confirm_pickup" : "confirm_delivery";
    allowed(call.methodName === method);
    const key = await this.provider.access(signed);
    allowed(
      key.receiver === this.contract && key.methods.length === 1 && key.methods[0] === method,
    );
    if (
      d.nonce <= key.nonce ||
      d.maxBlockHeight <= key.height ||
      d.maxBlockHeight > key.height + 200n
    )
      throw new ApiException(
        409,
        "E_DELEGATE_EXPIRED",
        "Refresh this delivery request and try again.",
      );
    let raw: unknown;
    try {
      raw = JSON.parse(Buffer.from(call.args).toString("utf8"));
    } catch {
      throw new ApiException(400, "E_VALIDATION");
    }
    const args =
      call.methodName === "confirm_pickup" ? parse(pickupArgs, raw) : parse(deliveryArgs, raw);
    const shipment = requireValue(
      await this.chain.view<Shipment | null>("get_shipment", { id: args.id }),
    );
    if (method === "confirm_pickup") {
      allowed(shipment.driver === actor.accountId);
      allowed(shipment.status === "Approved");
    } else {
      const destination = requireValue(
        await this.chain.view<Destination | null>("get_destination", { id: shipment.destination }),
      );
      allowed(destination.warehouse === actor.accountId && shipment.status === "PickedUp");
      const delivery = parse(deliveryArgs, raw);
      if (delivery.good_qty > shipment.qty) throw new ApiException(400, "E_VALIDATION");
      if (delivery.good_qty !== shipment.qty || delivery.report_hash) {
        if (!delivery.report_hash)
          throw new ApiException(
            400,
            "E_REPORT_REQUIRED",
            "Save a problem report before confirming this delivery.",
          );
        await this.report(shipment, delivery.report_hash, delivery.good_qty);
      }
    }
  }
  private async reconcile(row: Snapshot<RelayRecord>): Promise<Snapshot<RelayRecord>> {
    if (row.value.status !== "pending") return row;
    let status: RelayResponse["status"];
    try {
      status =
        (await this.provider.status(row.value.txHash)) ??
        (await this.provider.broadcast(row.value.bytes));
    } catch {
      return row;
    }
    if (status === "pending") return row;
    return this.store.replace("relay_requests", row.value.digest, row.version, {
      ...row.value,
      status,
    });
  }
  private response(row: Snapshot<RelayRecord>): RelayResponse {
    return { txHash: row.value.txHash, status: row.value.status, proofUrl: row.value.proofUrl };
  }
}
