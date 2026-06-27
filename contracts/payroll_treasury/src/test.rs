#![cfg(test)]
use super::*;
use payroll_stream::{PayrollStream, PayrollStreamClient};
use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::token::StellarAssetClient;
use soroban_sdk::{Address, Env};

const YEAR_SECS: u64 = 31_536_000;
const START_TS: u64 = 1_000_000;

struct Ctx {
    env: Env,
    treasury: PayrollTreasuryClient<'static>,
    stream: PayrollStreamClient<'static>,
    token: Address,
    treasury_id: Address,
    stream_id: Address,
    employer: Address,
}

fn setup() -> Ctx {
    let env = Env::default();
    // In fund_payroll the treasury authorizes a sub-call on its own behalf (authorize_as_current_contract);
    // for this to work in tests, a mock that allows non-root auth is needed.
    env.mock_all_auths_allowing_non_root_auth();
    env.ledger().set_timestamp(START_TS);

    let admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token = sac.address();

    // payroll_stream (cross-contract target)
    let stream_id = env.register(PayrollStream, (admin.clone(), token.clone()));
    let stream = PayrollStreamClient::new(&env, &stream_id);

    // treasury (strategy address is a placeholder for now)
    let strategy = Address::generate(&env);
    let treasury_id = env.register(
        PayrollTreasury,
        (
            admin.clone(),
            token.clone(),
            stream_id.clone(),
            strategy,
            500u32, // 5% APY
        ),
    );
    let treasury = PayrollTreasuryClient::new(&env, &treasury_id);

    let employer = Address::generate(&env);

    Ctx {
        env,
        treasury,
        stream,
        token,
        treasury_id,
        stream_id,
        employer,
    }
}

fn mint(ctx: &Ctx, to: &Address, amount: i128) {
    StellarAssetClient::new(&ctx.env, &ctx.token).mint(to, &amount);
}

fn token_balance(ctx: &Ctx, who: &Address) -> i128 {
    token::Client::new(&ctx.env, &ctx.token).balance(who)
}

fn advance(ctx: &Ctx, secs: u64) {
    let t = ctx.env.ledger().timestamp();
    ctx.env.ledger().set_timestamp(t + secs);
}

/// Treasury accounting invariant:
/// token.balance(treasury) == yield_reserve + Σ vault.principal
fn assert_treasury_invariant(ctx: &Ctx, employers: &[&Address]) {
    let bal = token_balance(ctx, &ctx.treasury_id);
    let mut sum = ctx.treasury.yield_reserve();
    for e in employers {
        sum += ctx.treasury.get_vault(e).principal;
    }
    assert_eq!(bal, sum, "treasury accounting invariant violated");
}

#[test]
fn test_init_and_set_rate() {
    let ctx = setup();
    assert_eq!(ctx.treasury.annual_rate_bps(), 500u32);
    assert_eq!(ctx.treasury.yield_reserve(), 0i128);
    assert_eq!(ctx.treasury.total_deposits(), 0i128);
    assert_eq!(ctx.treasury.payroll_stream(), ctx.stream_id);

    ctx.treasury.set_annual_rate(&750u32);
    assert_eq!(ctx.treasury.annual_rate_bps(), 750u32);
}

#[test]
fn test_deposit_credits_principal() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.treasury.deposit(&ctx.employer, &1_000_000);

    assert_eq!(ctx.treasury.get_vault(&ctx.employer).principal, 1_000_000);
    assert_eq!(ctx.treasury.total_deposits(), 1_000_000);
    assert_eq!(token_balance(&ctx, &ctx.treasury_id), 1_000_000);
    assert_eq!(token_balance(&ctx, &ctx.employer), 0);
    assert_eq!(ctx.treasury.pending_yield(&ctx.employer), 0);
    assert_treasury_invariant(&ctx, &[&ctx.employer]);
}

#[test]
fn test_deposit_zero_rejected() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    assert!(ctx.treasury.try_deposit(&ctx.employer, &0).is_err());
}

#[test]
fn test_yield_accrues_linearly_5pct() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.treasury.deposit(&ctx.employer, &1_000_000);

    advance(&ctx, YEAR_SECS); // 1 year @ 5%
    assert_eq!(ctx.treasury.pending_yield(&ctx.employer), 50_000); // 5% of 1M
    assert_eq!(ctx.treasury.total_balance(&ctx.employer), 1_050_000);
}

#[test]
fn test_checkpoint_on_second_deposit() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 2_000_000);
    ctx.treasury.deposit(&ctx.employer, &1_000_000);

    advance(&ctx, YEAR_SECS); // accrued 50_000
    ctx.treasury.deposit(&ctx.employer, &1_000_000); // checkpoint locks, principal 2M
    let v = ctx.treasury.get_vault(&ctx.employer);
    assert_eq!(v.accrued_yield, 50_000);
    assert_eq!(v.principal, 2_000_000);

    advance(&ctx, YEAR_SECS); // +5% of 2M = 100_000
    assert_eq!(ctx.treasury.pending_yield(&ctx.employer), 150_000);
    assert_eq!(ctx.treasury.total_balance(&ctx.employer), 2_150_000);
}

