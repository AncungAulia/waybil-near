import { randomUUID, createHash } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiException, unavailable } from "./errors";

export type Bucket = "documents" | "report-photos";
export interface StoredFile {
  path: string;
  mime: string;
  size: number;
  sha256: string;
}
export interface FileStore {
  put(bucket: Bucket, path: string, bytes: Uint8Array, mime: string): Promise<void>;
  read(bucket: Bucket, path: string): Promise<Uint8Array>;
  remove(bucket: Bucket, path: string): Promise<void>;
  sign(bucket: Bucket, path: string): Promise<string>;
}
export const sha256 = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
export async function inspectFile(bytes: Uint8Array, photoOnly = false): Promise<StoredFile> {
  if (bytes.length > 2097152) throw new ApiException(413, "E_TOO_LARGE");
  let mime: string | undefined;
  try {
    mime = (await fileTypeFromBuffer(bytes))?.mime;
  } catch {
    mime = undefined;
  }
  const accepted = photoOnly
    ? ["image/jpeg", "image/png"]
    : ["application/pdf", "image/jpeg", "image/png"];
  if (!mime || !accepted.includes(mime))
    throw new ApiException(
      400,
      "E_FILE_TYPE",
      photoOnly ? "Use a JPG or PNG photo." : "Use a PDF, JPG or PNG file.",
    );
  const ext = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";
  return { path: `${randomUUID()}.${ext}`, mime, size: bytes.length, sha256: sha256(bytes) };
}
export class PrivateFiles implements FileStore {
  constructor(private client: SupabaseClient | null) {}
  private bucket(name: Bucket) {
    return (this.client ?? unavailable()).storage.from(name);
  }
  private check(error: unknown) {
    if (error)
      throw new ApiException(503, "E_STORAGE", "Your file could not be saved. Please try again.");
  }
  async put(bucket: Bucket, path: string, bytes: Uint8Array, mime: string) {
    const { error } = await this.bucket(bucket).upload(path, bytes, {
      contentType: mime,
      upsert: true,
    });
    this.check(error);
  }
  async read(bucket: Bucket, path: string) {
    const { data, error } = await this.bucket(bucket).download(path);
    this.check(error);
    if (!data) unavailable();
    return new Uint8Array(await data.arrayBuffer());
  }
  async remove(bucket: Bucket, path: string) {
    const { error } = await this.bucket(bucket).remove([path]);
    this.check(error);
  }
  async sign(bucket: Bucket, path: string) {
    const { data, error } = await this.bucket(bucket).createSignedUrl(path, 300);
    this.check(error);
    return data?.signedUrl ?? unavailable();
  }
}
