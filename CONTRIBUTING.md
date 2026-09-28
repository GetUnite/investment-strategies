# Contributing

Thanks for helping improve Alluo's investment strategies. This guide covers local
development and preparing a focused pull request. For a substantial change, open
or reference an issue describing the problem and intended behavior first.

## Find your way around

- `contracts/`: strategies and `StrategyHandler`.
- `contracts/interfaces/`: protocol interfaces, including `IAlluoStrategyV2`.
- `contracts/deprecated/`: older implementations; check whether your change
  concerns an active strategy before editing these.
- `test/`: TypeScript tests using Hardhat, ethers, Chai and mainnet forks.
- `scripts/`: deployment and configuration scripts. These are not needed for
  local contribution checks.
- `hardhat.config.ts`, `.solhint.json` and `.prettierrc`: compiler, lint and
  formatting settings. `artifacts/`, `cache/` and `typechain/` are generated.

## Set up a local checkout

Fork this repository, clone your fork, and create a branch from `master`. Install
Git, Node.js and npm, then run from the repository root:

```sh
node --version
npm --version
npm ci --no-audit --no-fund
cp .env.example .env
```

Use the committed npm lockfile for a reproducible installation. Avoid mixing npm
and Yarn in the same checkout or including incidental lockfile changes in an
unrelated PR. `npm ci` also installs the repository's Husky hooks.

The locked toolchain uses Hardhat 2.13.0 and Solidity 0.8.14 (optimizer: 100 runs).
Installation and compilation were reproduced with Node.js 18.20.8 and npm 10.8.2.
Node 18 is end-of-life: this is a legacy reproduction environment, not a
recommendation for a deployed service. Keep toolchain upgrades separate from
unrelated changes and report the versions you actually tested.

### Configure the local fork

The default Hardhat network runs in-process and reads Ethereum mainnet state from
`MAINNET_FORKING_URL`. It needs an **archive-capable Ethereum JSON-RPC endpoint**:
the configuration starts at block 16,091,204, and tests reset to historical blocks
between 16,095,613 and 16,666,958. A provider that serves today's state may still
reject these reads.

For local tests, use a disposable public test mnemonic, never a funded wallet's
mnemonic. The following `.env` values configure local accounts and keep the named
deployment networks pointed at loopback. Replace the archive URL placeholder
with your provider's endpoint; do not commit `.env` or credentials.

```dotenv
MNEMONIC="test test test test test test test test test test test junk"
MAINNET_FORKING_URL=https://YOUR_ETHEREUM_ARCHIVE_RPC
MAINNET_URL=http://127.0.0.1:8545
POLYGON_URL=http://127.0.0.1:8545
RINKEBY_URL=http://127.0.0.1:8545
GOERLI_URL=http://127.0.0.1:8545
MUMBAI_URL=http://127.0.0.1:8545
ETHERSCAN_API_KEY=
POLYGONSCAN_API_KEY=
REPORT_GAS=false
CONTRACT_SIZER=false
```

The URL and mnemonic fields are read while Hardhat validates the configuration,
even when you only want to compile. Explorer API keys are unnecessary for local
compilation and testing. `FORKING_ENABLED` in the example file does not disable
forking: the current configuration does not read it.

Run tests with `--network hardhat`. Their deposits, swaps, deployments and time
changes happen inside the local fork. Do not select a live network or run a
deployment script as part of this workflow. You do not need a browser wallet or
funded account.

## Check your change

Compile before testing so that contract artifacts and TypeChain bindings exist:

```sh
npx hardhat help
npx hardhat compile --concurrency 1
npm run solhint
npx solhint 'contracts/**/*.sol'
```

The first compile downloads the Solidity compiler and needs internet access.
The explicit quoted Solhint glob checks all contract paths: the existing npm
script's unquoted glob can expand differently between shells and omit files.
At baseline commit `dd9340b`, the npm lint script passes under Linux `/bin/sh`,
while the recursive command reports 19 errors and 43 warnings. Compare with an
unchanged checkout and identify which findings your change introduces; keep
unrelated cleanup separate.

Start with the test file relevant to your change, then run the suite:

```sh
npx hardhat test --network hardhat --no-compile test/CurveConvexStrategyV2.ts
npx hardhat test --network hardhat --no-compile
```

These are fork integration tests, including their setup hooks. Even a narrowly
selected test can require historical remote state. Respect your RPC provider's
limits and avoid parallel test processes that share the same allowance.

For formatting, check only the files you changed; for this guide, for example:

```sh
npx prettier CONTRIBUTING.md --check
```

Use `--write` on specific files when you intend to format them. Follow nearby
code and the checked-in formatter configuration. Explain contract behavior
changes and add regression coverage for the relevant permissions, asset amounts,
entry/exit behavior or upgrade behavior. Documentation-only changes should have
their commands and links checked, with any unavailable checks reported honestly.

### Existing hooks and common failures

- The pre-commit hook runs `npm run prettier:solidity`, which **writes Solidity
  files**, and then `npm run solhint`. Review `git diff` afterward and keep
  unrelated formatter changes out of your commit.
- The pre-push hook runs `npx hardhat test`; it needs the same fork configuration.
  `npm run alluo-ready` also formats contracts and runs tests, so it is not a
  read-only check.
- Configuration errors about URLs or the mnemonic usually mean `.env` is
  incomplete. Keep local deployment URLs as loopback values.
- Missing artifacts or `typechain` imports: run the compile command first.
- Archive authorization errors, missing historical state or rate limits: check
  the provider's historical-state access and usage limits before blaming the
  strategy under test.
- `InvalidResponseError` mentioning `totalDifficulty`: Hardhat 2.13.0 requires
  this field in historical block responses. A 2026-09-28 baseline run against
  Tenderly's public mainnet endpoint failed in the setup hook because that field
  was omitted, despite successful historical-code reads. The test bodies did
  not run. Use a compatible archive provider or discuss a separate toolchain
  update; do not treat this setup failure as a passing test.

## Submit a focused pull request

1. Link the relevant issue and explain the problem, resulting behavior and scope.
2. Include regression tests for changed behavior and update affected docs.
3. Report your Node/npm versions, exact checks and results. Include baseline
   failures and provider limitations without exposing RPC credentials.
4. Review the diff for generated artifacts, secrets, unrelated formatting and
   lockfile changes. Keep commits focused and open a PR against `master`.
5. Respond to review feedback and rerun the checks affected by revisions.

For a bounty-linked issue, follow its stated application and submission route;
opening a PR does not itself establish assignment, acceptance or payment.
