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
    contractId: "CD5ERANICKKDMD3G7ULGMV5AWXAOMK4AYTIENGZNUTZEMSBIEVVJTFRY",
  }
} as const

export const Errors = {
  100: {message:"Unauthorized"},
  101: {message:"InvalidArguments"},
  102: {message:"InsufficientBalance"},
  103: {message:"InsufficientYieldReserve"},
  104: {message:"AlreadyInitialized"}
}

export type DataKey = {tag: "Admin", values: void} | {tag: "Token", values: void} | {tag: "PayrollStream", values: void} | {tag: "Strategy", values: void} | {tag: "AnnualRateBps", values: void} | {tag: "YieldReserve", values: void} | {tag: "TotalDeposits", values: void} | {tag: "Vault", values: readonly [string]};


export interface EmployerVault {
  accrued_yield: i128;
  last_checkpoint: u64;
  principal: i128;
  total_funded_to_payroll: i128;
}

export interface Client {
  /**
   * Construct and simulate a admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  token: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * USDC yatır → checkpoint sonrası `principal` artar.
   */
  deposit: ({employer, amount}: {employer: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Kontrat WASM'ını güncelle (yalnızca admin). Adres + state korunur (ADR-0001).
   */
  upgrade: ({new_wasm_hash}: {new_wasm_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Belirli tutarı çek (yield-önce düşüm; yield `YieldReserve`'den ödenir).
   */
  withdraw: ({employer, amount}: {employer: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_vault transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_vault: ({employer}: {employer: string}, options?: MethodOptions) => Promise<AssembledTransaction<EmployerVault>>

  /**
   * Construct and simulate a fund_payroll transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Hazineden doğrudan bordroyu fonla: yield-önce düş, sonra
   * `payroll_stream.fund(treasury, employer, amount)` çağır (cross-contract).
   */
  fund_payroll: ({employer, amount}: {employer: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a withdraw_all transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Tüm bakiyeyi (principal + birikmiş yield) çek.
   */
  withdraw_all: ({employer}: {employer: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a pending_yield transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Birikmiş + bekleyen getiri (checkpoint'siz projeksiyon).
   */
  pending_yield: ({employer}: {employer: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a total_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * principal + (birikmiş + bekleyen) yield.
   */
  total_balance: ({employer}: {employer: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a yield_reserve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  yield_reserve: (options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a payroll_stream transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  payroll_stream: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a total_deposits transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  total_deposits: (options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a annual_rate_bps transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  annual_rate_bps: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a set_annual_rate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * APY (bps) güncelle — yalnızca admin.
   */
  set_annual_rate: ({bps}: {bps: u32}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a fund_yield_reserve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Yield reserve'i besle (permissionless — herkes seed edebilir).
   */
  fund_yield_reserve: ({funder, amount}: {funder: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, token, payroll_stream, strategy, annual_rate_bps}: {admin: string, token: string, payroll_stream: string, strategy: string, annual_rate_bps: u32},
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
    return ContractClient.deploy({admin, token, payroll_stream, strategy, annual_rate_bps}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAABQAAAAAAAAAMVW5hdXRob3JpemVkAAAAZAAAAAAAAAAQSW52YWxpZEFyZ3VtZW50cwAAAGUAAAAAAAAAE0luc3VmZmljaWVudEJhbGFuY2UAAAAAZgAAAAAAAAAYSW5zdWZmaWNpZW50WWllbGRSZXNlcnZlAAAAZwAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAABo",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAACAAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAFVG9rZW4AAAAAAAAAAAAAAAAAAA1QYXlyb2xsU3RyZWFtAAAAAAAAAAAAAAAAAAAIU3RyYXRlZ3kAAAAAAAAAAAAAAA1Bbm51YWxSYXRlQnBzAAAAAAAAAAAAAAAAAAAMWWllbGRSZXNlcnZlAAAAAAAAAAAAAAANVG90YWxEZXBvc2l0cwAAAAAAAAEAAAAAAAAABVZhdWx0AAAAAAAAAQAAABM=",
        "AAAAAQAAAAAAAAAAAAAADUVtcGxveWVyVmF1bHQAAAAAAAAEAAAAAAAAAA1hY2NydWVkX3lpZWxkAAAAAAAACwAAAAAAAAAPbGFzdF9jaGVja3BvaW50AAAAAAYAAAAAAAAACXByaW5jaXBhbAAAAAAAAAsAAAAAAAAAF3RvdGFsX2Z1bmRlZF90b19wYXlyb2xsAAAAAAs=",
        "AAAAAAAAAAAAAAAFYWRtaW4AAAAAAAAAAAAAAQAAABM=",
        "AAAAAAAAAAAAAAAFdG9rZW4AAAAAAAAAAAAAAQAAABM=",
        "AAAAAAAAADZVU0RDIHlhdMSxciDihpIgY2hlY2twb2ludCBzb25yYXPEsSBgcHJpbmNpcGFsYCBhcnRhci4AAAAAAAdkZXBvc2l0AAAAAAIAAAAAAAAACGVtcGxveWVyAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==",
        "AAAAAAAAAFFLb250cmF0IFdBU00nxLFuxLEgZ8O8bmNlbGxlICh5YWxuxLF6Y2EgYWRtaW4pLiBBZHJlcyArIHN0YXRlIGtvcnVudXIgKEFEUi0wMDAxKS4AAAAAAAAHdXBncmFkZQAAAAABAAAAAAAAAA1uZXdfd2FzbV9oYXNoAAAAAAAD7gAAACAAAAAA",
        "AAAAAAAAAE5CZWxpcmxpIHR1dGFyxLEgw6dlayAoeWllbGQtw7ZuY2UgZMO8xZ/DvG07IHlpZWxkIGBZaWVsZFJlc2VydmVgJ2RlbiDDtmRlbmlyKS4AAAAAAAh3aXRoZHJhdwAAAAIAAAAAAAAACGVtcGxveWVyAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==",
        "AAAAAAAAAAAAAAAJZ2V0X3ZhdWx0AAAAAAAAAQAAAAAAAAAIZW1wbG95ZXIAAAATAAAAAQAAB9AAAAANRW1wbG95ZXJWYXVsdAAAAA==",
        "AAAAAAAAAIlIYXppbmVkZW4gZG/En3J1ZGFuIGJvcmRyb3l1IGZvbmxhOiB5aWVsZC3Dtm5jZSBkw7zFnywgc29ucmEKYHBheXJvbGxfc3RyZWFtLmZ1bmQodHJlYXN1cnksIGVtcGxveWVyLCBhbW91bnQpYCDDp2HEn8SxciAoY3Jvc3MtY29udHJhY3QpLgAAAAAAAAxmdW5kX3BheXJvbGwAAAACAAAAAAAAAAhlbXBsb3llcgAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAA=",
        "AAAAAAAAADFUw7xtIGJha2l5ZXlpIChwcmluY2lwYWwgKyBiaXJpa21pxZ8geWllbGQpIMOnZWsuAAAAAAAADHdpdGhkcmF3X2FsbAAAAAEAAAAAAAAACGVtcGxveWVyAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAUAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAA5wYXlyb2xsX3N0cmVhbQAAAAAAEwAAAAAAAAAIc3RyYXRlZ3kAAAATAAAAAAAAAA9hbm51YWxfcmF0ZV9icHMAAAAABAAAAAA=",
        "AAAAAAAAADlCaXJpa21pxZ8gKyBiZWtsZXllbiBnZXRpcmkgKGNoZWNrcG9pbnQnc2l6IHByb2pla3NpeW9uKS4AAAAAAAANcGVuZGluZ195aWVsZAAAAAAAAAEAAAAAAAAACGVtcGxveWVyAAAAEwAAAAEAAAAL",
        "AAAAAAAAAClwcmluY2lwYWwgKyAoYmlyaWttacWfICsgYmVrbGV5ZW4pIHlpZWxkLgAAAAAAAA10b3RhbF9iYWxhbmNlAAAAAAAAAQAAAAAAAAAIZW1wbG95ZXIAAAATAAAAAQAAAAs=",
        "AAAAAAAAAAAAAAANeWllbGRfcmVzZXJ2ZQAAAAAAAAAAAAABAAAACw==",
        "AAAAAAAAAAAAAAAOcGF5cm9sbF9zdHJlYW0AAAAAAAAAAAABAAAAEw==",
        "AAAAAAAAAAAAAAAOdG90YWxfZGVwb3NpdHMAAAAAAAAAAAABAAAACw==",
        "AAAAAAAAAAAAAAAPYW5udWFsX3JhdGVfYnBzAAAAAAAAAAABAAAABA==",
        "AAAAAAAAAChBUFkgKGJwcykgZ8O8bmNlbGxlIOKAlCB5YWxuxLF6Y2EgYWRtaW4uAAAAD3NldF9hbm51YWxfcmF0ZQAAAAABAAAAAAAAAANicHMAAAAABAAAAAA=",
        "AAAAAAAAAEBZaWVsZCByZXNlcnZlJ2kgYmVzbGUgKHBlcm1pc3Npb25sZXNzIOKAlCBoZXJrZXMgc2VlZCBlZGViaWxpcikuAAAAEmZ1bmRfeWllbGRfcmVzZXJ2ZQAAAAAAAgAAAAAAAAAGZnVuZGVyAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA" ]),
      options
    )
  }
  public readonly fromJSON = {
    admin: this.txFromJSON<string>,
        token: this.txFromJSON<string>,
        deposit: this.txFromJSON<null>,
        upgrade: this.txFromJSON<null>,
        withdraw: this.txFromJSON<null>,
        get_vault: this.txFromJSON<EmployerVault>,
        fund_payroll: this.txFromJSON<null>,
        withdraw_all: this.txFromJSON<null>,
        pending_yield: this.txFromJSON<i128>,
        total_balance: this.txFromJSON<i128>,
        yield_reserve: this.txFromJSON<i128>,
        payroll_stream: this.txFromJSON<string>,
        total_deposits: this.txFromJSON<i128>,
        annual_rate_bps: this.txFromJSON<u32>,
        set_annual_rate: this.txFromJSON<null>,
        fund_yield_reserve: this.txFromJSON<null>
  }
}