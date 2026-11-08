# Threat report registry

The owner is the deployer. Anyone can submit a nonzero digest with one of the five risk classifications as its category. IDs start at zero. Each digest can be used only once across submissions and revisions, including superseded hashes. This keeps each historical digest associated with a single submission or revision. Only the reporter and owner can change a report. Revising increments the revision counter and sets status to Revised.

From backend/contracts run `npm ci` and `npx hardhat test`. The compiler is the pinned solc-js 0.8.24 dependency. See ../scripts/dev_chain.md for deployment.
