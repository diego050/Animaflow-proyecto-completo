# AnimaFlow — Git Workflow & Branching Strategy

> **Last updated:** 2025-05-19

---

## Branch Structure

```
main (production)        ← deploys to VPS production
├── Testing (staging)    ← deploys to VPS staging/testing
│   └── Develop          ← active development, feature branches merge here
│       ├── feature/auth-improvements
│       ├── feature/new-export-formats
│       └── bugfix/mobile-responsive
```

---

## Workflow

1. **Feature Development**
   - Create feature/bugfix branch from `Develop`
   - Naming convention: `feature/short-description` or `bugfix/issue-description`
   - Open Pull Request into `Develop`

2. **Development Integration**
   - PR requires passing CI checks (`test-backend`, `test-frontend`)
   - Merge via squash or merge commit (team preference)
   - CI runs automatically on every push to `Develop`

3. **Staging / QA**
   - When ready for QA, run `scripts/merge-to-testing.sh`
   - This merges `Develop` → `Testing`
   - GitHub Actions auto-deploys to testing VPS
   - QA team validates on staging environment

4. **Production Release**
   - After QA sign-off, run `scripts/merge-to-main.sh`
   - This merges `Testing` → `main`
   - GitHub Actions auto-deploys to production VPS
   - Requires manual approval via GitHub Environment protection

---

## Branch Protection Rules (Manual Setup in GitHub)

### `main` (Production)
- ✅ Require pull request reviews before merging: **1 reviewer**
- ✅ Require status checks to pass: `test-backend`, `test-frontend`
- ✅ Include administrators: **false**
- ✅ Allow force pushes: **false**
- ✅ Allow deletions: **false**

### `Testing` (Staging)
- ✅ Require pull request reviews before merging: **1 reviewer**
- ✅ Require status checks to pass: `test-backend`, `test-frontend`
- ✅ Allow force pushes: **false**

### `Develop`
- ✅ Require pull request reviews before merging: **optional** (team decision)
- ✅ Require status checks to pass: `test-backend`, `test-frontend`

---

## Merge Scripts

| Script | Purpose |
|--------|---------|
| `scripts/merge-to-testing.sh` | Fast-forward `Develop` → `Testing` and trigger staging deploy |
| `scripts/merge-to-main.sh` | Fast-forward `Testing` → `main` and trigger production deploy |

### Usage

```bash
# After QA preparation
chmod +x scripts/merge-to-testing.sh
./scripts/merge-to-testing.sh

# After QA approval
chmod +x scripts/merge-to-main.sh
./scripts/merge-to-main.sh
```

---

## CI/CD Workflows

| Workflow | File | Trigger |
|----------|------|---------|
| **CI — Test & Build** | `.github/workflows/ci.yml` | PR to `Develop`/`Testing`/`main`, push to `Develop` |
| **Deploy to Testing** | `.github/workflows/deploy-testing.yml` | Push to `Testing` |
| **Deploy to Production** | `.github/workflows/deploy-production.yml` | Push to `main` |
| **Security Scan** | `.github/workflows/security.yml` | Weekly cron + PR to `main` |

---

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user authentication
fix: resolve mobile responsive issue
docs: update API documentation
chore: update dependencies
test: add pipeline integration tests
```

---

## Emergency Hotfix Procedure

1. Create branch from `main`: `hotfix/critical-fix`
2. Fix, test, open PR directly to `main`
3. After merge and deploy, cherry-pick or merge back into `Develop` and `Testing`
