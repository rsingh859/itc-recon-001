# TaxDrive Developer Onboarding & Architecture Guide

Welcome to the **TaxDrive (AutoTax)** engineering team. TaxDrive is an enterprise-grade, high-throughput GST Reconciliation, Outbound E-Invoicing, and Automated Compliance platform engineered specifically for automotive dealership conglomerates and high-volume enterprise supply chains.

---

## 1. High-Level Architecture Topology

TaxDrive is architected as a high-performance **Go Microservices Mesh** on the backend paired with a modern **Micro Frontend (MFE) Host Shell** on the frontend:

```mermaid
graph TD
    subgraph Client [Browser / Frontend]
        ViteHost[React 19 App Shell Host :3000]
        EventBus[Cross-MFE Typed Event Bus]
        ViteHost <--> EventBus
        EventBus <--> MFERecon[Remote 1: mfe-recon : Inbound ITC]
        EventBus <--> MFESales[Remote 2: mfe-sales : Outbound IRN]
        EventBus <--> MFEComp[Remote 3: mfe-compliance : Action Hub & 3B]
    end

    subgraph Ingress [API Gateway Layer]
        Gateway[Go API Gateway :8080<br/>JWT Validation, Rate Limiter & Reverse Proxy]
    end

    subgraph ServiceMesh [Go Domain Microservices Mesh]
        TenantSvc[Tenant & Identity Service :8081]
        IngestSvc[Ingestion & GSP Pipeline :8082]
        ReconSvc[Reconciliation Engine Service :8083]
        InvoiceSvc[Invoicing, Compliance & OEM Service :8084]
        EventBroker[Asynchronous Domain Event Broker]
    end

    subgraph Storage [State & Caching Layer]
        Postgres[(PostgreSQL 16 - Multi-Tenant RLS & ACID Audit Trail)]
        Redis[(Redis 7 - Sub-20ms Result & Filter Cache)]
    end

    ViteHost -->|HTTP /api/v1/*| Gateway
    Gateway -->|/api/v1/tenants/*| TenantSvc
    Gateway -->|/api/v1/ingest/*| IngestSvc
    Gateway -->|/api/v1/recon/*| ReconSvc
    Gateway -->|/api/v1/invoices, /notices, /oem, /gstr3b| InvoiceSvc

    IngestSvc -->|Publish Gstr2bIngestEvent| EventBroker
    EventBroker -->|Trigger Batch Match| ReconSvc
    ReconSvc <--> Redis
    ReconSvc -->|Publish ReconBatchEvent| EventBroker
    EventBroker -->|Trigger Statutory Notices & Payment Locks| InvoiceSvc

    TenantSvc & IngestSvc & ReconSvc & InvoiceSvc <--> Postgres
```

---

## 2. Prerequisites & Toolchain Setup

Ensure the following tools are installed on your workstation:
- **Go**: `v1.22+` (Go 1.25.1 recommended for optimal compiler optimizations).
- **Node.js**: `v20.x` or `v22.x` (with npm `10+` or `11+`).
- **Docker & Docker Compose**: For containerized PostgreSQL and Redis.
- **Git**: For version control.

---

## 3. Repository Directory Layout

