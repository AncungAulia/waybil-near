import type { ErrorCode } from "./codes";
import type { Role } from "./shipment";

export interface ProposalReasonInput {
  reason: "too_big_jump" | "needs_history" | "payment_risk" | "other";
  note: string;
}
export interface ProposalReason extends ProposalReasonInput {
  id: string;
  proposalId: number;
  actor: string;
  createdAt: string;
}
export interface PauseNoteInput {
  shipperId: string;
  reason: "payment_risk" | "late_bills" | "other";
  note: string;
  txHash: string;
}
export interface PauseNote extends PauseNoteInput {
  id: string;
  actor: string;
  proofUrl: string;
  createdAt: string;
}

export interface CreditProof {
  model: string;
  chatId: string;
  requestHash: string;
  responseHash: string;
  signature: string;
  signer: string;
  verification: "pinned_model_signer";
  attestationReference: string;
}
export interface CreditReviewInfo {
  id: string;
  shipperId: string;
  kind: "initial" | "review";
  state: "queued" | "running" | "writing" | "complete";
  result: "raised" | "proposed" | "no_change" | "failed" | null;
  suggestedLimit: string | null;
  needsCloserLook: boolean;
  reasons: string[];
  proposalId: number | null;
  txHash: string | null;
  proof: CreditProof | null;
  createdAt: string;
  completedAt: string | null;
}

export type ReportReason = "damaged" | "missing" | "wrong_goods" | "other";
export interface ReportInput {
  shipmentId: number;
  goodQty: number;
  reasons: ReportReason[];
  note: string;
}
export interface ReportSaved {
  reportHash: string;
  confirmArgs: { id: number; good_qty: number; report_hash: string };
}
export interface ReportDetail extends ReportInput {
  warehouseId: string;
  reportHash: string;
  recorded: boolean;
  photos: Array<{ sha256: string; mime: string; size: number; signedUrl: string }>;
}

export type DocumentKind = "registration" | "bank_statement" | "tax_id";
export interface CompanyInput {
  name: string;
  registration: string;
  country: string;
  province: string;
  city: string;
  address: string;
  postal: string;
  contact: string;
  job: string;
  phone: string;
  email: string;
  trips: number;
  shippingSpend: string;
  routes: string;
}
export interface Application {
  id: string;
  shipperId: string;
  company: CompanyInput;
  state: "draft" | "in_review" | "needs_more" | "approved" | "rejected";
  documents: Partial<Record<DocumentKind, string>>;
  proposalId: number | null;
  reviewId: string | null;
  submissionNumber: number;
  rejection: { reason: string; note: string; actor: string; at: string } | null;
  createdAt: string;
  updatedAt: string;
}
export interface DocumentInfo {
  id: string;
  kind: DocumentKind;
  mime: string;
  size: number;
  sha256: string;
  signedUrl: string;
}
export interface ApplicationDetail {
  application: Application;
  documents: DocumentInfo[];
}

export interface RelayRequest {
  signedDelegate: string;
}
export interface RelayResponse {
  txHash: string;
  status: "pending" | "confirmed" | "failed";
  proofUrl: string;
}

export type ChallengeRequest =
  | { kind: "wallet"; accountId: string; role?: "shipper" | "investor" }
  | { kind: "google"; publicKey: string; inviteCode?: string };
export interface ChallengeResponse {
  id: string;
  nonce: string;
  message: string;
  recipient: string;
  callbackUrl: string;
  expiresAt: string;
}
export interface WalletLogin {
  challengeId: string;
  accountId: string;
  publicKey: string;
  signature: string;
  nonce: string;
}
export interface GoogleLogin {
  challengeId: string;
  idToken: string;
}

export interface InviteCreate {
  type: "driver" | "warehouse";
  name: string;
  phone: string;
  address?: string;
}
export interface PublicInvite {
  shipperName: string;
  type: "driver" | "warehouse";
  state: "open" | "used" | "expired";
}
export interface Invite extends InviteCreate {
  code: string;
  shipperId: string;
  shipperName: string;
  expiresAt: string;
  acceptedBy: string | null;
  acceptedAt: string | null;
}

export interface ApiError {
  error: { code: ErrorCode; message: string };
}
export interface Profile {
  accountId: string;
  role: Role;
  authMethod: "wallet" | "google";
  name: string;
  phone: string;
  email: string;
  truckPlate: string | null;
  sessionVersion: number;
}
export interface Principal {
  accountId: string;
  role: Role;
  authMethod: "wallet" | "google";
  sessionVersion: number;
}
export interface SessionResponse {
  token: string;
  expiresAt: string;
  profile: Profile;
}
export interface ProfileUpdate {
  name?: string;
  phone?: string;
  email?: string;
  truckPlate?: string | null;
}

export interface ApplicationListItem extends Application {
  review: CreditReviewInfo | null;
}
export interface ApplicationsResponse {
  applications: ApplicationListItem[];
}
export interface ApplicationResponse {
  application: Application;
}
export interface CreditReviewResponse {
  review: CreditReviewInfo;
}

export const APPLICATION_REJECTION_REASONS = [
  "payment_risk",
  "needs_history",
  "unclear_documents",
  "other",
] as const;
export type ApplicationRejectionReason = (typeof APPLICATION_REJECTION_REASONS)[number];
export interface ApplicationRejectionInput {
  reason: ApplicationRejectionReason;
  note: string;
}
export type EmailStatus = "queued" | "sending" | "sent" | "failed" | "uncertain";
export interface ApplicationRejectionResponse {
  application: Application;
  emailStatus: EmailStatus;
}
export type DocumentUploaded = Omit<DocumentInfo, "signedUrl">;
export interface InviteCreatedResponse {
  invite: Invite;
  link: string;
}
export interface InvitesResponse {
  invites: Invite[];
}
export interface InviteAcceptedResponse {
  invite: Invite;
  networkLinkRequired: true;
}
export interface LogoutResponse {
  revoked: true;
}
export interface ProposalReasonsResponse {
  reasons: ProposalReason[];
}
export interface PauseNotesResponse {
  notes: PauseNote[];
}