#[test]
fn test_withdraw_yield_first() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.treasury.deposit(&ctx.employer, &1_000_000);
    // seed the reserve (yield payment comes from here)
    let funder = Address::generate(&ctx.env);
    mint(&ctx, &funder, 100_000);
    ctx.treasury.fund_yield_reserve(&funder, &100_000);

    advance(&ctx, YEAR_SECS); // accrued 50_000
    ctx.treasury.withdraw(&ctx.employer, &30_000); // all from yield

    let v = ctx.treasury.get_vault(&ctx.employer);
    assert_eq!(v.accrued_yield, 20_000);
    assert_eq!(v.principal, 1_000_000); // principal untouched
    assert_eq!(ctx.treasury.yield_reserve(), 70_000); // 100k - 30k
    assert_eq!(ctx.treasury.total_deposits(), 1_000_000);
    assert_eq!(token_balance(&ctx, &ctx.employer), 30_000);
    assert_treasury_invariant(&ctx, &[&ctx.employer]);
}

#[test]
fn test_withdraw_exceeds_balance_rejected() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.treasury.deposit(&ctx.employer, &1_000_000);
    assert!(ctx
        .treasury
        .try_withdraw(&ctx.employer, &2_000_000)
        .is_err());
}

#[test]
fn test_withdraw_insufficient_yield_reserve_rejected() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.treasury.deposit(&ctx.employer, &1_000_000);
    advance(&ctx, YEAR_SECS); // accrued 50_000 but reserve 0
    assert!(ctx.treasury.try_withdraw(&ctx.employer, &30_000).is_err());
}

#[test]
fn test_withdraw_all() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.treasury.deposit(&ctx.employer, &1_000_000);
    let funder = Address::generate(&ctx.env);
    mint(&ctx, &funder, 100_000);
    ctx.treasury.fund_yield_reserve(&funder, &100_000);

    advance(&ctx, YEAR_SECS); // accrued 50_000
    ctx.treasury.withdraw_all(&ctx.employer);

    let v = ctx.treasury.get_vault(&ctx.employer);
    assert_eq!(v.principal, 0);
    assert_eq!(v.accrued_yield, 0);
    assert_eq!(ctx.treasury.total_deposits(), 0);
    assert_eq!(ctx.treasury.yield_reserve(), 50_000); // 100k - 50k yield
    assert_eq!(token_balance(&ctx, &ctx.employer), 1_050_000);
    assert_treasury_invariant(&ctx, &[&ctx.employer]);
}

#[test]
fn test_fund_payroll_cross_contract() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.treasury.deposit(&ctx.employer, &1_000_000);
    let funder = Address::generate(&ctx.env);
    mint(&ctx, &funder, 100_000);
    ctx.treasury.fund_yield_reserve(&funder, &100_000);

    advance(&ctx, YEAR_SECS); // accrued 50_000

    // pay 200k to payroll: 50k yield + 150k principal
    ctx.treasury.fund_payroll(&ctx.employer, &200_000);

    let v = ctx.treasury.get_vault(&ctx.employer);
    assert_eq!(v.accrued_yield, 0);
    assert_eq!(v.principal, 850_000);
    assert_eq!(v.total_funded_to_payroll, 200_000);
    assert_eq!(ctx.treasury.total_deposits(), 850_000);
    assert_eq!(ctx.treasury.yield_reserve(), 50_000); // 100k - 50k

    // Cross-contract result: the employer's available balance in payroll_stream increased
    assert_eq!(ctx.stream.employer_balance(&ctx.employer), 200_000);
    assert_eq!(token_balance(&ctx, &ctx.stream_id), 200_000);
    assert_eq!(token_balance(&ctx, &ctx.treasury_id), 900_000);
    assert_treasury_invariant(&ctx, &[&ctx.employer]);
}

#[test]
fn test_fund_payroll_then_create_stream_end_to_end() {
    // Can a real stream be opened and withdrawn using the balance from fund_payroll?
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.treasury.deposit(&ctx.employer, &1_000_000);
    ctx.treasury.fund_payroll(&ctx.employer, &600_000);
    assert_eq!(ctx.stream.employer_balance(&ctx.employer), 600_000);

    let employee = Address::generate(&ctx.env);
    let id = ctx
        .stream
        .create_stream(&ctx.employer, &employee, &1000, &0, &0, &500_000);
    advance(&ctx, 100);
    ctx.stream.withdraw(&id, &50_000);
    assert_eq!(token_balance(&ctx, &employee), 50_000);
}

