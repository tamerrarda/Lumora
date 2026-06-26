#![no_std]
//! Lumora — payroll_treasury
//!
//! Yield treasury (Phase 2). The employer deposits USDC and accrues time-weighted yield (APY, bps);
//! it can fund payroll directly from the treasury (`fund_payroll` → `payroll_stream.fund`).
//! Scale: the rate is in **basis points** (1e4; 5% = 500 bps). Yield is paid from the admin-seeded `YieldReserve`.
//!
//!
//! Signature note (consistent with Phase 1): `deposit`/`withdraw`/`withdraw_all`/`fund_payroll` take a leading
//! `employer: Address`, and `fund_yield_reserve` takes a `funder: Address` — Soroban has no implicit caller;
//! the vault owner/payer is given explicitly and calls `require_auth`.

use soroban_sdk::auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation};
use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, symbol_short, token, vec,
    Address, BytesN, Env, IntoVal,
};

/// The interface of payroll_stream we call (cross-contract CPI client). We declare the interface
/// here instead of a crate dependency → the production cdylib does not link to payroll_stream.
#[contractclient(name = "PayrollStreamCpi")]
pub trait PayrollStreamInterface {
    fn fund(env: Env, from: Address, employer: Address, amount: i128);
}

// --- Constants ---
const YEAR: i128 = 365 * 24 * 60 * 60; // 31_536_000 s
const BPS_SCALE: i128 = 10_000;
const YEAR_BPS: i128 = YEAR * BPS_SCALE; // pending divisor

const PERSIST_THRESHOLD: u32 = 17_280; // ~1 day
const PERSIST_EXTEND: u32 = 518_400; // ~30 days
const INSTANCE_THRESHOLD: u32 = 17_280;
const INSTANCE_EXTEND: u32 = 518_400;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    // Code range (payroll_treasury: 100–199)
    Unauthorized = 100,
    InvalidArguments = 101,
    InsufficientBalance = 102,
    InsufficientYieldReserve = 103,
    AlreadyInitialized = 104,
}

#[contracttype]
#[derive(Clone)]
pub struct EmployerVault {
    pub principal: i128,
    pub accrued_yield: i128,
    pub last_checkpoint: u64,
    pub total_funded_to_payroll: i128,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    PayrollStream,
    Strategy,
    AnnualRateBps,
    YieldReserve,
    TotalDeposits,
    Vault(Address),
}

#[contract]
pub struct PayrollTreasury;

