# TaxDrive (AutoTax) — Enterprise GST Reconciliation & E-Invoicing Platform

TaxDrive is a high-throughput, microsecond-latency GST Reconciliation, Outbound E-Invoicing (IRN/EWB), OEM Scheme Auditor, and Autonomous Tax Compliance platform built for automotive dealership networks and high-volume enterprise supply chains.

## Key Architecture & Documentation Links

- **[System Architecture Guide (Architecture.md)](file:///d:/projects/recon-001-improved/Architecture.md)**: Exhaustive technical specification covering the Go microservices mesh, 7-tier reconciliation algorithms, PostgreSQL RLS multi-tenancy, asynchronous event broker, Redis caching, and React 19 MFE shell.
- **[Developer Onboarding Guide (DEVELOPER_ONBOARDING.md)](file:///d:/projects/recon-001-improved/docs/DEVELOPER_ONBOARDING.md)**: Local development setup, toolchain requirements, multi-service run modes, and test commands.
- **[Engine Scaling & Optimization (ENGINE_SCALING_AND_OPTIMIZATION.md)](file:///d:/projects/recon-001-improved/docs/ENGINE_SCALING_AND_OPTIMIZATION.md)**: Benchmarks (5.98ms per 5,000 records), SIMD AVX-512 vectorization, and competitive moats.
- **[Go-to-Market & Investor Pitch (GO_TO_MARKET_AND_INVESTOR_PITCH.md)](file:///d:/projects/recon-001-improved/docs/GO_TO_MARKET_AND_INVESTOR_PITCH.md)**: Business case, enterprise pricing tiers, and OEM TAM analysis.

## Quickstart

### Option 1: One-Command Full Docker Mesh (Recommended for Local Testing)
Starts all 8 services together in Docker (PostgreSQL 16, Redis 7, 4 Go microservices, API Gateway, and React 19 Frontend):
```powershell
# Start everything in background
npm run docker:up          # or: docker compose up -d --build

# View logs for all services
npm run docker:logs        # or: docker compose logs -f

# Check running container health status
npm run docker:ps          # or: docker compose ps

# Stop and clean up all services together
npm run docker:down        # or: docker compose down
```
Open **http://localhost:3000** for the UI or **http://localhost:8080/healthz** for API Gateway health.

---

### Option 2: One-Command Concurrent Native Mesh
Boots PostgreSQL + Redis in Docker, and launches all Go microservices + Frontend concurrently in a single terminal with automatic process cleanup on Ctrl+C:
```powershell
npm run dev:all
```

---

### Option 3: Manual Multi-Terminal Microservices Mode
```powershell
# 1. Start PostgreSQL 16 & Redis 7 in Docker
npm run db:up

# 2. Build Go microservice binaries
npm run services:build

# 3. Launch the 5 backend services (separate terminal tabs):
npm run services:tenant      # Port 8081
npm run services:ingest      # Port 8082
npm run services:recon       # Port 8083 (with Redis cache)
npm run services:invoicing   # Port 8084
npm run services:gateway     # Port 8080 (Public API Gateway)

# 4. Launch Frontend (MFE Host Shell)
npm run dev                  # Port 3000
```

---

### Option 4: Unified All-in-One Server Mode (Fastest for Go dev)
```powershell
# Terminal 1: Unified Go backend (with automatic in-memory fallback if no DB)
npm run server:go            # Port 8080

# Terminal 2: Launch Frontend (MFE Host Shell)
npm run dev                  # Port 3000
```

