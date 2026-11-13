import type { CreditReviewInfo } from "@waybil/shared";
import type { CreditRow } from "../modules/credit/credit.service";
import { creditFindings } from "../modules/credit/credit.schema";
/** The part of a stored credit review that its owner and the team may see. */
export function publicReview(row: CreditRow, now = Date.now()): CreditReviewInfo {
  const {
    id,
    shipperId,
    kind,
    state,
    result,
    suggestedLimit,
    needsCloserLook,
    reasons,
    proposalId,
    txHash,
    proof,
    createdAt,
    completedAt,
  } = row;
  return {
    id,
    shipperId,
    kind,
    state,
    result,
    suggestedLimit,
    needsCloserLook,
    reasons,
    proposalId,
    txHash,
    proof,
    findings: creditFindings(row, now),
    createdAt,
    completedAt,
  };
}
