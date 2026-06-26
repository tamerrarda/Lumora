#![no_std]
//! Lumora — payroll_stream
//!
//! Salary stream engine (Phase 1).
//! Stream lifecycle: fund / create / withdraw / pause / resume / cancel / settle / update_rate.
//!
//! Signature note: `create_stream`/`batch_create` take, in addition to the spec signature, a leading
//! `employer: Address` — the contract must know which `EmployerBalance` to lock the reserve from and
//! who authorizes it (the caller `Address` is always explicit and `require_auth`'d). `fund` takes
//! `from` + `employer` (permissionless; treasury `fund_payroll` uses this path).
//! Authorization in create/lifecycle is employer-centric; admin/manager-on-behalf creation is Phase 2+.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, BytesN, Env,
    Vec,
};

// --- TTL constants (≈5s ledger) ---
const PERSIST_THRESHOLD: u32 = 17_280; // ~1 day
const PERSIST_EXTEND: u32 = 518_400; // ~30 days
const INSTANCE_THRESHOLD: u32 = 17_280;
const INSTANCE_EXTEND: u32 = 518_400;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    // Code range (payroll_stream: 1–99)
    Unauthorized = 1,
    InvalidStream = 2,
    InvalidArguments = 3,
    NotEmployee = 4,
    StreamInactive = 5,
    InsufficientTreasury = 6,
    AlreadyInitialized = 7,
}

/// Stream state machine.
#[contracttype]
#[derive(Clone)]
pub struct Stream {
    pub employer: Address,
    pub employee: Address,
    pub rate_per_second: i128,
    pub start_time: u64,
    pub end_time: u64, // 0 = infinite
    pub last_checkpoint: u64,
    pub max_total_amount: i128,
    pub accrued_stored: i128,
    pub withdrawn: i128,
    pub reserved_amount: i128,
    pub paused: bool,
    pub canceled: bool,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    NextStreamId,
    PayrollManager(Address),
    StreamData(u64),
    EmployerBalance(Address),
}

#[contract]
pub struct PayrollStream;

// Events are fixed by the contract-first `(topics) + data` schema in
// 09-ARAYUZ-VE-EVENTLER.md §4 (indexer 05 depends on this). SDK 25 deprecates `publish`
// and recommends `#[contractevent]`; that macro changes the topic/data layout, so we
// deliberately keep using publish to preserve the spec schema.
#[allow(deprecated)]
#[contractimpl]
impl PayrollStream {
    /// Initializes the contract with admin + token (USDC SAC).
    pub fn __constructor(env: Env, admin: Address, token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_err(&env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::NextStreamId, &1u64);
    }

    // --- Management ---

    /// Assign/remove role (admin).
    pub fn set_payroll_manager(env: Env, manager: Address, enabled: bool) {
        read_admin(&env).require_auth();
        bump_instance(&env);
        let key = DataKey::PayrollManager(manager.clone());
        env.storage().persistent().set(&key, &enabled);
        env.storage()
            .persistent()
            .extend_ttl(&key, PERSIST_THRESHOLD, PERSIST_EXTEND);
        env.events()
            .publish((symbol_short!("mgr_upd"), manager), enabled);
    }

    // --- Funding ---

    /// `from` transfers USDC from its own wallet to the contract, increasing `employer`'s
    /// available balance. Permissionless: the caller only sends its own money;
    /// no one can reduce another's balance. Direct usage is `from==employer`;
    /// the treasury path is `from=treasury_addr, employer=actual_employer` (fund_payroll → this).
    pub fn fund(env: Env, from: Address, employer: Address, amount: i128) {
        from.require_auth();
        if amount <= 0 {
            panic_err(&env, Error::InvalidArguments);
        }
        bump_instance(&env);

        // Transfer from→contract; if the transfer reverts, no balance trace remains.
        let client = token::Client::new(&env, &read_token(&env));
        let contract = env.current_contract_address();
        client.transfer(&from, &contract, &amount);

        let bal = read_balance(&env, &employer);
        write_balance(&env, &employer, bal + amount);

        env.events()
            .publish((symbol_short!("funded"), employer), amount);
    }

    // --- Stream lifecycle ---

    /// Create a single stream; a reserve of `max_total_amount` is locked from `employer`'s balance.
    pub fn create_stream(
        env: Env,
        employer: Address,
        employee: Address,
        rate_per_second: i128,
        start_time: u64,
        end_time: u64,
        max_total_amount: i128,
    ) -> u64 {
        employer.require_auth();
        bump_instance(&env);
        create_one(
            &env,
            &employer,
            &employee,
            rate_per_second,
            start_time,
            end_time,
            max_total_amount,
        )
    }

    /// Batch creation; all reserves are locked from a single `employer` balance.
    pub fn batch_create(
        env: Env,
        employer: Address,
        employees: Vec<Address>,
        rates: Vec<i128>,
        start_time: u64,
        end_time: u64,
        max_totals: Vec<i128>,
    ) -> Vec<u64> {
        employer.require_auth();
        let n = employees.len();
        if n == 0 || rates.len() != n || max_totals.len() != n {
            panic_err(&env, Error::InvalidArguments);
        }
        bump_instance(&env);

        let mut ids = Vec::new(&env);
        for i in 0..n {
            let employee = employees.get(i).unwrap();
            let rate = rates.get(i).unwrap();
            let max_total = max_totals.get(i).unwrap();
            let id = create_one(
                &env, &employer, &employee, rate, start_time, end_time, max_total,
            );
            ids.push_back(id);
        }
        ids
    }

