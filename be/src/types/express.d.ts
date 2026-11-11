import type { Principal } from "@waybil/shared";
declare global {
  namespace Express {
    interface Request {
      auth?: Principal;
    }
  }
}
