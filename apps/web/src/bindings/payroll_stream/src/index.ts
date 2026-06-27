import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CCAY3UKTW6G4XUXLTWVOUYPHDIR2KOYDWELJ72PZGFBTRGRKC6NSH6OD",
  }
} as const

export const Errors = {
  1: {message:"Unauthorized"},
  2: {message:"InvalidStream"},
  3: {message:"InvalidArguments"},
  4: {message:"NotEmployee"},
  5: {message:"StreamInactive"},
  6: {message:"InsufficientTreasury"},
  7: {message:"AlreadyInitialized"}
}


/**
 * Stream durum makinesi.
 */
export interface Stream {
  accrued_stored: i128;
  canceled: boolean;
  employee: string;
  employer: string;
  end_time: u64;
  last_checkpoint: u64;
  max_total_amount: i128;
  paused: boolean;
  rate_per_second: i128;
  reserved_amount: i128;
  start_time: u64;
  withdrawn: i128;
}

export type DataKey = {tag: "Admin", values: void} | {tag: "Token", values: void} | {tag: "NextStreamId", values: void} | {tag: "PayrollManager", values: readonly [string]} | {tag: "StreamData", values: readonly [u64]} | {tag: "EmployerBalance", values: readonly [string]};

export interface Client {
  /**
   * Construct and simulate a fund transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * `from` USDC'yi kendi cüzdanından kontrata aktarır, `employer`'ın available
   * bakiyesini artırır. Permissionless (08 §2.1): çağıran yalnızca kendi parasını
   * gönderir; kimse başkasının bakiyesini azaltamaz. Doğrudan kullanım `from==employer`;
   * treasury yolu `from=treasury_addr, employer=gerçek_işveren` (fund_payroll → bu).
   */
  fund: ({from, employer, amount}: {from: string, employer: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a pause transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Akışı durdur (tahakkuk donar).
   */
  pause: ({stream_id}: {stream_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  token: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a cancel transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * İptal et: tahakkuku dondur, kullanılmayan rezervi işverene iade et.
   * Çalışan birikmiş (henüz çekilmemiş) tutarı sonradan çekebilir.
   */
  cancel: ({stream_id}: {stream_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a resume transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Akışı sürdür (duraklatılan süre tahakkuk etmez).
   */
  resume: ({stream_id}: {stream_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a settle transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Biten/tavana ulaşan akışta fazla rezervi işverene iade et.
   */
  settle: ({stream_id}: {stream_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Kontrat WASM'ını güncelle (yalnızca admin). Adres + state korunur (ADR-0001).
   */
  upgrade: ({new_wasm_hash}: {new_wasm_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Çalışan kazandığı tutarı çeker (CEI: önce state, sonra transfer).
   */
  withdraw: ({stream_id, amount}: {stream_id: u64, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a claimable transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  claimable: ({stream_id}: {stream_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_stream transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_stream: ({stream_id}: {stream_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Stream>>

  /**
   * Construct and simulate a update_rate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Checkpoint sonrası rate güncelle. Rezerv `max_total` zaten tavanı karşıladığından
   * ek rezerv gerekmez (tahakkuk tavanda sınırlı).
   */
  update_rate: ({stream_id, new_rate}: {stream_id: u64, new_rate: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a batch_create transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Toplu oluşturma; tüm rezervler tek `employer` bakiyesinden kilitlenir.
   */
  batch_create: ({employer, employees, rates, start_time, end_time, max_totals}: {employer: string, employees: Array<string>, rates: Array<i128>, start_time: u64, end_time: u64, max_totals: Array<i128>}, options?: MethodOptions) => Promise<AssembledTransaction<Array<u64>>>

  /**
   * Construct and simulate a create_stream transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Tek stream oluştur; `max_total_amount` kadar rezerv `employer` bakiyesinden kilitlenir.
   */
  create_stream: ({employer, employee, rate_per_second, start_time, end_time, max_total_amount}: {employer: string, employee: string, rate_per_second: i128, start_time: u64, end_time: u64, max_total_amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a next_stream_id transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  next_stream_id: (options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a employer_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  employer_balance: ({employer}: {employer: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a set_payroll_manager transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Rol ata/kaldır (admin).
   */
  set_payroll_manager: ({manager, enabled}: {manager: string, enabled: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, token}: {admin: string, token: string},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin, token}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAABwAAAAAAAAAMVW5hdXRob3JpemVkAAAAAQAAAAAAAAANSW52YWxpZFN0cmVhbQAAAAAAAAIAAAAAAAAAEEludmFsaWRBcmd1bWVudHMAAAADAAAAAAAAAAtOb3RFbXBsb3llZQAAAAAEAAAAAAAAAA5TdHJlYW1JbmFjdGl2ZQAAAAAABQAAAAAAAAAUSW5zdWZmaWNpZW50VHJlYXN1cnkAAAAGAAAAAAAAABJBbHJlYWR5SW5pdGlhbGl6ZWQAAAAAAAc=",
        "AAAAAQAAABZTdHJlYW0gZHVydW0gbWFraW5lc2kuAAAAAAAAAAAABlN0cmVhbQAAAAAADAAAAAAAAAAOYWNjcnVlZF9zdG9yZWQAAAAAAAsAAAAAAAAACGNhbmNlbGVkAAAAAQAAAAAAAAAIZW1wbG95ZWUAAAATAAAAAAAAAAhlbXBsb3llcgAAABMAAAAAAAAACGVuZF90aW1lAAAABgAAAAAAAAAPbGFzdF9jaGVja3BvaW50AAAAAAYAAAAAAAAAEG1heF90b3RhbF9hbW91bnQAAAALAAAAAAAAAAZwYXVzZWQAAAAAAAEAAAAAAAAAD3JhdGVfcGVyX3NlY29uZAAAAAALAAAAAAAAAA9yZXNlcnZlZF9hbW91bnQAAAAACwAAAAAAAAAKc3RhcnRfdGltZQAAAAAABgAAAAAAAAAJd2l0aGRyYXduAAAAAAAACw==",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABgAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAFVG9rZW4AAAAAAAAAAAAAAAAAAAxOZXh0U3RyZWFtSWQAAAABAAAAAAAAAA5QYXlyb2xsTWFuYWdlcgAAAAAAAQAAABMAAAABAAAAAAAAAApTdHJlYW1EYXRhAAAAAAABAAAABgAAAAEAAAAAAAAAD0VtcGxveWVyQmFsYW5jZQAAAAABAAAAEw==",
        "AAAAAAAAAVVgZnJvbWAgVVNEQyd5aSBrZW5kaSBjw7x6ZGFuxLFuZGFuIGtvbnRyYXRhIGFrdGFyxLFyLCBgZW1wbG95ZXJgJ8SxbiBhdmFpbGFibGUKYmFraXllc2luaSBhcnTEsXLEsXIuIFBlcm1pc3Npb25sZXNzICgwOCDCpzIuMSk6IMOnYcSfxLFyYW4geWFsbsSxemNhIGtlbmRpIHBhcmFzxLFuxLEKZ8O2bmRlcmlyOyBraW1zZSBiYcWfa2FzxLFuxLFuIGJha2l5ZXNpbmkgYXphbHRhbWF6LiBEb8SfcnVkYW4ga3VsbGFuxLFtIGBmcm9tPT1lbXBsb3llcmA7CnRyZWFzdXJ5IHlvbHUgYGZyb209dHJlYXN1cnlfYWRkciwgZW1wbG95ZXI9Z2Vyw6dla19pxZ92ZXJlbmAgKGZ1bmRfcGF5cm9sbCDihpIgYnUpLgAAAAAAAARmdW5kAAAAAwAAAAAAAAAEZnJvbQAAABMAAAAAAAAACGVtcGxveWVyAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==",
        "AAAAAAAAAAAAAAAFYWRtaW4AAAAAAAAAAAAAAQAAABM=",
        "AAAAAAAAACFBa8SxxZ/EsSBkdXJkdXIgKHRhaGFra3VrIGRvbmFyKS4AAAAAAAAFcGF1c2UAAAAAAAABAAAAAAAAAAlzdHJlYW1faWQAAAAAAAAGAAAAAA==",
        "AAAAAAAAAAAAAAAFdG9rZW4AAAAAAAAAAAAAAQAAABM=",
        "AAAAAAAAAI7EsHB0YWwgZXQ6IHRhaGFra3VrdSBkb25kdXIsIGt1bGxhbsSxbG1heWFuIHJlemVydmkgacWfdmVyZW5lIGlhZGUgZXQuCsOHYWzEscWfYW4gYmlyaWttacWfIChoZW7DvHogw6dla2lsbWVtacWfKSB0dXRhcsSxIHNvbnJhZGFuIMOnZWtlYmlsaXIuAAAAAAAGY2FuY2VsAAAAAAABAAAAAAAAAAlzdHJlYW1faWQAAAAAAAAGAAAAAA==",
        "AAAAAAAAADdBa8SxxZ/EsSBzw7xyZMO8ciAoZHVyYWtsYXTEsWxhbiBzw7xyZSB0YWhha2t1ayBldG1leikuAAAAAAZyZXN1bWUAAAAAAAEAAAAAAAAACXN0cmVhbV9pZAAAAAAAAAYAAAAA",
        "AAAAAAAAAD5CaXRlbi90YXZhbmEgdWxhxZ9hbiBha8SxxZ90YSBmYXpsYSByZXplcnZpIGnFn3ZlcmVuZSBpYWRlIGV0LgAAAAAABnNldHRsZQAAAAAAAQAAAAAAAAAJc3RyZWFtX2lkAAAAAAAABgAAAAA=",
        "AAAAAAAAAFFLb250cmF0IFdBU00nxLFuxLEgZ8O8bmNlbGxlICh5YWxuxLF6Y2EgYWRtaW4pLiBBZHJlcyArIHN0YXRlIGtvcnVudXIgKEFEUi0wMDAxKS4AAAAAAAAHdXBncmFkZQAAAAABAAAAAAAAAA1uZXdfd2FzbV9oYXNoAAAAAAAD7gAAACAAAAAA",
        "AAAAAAAAAErDh2FsxLHFn2FuIGthemFuZMSxxJ/EsSB0dXRhcsSxIMOnZWtlciAoQ0VJOiDDtm5jZSBzdGF0ZSwgc29ucmEgdHJhbnNmZXIpLgAAAAAACHdpdGhkcmF3AAAAAgAAAAAAAAAJc3RyZWFtX2lkAAAAAAAABgAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==",
        "AAAAAAAAAAAAAAAJY2xhaW1hYmxlAAAAAAAAAQAAAAAAAAAJc3RyZWFtX2lkAAAAAAAABgAAAAEAAAAL",
        "AAAAAAAAAAAAAAAKZ2V0X3N0cmVhbQAAAAAAAQAAAAAAAAAJc3RyZWFtX2lkAAAAAAAABgAAAAEAAAfQAAAABlN0cmVhbQAA",
        "AAAAAAAAAItDaGVja3BvaW50IHNvbnJhc8SxIHJhdGUgZ8O8bmNlbGxlLiBSZXplcnYgYG1heF90b3RhbGAgemF0ZW4gdGF2YW7EsSBrYXLFn8SxbGFkxLHEn8SxbmRhbgplayByZXplcnYgZ2VyZWttZXogKHRhaGFra3VrIHRhdmFuZGEgc8SxbsSxcmzEsSkuAAAAAAt1cGRhdGVfcmF0ZQAAAAACAAAAAAAAAAlzdHJlYW1faWQAAAAAAAAGAAAAAAAAAAhuZXdfcmF0ZQAAAAsAAAAA",
        "AAAAAAAAAEhUb3BsdSBvbHXFn3R1cm1hOyB0w7xtIHJlemVydmxlciB0ZWsgYGVtcGxveWVyYCBiYWtpeWVzaW5kZW4ga2lsaXRsZW5pci4AAAAMYmF0Y2hfY3JlYXRlAAAABgAAAAAAAAAIZW1wbG95ZXIAAAATAAAAAAAAAAllbXBsb3llZXMAAAAAAAPqAAAAEwAAAAAAAAAFcmF0ZXMAAAAAAAPqAAAACwAAAAAAAAAKc3RhcnRfdGltZQAAAAAABgAAAAAAAAAIZW5kX3RpbWUAAAAGAAAAAAAAAAptYXhfdG90YWxzAAAAAAPqAAAACwAAAAEAAAPqAAAABg==",
        "AAAAAAAAAC1Lb250cmF0xLEgYWRtaW4gKyB0b2tlbiAoVVNEQyBTQUMpIGlsZSBrdXJhci4AAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAA==",
        "AAAAAAAAAFhUZWsgc3RyZWFtIG9sdcWfdHVyOyBgbWF4X3RvdGFsX2Ftb3VudGAga2FkYXIgcmV6ZXJ2IGBlbXBsb3llcmAgYmFraXllc2luZGVuIGtpbGl0bGVuaXIuAAAADWNyZWF0ZV9zdHJlYW0AAAAAAAAGAAAAAAAAAAhlbXBsb3llcgAAABMAAAAAAAAACGVtcGxveWVlAAAAEwAAAAAAAAAPcmF0ZV9wZXJfc2Vjb25kAAAAAAsAAAAAAAAACnN0YXJ0X3RpbWUAAAAAAAYAAAAAAAAACGVuZF90aW1lAAAABgAAAAAAAAAQbWF4X3RvdGFsX2Ftb3VudAAAAAsAAAABAAAABg==",
        "AAAAAAAAAAAAAAAObmV4dF9zdHJlYW1faWQAAAAAAAAAAAABAAAABg==",
        "AAAAAAAAAAAAAAAQZW1wbG95ZXJfYmFsYW5jZQAAAAEAAAAAAAAACGVtcGxveWVyAAAAEwAAAAEAAAAL",
        "AAAAAAAAABhSb2wgYXRhL2thbGTEsXIgKGFkbWluKS4AAAATc2V0X3BheXJvbGxfbWFuYWdlcgAAAAACAAAAAAAAAAdtYW5hZ2VyAAAAABMAAAAAAAAAB2VuYWJsZWQAAAAAAQAAAAA=" ]),
      options
    )
  }
  public readonly fromJSON = {
    fund: this.txFromJSON<null>,
        admin: this.txFromJSON<string>,
        pause: this.txFromJSON<null>,
        token: this.txFromJSON<string>,
        cancel: this.txFromJSON<null>,
        resume: this.txFromJSON<null>,
        settle: this.txFromJSON<null>,
        upgrade: this.txFromJSON<null>,
        withdraw: this.txFromJSON<null>,
        claimable: this.txFromJSON<i128>,
        get_stream: this.txFromJSON<Stream>,
        update_rate: this.txFromJSON<null>,
        batch_create: this.txFromJSON<Array<u64>>,
        create_stream: this.txFromJSON<u64>,
        next_stream_id: this.txFromJSON<u64>,
        employer_balance: this.txFromJSON<i128>,
        set_payroll_manager: this.txFromJSON<null>
  }
}