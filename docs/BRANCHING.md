# Branching Rules

- **main**: Integration only. Only `docs/`, root files, and merges. No feature work.
- **backend-dev** (folder `wt-backend`, Codex): May edit `backend/` only.
- **frontend-dev** (folder `wt-frontend`, Antigravity): May edit `frontend/` only.
- **Contract changes**: Happen on `main` first (in `kernal-v2`), then `git merge main` inside both worktrees.
- **Sync routine**: Commit and push the dev branch, then in `kernal-v2` run `git merge backend-dev` or `git merge frontend-dev` and push `main`. Then in the other worktree run `git merge main`.
- **Commit message format**: `<prompt-id>: <summary>`, e.g., `C1: phishing and ssrf`, `A2: result page`.
- **Security**: Never commit `.env`, private keys, or API keys.