// The publish topic/data schema is preserved
// (the SDK 25 deprecation is deliberately suppressed — see the same note in payroll_stream).
#[allow(deprecated)]
#[contractimpl]
impl PayrollTreasury {
    pub fn __constructor(
        env: Env,
        admin: Address,
        token: Address,
        payroll_stream: Address,
        strategy: Address,
        annual_rate_bps: u32,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_err(&env, Error::AlreadyInitialized);
        }
        let s = env.storage().instance();
        s.set(&DataKey::Admin, &admin);
        s.set(&DataKey::Token, &token);
        s.set(&DataKey::PayrollStream, &payroll_stream);
        s.set(&DataKey::Strategy, &strategy);
        s.set(&DataKey::AnnualRateBps, &annual_rate_bps);
        s.set(&DataKey::YieldReserve, &0i128);
        s.set(&DataKey::TotalDeposits, &0i128);
    }

    // --- Employer ---

    /// Deposit USDC → after checkpoint, `principal` increases.
    pub fn deposit(env: Env, employer: Address, amount: i128) {
        employer.require_auth();
        if amount <= 0 {
            panic_err(&env, Error::InvalidArguments);
        }
        bump_instance(&env);

        let mut v = load_vault(&env, &employer);
        checkpoint_vault(&env, &mut v);

        // Take the token (incoming transfer; if it fails the whole tx reverts).
        let client = token::Client::new(&env, &read_token(&env));
        let contract = env.current_contract_address();
        client.transfer(&employer, &contract, &amount);

        v.principal += amount;
        write_vault(&env, &employer, &v);
        write_total_deposits(&env, read_total_deposits(&env) + amount);

        env.events()
            .publish((symbol_short!("deposit"), employer), amount);
    }

    /// Withdraw a specific amount (yield-first deduction; yield is paid from `YieldReserve`).
    pub fn withdraw(env: Env, employer: Address, amount: i128) {
        employer.require_auth();
        if amount <= 0 {
            panic_err(&env, Error::InvalidArguments);
        }
        bump_instance(&env);

        let mut v = load_vault(&env, &employer);
        checkpoint_vault(&env, &mut v);
        if amount > v.principal + v.accrued_yield {
            panic_err(&env, Error::InsufficientBalance);
        }
        let yield_used = payout(&env, &mut v, amount);
        write_vault(&env, &employer, &v);

        // Interaction (CEI): state updated, then transfer.
        let client = token::Client::new(&env, &read_token(&env));
        let contract = env.current_contract_address();
        client.transfer(&contract, &employer, &amount);

        env.events()
            .publish((symbol_short!("withdraw"), employer), (amount, yield_used));
    }

    /// Withdraw the entire balance (principal + accrued yield).
    pub fn withdraw_all(env: Env, employer: Address) {
        employer.require_auth();
        bump_instance(&env);

        let mut v = load_vault(&env, &employer);
        checkpoint_vault(&env, &mut v);
        let amount = v.principal + v.accrued_yield;
        if amount <= 0 {
            write_vault(&env, &employer, &v);
            return;
        }
        let yield_used = payout(&env, &mut v, amount);
        write_vault(&env, &employer, &v);

        let client = token::Client::new(&env, &read_token(&env));
        let contract = env.current_contract_address();
        client.transfer(&contract, &employer, &amount);

        env.events()
            .publish((symbol_short!("withdraw"), employer), (amount, yield_used));
    }

    /// Fund payroll directly from the treasury: deduct yield-first, then
    /// call `payroll_stream.fund(treasury, employer, amount)` (cross-contract).
    pub fn fund_payroll(env: Env, employer: Address, amount: i128) {
        employer.require_auth();
        if amount <= 0 {
            panic_err(&env, Error::InvalidArguments);
        }
        bump_instance(&env);

        let mut v = load_vault(&env, &employer);
        checkpoint_vault(&env, &mut v);
        if amount > v.principal + v.accrued_yield {
            panic_err(&env, Error::InsufficientBalance);
        }
        let yield_used = payout(&env, &mut v, amount);
        v.total_funded_to_payroll += amount;
        write_vault(&env, &employer, &v);

        // Cross-contract: the treasury authorizes the transfer on its own behalf (from=treasury).
        // In Soroban a contract must explicitly authorize its own address's `require_auth`
        // in sub-calls via `authorize_as_current_contract`:
        //   fund(from=treasury, employer, amount)  →  token.transfer(treasury, payroll, amount)
        let payroll = read_payroll_stream(&env);
        let contract = env.current_contract_address();
        // The treasury calls payroll.fund DIRECTLY → fund's `from.require_auth()`
        // (treasury) is met automatically. But in the token.transfer(from=treasury, …)
        // call that payroll makes inside fund, the treasury is NOT the direct caller;
        // it must explicitly authorize this transfer on its own behalf.
        env.authorize_as_current_contract(vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: read_token(&env),
                    fn_name: symbol_short!("transfer"),
                    args: (contract.clone(), payroll.clone(), amount).into_val(&env),
                },
                sub_invocations: vec![&env],
            }),
        ]);
        let p = PayrollStreamCpi::new(&env, &payroll);
        p.fund(&contract, &employer, &amount);

        env.events()
            .publish((symbol_short!("fund_pay"), employer), (amount, yield_used));
    }

    /// Feed the yield reserve (permissionless — anyone can seed).
    pub fn fund_yield_reserve(env: Env, funder: Address, amount: i128) {
        funder.require_auth();
        if amount <= 0 {
            panic_err(&env, Error::InvalidArguments);
        }
        bump_instance(&env);

        let client = token::Client::new(&env, &read_token(&env));
        let contract = env.current_contract_address();
        client.transfer(&funder, &contract, &amount);

        write_yield_reserve(&env, read_yield_reserve(&env) + amount);
        env.events()
            .publish((symbol_short!("res_fund"), funder), amount);
    }

    // --- Admin ---

    /// Update APY (bps) — admin only.
    pub fn set_annual_rate(env: Env, bps: u32) {
        read_admin(&env).require_auth();
        bump_instance(&env);
        let old = read_rate(&env);
        env.storage().instance().set(&DataKey::AnnualRateBps, &bps);
        env.events()
            .publish((symbol_short!("rate_upd"),), (old, bps));
    }

    // --- Views ---

    /// Accrued + pending yield (checkpoint-less projection).
    pub fn pending_yield(env: Env, employer: Address) -> i128 {
        let v = load_vault(&env, &employer);
        let now = env.ledger().timestamp();
        let extra = if now > v.last_checkpoint {
            pending_calc(&env, v.principal, read_rate(&env), now - v.last_checkpoint)
        } else {
            0
        };
        v.accrued_yield + extra
    }

    /// principal + (accrued + pending) yield.
    pub fn total_balance(env: Env, employer: Address) -> i128 {
        let v = load_vault(&env, &employer);
        let now = env.ledger().timestamp();
        let extra = if now > v.last_checkpoint {
            pending_calc(&env, v.principal, read_rate(&env), now - v.last_checkpoint)
        } else {
            0
        };
        v.principal + v.accrued_yield + extra
    }

    pub fn get_vault(env: Env, employer: Address) -> EmployerVault {
        load_vault(&env, &employer)
    }

    pub fn admin(env: Env) -> Address {
        read_admin(&env)
    }

    /// Update the contract WASM (admin only). Address + state are preserved.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        read_admin(&env).require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }

    pub fn token(env: Env) -> Address {
        read_token(&env)
    }

    pub fn payroll_stream(env: Env) -> Address {
        read_payroll_stream(&env)
    }

    pub fn annual_rate_bps(env: Env) -> u32 {
        read_rate(&env)
    }

    pub fn yield_reserve(env: Env) -> i128 {
        read_yield_reserve(&env)
    }

    pub fn total_deposits(env: Env) -> i128 {
        read_total_deposits(&env)
    }
}

