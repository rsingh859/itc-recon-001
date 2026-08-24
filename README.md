# TaxDrive (AutoTax) — Enterprise GST Reconciliation & E-Invoicing Platform

TaxDrive is a high-throughput, microsecond-latency GST Reconciliation, Outbound E-Invoicing (IRN/EWB), OEM Scheme Auditor, and Autonomous Tax Compliance platform built for automotive dealership networks and high-volume enterprise supply chains.

## Key Architecture & Documentation Links

- **[System Architecture Guide (Architecture.md)](file:///d:/projects/recon-001-improved/Architecture.md)**: Exhaustive technical specification covering the Go microservices mesh, 7-tier reconciliation algorithms, PostgreSQL RLS multi-tenancy, asynchronous event broker, Redis caching, and React 19 MFE shell.
- **[Developer Onboarding Guide (DEVELOPER_ONBOARDING.md)](file:///d:/projects/recon-001-improved/docs/DEVELOPER_ONBOARDING.md)**: Local development setup, toolchain requirements, multi-service run modes, and test commands.
- **[Engine Scaling & Optimization (ENGINE_SCALING_AND_OPTIMIZATION.md)](file:///d:/projects/recon-001-improved/docs/ENGINE_SCALING_AND_OPTIMIZATION.md)**: Benchmarks (5.98ms per 5,000 records), SIMD AVX-512 vectorization, and competitive moats.
- **[Go-to-Market & Investor Pitch (GO_TO_MARKET_AND_INVESTOR_PITCH.md)](file:///d:/projects/recon-001-improved/docs/GO_TO_MARKET_AND_INVESTOR_PITCH.md)**: Business case, enterprise pricing tiers, and OEM TAM analysis.

## Quickstart

### Option 1: Full Microservices Mesh Mode (Recommended)
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

### Option 2: Unified All-in-One Server Mode (Fastest)
```powershell
# Terminal 1: Unified Go backend (with automatic in-memory fallback if no DB)
npm run server:go            # Port 8080

# Terminal 2: Launch Frontend (MFE Host Shell)
npm run dev                  # Port 3000
```

