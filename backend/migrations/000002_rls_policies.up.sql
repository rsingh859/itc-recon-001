-- 000002_rls_policies.up.sql
-- Row-Level Security (RLS) policies for multi-tenant isolation

-- Enable RLS on all tenant-scoped tables
ALTER TABLE purchase_register_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gstr2b_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciled_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE oem_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE statutory_notice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE statutory_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create Tenant Isolation Policies using session setting `app.current_tenant_id`
-- If `app.current_tenant_id` is set, only rows belonging to that tenant are visible/modifiable.
-- If unset or empty (e.g. administrative migration tasks), access is unrestricted or defaults.

DO $$
BEGIN
    -- Purchase Register
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_pr') THEN
        CREATE POLICY tenant_isolation_pr ON purchase_register_items
            FOR ALL
            USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '') OR current_setting('app.current_tenant_id', true) IS NULL)
            WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '') OR current_setting('app.current_tenant_id', true) IS NULL);
    END IF;

    -- GSTR-2B
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_2b') THEN
        CREATE POLICY tenant_isolation_2b ON gstr2b_items
            FOR ALL
            USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '') OR current_setting('app.current_tenant_id', true) IS NULL)
            WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '') OR current_setting('app.current_tenant_id', true) IS NULL);
    END IF;

    -- Reconciled Records
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_rec') THEN
        CREATE POLICY tenant_isolation_rec ON reconciled_records
            FOR ALL
            USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '') OR current_setting('app.current_tenant_id', true) IS NULL)
            WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '') OR current_setting('app.current_tenant_id', true) IS NULL);
    END IF;

    -- Sales Invoices
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_sales') THEN
        CREATE POLICY tenant_isolation_sales ON sales_invoices
            FOR ALL
            USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '') OR current_setting('app.current_tenant_id', true) IS NULL)
            WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '') OR current_setting('app.current_tenant_id', true) IS NULL);
    END IF;

    -- Compliance Alerts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_alerts') THEN
        CREATE POLICY tenant_isolation_alerts ON compliance_alerts
            FOR ALL
            USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '') OR current_setting('app.current_tenant_id', true) IS NULL)
            WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '') OR current_setting('app.current_tenant_id', true) IS NULL);
    END IF;

    -- Statutory Audit Logs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_audit') THEN
        CREATE POLICY tenant_isolation_audit ON statutory_audit_logs
            FOR ALL
            USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '') OR current_setting('app.current_tenant_id', true) IS NULL)
            WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '') OR current_setting('app.current_tenant_id', true) IS NULL);
    END IF;
END $$;
