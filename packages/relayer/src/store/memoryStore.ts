import type { VerificationRecord, VerificationStore } from "../types.js";

/** In-memory store for tests and local dev; production swaps in Postgres. */
export class MemoryVerificationStore implements VerificationStore {
  private readonly records = new Map<string, VerificationRecord>();

  async get(key: string): Promise<VerificationRecord | undefined> {
    return this.records.get(key);
  }

  async put(key: string, record: VerificationRecord): Promise<void> {
    this.records.set(key, record);
  }
}
