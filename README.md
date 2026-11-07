# AI-Powered Web Threat Detection & Digital Trust Intelligence

An intelligent threat detection and digital trust system that evaluates web threats (phishing, spoofing, malicious redirects, TLS/header anomalies) and social engineering messages, provides AI-driven threat explanations, and records auditable cryptographic proofs on-chain for verification.

## Folder Structure

```
kernal-fresh/
  kernal-v2/           # Main branch checkout (integration & documentation)
    backend/           # FastAPI backend + Hardhat contracts
    frontend/          # Next.js dashboard
    docs/              # API contract and branching guidelines
  wt-backend/          # Git worktree for branch backend-dev (Codex)
  wt-frontend/         # Git worktree for branch frontend-dev (Antigravity)
```

## Branch Table

| Branch | Worktree Folder | Role / Scope | Primary Agent |
| :--- | :--- | :--- | :--- |
| `main` | `kernal-v2` | Integration, root configuration, docs | Main Integrator |
| `backend-dev` | `wt-backend` | Backend FastAPI services, Hardhat contracts | Codex |
| `frontend-dev` | `wt-frontend` | Next.js frontend UI dashboard | Antigravity |

## How to run: TODO
