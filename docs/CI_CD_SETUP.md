# CI/CD Setup Guide

> **Last updated:** 2025-05-19

---

## Required GitHub Secrets

Go to: **Settings → Secrets and variables → Actions**

### SSH Deployment Secrets

| Secret | Description |
|--------|-------------|
| `SSH_PRIVATE_KEY` | SSH private key for VPS access (`-----BEGIN OPENSSH PRIVATE KEY-----...`) |
| `PRODUCTION_HOST` | Production VPS IP or hostname (e.g., `203.0.113.1` or `animaflow.com`) |
| `PRODUCTION_USER` | VPS username for production (e.g., `ubuntu`, `deploy`) |
| `TESTING_HOST` | Testing/staging VPS IP or hostname |
| `TESTING_USER` | VPS username for testing |

### How to Generate SSH Key

```bash
ssh-keygen -t ed25519 -C "github-actions@animaflow.com" -f ~/.ssh/github_actions
# Add public key to VPS: ~/.ssh/authorized_keys
# Add private key to GitHub Secrets: SSH_PRIVATE_KEY
```

---

## GitHub Environments

Create two environments in **Settings → Environments**:

1. **`testing`** — for staging deployment
   - No protection rules required (auto-deploy on push to `Testing`)

2. **`production`** — for production deployment
   - ✅ **Required reviewers**: at least 1 person
   - ✅ **Deployment branches**: `main` only
   - This ensures manual approval before production deploys

---

## Branch Protection Setup

1. Go to **Settings → Branches**
2. Add rule for **`main`**:
   - Require pull request reviews before merging: **1 reviewer**
   - Require status checks to pass before merging:
     - `test-backend`
     - `test-frontend`
   - Restrict pushes that create files: **enabled**
   - Allow force pushes: **disabled**
   - Allow deletions: **disabled**
3. Add rule for **`Testing`**:
   - Require pull request reviews before merging: **1 reviewer**
   - Require status checks to pass:
     - `test-backend`
     - `test-frontend`
   - Allow force pushes: **disabled**
4. Add rule for **`Develop`**:
   - Require status checks to pass:
     - `test-backend`
     - `test-frontend`
   - Require pull request reviews: **optional** (team decision)

---

## Workflow Summary

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Runs backend tests (pytest + Postgres/Redis), frontend build (TypeScript + Vite), and linting on every PR |
| `.github/workflows/deploy-testing.yml` | SSH into testing VPS, pulls `Testing` branch, runs migrations, restarts Docker services |
| `.github/workflows/deploy-production.yml` | SSH into production VPS, backs up DB, pulls `main`, runs migrations, zero-downtime Docker rebuild, health check |
| `.github/workflows/security.yml` | Weekly Trivy filesystem scan + TruffleHog secret detection on PRs to `main` |

---

## Post-Setup Verification

1. **Verify CI on PR**
   - Create a test branch from `Develop`
   - Make a small change, open PR to `Develop`
   - Confirm all checks (backend, frontend, lint) appear and pass

2. **Verify Testing Deploy**
   - Run `./scripts/merge-to-testing.sh` locally
   - Check GitHub Actions tab for `Deploy to Testing` run
   - Verify staging URL responds correctly

3. **Verify Production Deploy**
   - After QA approval, run `./scripts/merge-to-main.sh`
   - Confirm manual approval step in GitHub Actions
   - After approval, verify production health endpoint

---

## Troubleshooting

### CI fails on backend tests
- Check `DATABASE_URL` and `REDIS_URL` environment variables in `ci.yml`
- Ensure `alembic upgrade head` runs successfully before tests

### Deploy fails with SSH error
- Verify `SSH_PRIVATE_KEY` secret contains the **private** key (not public)
- Ensure VPS has the corresponding public key in `~/.ssh/authorized_keys`
- Check that `TESTING_HOST`/`PRODUCTION_HOST` are correct and reachable

### Docker services don't restart
- Ensure `docker-compose.prod.yml` exists on VPS at `/opt/animaflow/`
- Check that the GitHub Actions user has Docker permissions
- Review logs: `docker-compose -f docker-compose.prod.yml logs`

---

## Related Documentation

- [`docs/GIT_WORKFLOW.md`](GIT_WORKFLOW.md) — Branching strategy and merge procedures
- [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) — Full VPS deployment guide (Spanish)
