import type { Role } from "./shipment";

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