#[test]
fn test_fund_yield_reserve_permissionless() {
    let ctx = setup();
    let funder = Address::generate(&ctx.env);
    mint(&ctx, &funder, 100_000);
    ctx.treasury.fund_yield_reserve(&funder, &100_000);
    assert_eq!(ctx.treasury.yield_reserve(), 100_000);
    assert_eq!(token_balance(&ctx, &ctx.treasury_id), 100_000);
    assert_eq!(token_balance(&ctx, &funder), 0);
}

#[test]
fn test_yield_math_overflow_safe_large_values() {
    // Boundary: principal=1e16 (1e9 USDC), 5%, 10 years — no overflow, exact result.
    let ctx = setup();
    let big: i128 = 10_000_000_000_000_000; // 1e16
    mint(&ctx, &ctx.employer, big);
    ctx.treasury.deposit(&ctx.employer, &big);
    advance(&ctx, YEAR_SECS * 10);
    // 1e16 * 5% * 10 years = 1e16 * 0.5 = 5e15
    assert_eq!(
        ctx.treasury.pending_yield(&ctx.employer),
        5_000_000_000_000_000
    );
}

#[test]
fn test_reserve_isolation_invariant_mixed_ops() {
    let ctx = setup();
    let e2 = Address::generate(&ctx.env);
    mint(&ctx, &ctx.employer, 2_000_000);
    mint(&ctx, &e2, 3_000_000);
    let funder = Address::generate(&ctx.env);
    mint(&ctx, &funder, 500_000);

    ctx.treasury.deposit(&ctx.employer, &2_000_000);
    ctx.treasury.deposit(&e2, &3_000_000);
    ctx.treasury.fund_yield_reserve(&funder, &500_000);
    assert_treasury_invariant(&ctx, &[&ctx.employer, &e2]);

    advance(&ctx, YEAR_SECS);
    ctx.treasury.withdraw(&ctx.employer, &50_000); // yield
    assert_treasury_invariant(&ctx, &[&ctx.employer, &e2]);

    ctx.treasury.fund_payroll(&e2, &1_000_000);
    assert_treasury_invariant(&ctx, &[&ctx.employer, &e2]);

    ctx.treasury.withdraw_all(&ctx.employer);
    assert_treasury_invariant(&ctx, &[&ctx.employer, &e2]);
}

#[test]
fn test_deposit_requires_employer_auth() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.env.mock_auths(&[]);
    assert!(ctx.treasury.try_deposit(&ctx.employer, &1_000_000).is_err());
}

#[test]
fn test_fund_payroll_enforced_auth_regression() {
    // REGRESSION (bug found on testnet): fund_payroll's cross-contract token
    // transfer must be correctly authorized by the treasury's
    // `authorize_as_current_contract` tree. Other tests use
    // `mock_all_auths_allowing_non_root_auth` so they do NOT actually verify this
    // tree (they auto-accept non-root auth → the bug is masked).
    //
    // This test switches to ENFORCING mode: only the employer's root auth is given;
    // the treasury→payroll_stream token transfer can ONLY be authorized by the
    // treasury's own authorize_as_current_contract. If the tree is wrong
    // (e.g. the transfer is nested under `fund`), the transfer's require_auth blows up
    // and this test fails.
    use soroban_sdk::testutils::{MockAuth, MockAuthInvoke};
    use soroban_sdk::IntoVal;

    let ctx = setup(); // setup: mock_all_auths_allowing_non_root_auth
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.treasury.deposit(&ctx.employer, &1_000_000);
    let funder = Address::generate(&ctx.env);
    mint(&ctx, &funder, 100_000);
    ctx.treasury.fund_yield_reserve(&funder, &100_000);
    advance(&ctx, YEAR_SECS); // accrued 50_000

    // --- Switch to ENFORCING mode: only the employer's fund_payroll call is authorized ---
    let amount: i128 = 200_000;
    ctx.env.mock_auths(&[MockAuth {
        address: &ctx.employer,
        invoke: &MockAuthInvoke {
            contract: &ctx.treasury_id,
            fn_name: "fund_payroll",
            args: (ctx.employer.clone(), amount).into_val(&ctx.env),
            // the employer does not authorize the transfer — the treasury does it on its own behalf.
            sub_invokes: &[],
        },
    }]);

    // Passes if the tree is correct; if wrong, the cross-contract transfer auth blows up.
    ctx.treasury.fund_payroll(&ctx.employer, &amount);

    // Result: the employer balance in the payroll contract increased + tokens moved.
    assert_eq!(ctx.stream.employer_balance(&ctx.employer), 200_000);
    assert_eq!(token_balance(&ctx, &ctx.stream_id), 200_000);
    assert_eq!(
        ctx.treasury
            .get_vault(&ctx.employer)
            .total_funded_to_payroll,
        200_000
    );
}
