#![cfg(test)]
use super::*;
use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::token::StellarAssetClient;
use soroban_sdk::{vec, Address, Env};

const START_TS: u64 = 1_000_000;

struct Ctx {
    env: Env,
    client: PayrollStreamClient<'static>,
    token: Address,
    contract_id: Address,
    employer: Address,
    employee: Address,
}

fn setup() -> Ctx {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(START_TS);

    let admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token = sac.address();
    let contract_id = env.register(PayrollStream, (admin.clone(), token.clone()));
    let client = PayrollStreamClient::new(&env, &contract_id);

    let employer = Address::generate(&env);
    let employee = Address::generate(&env);

    Ctx {
        env,
        client,
        token,
        contract_id,
        employer,
        employee,
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

/// Global accounting invariant:
/// token.balance(contract) == Σ employer_balance + Σ reserved_amount
fn assert_invariant(ctx: &Ctx, employers: &[&Address], stream_ids: &[u64]) {
    let contract_bal = token_balance(ctx, &ctx.contract_id);
    let mut sum = 0i128;
    for e in employers {
        sum += ctx.client.employer_balance(e);
    }
    for id in stream_ids {
        sum += ctx.client.get_stream(id).reserved_amount;
    }
    assert_eq!(contract_bal, sum, "global accounting invariant violated");
}

#[test]
fn test_init_and_reads() {
    let ctx = setup();
    assert_eq!(ctx.client.next_stream_id(), 1u64);
    assert_eq!(ctx.client.token(), ctx.token);
}

#[test]
fn test_fund_moves_tokens_and_credits_balance() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);

    ctx.client.fund(&ctx.employer, &ctx.employer, &1_000_000);

    assert_eq!(ctx.client.employer_balance(&ctx.employer), 1_000_000);
    assert_eq!(token_balance(&ctx, &ctx.employer), 0);
    assert_eq!(token_balance(&ctx, &ctx.contract_id), 1_000_000);
    assert_invariant(&ctx, &[&ctx.employer], &[]);
}

#[test]
fn test_fund_zero_rejected() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    assert!(ctx
        .client
        .try_fund(&ctx.employer, &ctx.employer, &0)
        .is_err());
}

#[test]
fn test_create_locks_reserve() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &1_000_000);

    let id = ctx
        .client
        .create_stream(&ctx.employer, &ctx.employee, &1000, &0, &0, &600_000);

    assert_eq!(id, 1);
    assert_eq!(ctx.client.next_stream_id(), 2);
    assert_eq!(ctx.client.employer_balance(&ctx.employer), 400_000);
    let s = ctx.client.get_stream(&id);
    assert_eq!(s.reserved_amount, 600_000);
    assert_eq!(s.employee, ctx.employee);
    assert_eq!(s.rate_per_second, 1000);
    assert_invariant(&ctx, &[&ctx.employer], &[id]);
}

#[test]
fn test_create_insufficient_treasury_rejected() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 100_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &100_000);

    let res = ctx
        .client
        .try_create_stream(&ctx.employer, &ctx.employee, &1000, &0, &0, &600_000);
    assert!(res.is_err());
}

#[test]
fn test_create_invalid_args_rejected() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &1_000_000);

    // rate <= 0
    assert!(ctx
        .client
        .try_create_stream(&ctx.employer, &ctx.employee, &0, &0, &0, &600_000)
        .is_err());
    // end <= start
    assert!(ctx
        .client
        .try_create_stream(
            &ctx.employer,
            &ctx.employee,
            &1000,
            &(START_TS + 100),
            &(START_TS + 50),
            &600_000
        )
        .is_err());
}

#[test]
fn test_claimable_accrues_linearly() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &1_000_000);
    let id = ctx
        .client
        .create_stream(&ctx.employer, &ctx.employee, &1000, &0, &0, &600_000);

    assert_eq!(ctx.client.claimable(&id), 0);
    advance(&ctx, 100);
    assert_eq!(ctx.client.claimable(&id), 100_000);
    advance(&ctx, 400);
    assert_eq!(ctx.client.claimable(&id), 500_000);
}

#[test]
fn test_claimable_capped_at_max_total() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &1_000_000);
    let id = ctx
        .client
        .create_stream(&ctx.employer, &ctx.employee, &1000, &0, &0, &600_000);

    advance(&ctx, 10_000); // would claim 10M, cap is 600k
    assert_eq!(ctx.client.claimable(&id), 600_000);
}