```
recon-001-improved/
├── backend/                             # High-Performance Go Microservices Mesh
│   ├── cmd/                             # Service Entrypoints (main packages)
│   │   ├── gateway/                     # API Gateway (Port 8080)
│   │   ├── tenant-service/              # Dealership Hierarchy & Multi-Tenancy (Port 8081)
│   │   ├── ingest-service/              # GSP Sync & DMS Ingestion Pipeline (Port 8082)
│   │   ├── recon-service/               # 7-Tier Reconciliation Compute Engine (Port 8083)
│   │   ├── invoicing-service/           # E-Invoicing, Notices, OEM Schemes & GSTR-3B (Port 8084)
│   │   └── server/                      # All-in-One Unified Server (for single-process dev)
│   ├── internal/                        # Internal domain packages
│   │   ├── cache/                       # Dual-mode Redis + In-Memory TTL cache
│   │   ├── domain/                      # Shared models, entities, and API payloads
│   │   ├── engine/                      # 7-tier matching algorithms, normalizer, and fuzzy search
│   │   ├── events/                      # Asynchronous Event Broker, domain events & consumers
│   │   ├── gateway/                     # JWT parser, reverse proxy, token bucket rate limiter
│   │   ├── handlers/                    # HTTP REST controller handlers
│   │   ├── middleware/                 # CORS, microsecond logger, tenant context, recovery
│   │   └── store/                       # Dual-mode PostgreSQL (RLS) & Memory DataStore
│   └── migrations/                      # Versioned PostgreSQL DDL & RLS policies
│
├── src/                                 # Vite React 19 Frontend with MFE Decomposition
│   ├── api/                             # Typed API client bridge (reconApi, invoicesApi, etc.)
│   ├── components/                      # UI Views (Header, Workbench, Hub, GatePass)
│   ├── context/                         # Multi-Theme Provider (Zurich, Mayfair, Obsidian, etc.)
│   ├── data/                            # Baseline dealership mock datasets
│   ├── mfe/                             # Micro Frontend Architecture
│   │   ├── eventBus.ts                  # Typed Cross-MFE Observable Event Bus
│   │   ├── types.ts                     # Remote MFE props contracts & event map
│   │   ├── remotes/                     # Lazy-loaded remote domain workspaces
│   │   │   ├── recon/                   # Remote 1: Inbound ITC Recon Workbench
│   │   │   ├── sales/                   # Remote 2: Outbound Sales & IRN Stamping
│   │   │   └── compliance/              # Remote 3: Action Hub, OEM Schemes, GSTR-3B
│   │   └── shell/                       # Host container skeleton fallbacks
│   ├── App.tsx                          # App Shell Host Container
│   └── main.tsx                         # Client DOM root entrypoint
│
├── mock-server/                         # Node.js/TSX Mock Integration Server (Port 8081)
├── docker-compose.yml                   # PostgreSQL 16 & Redis 7 local containers
└── package.json                         # Unified npm workflow scripts
```

---

## 4. Local Development Workflows

### Option A: Standard Full Microservices Mode (Recommended)
This runs the full distributed Go mesh behind the API Gateway on port `:8080`:

```powershell
# 1. Start PostgreSQL 16 and Redis 7 in background
npm run db:up

# 2. Build all 5 microservice binaries
npm run services:build

# 3. In separate terminal tabs, launch the services:
npm run services:tenant      # Port 8081
npm run services:ingest      # Port 8082
npm run services:recon       # Port 8083 (with Redis cache)
npm run services:invoicing   # Port 8084
npm run services:gateway     # Port 8080 (Public Gateway)

# 4. In another terminal, start the React MFE frontend:
npm run dev                  # Port 3000
```

### Option B: All-in-One Go Server Mode (Fastest for Backend Development)
Runs all domain capabilities inside a single native Go binary on `:8080` with zero external dependencies (uses in-memory fallback store if `DATABASE_URL` is omitted):

```powershell
# Terminal 1: Launch unified Go server
npm run server:go            # Port 8080

# Terminal 2: Launch Vite React frontend
npm run dev                  # Port 3000
```

### Option C: Mock Server Mode (For Frontend-Only Work)
If you are developing UI components without building Go:

```powershell
# Terminal 1: Launch Node/TSX mock server
npm run mock:server          # Port 8081

# Terminal 2: Launch Vite React frontend
npm run dev                  # Port 3000
```

---

## 5. Multi-Tenant Database Architecture & Row-Level Security (RLS)

### Automatic Embedded Migrations
When `DATABASE_URL` is specified (e.g. `postgres://autotax:autotax_secure_pass_2026@localhost:5432/autotax_db?sslmode=disable`), the Go backend automatically compiles and executes versioned SQL migrations using `//go:embed`:
- `000001_init_schema.up.sql`: Core tables for `tenants`, `branches`, `purchase_register_items`, `gstr2b_items`, `reconciliation_batches`, `reconciled_records`, `sales_invoices`, `compliance_alerts`, `oem_schemes`, `statutory_notice_logs`, and `statutory_audit_logs`.
- `000002_rls_policies.up.sql`: RLS policies enforcing tenant isolation.
- `000003_seed_data.up.sql`: Realistic automotive dealership group baseline data.

### Multi-Tenant Isolation via PostgreSQL RLS
All tenant queries and transaction boundaries execute with session-scoped RLS injection:
```sql
SET LOCAL app.current_tenant_id = 'dms-01';
```
PostgreSQL filters all subsequent queries in the transaction to only rows matching `tenant_id = 'dms-01'`, making accidental cross-tenant data leaks mathematically impossible at the database engine level.

