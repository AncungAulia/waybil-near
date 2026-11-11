import type { CreditReviewInfo } from "@waybil/shared";
export function publicReview(row: CreditReviewInfo): CreditReviewInfo {
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
    createdAt,
    completedAt,
  };
}
