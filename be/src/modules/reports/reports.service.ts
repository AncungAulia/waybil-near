import type {
  Principal,
  Shipment,
  Destination,
  ReportInput,
  ReportSaved,
  ReportDetail,
} from "@waybil/shared";
import type { Store } from "../../types/db";
import type { Chain } from "../../lib/near";
import type { Leases } from "../../lib/leases";
import { allowed, ApiException, conflict, requireValue, unavailable } from "../../lib/errors";
import { inspectFile, sha256, type FileStore, type StoredFile } from "../../lib/storage";

export interface ReportPhoto extends StoredFile {
  id: string;
  shipmentId: number;
  reportHash: string;
  position: number;
  ready: boolean;
}
export interface ReportRecord extends ReportInput {
  warehouseId: string;
  reportHash: string;
  canonical: string;
  photoIds: string[];
  state: "uploading" | "ready";
  createdAt: string;
}
export function canonicalReport(
  input: ReportInput,
  warehouseId: string,
  photos: Array<Pick<StoredFile, "sha256" | "mime" | "size">>,
) {
  return JSON.stringify({
    version: 1,
    shipmentId: input.shipmentId,
    warehouseId,
    goodQty: input.goodQty,
    reasons: [...new Set(input.reasons)].sort(),
    note: input.note.trim().normalize("NFC"),
    photos: photos.map((p) => ({ sha256: p.sha256, mime: p.mime, size: p.size })),
  });
}
export class Reports {
  constructor(
    private store: Store,
    private chain: Chain,
    private files: FileStore,
    private leases: Leases,
  ) {}
  async create(actor: Principal, input: ReportInput, uploads: Uint8Array[]): Promise<ReportSaved> {
    allowed(actor.role === "warehouse" && actor.authMethod === "google");
    if (uploads.length > 5) throw new ApiException(400, "E_VALIDATION");
    return this.leases.run(`report:${input.shipmentId}`, async () => {
      const shipment = requireValue(
        await this.chain.view<Shipment | null>("get_shipment", { id: input.shipmentId }),
      );
      const destination = requireValue(
        await this.chain.view<Destination | null>("get_destination", { id: shipment.destination }),
      );
      allowed(destination.warehouse === actor.accountId);
      if (input.goodQty > shipment.qty) throw new ApiException(400, "E_VALIDATION");
      const photos = await Promise.all(uploads.map((bytes) => inspectFile(bytes, true)));
      const canonical = canonicalReport(input, actor.accountId, photos);
      const reportHash = sha256(canonical);
      const id = String(input.shipmentId);
      let row = await this.store.get<ReportRecord>("reports", id);
      if (row && row.value.reportHash !== reportHash) conflict();
      if (row?.value.state === "ready") {
        await this.integrity(row.value);
        this.chainMatch(shipment, reportHash);
        return this.saved(input.shipmentId, input.goodQty, reportHash);
      }
      if (shipment.status !== "PickedUp")
        throw new ApiException(
          409,
          "E_ALREADY_CONFIRMED",
          "This delivery has already been confirmed.",
        );
      if (!row)
        row = await this.store.insert("reports", id, {
          ...input,
          reasons: [...new Set(input.reasons)].sort(),
          note: input.note.trim().normalize("NFC"),
          warehouseId: actor.accountId,
          reportHash,
          canonical,
          photoIds: photos.map((_p, position) => sha256(`${reportHash}:${position}`)),
          state: "uploading",
          createdAt: new Date().toISOString(),
        } satisfies ReportRecord);
      for (let position = 0; position < photos.length; position++) {
        const photoId = row.value.photoIds[position]!;
        let photo = await this.store.get<ReportPhoto>("report_photos", photoId);
        if (!photo)
          photo = await this.store.insert("report_photos", photoId, {
            ...photos[position]!,
            id: photoId,
            path: `${actor.accountId}/${photoId}.${photos[position]!.path.split(".").at(-1)}`,
            shipmentId: input.shipmentId,
            reportHash,
            position,
            ready: false,
          } satisfies ReportPhoto);
        if (!photo.value.ready) {
          await this.files.put(
            "report-photos",
            photo.value.path,
            uploads[position]!,
            photo.value.mime,
          );
          await this.store.replace<ReportPhoto>("report_photos", photoId, photo.version, {
            ...photo.value,
            ready: true,
          });
        }
      }
      await this.store.replace<ReportRecord>("reports", id, row.version, {
        ...row.value,
        state: "ready",
      });
      return this.saved(input.shipmentId, input.goodQty, reportHash);
    });
  }
  async read(actor: Principal, id: number): Promise<ReportDetail> {
    const shipment = requireValue(await this.chain.view<Shipment | null>("get_shipment", { id }));
    const destination = requireValue(
      await this.chain.view<Destination | null>("get_destination", { id: shipment.destination }),
    );
    const participant = [shipment.shipper, shipment.driver, destination.warehouse].includes(
      actor.accountId,
    );
    allowed(
      participant || (await this.chain.view<boolean>("is_member", { account_id: actor.accountId })),
    );
    const { value } = requireValue(await this.store.get<ReportRecord>("reports", String(id)));
    if (value.state !== "ready") unavailable();
    const storedPhotos = await this.integrity(value);
    this.chainMatch(shipment, value.reportHash);
    const photos = [];
    for (const photo of storedPhotos) {
      photos.push({
        sha256: photo.sha256,
        mime: photo.mime,
        size: photo.size,
        signedUrl: await this.files.sign("report-photos", photo.path),
      });
    }
    return {
      shipmentId: id,
      warehouseId: value.warehouseId,
      goodQty: value.goodQty,
      reasons: value.reasons,
      note: value.note,
      reportHash: value.reportHash,
      recorded: shipment.report_hash === value.reportHash,
      photos,
    };
  }
  async validateConfirmation(shipment: Shipment, hash: string, goodQty: number): Promise<void> {
    const { value } = requireValue(
      await this.store.get<ReportRecord>("reports", String(shipment.id)),
    );
    const destination = requireValue(
      await this.chain.view<Destination | null>("get_destination", { id: shipment.destination }),
    );
    allowed(
      value.state === "ready" &&
        value.reportHash === hash &&
        value.goodQty === goodQty &&
        value.warehouseId === destination.warehouse,
    );
    await this.integrity(value);
  }
  private async integrity(report: ReportRecord): Promise<ReportPhoto[]> {
    const photos: ReportPhoto[] = [];
    for (let i = 0; i < report.photoIds.length; i++) {
      const photo = requireValue(
        await this.store.get<ReportPhoto>("report_photos", report.photoIds[i]!),
      ).value;
      allowed(photo.ready && photo.reportHash === report.reportHash && photo.position === i);
      photos.push(photo);
    }
    if (
      canonicalReport(report, report.warehouseId, photos) !== report.canonical ||
      sha256(report.canonical) !== report.reportHash
    )
      throw new ApiException(
        409,
        "E_REPORT_INTEGRITY",
        "This report does not match the saved proof.",
      );
    return photos;
  }
  private chainMatch(shipment: Shipment, hash: string) {
    if (shipment.report_hash && shipment.report_hash !== hash)
      throw new ApiException(
        409,
        "E_REPORT_INTEGRITY",
        "This report does not match the delivery record.",
      );
  }
  private saved(id: number, goodQty: number, hash: string): ReportSaved {
    return { reportHash: hash, confirmArgs: { id, good_qty: goodQty, report_hash: hash } };
  }
}