    /// Update rate after checkpoint. Since the `max_total` reserve already covers the cap,
    /// no extra reserve is needed (accrual is bounded by the cap).
    pub fn update_rate(env: Env, stream_id: u64, new_rate: i128) {
        let mut s = load_stream(&env, stream_id);
        s.employer.require_auth();
        if s.canceled {
            panic_err(&env, Error::StreamInactive);
        }
        if new_rate <= 0 {
            panic_err(&env, Error::InvalidArguments);
        }
        bump_instance(&env);

        checkpoint(&env, &mut s);
        let old = s.rate_per_second;
        s.rate_per_second = new_rate;
        save_stream(&env, stream_id, &s);

        env.events()
            .publish((symbol_short!("rate_upd"), stream_id), (old, new_rate));
    }

    /// Pause the stream (accrual freezes).
    pub fn pause(env: Env, stream_id: u64) {
        let mut s = load_stream(&env, stream_id);
        s.employer.require_auth();
        if s.canceled || s.paused {
            panic_err(&env, Error::StreamInactive);
        }
        bump_instance(&env);

        checkpoint(&env, &mut s);
        s.paused = true;
        save_stream(&env, stream_id, &s);
        env.events()
            .publish((symbol_short!("paused"), stream_id), ());
    }

    /// Resume the stream (the paused period does not accrue).
    pub fn resume(env: Env, stream_id: u64) {
        let mut s = load_stream(&env, stream_id);
        s.employer.require_auth();
        if s.canceled || !s.paused {
            panic_err(&env, Error::StreamInactive);
        }
        bump_instance(&env);

        s.paused = false;
        s.last_checkpoint = effective_now(&env, &s); // skip the gap
        save_stream(&env, stream_id, &s);
        env.events()
            .publish((symbol_short!("resumed"), stream_id), ());
    }

    /// Cancel: freeze accrual, return the unused reserve to the employer.
    /// The employee can later withdraw the accrued (not-yet-withdrawn) amount.
    pub fn cancel(env: Env, stream_id: u64) {
        let mut s = load_stream(&env, stream_id);
        s.employer.require_auth();
        if s.canceled {
            panic_err(&env, Error::StreamInactive);
        }
        bump_instance(&env);

        checkpoint(&env, &mut s);
        s.canceled = true;
        release_excess(&env, &mut s);
        save_stream(&env, stream_id, &s);

        env.events()
            .publish((symbol_short!("canceled"), stream_id), ());
    }

    /// For a finished/capped stream, return the excess reserve to the employer.
    pub fn settle(env: Env, stream_id: u64) {
        let mut s = load_stream(&env, stream_id);
        s.employer.require_auth();
        bump_instance(&env);

        checkpoint(&env, &mut s);
        if !is_finished(&env, &s) {
            // On an active (unfinished/uncapped) stream, settle corrupts the reserve.
            panic_err(&env, Error::InvalidArguments);
        }
        let released = release_excess(&env, &mut s);
        save_stream(&env, stream_id, &s);

        env.events().publish(
            (symbol_short!("settled"), stream_id),
            (released, s.reserved_amount),
        );
    }

    // --- Employee ---

    /// The employee withdraws the earned amount (CEI: state first, then transfer).
    pub fn withdraw(env: Env, stream_id: u64, amount: i128) {
        let mut s = load_stream(&env, stream_id);
        s.employee.require_auth();
        if amount <= 0 {
            panic_err(&env, Error::InvalidArguments);
        }
        bump_instance(&env);

        let claim = accrued(&env, &s) - s.withdrawn;
        if amount > claim {
            panic_err(&env, Error::InvalidArguments);
        }

        // Effects
        s.withdrawn += amount;
        s.reserved_amount -= amount;
        let employee = s.employee.clone();
        save_stream(&env, stream_id, &s);

        // Interaction
        let client = token::Client::new(&env, &read_token(&env));
        let contract = env.current_contract_address();
        client.transfer(&contract, &employee, &amount);

        env.events()
            .publish((symbol_short!("withdraw"), stream_id, employee), amount);
    }

    // --- Views ---

    pub fn claimable(env: Env, stream_id: u64) -> i128 {
        let s = load_stream(&env, stream_id);
        let c = accrued(&env, &s) - s.withdrawn;
        if c < 0 {
            0
        } else {
            c
        }
    }

    pub fn get_stream(env: Env, stream_id: u64) -> Stream {
        load_stream(&env, stream_id)
    }

    pub fn employer_balance(env: Env, employer: Address) -> i128 {
        read_balance(&env, &employer)
    }

    pub fn next_stream_id(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::NextStreamId)
            .unwrap_or(1u64)
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
}

// =================== internal helpers ===================

