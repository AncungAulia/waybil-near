import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { unavailable } from "./errors";
export interface SealedKey {
  iv: string;
  tag: string;
  ciphertext: string;
}
export class RecoveryKeys {
  constructor(private encodedKey: string | undefined) {}
  seal(secret: string, identity: string): SealedKey {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    cipher.setAAD(Buffer.from(identity));
    const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    return {
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
  }
  open(sealed: SealedKey, identity: string): string {
    const decipher = createDecipheriv("aes-256-gcm", this.key(), Buffer.from(sealed.iv, "base64"));
    decipher.setAAD(Buffer.from(identity));
    decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(sealed.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
  private key() {
    return this.encodedKey ? Buffer.from(this.encodedKey, "base64") : unavailable();
  }
}
