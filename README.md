# DEX AMM Project

## Overview

This project implements a **simplified Decentralized Exchange (DEX)** based on the **Automated Market Maker (AMM)** model, inspired by **Uniswap V2**.  
It allows users to trade two ERC-20 tokens directly from a liquidity pool without relying on order books or centralized intermediaries.

The DEX supports:
- Liquidity provision and removal
- Token swaps using the constant product formula
- Fee distribution to liquidity providers
- Fully automated testing and Docker-based evaluation

---

## Features

- Initial and subsequent liquidity provision
- Liquidity removal with proportional share calculation
- Token swaps using constant product formula (`x * y = k`)
- **0.3% trading fee** rewarded to liquidity providers
- LP share tracking through internal liquidity accounting
- Secure token transfers using SafeERC20
- Reentrancy protection using ReentrancyGuard
- 25+ automated test cases with full coverage

---

## Architecture

### Contract Structure

- **DEX.sol**
  - Core AMM logic
  - Manages reserves, swaps, liquidity, and fees
  - Handles LP accounting internally

- **MockERC20.sol**
  - Simple ERC-20 token used for testing
  - Supports minting for test scenarios

### Design Decisions

- Single liquidity pool for two tokens
- Internal LP accounting instead of a separate LP token (simpler and efficient)
- Fee retained inside the pool to increase LP value
- Explicit reserve tracking (instead of relying on token balances)

---

## Mathematical Implementation

### Constant Product Formula

The pool maintains the invariant:

```text
x * y = k

```

```text
Where:

x = reserve of Token A

y = reserve of Token B

k = constant product

After every swap, k never decreases.
Due to fees remaining in the pool, k increases over time, benefiting liquidity providers.

```
Fee Calculation (0.3%)

For swaps, a 0.3% fee is applied using:
```text
amountInWithFee = amountIn * 997
numerator = amountInWithFee * reserveOut
denominator = (reserveIn * 1000) + amountInWithFee
amountOut = numerator / denominator
```

This ensures:

Traders pay a small fee

Fees stay inside the pool

Liquidity providers earn proportionally


LP Token Minting Logic
Initial Liquidity Provider
```text
liquidityMinted = sqrt(amountA * amountB)
```

The first provider sets the initial price.

Subsequent Liquidity Providers

Liquidity must follow the existing price ratio:
```text
liquidityMinted = (amountA * totalLiquidity) / reserveA
```

Liquidity Removal

Liquidity is withdrawn proportionally:
```text
amountA = (liquidityBurned * reserveA) / totalLiquidity
amountB = (liquidityBurned * reserveB) / totalLiquidity
```

This guarantees fairness and correct fee distribution.

Setup Instructions
Prerequisites

Node.js (v18+)

Docker & Docker Compose

Git


Installation (Docker – Recommended)

Clone the repository:
```bash
git clone <https://github.com/Ashritagogula/dex-amm.git>
cd dex-amm
```

Start Docker:
```bash
docker-compose up -d
```

Compile contracts:
```bash
docker-compose exec app npm run compile
```

Run tests:
```bash
docker-compose exec app npm test
```

Check coverage:
```bash
docker-compose exec app npm run coverage
```

Stop Docker:
```bash
docker-compose down
```

Running Tests Locally (Without Docker)
```bash
npm install
npm run compile
npm test
npm run coverage
```


## Test Coverage

- 25+ automated test cases

- Full line and function coverage

- Edge cases, reverts, fees, and swaps fully tested

- Coverage verified using solidity-coverage

## Security Considerations

- Reentrancy protection using ReentrancyGuard

- Safe ERC-20 transfers using SafeERC20

- Strict input validation (zero amounts, insufficient liquidity)

- Explicit reserve tracking to prevent balance manipulation

- No privileged or owner-only functions

## Known Limitations

- Supports only one token pair

- No slippage protection (minAmountOut)

- No deadline parameter for swaps

- No flash swaps

- No multi-pair factory contract

These are intentionally omitted to keep the implementation focused and educational.

## Conclusion

This project demonstrates how modern DeFi protocols enable decentralized trading using AMMs.
It provides a clean, secure, and well-tested reference implementation of a Uniswap-style DEX with full Docker-based automation.