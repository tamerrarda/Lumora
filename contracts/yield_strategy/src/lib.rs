#![no_std]
//! Lumora — yield_strategy (MockStrategy)
//!
//! Yield source adapter (Phase 2 — MockStrategy). Modular design: to plug in different yield
//! sources without changing the core treasury.
//!
//! Interface (YieldStrategy): `deposit / withdraw -> realized / balance / pending`.
//! IMPORTANT: `withdraw` returns the **REALIZED** amount, not the REQUESTED one —
//! the adapter is designed from the start for lossy/asynchronous DeFi.
//!
//! MVP behavior: custodial mock (holds what is deposited; pending=0). The treasury's Phase 2
//! yield math is already reserve-based inline; the real yield-generating `DefiStrategy`
//! (a Stellar-native protocol bridge) will implement this interface in Phase 5/mainnet.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, BytesN, Env,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    // Code range (yield_strategy: 200–299)
    AlreadyInitialized = 200,
    Unauthorized = 201,
    InvalidArguments = 202,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    Balance,
}

#[contract]
pub struct MockStrategy;

#[contractimpl]
impl MockStrategy {
    pub fn __constructor(env: Env, admin: Address, token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_err(&env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Balance, &0i128);
    }

    /// Deposit tokens into the adapter (owner/treasury). `from` sends from its own wallet.
    pub fn deposit(env: Env, from: Address, amount: i128) {
        from.require_auth();
        if amount <= 0 {
            panic_err(&env, Error::InvalidArguments);
        }
        let client = token::Client::new(&env, &read_token(&env));
        let contract = env.current_contract_address();
        client.transfer(&from, &contract, &amount);
        write_balance(&env, read_balance(&env) + amount);
    }

    /// Withdraw from the adapter; returns the **realized** amount (bounded by balance). Admin only.
    pub fn withdraw(env: Env, to: Address, amount: i128) -> i128 {
        read_admin(&env).require_auth();
        if amount <= 0 {
            panic_err(&env, Error::InvalidArguments);
        }
        let bal = read_balance(&env);
        let actual = if amount > bal { bal } else { amount };
        if actual > 0 {
            write_balance(&env, bal - actual);
            let client = token::Client::new(&env, &read_token(&env));
            let contract = env.current_contract_address();
            client.transfer(&contract, &to, &actual);
        }
        actual
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

    /// Total held in the adapter.
    pub fn balance(env: Env) -> i128 {
        read_balance(&env)
    }

    /// Pending yield (mock: 0; the real strategy computes it in Phase 5).
    pub fn pending(_env: Env) -> i128 {
        0
    }
}

fn read_admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

fn read_token(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Token).unwrap()
}

fn read_balance(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::Balance).unwrap_or(0)
}

fn write_balance(env: &Env, val: i128) {
    env.storage().instance().set(&DataKey::Balance, &val);
}

fn panic_err(env: &Env, e: Error) -> ! {
    soroban_sdk::panic_with_error!(env, e)
}

mod test;
