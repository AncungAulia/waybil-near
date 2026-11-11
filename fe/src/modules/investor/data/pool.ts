import { FEE_BPS } from "@waybil/shared";

/* What the pool earns of each bill, from the shared fee split, for example "1.6%". */
export const POOL_PERCENT = `${Number(FEE_BPS.pool) / 100}%`;