// =================== internal helpers ===================

/// Yield-first deduction: first `accrued_yield`, then `principal`. Updates the `YieldReserve` and
/// `TotalDeposits` accounting; returns the amount of yield used.
/// The caller must guarantee `amount <= principal + accrued_yield`.
fn payout(env: &Env, v: &mut EmployerVault, amount: i128) -> i128 {
    let yield_used = amount.min(v.accrued_yield);
    let principal_used = amount - yield_used;
    v.accrued_yield -= yield_used;
    v.principal -= principal_used;

    let yr = read_yield_reserve(env);
    if yield_used > yr {
        panic_err(env, Error::InsufficientYieldReserve);
    }
    write_yield_reserve(env, yr - yield_used);
    write_total_deposits(env, read_total_deposits(env) - principal_used);
    yield_used
}

/// pending = principal * rate_bps * elapsed / (YEAR * 10_000). Overflow-safe;
/// the division's fractional loss favors the protocol (yield is under-computed → reserve is not depleted).
fn pending_calc(env: &Env, principal: i128, rate_bps: u32, elapsed: u64) -> i128 {
    if principal <= 0 || rate_bps == 0 || elapsed == 0 {
        return 0;
    }
    principal
        .checked_mul(rate_bps as i128)
        .unwrap_or_else(|| panic_err(env, Error::InvalidArguments))
        .checked_mul(elapsed as i128)
        .unwrap_or_else(|| panic_err(env, Error::InvalidArguments))
        / YEAR_BPS
}

fn checkpoint_vault(env: &Env, v: &mut EmployerVault) {
    let now = env.ledger().timestamp();
    if now > v.last_checkpoint {
        let add = pending_calc(env, v.principal, read_rate(env), now - v.last_checkpoint);
        v.accrued_yield = v
            .accrued_yield
            .checked_add(add)
            .unwrap_or_else(|| panic_err(env, Error::InvalidArguments));
        v.last_checkpoint = now;
    }
}

fn load_vault(env: &Env, employer: &Address) -> EmployerVault {
    let key = DataKey::Vault(employer.clone());
    if let Some(v) = env.storage().persistent().get::<_, EmployerVault>(&key) {
        env.storage()
            .persistent()
            .extend_ttl(&key, PERSIST_THRESHOLD, PERSIST_EXTEND);
        v
    } else {
        EmployerVault {
            principal: 0,
            accrued_yield: 0,
            last_checkpoint: env.ledger().timestamp(),
            total_funded_to_payroll: 0,
        }
    }
}

fn write_vault(env: &Env, employer: &Address, v: &EmployerVault) {
    let key = DataKey::Vault(employer.clone());
    env.storage().persistent().set(&key, v);
    env.storage()
        .persistent()
        .extend_ttl(&key, PERSIST_THRESHOLD, PERSIST_EXTEND);
}

fn read_admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}
fn read_token(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Token).unwrap()
}
fn read_payroll_stream(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::PayrollStream)
        .unwrap()
}
fn read_rate(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::AnnualRateBps)
        .unwrap_or(0)
}
fn read_yield_reserve(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::YieldReserve)
        .unwrap_or(0)
}
fn write_yield_reserve(env: &Env, val: i128) {
    env.storage().instance().set(&DataKey::YieldReserve, &val);
}
fn read_total_deposits(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::TotalDeposits)
        .unwrap_or(0)
}
fn write_total_deposits(env: &Env, val: i128) {
    env.storage().instance().set(&DataKey::TotalDeposits, &val);
}

fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_THRESHOLD, INSTANCE_EXTEND);
}

fn panic_err(env: &Env, e: Error) -> ! {
    soroban_sdk::panic_with_error!(env, e)
}

mod test;
