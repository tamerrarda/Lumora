# scripts/

Operational helper scripts (deploy/seed).

## seed-demo.sh

Generates staged data for the jury demo: opens a salary stream with a **backdated**
start; so when the employee opens the `/earnings` screen they see a balance that is
**instantly filled and growing second by second** (without waiting for payday — the
essence of the product).

```bash
# default: 30 USDC/month, 1 month, backdated 2 days
bash scripts/seed-demo.sh

# customize
MONTHLY_USDC=100 MONTHS=2 BACKDATE_DAYS=3 bash scripts/seed-demo.sh
```

**Prerequisites**
- `stellar-cli` installed, `testnet` network defined (`stellar network ls`)
- Employer identity (`lumora-dev`) funded + USDC trustline + USDC ≥ the reserve in wallet
  - Testnet USDC: https://faucet.circle.com (select USDC + Stellar Testnet)
- Employee identity (`lumora-employee`) exists + USDC trustline open (for withdrawal)

The script automatically funds the missing contract balance, then creates the stream
and prints the employee address + the `/earnings` link.