### Immutable WORM Audit Trail
Every manual override, payment hold toggle, or statutory notice dispatch writes an immutable record to `statutory_audit_logs` inside the same ACID transaction, guaranteeing unforgeable Section 16(2)(aa) audit defense dossiers.

---

## 6. Reconciliation Compute Engine Deep-Dive

The 7-Tier matching algorithm in `backend/internal/engine/reconciler.go` executes in microseconds:

| Tier | Classification | Matching Criteria | Primary Action |
|---|---|---|---|
| **Tier 1** | `EXACT_MATCH` | Cleaned Normalized Invoice No + Supplier GSTIN + Tax Amount ($\le ₹10$ tolerance) | Auto-approved for GSTR-3B Table 4(A)(5) |
| **Tier 2** | `FUZZY_MATCH` | Levenshtein Distance $\le 2$ or Similarity Score $\ge 80\%$ (ignoring symbols/formatting) | Highlighted for 1-click batch approval |
| **Tier 3** | `VALUE_MISMATCH` | Exact Invoice No & GSTIN, but Taxable/Tax Amount differs by $> ₹10$ | Supplier credit note / debit note required |
| **Tier 4** | `DATE_MISMATCH` | Matched invoice across different tax periods ($>30$ days difference) | Timing adjustment claim |
| **Tier 5** | `MISSING_IN_2B` | Invoice recorded in ERP Purchase Register but absent from GSTN Portal | Automatic Section 16(2)(aa) WhatsApp notice & ERP payment hold |
| **Tier 6** | `RULE_37_RISK` | Inward supply unpaid beyond 180 days from invoice date | Mandatory ITC reversal with 18% daily interest under Sec 50 |
| **Tier 7** | `BLOCKED_17_5` | Section 17(5) blocked credit (Staff canteen, food, insurance, demo cars) | Permanent reversal in GSTR-3B Table 4(B)(1) / Table 4(D)(1) |

### Parallel Batch Execution
Batches $>500$ rows dynamically shard across multi-core worker pools using `BatchReconcileParallel()` with native Go goroutines and sync wait groups.

---

## 7. Cross-MFE Frontend & Event Bus

The frontend employs a decoupled **Micro Frontend (MFE)** architecture with a typed event bus (`src/mfe/eventBus.ts`):

```typescript
// Subscribing to an event from any remote MFE or component
const unbind = mfeEventBus.on('MATCH_OVERRIDDEN', ({ recordId, action }) => {
  console.log(`Record ${recordId} action changed to ${action}`);
});

// Emitting an event
mfeEventBus.emit('TENANT_CHANGED', {
  dealership: selectedDealership,
  activeGstin: '07AABCA9876K1Z2',
});
```

### Remote MFE Boundaries:
- `mfe-recon`: Inbound purchases, 7-tier matrix, fuzzy match viewer, tolerance tuner.
- `mfe-sales`: Outbound sales register, instant IRN stamping, digital QR codes, delivery gate passes.
- `mfe-compliance`: Executive Action Hub, OEM incentive tracker, GSTR-3B Table 4 returns, and statutory vendor notice dispatches.

---

## 8. Testing & Quality Assurance

### Run Backend Unit Tests & Benchmarks
```powershell
cd backend

# Run all unit tests
go test -v ./...

# Run 7-tier reconciliation engine benchmark
cd internal/engine
go test -bench=. -benchmem
```
*Expected Benchmark Output:* `BenchmarkReconciliationEngine-16: 5.98ms per 5,000 records (~350 KB memory allocation)`.

### Run Frontend Linting & Build
```powershell
# Type check and lint (0 errors)
npm run lint

# Build production bundle with code-split MFE chunks
npm run build
```

---

## 9. Common Troubleshooting & Gotchas

1. **Port Conflicts (`8080`, `8081`, `8082`, `8083`, `8084`, `3000`):**  
   If a port is in use, verify with `Get-NetTCPConnection -LocalPort <port>` in PowerShell or override using environment variables (e.g., `$env:PORT="8090"`).
2. **PostgreSQL Connection Fallback:**  
   If `DATABASE_URL` is omitted or PostgreSQL is not running, the Go backend will automatically fall back to the thread-safe `MemoryStore` with pre-seeded dealership data.
3. **PowerShell CLI Quoting:**  
   When invoking POST endpoints from Windows PowerShell CLI, use `curl.exe` with escaped quotes `\"` or use Node.js `fetch()` / Postman to avoid PowerShell string parser stripping quotes.
