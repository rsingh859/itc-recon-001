import http from 'http';
import url from 'url';
import { 
  DEALERSHIP_PROFILES, 
  MOCK_PURCHASE_REGISTER, 
  MOCK_GSTR_2B, 
  OEM_SCHEMES_MOCK 
} from '../src/data/mockDealershipData';
import { SAMPLE_SALES_INVOICES, SalesInvoiceItem } from '../src/data/salesInvoicesData';
import { 
  SAMPLE_COMPLIANCE_ALERTS, 
  SAMPLE_COMPLIANCE_WORKFLOW_STEPS 
} from '../src/data/complianceOsData';
import { runReconciliation } from '../src/utils/reconciliationEngine';
import { ReconciledRecord } from '../src/types';

const PORT = process.env.MOCK_PORT ? parseInt(process.env.MOCK_PORT, 10) : 8081;

// Mutable In-Memory State for Mock Server
let liveReconciledRecords: ReconciledRecord[] = runReconciliation(MOCK_PURCHASE_REGISTER, MOCK_GSTR_2B);
let liveSalesInvoices: SalesInvoiceItem[] = [...SAMPLE_SALES_INVOICES];
let liveComplianceAlerts = [...SAMPLE_COMPLIANCE_ALERTS];
let noticeLogs: any[] = [];
const startTime = Date.now();

function sendJson(res: http.ServerResponse, status: number, data: any, message = '', executionTimeMs = 0) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type, Content-Length, Authorization, X-Tenant-ID, X-Active-GSTIN, X-Correlation-ID',
    'Access-Control-Expose-Headers': 'X-Correlation-ID, X-Execution-Time-Us, X-Server-Engine',
    'X-Server-Engine': 'NodeJS-TSX-MockServer-V1',
    'X-Execution-Time-Us': `${Math.round(executionTimeMs * 1000)}`,
  });

  const body = {
    success: status >= 200 && status < 300,
    message,
    data,
    meta: {
      correlationId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      executionTimeUs: Math.round(executionTimeMs * 1000),
      executionTimeMs: `${executionTimeMs.toFixed(2)}ms`,
      version: '1.0.0-mock',
    },
  };

  res.end(JSON.stringify(body));
}