#[allow(deprecated)] // see the event note in the impl block
fn create_one(
    env: &Env,
    employer: &Address,
    employee: &Address,
    rate_per_second: i128,
    start_time: u64,
    end_time: u64,
    max_total_amount: i128,
) -> u64 {
    if rate_per_second <= 0 || max_total_amount <= 0 {
        panic_err(env, Error::InvalidArguments);
    }
    let start = if start_time == 0 {
        env.ledger().timestamp()
    } else {
        start_time
    };
    if end_time != 0 && end_time <= start {
        panic_err(env, Error::InvalidArguments);
    }

    // Lock the reserve from the employer balance.
    let bal = read_balance(env, employer);
    if bal < max_total_amount {
        panic_err(env, Error::InsufficientTreasury);
    }
    write_balance(env, employer, bal - max_total_amount);

    let id: u64 = env
        .storage()
        .instance()
        .get(&DataKey::NextStreamId)
        .unwrap_or(1u64);
    env.storage()
        .instance()
        .set(&DataKey::NextStreamId, &(id + 1));

    let s = Stream {
        employer: employer.clone(),
        employee: employee.clone(),
        rate_per_second,
        start_time: start,
        end_time,
        last_checkpoint: start,
        max_total_amount,
        accrued_stored: 0,
        withdrawn: 0,
        reserved_amount: max_total_amount,
        paused: false,
        canceled: false,
    };
    save_stream(env, id, &s);

    env.events().publish(
        (symbol_short!("created"), id, employer.clone()),
        (employee.clone(), rate_per_second, max_total_amount),
    );
    id
}

/// Accrual base (bounded by the cap).
fn accrued(env: &Env, s: &Stream) -> i128 {
    let base = if s.canceled || s.paused {
        s.accrued_stored
    } else {
        let now = effective_now(env, s);
        if now <= s.last_checkpoint {
            s.accrued_stored
        } else {
            let delta = (now - s.last_checkpoint) as i128;
            let add = delta
                .checked_mul(s.rate_per_second)
                .unwrap_or_else(|| panic_err(env, Error::InvalidArguments));
            s.accrued_stored
                .checked_add(add)
                .unwrap_or_else(|| panic_err(env, Error::InvalidArguments))
        }
    };
    if base > s.max_total_amount {
        s.max_total_amount
    } else {
        base
    }
}

/// "Now" bounded by end_time.
fn effective_now(env: &Env, s: &Stream) -> u64 {
    let now = env.ledger().timestamp();
    if s.end_time != 0 && now > s.end_time {
        s.end_time
    } else {
        now
    }
}

/// Lock in the accrual up to now (for an active stream).
fn checkpoint(env: &Env, s: &mut Stream) {
    if s.canceled || s.paused {
        return;
    }
    let now = effective_now(env, s);
    if now > s.last_checkpoint {
        s.accrued_stored = accrued(env, s);
        s.last_checkpoint = now;
    }
}

/// Is the stream finished? (canceled / end_time passed / cap reached)
fn is_finished(env: &Env, s: &Stream) -> bool {
    if s.canceled {
        return true;
    }
    if s.accrued_stored >= s.max_total_amount {
        return true;
    }
    s.end_time != 0 && env.ledger().timestamp() >= s.end_time
}

/// Returns the unused reserve (reserved - what is still owed to the employee) to the employer.
/// The returned value is the refunded amount.
fn release_excess(env: &Env, s: &mut Stream) -> i128 {
    let outstanding = s.accrued_stored - s.withdrawn; // what the employee can still withdraw
    let excess = s.reserved_amount - outstanding;
    if excess > 0 {
        s.reserved_amount -= excess;
        let bal = read_balance(env, &s.employer);
        write_balance(env, &s.employer, bal + excess);
        excess
    } else {
        0
    }
}

fn read_admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

fn read_token(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Token).unwrap()
}

fn read_balance(env: &Env, addr: &Address) -> i128 {
    let key = DataKey::EmployerBalance(addr.clone());
    if let Some(v) = env.storage().persistent().get::<_, i128>(&key) {
        env.storage()
            .persistent()
            .extend_ttl(&key, PERSIST_THRESHOLD, PERSIST_EXTEND);
        v
    } else {
        0
    }
}

fn write_balance(env: &Env, addr: &Address, val: i128) {
    let key = DataKey::EmployerBalance(addr.clone());
    env.storage().persistent().set(&key, &val);
    env.storage()
        .persistent()
        .extend_ttl(&key, PERSIST_THRESHOLD, PERSIST_EXTEND);
}

fn load_stream(env: &Env, id: u64) -> Stream {
    let key = DataKey::StreamData(id);
    let s: Stream = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| panic_err(env, Error::InvalidStream));
    env.storage()
        .persistent()
        .extend_ttl(&key, PERSIST_THRESHOLD, PERSIST_EXTEND);
    s
}

fn save_stream(env: &Env, id: u64, s: &Stream) {
    let key = DataKey::StreamData(id);
    env.storage().persistent().set(&key, s);
    env.storage()
        .persistent()
        .extend_ttl(&key, PERSIST_THRESHOLD, PERSIST_EXTEND);
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
