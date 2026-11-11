export type Table = "profiles";
export interface Snapshot<T> {
  value: T;
  version: number;
}
export interface Store {
  get<T>(table: Table, id: string): Promise<Snapshot<T> | null>;
  list<T>(table: Table, filter?: Record<string, unknown>): Promise<Array<Snapshot<T>>>;
  insert<T>(table: Table, id: string, value: T): Promise<Snapshot<T>>;
  replace<T>(table: Table, id: string, version: number, value: T): Promise<Snapshot<T>>;
  remove(table: Table, id: string, version: number): Promise<void>;
}
