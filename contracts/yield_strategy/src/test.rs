#![cfg(test)]
use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::StellarAssetClient;
use soroban_sdk::{Address, Env};

struct Ctx {
    env: Env,
    client: MockStrategyClient<'static>,
    token: Address,
    contract_id: Address,
    owner: Address,
}

fn setup() -> Ctx {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token = sac.address();
    // admin = owner (treasury role)
    let contract_id = env.register(MockStrategy, (admin.clone(), token.clone()));
    let client = MockStrategyClient::new(&env, &contract_id);
    Ctx {
        env,
        client,
        token,
        contract_id,
        owner: admin,
    }
}

fn mint(ctx: &Ctx, to: &Address, amount: i128) {
    StellarAssetClient::new(&ctx.env, &ctx.token).mint(to, &amount);
}

fn balance(ctx: &Ctx, who: &Address) -> i128 {
    token::Client::new(&ctx.env, &ctx.token).balance(who)
}

#[test]
fn test_init() {
    let ctx = setup();
    assert_eq!(ctx.client.admin(), ctx.owner);
    assert_eq!(ctx.client.balance(), 0i128);
    assert_eq!(ctx.client.pending(), 0i128);
}

#[test]
fn test_deposit_holds_tokens() {
    let ctx = setup();
    mint(&ctx, &ctx.owner, 1_000_000);
    ctx.client.deposit(&ctx.owner, &1_000_000);
    assert_eq!(ctx.client.balance(), 1_000_000);
    assert_eq!(balance(&ctx, &ctx.contract_id), 1_000_000);
    assert_eq!(balance(&ctx, &ctx.owner), 0);
}

#[test]
fn test_withdraw_returns_actual_capped_at_balance() {
    let ctx = setup();
    mint(&ctx, &ctx.owner, 1_000_000);
    ctx.client.deposit(&ctx.owner, &1_000_000);

    // Requested > balance → realized = balance
    let actual = ctx.client.withdraw(&ctx.owner, &1_500_000);
    assert_eq!(actual, 1_000_000);
    assert_eq!(ctx.client.balance(), 0);
    assert_eq!(balance(&ctx, &ctx.owner), 1_000_000);
}

#[test]
fn test_withdraw_partial() {
    let ctx = setup();
    mint(&ctx, &ctx.owner, 1_000_000);
    ctx.client.deposit(&ctx.owner, &1_000_000);
    let actual = ctx.client.withdraw(&ctx.owner, &400_000);
    assert_eq!(actual, 400_000);
    assert_eq!(ctx.client.balance(), 600_000);
}

#[test]
fn test_deposit_zero_rejected() {
    let ctx = setup();
    mint(&ctx, &ctx.owner, 1_000_000);
    assert!(ctx.client.try_deposit(&ctx.owner, &0).is_err());
}
