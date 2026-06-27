// Auto-discovery of an employee's streams (no manual stream-ID entry).
// MVP: scans all streams on chain (count is small). Moves to getEvents/indexer in Phase 4.
import { streamClient, type Stream } from "./contracts";

export interface DiscoveredStream {
  id: bigint;
  stream: Stream;
}

export async function discoverEmployeeStreams(
  employee: string
): Promise<DiscoveredStream[]> {
  const c = streamClient({ publicKey: employee });
  const { result: nextId } = await c.next_stream_id();
  const found: DiscoveredStream[] = [];

  for (let i = 0n; i < nextId; i++) {
    try {
      const { result: stream } = await c.get_stream({ stream_id: i });
      if (stream.employee === employee && !stream.canceled) {
        found.push({ id: i, stream });
      }
    } catch {
      // empty/invalid id — skip
    }
  }
  return found;
}

/** A stream's authorized claimable amount on chain (raw i128). */
export async function readClaimable(
  streamId: bigint,
  viewer: string
): Promise<bigint> {
  const c = streamClient({ publicKey: viewer });
  const { result } = await c.claimable({ stream_id: streamId });
  return result;
}

/** All of an employer's streams (including canceled — for management/history). */
export async function discoverEmployerStreams(
  employer: string
): Promise<DiscoveredStream[]> {
  const c = streamClient({ publicKey: employer });
  const { result: nextId } = await c.next_stream_id();
  const found: DiscoveredStream[] = [];

  for (let i = 0n; i < nextId; i++) {
    try {
      const { result: stream } = await c.get_stream({ stream_id: i });
      if (stream.employer === employer) found.push({ id: i, stream });
    } catch {
      // empty/invalid id — skip
    }
  }
  return found;
}

/** The employer's available (non-reserved) balance in the contract (raw i128). */
export async function readEmployerBalance(employer: string): Promise<bigint> {
  const c = streamClient({ publicKey: employer });
  const { result } = await c.employer_balance({ employer });
  return result;
}