#[test]
fn test_withdraw_cei_balances() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &1_000_000);
    let id = ctx
        .client
        .create_stream(&ctx.employer, &ctx.employee, &1000, &0, &0, &600_000);

    advance(&ctx, 100); // claimable 100_000
    ctx.client.withdraw(&id, &60_000);

    assert_eq!(token_balance(&ctx, &ctx.employee), 60_000);
    assert_eq!(token_balance(&ctx, &ctx.contract_id), 940_000);
    let s = ctx.client.get_stream(&id);
    assert_eq!(s.withdrawn, 60_000);
    assert_eq!(s.reserved_amount, 540_000);
    assert_eq!(ctx.client.claimable(&id), 40_000);
    assert_invariant(&ctx, &[&ctx.employer], &[id]);
}

#[test]
fn test_withdraw_exceeds_claimable_rejected() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &1_000_000);
    let id = ctx
        .client
        .create_stream(&ctx.employer, &ctx.employee, &1000, &0, &0, &600_000);
    advance(&ctx, 100);
    assert!(ctx.client.try_withdraw(&id, &200_000).is_err());
}

#[test]
fn test_pause_freezes_resume_skips_gap() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 100_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &100_000_000);
    let id = ctx
        .client
        .create_stream(&ctx.employer, &ctx.employee, &1000, &0, &0, &100_000_000);

    advance(&ctx, 100);
    ctx.client.pause(&id); // accrued_stored = 100_000
    advance(&ctx, 200); // paused period is not counted
    assert_eq!(ctx.client.claimable(&id), 100_000);

    ctx.client.resume(&id);
    advance(&ctx, 50);
    assert_eq!(ctx.client.claimable(&id), 150_000);
}

#[test]
fn test_pause_twice_rejected() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &1_000_000);
    let id = ctx
        .client
        .create_stream(&ctx.employer, &ctx.employee, &1000, &0, &0, &600_000);
    ctx.client.pause(&id);
    assert!(ctx.client.try_pause(&id).is_err());
}

#[test]
fn test_cancel_returns_excess_employee_keeps_accrued() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &1_000_000);
    let id = ctx
        .client
        .create_stream(&ctx.employer, &ctx.employee, &1000, &0, &0, &600_000);

    advance(&ctx, 100); // accrued 100_000
    ctx.client.cancel(&id);

    // excess reserve (500_000) returned to the employer
    assert_eq!(ctx.client.employer_balance(&ctx.employer), 900_000);
    let s = ctx.client.get_stream(&id);
    assert!(s.canceled);
    assert_eq!(s.reserved_amount, 100_000);

    // accrual freezes after cancel
    advance(&ctx, 500);
    assert_eq!(ctx.client.claimable(&id), 100_000);

    // the employee can withdraw the accrued amount
    ctx.client.withdraw(&id, &100_000);
    assert_eq!(token_balance(&ctx, &ctx.employee), 100_000);
    assert_eq!(ctx.client.get_stream(&id).reserved_amount, 0);
    assert_invariant(&ctx, &[&ctx.employer], &[id]);
}

#[test]
fn test_settle_after_end_returns_excess() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &1_000_000);
    let end = START_TS + 200;
    let id = ctx
        .client
        .create_stream(&ctx.employer, &ctx.employee, &1000, &0, &end, &600_000);

    advance(&ctx, 300); // end passed; accrual 200*1000 = 200_000 (< 600k cap)
    assert_eq!(ctx.client.claimable(&id), 200_000);

    ctx.client.settle(&id);
    // excess 400_000 returned to the employer
    assert_eq!(ctx.client.employer_balance(&ctx.employer), 800_000);
    assert_eq!(ctx.client.get_stream(&id).reserved_amount, 200_000);
    assert_invariant(&ctx, &[&ctx.employer], &[id]);
}

#[test]
fn test_settle_active_rejected() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &1_000_000);
    let id = ctx
        .client
        .create_stream(&ctx.employer, &ctx.employee, &1000, &0, &0, &600_000);
    advance(&ctx, 100);
    assert!(ctx.client.try_settle(&id).is_err());
}

#[test]
fn test_update_rate_checkpoints() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 100_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &100_000_000);
    let id = ctx
        .client
        .create_stream(&ctx.employer, &ctx.employee, &1000, &0, &0, &100_000_000);

    advance(&ctx, 100); // accrued 100_000 @ rate 1000
    ctx.client.update_rate(&id, &2000);
    advance(&ctx, 100); // +100 * 2000 = 200_000
    assert_eq!(ctx.client.claimable(&id), 300_000);
}

