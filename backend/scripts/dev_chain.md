# Run the registry

From backend/ in Windows PowerShell:

```powershell
npm ci --prefix contracts
.\scripts\start_local_chain.ps1
$env:CHAIN_MODE = 'local'
.\.venv\Scripts\python.exe -m scripts.seed
.\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000
```

The helper deploys a new contract, reuses an existing local node on chain 31337, or starts a hidden loopback-only Hardhat node. It prints a stop command for a node it started. For manual setup, run the following from backend/contracts in two terminals. Redirect node output because Hardhat prints public development credentials.

```powershell
npx hardhat node --hostname 127.0.0.1 *> $null
```

```powershell
npx hardhat run scripts/deploy.ts --network localhost
```

Use CHAIN_MODE=local and leave CONTRACT_ADDRESS empty to use deployments/localhost.json. Local RPC is http://127.0.0.1:8545. Restarting an in-memory node clears its chain. Deploy again before publishing; old database receipts need their original chain history to verify. Seeding attempts to publish only fixture zero when the local registry is reachable.

## Sepolia

Use a throwaway Sepolia wallet funded with faucet test ETH. Set SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY in backend/.env, switch CHAIN_MODE to sepolia, then run `npx hardhat run scripts/deploy.ts --network sepolia` from backend/contracts. The backend uses that wallet to sign submissions to chain 11155111. Leave CONTRACT_ADDRESS empty to load the deployed address, or set it to the intended registry. Deployment manifests contain only the address, ABI, chain ID and deployment block. Never add a key or credential-bearing RPC URL to a manifest.

## Hash and verification

The backend hashes a UTF-8 JSON projection of the deterministic report with Ethereum Keccak-256. Timestamps use UTC, object keys are sorted, arrays retain report order, and the TLS issuer is committed by digest because certificate names may contain contact information. Only the digest and risk classification enter submission calldata. Message text, input previews, raw URLs, AI output and free-form evidence are excluded.

Verify returns HTTP 409 for unpublished reports and HTTP 503 when the chain or registry is unavailable. It compares the stored report with the current chain digest and returns ordered submission, status and revision events. Seeded fixtures and legacy simulated receipts are never proof of a real publication.
