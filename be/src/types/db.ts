export type Table =
  | "profiles"
  | "invites"
  | "auth_challenges"
  | "auth_identities"
  | "relay_requests"
  | "applications"
  | "application_documents"
  | "email_log"
  | "reports"
  | "report_photos"
  | "credit_reviews"
  | "proposal_reasons"
  | "pause_notes"
  | "job_runs"
  | "places"
  | "trips"
  | "arrival_codes"
  | "pool_events"
  | "pool_scan";
export interface Snapshot<T> {
  value: T;
  version: number;
}
export interface Store {
  removeExpiredChallenges(now: string): Promise<number>;
  get<T>(table: Table, id: string): Promise<Snapshot<T> | null>;
  list<T>(table: Table, filter?: Record<string, unknown>): Promise<Array<Snapshot<T>>>;
  insert<T>(table: Table, id: string, value: T): Promise<Snapshot<T>>;
  replace<T>(table: Table, id: string, version: number, value: T): Promise<Snapshot<T>>;
  remove(table: Table, id: string, version: number): Promise<void>;
}
