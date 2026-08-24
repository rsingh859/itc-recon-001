-- 000001_init_schema.up.sql
-- TaxDrive Core Schema with Multi-Tenant Partitioning Support

-- 1. Tenants (Dealership Groups)
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY,
    group_name VARCHAR(255) NOT NULL,
    brand VARCHAR(255) NOT NULL,
    authorized_dealer_for VARCHAR(255) NOT NULL,
    headquarters VARCHAR(255) NOT NULL,
    monthly_invoice_volume INT NOT NULL DEFAULT 0,
    dms_software VARCHAR(64) NOT NULL,
    active_gstin VARCHAR(15) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Dealership Branches
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    gstin VARCHAR(15) NOT NULL,
    state VARCHAR(128) NOT NULL,
    city VARCHAR(128) NOT NULL,
    branch_type VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branch_gstin UNIQUE (tenant_id, gstin)
);

-- 3. Inward Purchase Register Items (from DMS/ERP)
CREATE TABLE IF NOT EXISTS purchase_register_items (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_gstin VARCHAR(15) NOT NULL,
    internal_voucher_no VARCHAR(128) NOT NULL,
    invoice_no VARCHAR(128) NOT NULL,
    invoice_date DATE NOT NULL,
    vendor_gstin VARCHAR(15) NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    taxable_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    igst NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cgst NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    sgst NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cess NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_invoice_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(32) NOT NULL DEFAULT 'UNPAID',
    payment_due_date DATE,
    days_outstanding INT NOT NULL DEFAULT 0,
    is_eligible_itc BOOLEAN NOT NULL DEFAULT TRUE,
    ineligibility_reason TEXT,
    branch_name VARCHAR(128),
    oem_scheme_ref VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pr_tenant_gstin ON purchase_register_items(tenant_id, branch_gstin);
CREATE INDEX IF NOT EXISTS idx_pr_vendor_gstin ON purchase_register_items(vendor_gstin);
CREATE INDEX IF NOT EXISTS idx_pr_invoice_no ON purchase_register_items(invoice_no);

-- 4. Inward GSTR-2B Items (from GSTN Portal)
CREATE TABLE IF NOT EXISTS gstr2b_items (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    dealership_gstin VARCHAR(15) NOT NULL,
    invoice_no VARCHAR(128) NOT NULL,
    invoice_type VARCHAR(32) NOT NULL DEFAULT 'B2B',
    invoice_date DATE NOT NULL,
    supplier_gstin VARCHAR(15) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    taxable_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    igst NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cgst NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    sgst NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cess NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_invoice_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    itc_availability VARCHAR(8) NOT NULL DEFAULT 'Y',
    itc_reason TEXT,
    filing_period VARCHAR(32) NOT NULL,
    gstr1_filing_date DATE,
    irn_status VARCHAR(32) DEFAULT 'GENERATED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_2b_tenant_gstin ON gstr2b_items(tenant_id, dealership_gstin);
CREATE INDEX IF NOT EXISTS idx_2b_supplier_gstin ON gstr2b_items(supplier_gstin);
CREATE INDEX IF NOT EXISTS idx_2b_invoice_no ON gstr2b_items(invoice_no);

-- 5. Reconciliation Batches
CREATE TABLE IF NOT EXISTS reconciliation_batches (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_gstin VARCHAR(15) NOT NULL,
    filing_period VARCHAR(32) NOT NULL,
    total_pr_tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_2b_tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    matched_tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    at_risk_tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    rule37_tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    blocked175_tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_records INT NOT NULL DEFAULT 0,
    execution_time_ms NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Reconciled Records Matrix
CREATE TABLE IF NOT EXISTS reconciled_records (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_gstin VARCHAR(15) NOT NULL,
    batch_id VARCHAR(64) REFERENCES reconciliation_batches(id) ON DELETE SET NULL,
    match_status VARCHAR(64) NOT NULL,
    match_score INT NOT NULL DEFAULT 0,
    pr_item_id VARCHAR(64) REFERENCES purchase_register_items(id) ON DELETE SET NULL,
    gstr2b_item_id VARCHAR(64) REFERENCES gstr2b_items(id) ON DELETE SET NULL,
    tax_difference NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    taxable_difference NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    notes TEXT[] NOT NULL DEFAULT '{}',
    action_recommended VARCHAR(64) NOT NULL,
    vendor_action_status VARCHAR(64) DEFAULT 'NOT_NOTIFIED',
    is_oem_item BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_by VARCHAR(128),
    locked_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rec_tenant_gstin ON reconciled_records(tenant_id, branch_gstin);
CREATE INDEX IF NOT EXISTS idx_rec_status ON reconciled_records(match_status);

-- 7. Outbound Sales Invoices & E-Invoicing
CREATE TABLE IF NOT EXISTS sales_invoices (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number VARCHAR(128) NOT NULL,
    invoice_date DATE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_gstin VARCHAR(15) NOT NULL,
    customer_state_code VARCHAR(8) NOT NULL,
    invoice_type VARCHAR(64) NOT NULL,
    chassis_vin VARCHAR(64),
    vehicle_model VARCHAR(255),
    taxable_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    igst NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cgst NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    sgst NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cess NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    irn_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    irn_number VARCHAR(128),
    ack_number VARCHAR(64),
    ack_date TIMESTAMP WITH TIME ZONE,
    signed_qr_payload TEXT,
    ewb_status VARCHAR(32) NOT NULL DEFAULT 'NOT_REQUIRED',
    ewb_number VARCHAR(64),
    ewb_valid_until TIMESTAMP WITH TIME ZONE,
    vehicle_registration VARCHAR(64),
    erp_sync_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_PUSH',
    failure_reason TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_tenant ON sales_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_irn_status ON sales_invoices(irn_status);

-- 8. Compliance Exception Alerts
CREATE TABLE IF NOT EXISTS compliance_alerts (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    severity VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    impact_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    affected_entity VARCHAR(255) NOT NULL,
    suggested_action TEXT NOT NULL,
    auto_resolution_available BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Compliance Automated Workflow Pipeline Steps
CREATE TABLE IF NOT EXISTS compliance_workflow_steps (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    step_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    automated BOOLEAN NOT NULL DEFAULT TRUE,
    timestamp VARCHAR(64) NOT NULL,
    details TEXT NOT NULL,
    source_module VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. OEM Commercial Schemes & Incentive Claims
CREATE TABLE IF NOT EXISTS oem_schemes (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scheme_name VARCHAR(255) NOT NULL,
    circular_no VARCHAR(128) NOT NULL,
    quarter VARCHAR(32) NOT NULL,
    claimed_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    oem_passed_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    gst_credit_loss NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(64) NOT NULL DEFAULT 'PENDING_OEM_CREDIT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Statutory Section 16(2)(aa) Vendor Notice Logs
CREATE TABLE IF NOT EXISTS statutory_notice_logs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    record_id VARCHAR(64) NOT NULL,
    vendor_gstin VARCHAR(15) NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    dispatched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) NOT NULL DEFAULT 'DELIVERED',
    invoice_no VARCHAR(128) NOT NULL,
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00
);

-- 12. Statutory Audit Logs (WORM - Write Once Read Many for Tax Audit Defense)
CREATE TABLE IF NOT EXISTS statutory_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id VARCHAR(128) NOT NULL DEFAULT 'system',
    action_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    correlation_id VARCHAR(128),
    ip_address VARCHAR(64),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_entity ON statutory_audit_logs(tenant_id, entity_type, entity_id);
