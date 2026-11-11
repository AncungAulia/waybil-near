import type { Role } from "./shipment";

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
  error: { code: `E_${string}`; message: string };
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
