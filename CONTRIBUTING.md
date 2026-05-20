# Contributing

Thanks for taking the time to improve Alluo strategies. This guide keeps
contributions focused, reviewable, and safe for a protocol codebase.

## Before you start

- Search the existing issues and pull requests to avoid duplicate work.
- Open an issue before large strategy changes, protocol integrations, deployment
  changes, or security-sensitive work.
- For funded tasks, coordinate assignment and payout privately through the linked
  bounty platform. Do not post wallet addresses, private keys, seed phrases, or
  payment details in GitHub issues or pull requests.

## Local setup

1. Fork and clone the repository.
2. Install dependencies:

   ```sh
   npm install
   ```

   or:

   ```sh
   yarn install
   ```

3. Copy the environment template:

   ```sh
   cp .env.example .env
   ```

4. Fill in local RPC, Etherscan, and deployer settings as needed. Never commit
   `.env` or any secret material.

## Branches and commits

- Create a focused branch, for example `feature/add-new-strategy` or
  `fix/rebalance-edge-case`.
- Keep commits scoped to one logical change.
- Use clear commit messages that describe the behavior changed.

## Development standards

- Keep strategy interfaces compatible unless an issue explicitly approves a
  breaking change.
- Document assumptions about external protocols, pools, gauges, reward tokens,
  or deployment addresses.
- Add or update tests when changing strategy logic, accounting, access control,
  deployment scripts, or upgrade behavior.
- Prefer the smallest safe change over broad refactors.
- Do not include generated artifacts, local cache files, private keys, or
  unrelated formatting churn.

## Checks to run

Run the relevant checks before opening a pull request:

```sh
npx hardhat compile
npx hardhat test
npm run solhint
```

For strategy logic, accounting, or security-sensitive changes, also run:

```sh
npx hardhat coverage
```

For documentation-only changes, confirm the Markdown renders cleanly and run:

```sh
git diff --check
```

## Pull request checklist

Include the following in your pull request:

- A short summary of the change.
- The issue or bounty it addresses, when applicable.
- The checks you ran and their results.
- Any deployment, upgrade, risk, or protocol-integration notes reviewers should
  know.

## Security reports

If you find a vulnerability that could put funds or users at risk, do not open a
public GitHub issue with exploit details. Contact the maintainers privately first
so the issue can be assessed and coordinated responsibly.