#[test]
fn test_batch_create() {
    let ctx = setup();
    let e1 = Address::generate(&ctx.env);
    let e2 = Address::generate(&ctx.env);
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &1_000_000);

    let ids = ctx.client.batch_create(
        &ctx.employer,
        &vec![&ctx.env, e1.clone(), e2.clone()],
        &vec![&ctx.env, 1000i128, 2000i128],
        &0,
        &0,
        &vec![&ctx.env, 300_000i128, 300_000i128],
    );

    assert_eq!(ids, vec![&ctx.env, 1u64, 2u64]);
    assert_eq!(ctx.client.employer_balance(&ctx.employer), 400_000);
    assert_eq!(ctx.client.get_stream(&1).reserved_amount, 300_000);
    assert_eq!(ctx.client.get_stream(&2).employee, e2);
    assert_invariant(&ctx, &[&ctx.employer], &[1, 2]);
}

#[test]
fn test_batch_create_length_mismatch_rejected() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &1_000_000);
    let res = ctx.client.try_batch_create(
        &ctx.employer,
        &vec![&ctx.env, ctx.employee.clone()],
        &vec![&ctx.env, 1000i128, 2000i128], // length mismatch
        &0,
        &0,
        &vec![&ctx.env, 300_000i128],
    );
    assert!(res.is_err());
}

#[test]
fn test_set_payroll_manager() {
    let ctx = setup();
    let mgr = Address::generate(&ctx.env);
    ctx.client.set_payroll_manager(&mgr, &true); // no panic = success
}

#[test]
fn test_invalid_stream_id_rejected() {
    let ctx = setup();
    assert!(ctx.client.try_get_stream(&999).is_err());
    assert!(ctx.client.try_claimable(&999).is_err());
}

#[test]
fn test_withdraw_requires_employee_auth() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 1_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &1_000_000);
    let id = ctx
        .client
        .create_stream(&ctx.employer, &ctx.employee, &1000, &0, &0, &600_000);
    advance(&ctx, 100);

    // No signature → employee.require_auth() fails
    ctx.env.mock_auths(&[]);
    assert!(ctx.client.try_withdraw(&id, &10_000).is_err());
}

#[test]
fn test_invariant_through_mixed_ops() {
    let ctx = setup();
    mint(&ctx, &ctx.employer, 10_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &10_000_000);

    let id1 = ctx
        .client
        .create_stream(&ctx.employer, &ctx.employee, &1000, &0, &0, &3_000_000);
    let e2 = Address::generate(&ctx.env);
    let id2 =
        ctx.client
            .create_stream(&ctx.employer, &e2, &500, &0, &(START_TS + 1000), &2_000_000);

    assert_invariant(&ctx, &[&ctx.employer], &[id1, id2]);

    advance(&ctx, 300);
    ctx.client.withdraw(&id1, &200_000);
    assert_invariant(&ctx, &[&ctx.employer], &[id1, id2]);

    ctx.client.pause(&id1);
    assert_invariant(&ctx, &[&ctx.employer], &[id1, id2]);

    advance(&ctx, 1000); // id2 end passed
    ctx.client.settle(&id2);
    assert_invariant(&ctx, &[&ctx.employer], &[id1, id2]);

    ctx.client.cancel(&id1);
    assert_invariant(&ctx, &[&ctx.employer], &[id1, id2]);
}

#[test]
fn test_active_stream_survives_long_ledger_gap() {
    // An active stream stays accessible across a long ledger gap.
    let ctx = setup();
    mint(&ctx, &ctx.employer, 100_000_000);
    ctx.client.fund(&ctx.employer, &ctx.employer, &100_000_000);
    let id = ctx
        .client
        .create_stream(&ctx.employer, &ctx.employee, &1000, &0, &0, &100_000_000);

    // Advance the ledger forward by a long gap (within the extend_ttl window).
    ctx.env.ledger().with_mut(|li| {
        li.sequence_number += 400_000;
        li.timestamp += 400_000 * 5;
    });

    // Still accessible + accrual is correct.
    let s = ctx.client.get_stream(&id);
    assert_eq!(s.employee, ctx.employee);
    assert_eq!(ctx.client.claimable(&id), 100_000_000); // cap reached
}
