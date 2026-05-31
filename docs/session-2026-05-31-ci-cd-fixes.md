# Session: CI/CD Pipeline Fixes — 2026-05-31

## Overview
Fixed critical CI/CD pipeline failures blocking deployment and testing.

## Errors & Solutions

### 1. Docker Hub Pull Timeout in CI
**Error:**
```
Error response from daemon: Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection
```
**Root Cause:** GitHub Actions runners experience intermittent network timeouts when pulling Docker images from Docker Hub.

**Solution:** Added manual `docker pull` with retry logic as the first step in the `test-backend` job:
```yaml
- name: Pull postgres image with retries
  run: |
    for i in 1 2 3; do
      docker pull pgvector/pgvector:pg15 && break || echo "Retry $i/3 failed, waiting..." && sleep 10
    done
```
**File Modified:** `.github/workflows/ci.yml`

---

### 2. piper-tts Version Not Found
**Error:**
```
ERROR: Could not find a version that satisfies the requirement piper-tts==1.0.0 (from versions: 1.1.0, 1.2.0, 1.3.0, 1.4.0, 1.4.1, 1.4.2)
ERROR: No matching distribution found for piper-tts==1.0.0
```
**Root Cause:** `piper-tts==1.0.0` does not exist on PyPI. Available versions start from `1.1.0`.

**Solution:** Updated version to `1.4.2` (latest stable):
```diff
- piper-tts==1.0.0
+ piper-tts==1.4.2
```
**File Modified:** `backend/requirements.txt`

---

### 3. Iconify Embedding Model 404
**Error:** Google Gemini API returned 404 for model `text-embedding-004`.

**Root Cause:** The model name `text-embedding-004` is not a valid Gemini embedding model endpoint.

**Solution:** Changed to the correct model name `gemini-embedding-001`:
```diff
- EMBEDDING_MODEL = "text-embedding-004"
+ EMBEDDING_MODEL = "gemini-embedding-001"
```
**File Modified:** `backend/app/services/iconify_search.py`

## Impact
- CI pipeline now resilient to Docker Hub network issues.
- All Python dependencies resolve correctly.
- Iconify semantic search functional with correct embedding model.

## Owner
- Technical Orchestrator

## Date
- 2026-05-31