function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const start = performance.now();
  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '';
  const method = req.method || 'GET';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept, Content-Type, Content-Length, Authorization, X-Tenant-ID, X-Active-GSTIN, X-Correlation-ID',
    });
    res.end();
    return;
  }

  // Artificial Delay Simulation
  const delay = parsedUrl.query.delay ? parseInt(parsedUrl.query.delay as string, 10) : 0;
  if (delay > 0) {
    await new Promise((r) => setTimeout(r, delay));
  }

  // Synthetic Error Injection
  if (parsedUrl.query.mockError === 'true') {
    const elapsed = performance.now() - start;
    sendJson(res, 500, null, 'Simulated synthetic mock error', elapsed);
    return;
  }

  try {
    // 1. Health & Telemetry
    if (pathname === '/healthz') {
      const elapsed = performance.now() - start;
      sendJson(res, 200, {
        status: 'UP',
        service: 'autotax-mock-server',
        mode: 'MOCK_INTEGRATION_SERVER',
        uptimeSec: Math.floor((Date.now() - startTime) / 1000),
      }, 'Mock server is healthy', elapsed);
      return;
    }

    if (pathname === '/api/v1/metrics') {
      const mem = process.memoryUsage();
      const elapsed = performance.now() - start;
      sendJson(res, 200, {
        goroutines: 1,
        numCPU: 8,
        allocMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
        totalAllocMB: (mem.heapTotal / 1024 / 1024).toFixed(2),
        sysMB: (mem.rss / 1024 / 1024).toFixed(2),
        uptimeSec: Math.floor((Date.now() - startTime) / 1000),
        engineEngine: 'Mock Server In-Memory Simulator',
      }, 'Telemetry metrics retrieved', elapsed);
      return;
    }

    // 2. Tenants & Dealership Profiles
    if (pathname === '/api/v1/tenants/dealerships') {
      const elapsed = performance.now() - start;
      sendJson(res, 200, DEALERSHIP_PROFILES, 'Dealership profiles retrieved', elapsed);
      return;
    }

    if (pathname.startsWith('/api/v1/tenants/dealerships/')) {
      const id = pathname.replace('/api/v1/tenants/dealerships/', '');
      const dealer = DEALERSHIP_PROFILES.find((d) => d.id === id) || DEALERSHIP_PROFILES[0];
      const elapsed = performance.now() - start;
      sendJson(res, 200, dealer, 'Dealership profile retrieved', elapsed);
      return;
    }

    if (pathname === '/api/v1/tenants/current') {
      const elapsed = performance.now() - start;
      sendJson(res, 200, DEALERSHIP_PROFILES[0], 'Current tenant context', elapsed);
      return;
    }

    // 3. Reconciliation Engine Endpoints
    if (pathname === '/api/v1/recon/records') {
      const statusFilter = parsedUrl.query.status as string;
      const categoryFilter = parsedUrl.query.category as string;
      const q = (parsedUrl.query.q as string || '').toLowerCase().trim();

      let filtered = liveReconciledRecords;
      if (statusFilter && statusFilter !== 'ALL') {
        filtered = filtered.filter((r) => r.matchStatus === statusFilter);
      }
      if (categoryFilter && categoryFilter !== 'ALL') {
        filtered = filtered.filter((r) => r.prItem?.category === categoryFilter);
      }
      if (q) {
        filtered = filtered.filter((r) => {
          const prMatch = r.prItem && (
            r.prItem.invoiceNo.toLowerCase().includes(q) ||
            r.prItem.vendorName.toLowerCase().includes(q) ||
            r.prItem.vendorGstin.toLowerCase().includes(q)
          );
          const b2Match = r.gstr2bItem && (
            r.gstr2bItem.invoiceNo.toLowerCase().includes(q) ||
            r.gstr2bItem.supplierName.toLowerCase().includes(q) ||
            r.gstr2bItem.supplierGstin.toLowerCase().includes(q)
          );
          return prMatch || b2Match;
        });
      }

      const elapsed = performance.now() - start;
      sendJson(res, 200, filtered, 'Reconciled records retrieved', elapsed);
      return;
    }

    if (pathname === '/api/v1/recon/run' || pathname === '/api/v1/recon/jobs') {
      liveReconciledRecords = runReconciliation(MOCK_PURCHASE_REGISTER, MOCK_GSTR_2B);
      const elapsed = performance.now() - start;
      sendJson(res, 200, {
        records: liveReconciledRecords,
        totalCount: liveReconciledRecords.length,
      }, 'Reconciliation executed successfully', elapsed);
      return;
    }

    if (pathname === '/api/v1/recon/summary') {
      let prTotalTax = 0;
      let b2TotalTax = 0;
      let matchedTax = 0;
      let atRiskTax = 0;
      let rule37Tax = 0;
      let blocked175Tax = 0;

      liveReconciledRecords.forEach((r) => {
        if (r.prItem) prTotalTax += r.prItem.totalTax;
        if (r.gstr2bItem) b2TotalTax += r.gstr2bItem.totalTax;
        if (r.matchStatus === 'EXACT_MATCH' || r.matchStatus === 'FUZZY_MATCH' || r.matchStatus === 'OEM_CREDIT_PENDING') {
          matchedTax += r.gstr2bItem ? r.gstr2bItem.totalTax : r.prItem?.totalTax || 0;
        } else if (r.matchStatus === 'VALUE_MISMATCH' || r.matchStatus === 'MISSING_IN_2B') {
          atRiskTax += r.prItem?.totalTax || 0;
        } else if (r.matchStatus === 'RULE_37_RISK') {
          rule37Tax += r.prItem?.totalTax || 0;
        } else if (r.matchStatus === 'BLOCKED_17_5') {
          blocked175Tax += r.prItem?.totalTax || 0;
        }
      });

      const elapsed = performance.now() - start;
      sendJson(res, 200, {
        totalPrTax: prTotalTax,
        total2bTax: b2TotalTax,
        matchedTax,
        atRiskTax,
        rule37Tax,
        blocked175Tax,
        totalRecordsCount: liveReconciledRecords.length,
      }, 'Reconciliation summary metrics', elapsed);
      return;
    }

    if (pathname === '/api/v1/recon/override' && method === 'POST') {
      const body = await parseJsonBody(req);
      liveReconciledRecords = liveReconciledRecords.map((r) => {
        if (r.id === body.recordId) {
          return {
            ...r,
            actionRecommended: body.actionRecommended || r.actionRecommended,
            vendorActionStatus: body.vendorActionStatus || r.vendorActionStatus,
          };
        }
        return r;
      });
      const elapsed = performance.now() - start;
      sendJson(res, 200, { recordId: body.recordId, status: 'UPDATED' }, 'Record updated', elapsed);
      return;
    }

    // 4. Invoices & IRN Endpoints
    if (pathname === '/api/v1/invoices' && method === 'GET') {
      const filter = parsedUrl.query.filter as string;
      const q = (parsedUrl.query.q as string || '').toLowerCase().trim();

      let filtered = liveSalesInvoices;
      if (filter === 'IRN_GENERATED') filtered = filtered.filter((i) => i.irnStatus === 'GENERATED');
      if (filter === 'PENDING_IRN') filtered = filtered.filter((i) => i.irnStatus === 'PENDING');
      if (filter === 'FAILED') filtered = filtered.filter((i) => i.irnStatus === 'FAILED');
      if (filter === 'EWB') filtered = filtered.filter((i) => i.ewbStatus === 'GENERATED');

      if (q) {
        filtered = filtered.filter((i) => 
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.customerName.toLowerCase().includes(q) ||
          (i.chassisVin && i.chassisVin.toLowerCase().includes(q)) ||
          (i.vehicleModel && i.vehicleModel.toLowerCase().includes(q))
        );
      }

      const elapsed = performance.now() - start;
      sendJson(res, 200, filtered, 'Sales invoices retrieved', elapsed);
      return;
    }

    if (pathname.startsWith('/api/v1/invoices/') && pathname.endsWith('/irn') && method === 'POST') {
      const id = pathname.replace('/api/v1/invoices/', '').replace('/irn', '');
      let updatedInv: SalesInvoiceItem | null = null;

      liveSalesInvoices = liveSalesInvoices.map((inv) => {
        if (inv.id === id) {
          updatedInv = {
            ...inv,
            irnStatus: 'GENERATED',
            irnNumber: '9f8b2c418e7d23a15b9c0e7f8a9123456789abcdef0123456789abcdef012345',
            ackNumber: `112609${Math.floor(100000 + Math.random() * 900000)}`,
            ackDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
            signedQrPayload: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23fff"/><path d="M10,10 h30 v30 h-30 z M60,10 h30 v30 h-30 z M10,60 h30 v30 h-30 z M20,20 h10 v10 h-10 z M70,20 h10 v10 h-10 z M20,70 h10 v10 h-10 z M50,50 h10 v20 h-10 z" fill="%23000"/></svg>',
          };
          return updatedInv;
        }
        return inv;
      });

      const elapsed = performance.now() - start;
      sendJson(res, 200, updatedInv, 'IRN and 2D QR generated', elapsed);
      return;
    }

    // 5. Ingestion & GSP Endpoints
    if (pathname === '/api/v1/ingest/sync' && method === 'POST') {
      liveReconciledRecords = runReconciliation(MOCK_PURCHASE_REGISTER, MOCK_GSTR_2B);
      const elapsed = performance.now() - start;
      sendJson(res, 200, {
        status: 'COMPLETED',
        provider: 'Mock GSP Adapter (Vayana / IRIS)',
        syncedAt: new Date().toISOString(),
        recordsSynced: MOCK_GSTR_2B.length,
      }, 'GSTR-2B synced via GSP', elapsed);
      return;
    }

    if (pathname === '/api/v1/ingest/status') {
      const elapsed = performance.now() - start;
      sendJson(res, 200, {
        lastSync: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        gspConnection: 'HEALTHY',
        latencyMs: 8,
      }, 'Ingestion status', elapsed);
      return;
    }

    // 6. Notices Endpoints
    if (pathname === '/api/v1/notices/dispatch' && method === 'POST') {
      const body = await parseJsonBody(req);
      const channel = body.channel || 'WHATSAPP';
      liveReconciledRecords = liveReconciledRecords.map((r) => {
        if (r.id === body.recordId) {
          return {
            ...r,
            vendorActionStatus: channel === 'WHATSAPP' ? 'WHATSAPP_SENT' : 'EMAIL_SENT',
            actionRecommended: 'HOLD_PAYMENT',
          };
        }
        return r;
      });

      const entry = {
        id: `MOCK-NOT-${Date.now()}`,
        recordId: body.recordId,
        channel,
        dispatchedAt: new Date().toISOString(),
        status: 'DELIVERED',
      };
      noticeLogs.push(entry);

      const elapsed = performance.now() - start;
      sendJson(res, 200, entry, `Notice dispatched via ${channel}`, elapsed);
      return;
    }

    if (pathname === '/api/v1/notices/logs') {
      const elapsed = performance.now() - start;
      sendJson(res, 200, noticeLogs, 'Notice logs retrieved', elapsed);
      return;
    }

    // 7. Compliance Alerts & Workflow
    if (pathname === '/api/v1/compliance/alerts') {
      const elapsed = performance.now() - start;
      sendJson(res, 200, liveComplianceAlerts, 'Compliance alerts', elapsed);
      return;
    }

    if (pathname.startsWith('/api/v1/compliance/alerts/') && pathname.endsWith('/resolve')) {
      const id = pathname.replace('/api/v1/compliance/alerts/', '').replace('/resolve', '');
      liveComplianceAlerts = liveComplianceAlerts.map((a) => a.id === id ? { ...a, status: 'RESOLVED' } : a);
      const elapsed = performance.now() - start;
      sendJson(res, 200, { id, status: 'RESOLVED' }, 'Alert resolved', elapsed);
      return;
    }

    if (pathname === '/api/v1/compliance/workflow') {
      const elapsed = performance.now() - start;
      sendJson(res, 200, SAMPLE_COMPLIANCE_WORKFLOW_STEPS, 'Workflow steps', elapsed);
      return;
    }

    // 8. OEM Schemes
    if (pathname === '/api/v1/oem/schemes') {
      const elapsed = performance.now() - start;
      sendJson(res, 200, { schemes: OEM_SCHEMES_MOCK }, 'OEM schemes', elapsed);
      return;
    }

    if (pathname === '/api/v1/oem/audit' && method === 'POST') {
      const elapsed = performance.now() - start;
      sendJson(res, 200, { status: 'COMPLETED', auditedSchemes: OEM_SCHEMES_MOCK.length }, 'OEM audit completed', elapsed);
      return;
    }

    // 9. GSTR-3B Table 4
    if (pathname === '/api/v1/gstr3b/summary') {
      let table4A5 = 0;
      let table4B2 = 0;
      let table4D1 = 0;

      liveReconciledRecords.forEach((r) => {
        const tax = r.gstr2bItem ? r.gstr2bItem.totalTax : r.prItem?.totalTax || 0;
        if (r.matchStatus === 'EXACT_MATCH' || r.matchStatus === 'FUZZY_MATCH' || r.matchStatus === 'OEM_CREDIT_PENDING') {
          table4A5 += tax;
        } else if (r.matchStatus === 'RULE_37_RISK') {
          table4A5 += tax;
          table4B2 += tax;
        } else if (r.matchStatus === 'BLOCKED_17_5') {
          table4D1 += tax;
        }
      });

      const elapsed = performance.now() - start;
      sendJson(res, 200, {
        table4A5AllOtherITC: table4A5,
        table4B2Rule37Reversal: table4B2,
        table4CNetITC: table4A5 - table4B2,
        table4D1BlockedSection: table4D1,
      }, 'GSTR-3B Table 4 summary', elapsed);
      return;
    }

    // Not Found
    const elapsed = performance.now() - start;
    sendJson(res, 404, null, `Route not found: ${method} ${pathname}`, elapsed);
  } catch (err: any) {
    const elapsed = performance.now() - start;
    sendJson(res, 500, null, `Internal Mock Server Error: ${err?.message || err}`, elapsed);
  }
});

server.listen(PORT, () => {
  console.log(`\n===================================================`);
  console.log(`🎭 AutoTax UI Integration Mock Server Running on :${PORT}`);
  console.log(`📡 Mirroring Go Backend Contract & Endpoints (/api/v1/*)`);
  console.log(`===================================================\n`);
});
