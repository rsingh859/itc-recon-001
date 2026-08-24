package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
	"github.com/autotax/backend/internal/domain"
	"github.com/lib/pq"
)

// PostgresStore implements DataStore backed by a relational PostgreSQL database with RLS
type PostgresStore struct {
	db        *sql.DB
	startTime time.Time
}

// NewPostgresStore creates a connection pool, applies migrations, and returns a PostgresStore
func NewPostgresStore(ctx context.Context, connString string) (*PostgresStore, error) {
	db, err := sql.Open("postgres", connString)
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres connection: %w", err)
	}

	// Configure connection pooling
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(1 * time.Minute)

	// Verify connectivity
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("postgres ping failed: %w", err)
	}

	log.Println("Connected to PostgreSQL successfully. Running migrations...")
	if err := RunMigrations(ctx, db); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("database migration failed: %w", err)
	}

	return &PostgresStore{
		db:        db,
		startTime: time.Now(),
	}, nil
}

// GetStartTime returns the instance start time
func (s *PostgresStore) GetStartTime() time.Time {
	return s.startTime
}

// Close closes the database connection pool
func (s *PostgresStore) Close() error {
	if s.db != nil {
		return s.db.Close()
	}
	return nil
}

// withTenantTx runs a function inside a transaction with tenant RLS context set
func (s *PostgresStore) withTenantTx(ctx context.Context, tenantID string, fn func(tx *sql.Tx) error) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin tx: %w", err)
	}

	if tenantID != "" {
		if _, err := tx.ExecContext(ctx, "SET LOCAL app.current_tenant_id = $1", tenantID); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("failed to set tenant RLS context: %w", err)
		}
	}

	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}

	return tx.Commit()
}

// GetDealerships returns all registered organizations
func (s *PostgresStore) GetDealerships(ctx context.Context) ([]domain.DealershipProfile, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, group_name, brand, authorized_dealer_for, headquarters, monthly_invoice_volume, dms_software, active_gstin
		FROM tenants
		ORDER BY id ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("query tenants failed: %w", err)
	}
	defer rows.Close()

	var profiles []domain.DealershipProfile
	for rows.Next() {
		var p domain.DealershipProfile
		var dmsSoftware string
		if err := rows.Scan(&p.ID, &p.GroupName, &p.Brand, &p.AuthorizedDealerFor, &p.Headquarters, &p.MonthlyInvoiceVolume, &dmsSoftware, &p.ActiveGSTIN); err != nil {
			return nil, err
		}
		p.DMSSoftware = dmsSoftware

		// Query branches
		bRows, err := s.db.QueryContext(ctx, `
			SELECT gstin, state, city, branch_type
			FROM branches
			WHERE tenant_id = $1
			ORDER BY id ASC
		`, p.ID)
		if err == nil {
			for bRows.Next() {
				var b domain.DealershipBranch
				if err := bRows.Scan(&b.GSTIN, &b.State, &b.City, &b.Type); err == nil {
					p.Branches = append(p.Branches, b)
				}
			}
			bRows.Close()
		}

		profiles = append(profiles, p)
	}

	return profiles, nil
}

// GetDealershipByID returns a specific dealership
func (s *PostgresStore) GetDealershipByID(ctx context.Context, id string) (*domain.DealershipProfile, error) {
	var p domain.DealershipProfile
	var dmsSoftware string
	err := s.db.QueryRowContext(ctx, `
		SELECT id, group_name, brand, authorized_dealer_for, headquarters, monthly_invoice_volume, dms_software, active_gstin
		FROM tenants
		WHERE id = $1
	`, id).Scan(&p.ID, &p.GroupName, &p.Brand, &p.AuthorizedDealerFor, &p.Headquarters, &p.MonthlyInvoiceVolume, &dmsSoftware, &p.ActiveGSTIN)
	if err != nil {
		return nil, fmt.Errorf("dealership not found: %w", err)
	}
	p.DMSSoftware = dmsSoftware

	bRows, err := s.db.QueryContext(ctx, `
		SELECT gstin, state, city, branch_type
		FROM branches
		WHERE tenant_id = $1
		ORDER BY id ASC
	`, p.ID)
	if err == nil {
		for bRows.Next() {
			var b domain.DealershipBranch
			if err := bRows.Scan(&b.GSTIN, &b.State, &b.City, &b.Type); err == nil {
				p.Branches = append(p.Branches, b)
			}
		}
		bRows.Close()
	}

	return &p, nil
}

// GetPurchaseRegister returns inward ERP purchase registers
func (s *PostgresStore) GetPurchaseRegister(ctx context.Context, tenantID, gstin string) ([]domain.PurchaseRegisterItem, error) {
	query := `
		SELECT id, internal_voucher_no, invoice_no, invoice_date, vendor_gstin, vendor_name, category,
		       taxable_value, igst, cgst, sgst, cess, total_tax, total_invoice_value,
		       payment_status, days_outstanding, is_eligible_itc, COALESCE(branch_name, ''), COALESCE(oem_scheme_ref, ''), branch_gstin
		FROM purchase_register_items
		WHERE ($1 = '' OR tenant_id = $1)
		  AND ($2 = '' OR branch_gstin = $2)
		ORDER BY invoice_date DESC
	`
	rows, err := s.db.QueryContext(ctx, query, tenantID, gstin)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.PurchaseRegisterItem
	for rows.Next() {
		var pr domain.PurchaseRegisterItem
		var invDate time.Time
		var cat string
		if err := rows.Scan(
			&pr.ID, &pr.InternalVoucherNo, &pr.InvoiceNo, &invDate, &pr.VendorGSTIN, &pr.VendorName, &cat,
			&pr.TaxableValue, &pr.IGST, &pr.CGST, &pr.SGST, &pr.Cess, &pr.TotalTax, &pr.TotalInvoiceValue,
			&pr.PaymentStatus, &pr.DaysOutstanding, &pr.IsEligibleITC, &pr.BranchName, &pr.OEMSchemeRef, &pr.GSTIN,
		); err != nil {
			return nil, err
		}
		pr.InvoiceDate = invDate.Format("2006-01-02")
		pr.Category = domain.DealershipCategory(cat)
		items = append(items, pr)
	}

	return items, nil
}

// GetGstr2B returns inward GSTR-2B supplies
func (s *PostgresStore) GetGstr2B(ctx context.Context, tenantID, gstin string) ([]domain.Gstr2BItem, error) {
	query := `
		SELECT id, invoice_no, invoice_type, invoice_date, supplier_gstin, supplier_name,
		       taxable_value, igst, cgst, sgst, cess, total_tax, total_invoice_value,
		       itc_availability, COALESCE(itc_reason, ''), filing_period, COALESCE(gstr1_filing_date, invoice_date), COALESCE(irn_status, 'GENERATED'), dealership_gstin
		FROM gstr2b_items
		WHERE ($1 = '' OR tenant_id = $1)
		  AND ($2 = '' OR dealership_gstin = $2)
		ORDER BY invoice_date DESC
	`
	rows, err := s.db.QueryContext(ctx, query, tenantID, gstin)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.Gstr2BItem
	for rows.Next() {
		var b2 domain.Gstr2BItem
		var invDate, gstr1Date time.Time
		if err := rows.Scan(
			&b2.ID, &b2.InvoiceNo, &b2.InvoiceType, &invDate, &b2.SupplierGSTIN, &b2.SupplierName,
			&b2.TaxableValue, &b2.IGST, &b2.CGST, &b2.SGST, &b2.Cess, &b2.TotalTax, &b2.TotalInvoiceValue,
			&b2.ITCAvailability, &b2.ITCReason, &b2.FilingPeriod, &gstr1Date, &b2.IRNStatus, &b2.DealershipGSTIN,
		); err != nil {
			return nil, err
		}
		b2.InvoiceDate = invDate.Format("2006-01-02")
		b2.GSTR1FilingDate = gstr1Date.Format("2006-01-02")
		items = append(items, b2)
	}

	return items, nil
}

// SaveReconciledRecords saves reconciled records in an ACID transaction
func (s *PostgresStore) SaveReconciledRecords(ctx context.Context, tenantID, gstin string, records []domain.ReconciledRecord) error {
	return s.withTenantTx(ctx, tenantID, func(tx *sql.Tx) error {
		// Delete existing records for this branch to refresh
		_, _ = tx.ExecContext(ctx, "DELETE FROM reconciled_records WHERE tenant_id = $1 AND branch_gstin = $2", tenantID, gstin)

		stmt, err := tx.PrepareContext(ctx, `
			INSERT INTO reconciled_records (
				id, tenant_id, branch_gstin, match_status, match_score, pr_item_id, gstr2b_item_id,
				tax_difference, taxable_difference, notes, action_recommended, vendor_action_status, is_oem_item
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		`)
		if err != nil {
			return err
		}
		defer stmt.Close()

		for _, r := range records {
			var prID, b2ID *string
			if r.PRItem != nil {
				prID = &r.PRItem.ID
			}
			if r.GSTR2BItem != nil {
				b2ID = &r.GSTR2BItem.ID
			}

			_, err := stmt.ExecContext(ctx,
				r.ID, tenantID, gstin, string(r.MatchStatus), r.MatchScore, prID, b2ID,
				r.TaxDifference, r.TaxableDifference, pq.Array(r.Notes), r.ActionRecommended, r.VendorActionStatus, r.IsOEMItem,
			)
			if err != nil {
				return err
			}
		}

		return nil
	})
}

// GetReconciledRecords returns reconciled records
func (s *PostgresStore) GetReconciledRecords(ctx context.Context, tenantID, gstin string) ([]domain.ReconciledRecord, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT r.id, r.match_status, r.match_score, r.tax_difference, r.taxable_difference, r.notes, r.action_recommended, COALESCE(r.vendor_action_status, 'NOT_NOTIFIED'), r.is_oem_item,
		       pr.id, pr.internal_voucher_no, pr.invoice_no, pr.invoice_date, pr.vendor_gstin, pr.vendor_name, pr.category, pr.taxable_value, pr.igst, pr.cgst, pr.sgst, pr.cess, pr.total_tax, pr.total_invoice_value, pr.payment_status, pr.days_outstanding, pr.is_eligible_itc, COALESCE(pr.branch_name, ''), pr.branch_gstin,
		       b2.id, b2.invoice_no, b2.invoice_type, b2.invoice_date, b2.supplier_gstin, b2.supplier_name, b2.taxable_value, b2.igst, b2.cgst, b2.sgst, b2.cess, b2.total_tax, b2.total_invoice_value, b2.itc_availability, COALESCE(b2.itc_reason, ''), b2.filing_period, b2.gstr1_filing_date, b2.irn_status, b2.dealership_gstin
		FROM reconciled_records r
		LEFT JOIN purchase_register_items pr ON r.pr_item_id = pr.id
		LEFT JOIN gstr2b_items b2 ON r.gstr2b_item_id = b2.id
		WHERE ($1 = '' OR r.tenant_id = $1)
		  AND ($2 = '' OR r.branch_gstin = $2)
		ORDER BY r.id ASC
	`, tenantID, gstin)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []domain.ReconciledRecord
	for rows.Next() {
		var rec domain.ReconciledRecord
		var matchStatus, actionRec, vendorStatus string
		var notes pq.StringArray

		var prID, prVch, prInv, prVendorGstin, prVendorName, prCat, prPayStatus, prBranchName, prGstin *string
		var prInvDate *time.Time
		var prTaxable, prIgst, prCgst, prSgst, prCess, prTotalTax, prTotalVal *float64
		var prDays *int
		var prEligible *bool

		var b2ID, b2Inv, b2Type, b2SupplierGstin, b2SupplierName, b2ItcAvail, b2ItcReason, b2Period, b2IrnStatus, b2DealerGstin *string
		var b2InvDate, b2Gstr1Date *time.Time
		var b2Taxable, b2Igst, b2Cgst, b2Sgst, b2Cess, b2TotalTax, b2TotalVal *float64

		if err := rows.Scan(
			&rec.ID, &matchStatus, &rec.MatchScore, &rec.TaxDifference, &rec.TaxableDifference, &notes, &actionRec, &vendorStatus, &rec.IsOEMItem,
			&prID, &prVch, &prInv, &prInvDate, &prVendorGstin, &prVendorName, &prCat, &prTaxable, &prIgst, &prCgst, &prSgst, &prCess, &prTotalTax, &prTotalVal, &prPayStatus, &prDays, &prEligible, &prBranchName, &prGstin,
			&b2ID, &b2Inv, &b2Type, &b2InvDate, &b2SupplierGstin, &b2SupplierName, &b2Taxable, &b2Igst, &b2Cgst, &b2Sgst, &b2Cess, &b2TotalTax, &b2TotalVal, &b2ItcAvail, &b2ItcReason, &b2Period, &b2Gstr1Date, &b2IrnStatus, &b2DealerGstin,
		); err != nil {
			return nil, err
		}

		rec.MatchStatus = domain.MatchStatus(matchStatus)
		rec.ActionRecommended = actionRec
		rec.VendorActionStatus = vendorStatus
		rec.Notes = []string(notes)

		if prID != nil && *prID != "" {
			rec.PRItem = &domain.PurchaseRegisterItem{
				ID:                *prID,
				InternalVoucherNo: derefString(prVch),
				InvoiceNo:         derefString(prInv),
				InvoiceDate:       formatDate(prInvDate),
				VendorGSTIN:       derefString(prVendorGstin),
				VendorName:        derefString(prVendorName),
				Category:          domain.DealershipCategory(derefString(prCat)),
				TaxableValue:      derefFloat(prTaxable),
				IGST:              derefFloat(prIgst),
				CGST:              derefFloat(prCgst),
				SGST:              derefFloat(prSgst),
				Cess:              derefFloat(prCess),
				TotalTax:          derefFloat(prTotalTax),
				TotalInvoiceValue: derefFloat(prTotalVal),
				PaymentStatus:     derefString(prPayStatus),
				DaysOutstanding:   derefInt(prDays),
				IsEligibleITC:     derefBool(prEligible),
				BranchName:        derefString(prBranchName),
				GSTIN:             derefString(prGstin),
			}
		}

		if b2ID != nil && *b2ID != "" {
			rec.GSTR2BItem = &domain.Gstr2BItem{
				ID:                *b2ID,
				InvoiceNo:         derefString(b2Inv),
				InvoiceType:       derefString(b2Type),
				InvoiceDate:       formatDate(b2InvDate),
				SupplierGSTIN:     derefString(b2SupplierGstin),
				SupplierName:      derefString(b2SupplierName),
				TaxableValue:      derefFloat(b2Taxable),
				IGST:              derefFloat(b2Igst),
				CGST:              derefFloat(b2Cgst),
				SGST:              derefFloat(b2Sgst),
				Cess:              derefFloat(b2Cess),
				TotalTax:          derefFloat(b2TotalTax),
				TotalInvoiceValue: derefFloat(b2TotalVal),
				ITCAvailability:   derefString(b2ItcAvail),
				ITCReason:         derefString(b2ItcReason),
				FilingPeriod:      derefString(b2Period),
				GSTR1FilingDate:   formatDate(b2Gstr1Date),
				IRNStatus:         derefString(b2IrnStatus),
				DealershipGSTIN:   derefString(b2DealerGstin),
			}
		}

		records = append(records, rec)
	}

	return records, nil
}

// UpdateRecordActionTx updates record action and records an immutable audit log in an ACID transaction
func (s *PostgresStore) UpdateRecordActionTx(ctx context.Context, tenantID, recordID, action, vendorStatus string, audit *domain.AuditLogEntry) error {
	return s.withTenantTx(ctx, tenantID, func(tx *sql.Tx) error {
		query := `
			UPDATE reconciled_records
			SET action_recommended = COALESCE(NULLIF($1, ''), action_recommended),
			    vendor_action_status = COALESCE(NULLIF($2, ''), vendor_action_status),
			    updated_at = CURRENT_TIMESTAMP
			WHERE id = $3
		`
		res, err := tx.ExecContext(ctx, query, action, vendorStatus, recordID)
		if err != nil {
			return err
		}
		rows, _ := res.RowsAffected()
		if rows == 0 {
			return fmt.Errorf("record not found: %s", recordID)
		}

		if audit != nil {
			prevJSON, _ := json.Marshal(audit.PreviousState)
			newJSON, _ := json.Marshal(audit.NewState)
			_, err := tx.ExecContext(ctx, `
				INSERT INTO statutory_audit_logs (id, tenant_id, user_id, action_type, entity_type, entity_id, previous_state, new_state, correlation_id, ip_address, timestamp)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			`, audit.ID, tenantID, audit.UserID, audit.ActionType, audit.EntityType, audit.EntityID, prevJSON, newJSON, audit.CorrelationID, audit.IPAddress, audit.Timestamp)
			if err != nil {
				return fmt.Errorf("audit log insert failed: %w", err)
			}
		}

		return nil
	})
}

// GetSalesInvoices returns sales invoices
func (s *PostgresStore) GetSalesInvoices(ctx context.Context, tenantID string) ([]domain.SalesInvoiceItem, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, invoice_number, invoice_date, customer_name, customer_gstin, customer_state_code, invoice_type,
		       COALESCE(chassis_vin, ''), COALESCE(vehicle_model, ''), taxable_value, igst, cgst, sgst, cess, total_amount,
		       irn_status, COALESCE(irn_number, ''), COALESCE(ack_number, ''), ack_date, COALESCE(signed_qr_payload, ''),
		       ewb_status, COALESCE(ewb_number, ''), ewb_valid_until, COALESCE(vehicle_registration, ''), erp_sync_status, COALESCE(failure_reason, '')
		FROM sales_invoices
		WHERE ($1 = '' OR tenant_id = $1)
		ORDER BY invoice_date DESC
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invoices []domain.SalesInvoiceItem
	for rows.Next() {
		var inv domain.SalesInvoiceItem
		var invDate time.Time
		var ackDate, ewbValid *time.Time

		if err := rows.Scan(
			&inv.ID, &inv.InvoiceNumber, &invDate, &inv.CustomerName, &inv.CustomerGSTIN, &inv.CustomerStateCode, &inv.InvoiceType,
			&inv.ChassisVIN, &inv.VehicleModel, &inv.TaxableValue, &inv.IGST, &inv.CGST, &inv.SGST, &inv.Cess, &inv.TotalAmount,
			&inv.IRNStatus, &inv.IRNNumber, &inv.AckNumber, &ackDate, &inv.SignedQRPayload,
			&inv.EWBStatus, &inv.EWBNumber, &ewbValid, &inv.VehicleRegistration, &inv.ERPSyncStatus, &inv.FailureReason,
		); err != nil {
			return nil, err
		}

		inv.InvoiceDate = invDate.Format("2006-01-02")
		if ackDate != nil {
			inv.AckDate = ackDate.Format("2006-01-02 15:04:05")
		}
		if ewbValid != nil {
			inv.EWBValidUntil = ewbValid.Format("2006-01-02 15:04:05")
		}
		invoices = append(invoices, inv)
	}

	return invoices, nil
}

// UpdateSalesInvoiceIRNTx updates IRN with audit log
func (s *PostgresStore) UpdateSalesInvoiceIRNTx(ctx context.Context, tenantID, id, irn, ackNo, ackDate, qr string, audit *domain.AuditLogEntry) (*domain.SalesInvoiceItem, error) {
	var updated domain.SalesInvoiceItem
	err := s.withTenantTx(ctx, tenantID, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(ctx, `
			UPDATE sales_invoices
			SET irn_status = 'GENERATED',
			    irn_number = $1,
			    ack_number = $2,
			    ack_date = CURRENT_TIMESTAMP,
			    signed_qr_payload = $3,
			    updated_at = CURRENT_TIMESTAMP
			WHERE id = $4
		`, irn, ackNo, qr, id)
		if err != nil {
			return err
		}

		if audit != nil {
			newJSON, _ := json.Marshal(audit.NewState)
			_, err = tx.ExecContext(ctx, `
				INSERT INTO statutory_audit_logs (id, tenant_id, user_id, action_type, entity_type, entity_id, new_state, correlation_id, ip_address, timestamp)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			`, audit.ID, tenantID, audit.UserID, audit.ActionType, audit.EntityType, audit.EntityID, newJSON, audit.CorrelationID, audit.IPAddress, audit.Timestamp)
			if err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	invs, _ := s.GetSalesInvoices(ctx, tenantID)
	for _, i := range invs {
		if i.ID == id {
			updated = i
			break
		}
	}

	return &updated, nil
}

// GetComplianceAlerts returns compliance alerts
func (s *PostgresStore) GetComplianceAlerts(ctx context.Context, tenantID string) ([]domain.ComplianceExceptionAlert, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, severity, category, title, description, impact_amount, affected_entity, suggested_action, auto_resolution_available, status
		FROM compliance_alerts
		WHERE ($1 = '' OR tenant_id = $1)
		ORDER BY id ASC
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var alerts []domain.ComplianceExceptionAlert
	for rows.Next() {
		var a domain.ComplianceExceptionAlert
		if err := rows.Scan(&a.ID, &a.Severity, &a.Category, &a.Title, &a.Description, &a.ImpactAmount, &a.AffectedEntity, &a.SuggestedAction, &a.AutoResolutionAvailable, &a.Status); err != nil {
			return nil, err
		}
		alerts = append(alerts, a)
	}

	return alerts, nil
}

// ResolveAlertTx marks an alert as resolved in a transaction
func (s *PostgresStore) ResolveAlertTx(ctx context.Context, tenantID, alertID string, audit *domain.AuditLogEntry) error {
	return s.withTenantTx(ctx, tenantID, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(ctx, `
			UPDATE compliance_alerts
			SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP
			WHERE id = $1
		`, alertID)
		if err != nil {
			return err
		}

		if audit != nil {
			newJSON, _ := json.Marshal(audit.NewState)
			_, _ = tx.ExecContext(ctx, `
				INSERT INTO statutory_audit_logs (id, tenant_id, user_id, action_type, entity_type, entity_id, new_state, correlation_id, timestamp)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			`, audit.ID, tenantID, audit.UserID, audit.ActionType, audit.EntityType, audit.EntityID, newJSON, audit.CorrelationID, audit.Timestamp)
		}

		return nil
	})
}

// GetComplianceWorkflow returns compliance steps
func (s *PostgresStore) GetComplianceWorkflow(ctx context.Context, tenantID string) ([]domain.ComplianceWorkflowStep, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, step_name, status, automated, timestamp, details, source_module
		FROM compliance_workflow_steps
		WHERE ($1 = '' OR tenant_id = $1)
		ORDER BY id ASC
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var steps []domain.ComplianceWorkflowStep
	for rows.Next() {
		var st domain.ComplianceWorkflowStep
		var src string
		if err := rows.Scan(&st.ID, &st.StepName, &st.Status, &st.Automated, &st.Timestamp, &st.Details, &src); err != nil {
			return nil, err
		}
		st.SourceModule = src
		steps = append(steps, st)
	}

	return steps, nil
}

// GetOEMSchemes returns OEM schemes
func (s *PostgresStore) GetOEMSchemes(ctx context.Context, tenantID string) ([]domain.OEMScheme, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, scheme_name, circular_no, quarter, claimed_amount, oem_passed_amount, gst_credit_loss, status
		FROM oem_schemes
		WHERE ($1 = '' OR tenant_id = $1)
		ORDER BY id ASC
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var schemes []domain.OEMScheme
	for rows.Next() {
		var sc domain.OEMScheme
		if err := rows.Scan(&sc.ID, &sc.SchemeName, &sc.CircularNo, &sc.Quarter, &sc.ClaimedAmount, &sc.OEMPassedAmount, &sc.GSTCreditLoss, &sc.Status); err != nil {
			return nil, err
		}
		schemes = append(schemes, sc)
	}

	return schemes, nil
}

// AddNoticeLogTx logs statutory notice dispatches
func (s *PostgresStore) AddNoticeLogTx(ctx context.Context, tenantID string, log domain.NoticeLog, audit *domain.AuditLogEntry) error {
	return s.withTenantTx(ctx, tenantID, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(ctx, `
			INSERT INTO statutory_notice_logs (id, tenant_id, record_id, vendor_gstin, vendor_name, channel, dispatched_at, status, invoice_no, tax_amount)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		`, log.ID, tenantID, log.RecordID, log.VendorGSTIN, log.VendorName, log.Channel, log.DispatchedAt, log.Status, log.InvoiceNo, log.TaxAmount)
		if err != nil {
			return err
		}

		if audit != nil {
			newJSON, _ := json.Marshal(audit.NewState)
			_, _ = tx.ExecContext(ctx, `
				INSERT INTO statutory_audit_logs (id, tenant_id, user_id, action_type, entity_type, entity_id, new_state, correlation_id, timestamp)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			`, audit.ID, tenantID, audit.UserID, audit.ActionType, audit.EntityType, audit.EntityID, newJSON, audit.CorrelationID, audit.Timestamp)
		}

		return nil
	})
}

// GetNoticeLogs returns all communication logs
func (s *PostgresStore) GetNoticeLogs(ctx context.Context, tenantID string) ([]domain.NoticeLog, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, record_id, vendor_gstin, vendor_name, channel, dispatched_at, status, invoice_no, tax_amount
		FROM statutory_notice_logs
		WHERE ($1 = '' OR tenant_id = $1)
		ORDER BY dispatched_at DESC
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []domain.NoticeLog
	for rows.Next() {
		var l domain.NoticeLog
		if err := rows.Scan(&l.ID, &l.RecordID, &l.VendorGSTIN, &l.VendorName, &l.Channel, &l.DispatchedAt, &l.Status, &l.InvoiceNo, &l.TaxAmount); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}

	return logs, nil
}

// GetAuditLogs returns immutable audit logs
func (s *PostgresStore) GetAuditLogs(ctx context.Context, tenantID string) ([]domain.AuditLogEntry, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, tenant_id, user_id, action_type, entity_type, entity_id, correlation_id, COALESCE(ip_address, ''), timestamp
		FROM statutory_audit_logs
		WHERE ($1 = '' OR tenant_id = $1)
		ORDER BY timestamp DESC
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []domain.AuditLogEntry
	for rows.Next() {
		var e domain.AuditLogEntry
		if err := rows.Scan(&e.ID, &e.TenantID, &e.UserID, &e.ActionType, &e.EntityType, &e.EntityID, &e.CorrelationID, &e.IPAddress, &e.Timestamp); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}

	return entries, nil
}

// CreateTenantTx creates a new tenant record
func (s *PostgresStore) CreateTenantTx(ctx context.Context, tenant domain.DealershipProfile) error {

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO tenants (id, group_name, brand, authorized_dealer_for, headquarters, monthly_invoice_volume, dms_software, active_gstin)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (id) DO UPDATE SET
			group_name = EXCLUDED.group_name,
			brand = EXCLUDED.brand,
			active_gstin = EXCLUDED.active_gstin
	`, tenant.ID, tenant.GroupName, tenant.Brand, tenant.AuthorizedDealerFor, tenant.Headquarters, tenant.MonthlyInvoiceVolume, tenant.DMSSoftware, tenant.ActiveGSTIN)
	return err
}

// CreateUserTx creates a new user
func (s *PostgresStore) CreateUserTx(ctx context.Context, user domain.User) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, auth_provider, oauth_sub, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, user.ID, user.TenantID, user.Email, user.PasswordHash, user.FullName, user.Role, user.AuthProvider, user.OAuthSub, user.IsActive)
	return err
}

// GetUserByEmail finds a user by email
func (s *PostgresStore) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, tenant_id, email, password_hash, full_name, role, auth_provider, COALESCE(oauth_sub, ''), is_active, created_at, updated_at
		FROM users WHERE email = $1
	`, email)
	var u domain.User
	if err := row.Scan(&u.ID, &u.TenantID, &u.Email, &u.PasswordHash, &u.FullName, &u.Role, &u.AuthProvider, &u.OAuthSub, &u.IsActive, &u.CreatedAt, &u.UpdatedAt); err != nil {
		return nil, err
	}
	return &u, nil
}

// GetUserByID finds a user by ID
func (s *PostgresStore) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, tenant_id, email, password_hash, full_name, role, auth_provider, COALESCE(oauth_sub, ''), is_active, created_at, updated_at
		FROM users WHERE id = $1
	`, id)
	var u domain.User
	if err := row.Scan(&u.ID, &u.TenantID, &u.Email, &u.PasswordHash, &u.FullName, &u.Role, &u.AuthProvider, &u.OAuthSub, &u.IsActive, &u.CreatedAt, &u.UpdatedAt); err != nil {
		return nil, err
	}
	return &u, nil
}

// CreateSessionTx logs a session
func (s *PostgresStore) CreateSessionTx(ctx context.Context, session domain.UserSession) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO user_sessions (id, user_id, tenant_id, token_hash, expires_at, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, session.ID, session.UserID, session.TenantID, session.TokenHash, session.ExpiresAt, session.IPAddress, session.UserAgent)
	return err
}

// GetSessionByID retrieves session
func (s *PostgresStore) GetSessionByID(ctx context.Context, sessionID string) (*domain.UserSession, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, user_id, tenant_id, token_hash, expires_at, COALESCE(ip_address, ''), COALESCE(user_agent, ''), created_at
		FROM user_sessions WHERE id = $1
	`, sessionID)
	var sess domain.UserSession
	if err := row.Scan(&sess.ID, &sess.UserID, &sess.TenantID, &sess.TokenHash, &sess.ExpiresAt, &sess.IPAddress, &sess.UserAgent, &sess.CreatedAt); err != nil {
		return nil, err
	}
	return &sess, nil
}

// AddPurchaseRegisterItemsTx inserts batch of PR items
func (s *PostgresStore) AddPurchaseRegisterItemsTx(ctx context.Context, tenantID, gstin string, items []domain.PurchaseRegisterItem) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO purchase_register_items (
			id, tenant_id, branch_gstin, internal_voucher_no, invoice_no, invoice_date,
			vendor_gstin, vendor_name, category, taxable_value, igst, cgst, sgst, cess,
			total_tax, total_invoice_value, payment_status, days_outstanding, is_eligible_itc,
			branch_name, oem_scheme_ref
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, item := range items {
		_, err := stmt.ExecContext(ctx,
			item.ID, tenantID, gstin, item.InternalVoucherNo, item.InvoiceNo, item.InvoiceDate,
			item.VendorGSTIN, item.VendorName, string(item.Category), item.TaxableValue, item.IGST, item.CGST, item.SGST, item.Cess,
			item.TotalTax, item.TotalInvoiceValue, item.PaymentStatus, item.DaysOutstanding, item.IsEligibleITC,
			item.BranchName, item.OEMSchemeRef,
		)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

// AddGstr2BItemsTx inserts batch of 2B items
func (s *PostgresStore) AddGstr2BItemsTx(ctx context.Context, tenantID, gstin string, items []domain.Gstr2BItem) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO gstr2b_items (
			id, tenant_id, dealership_gstin, invoice_no, invoice_type, invoice_date,
			supplier_gstin, supplier_name, taxable_value, igst, cgst, sgst, cess,
			total_tax, total_invoice_value, itc_availability, itc_reason, filing_period,
			gstr1_filing_date, irn_status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, item := range items {
		_, err := stmt.ExecContext(ctx,
			item.ID, tenantID, gstin, item.InvoiceNo, item.InvoiceType, item.InvoiceDate,
			item.SupplierGSTIN, item.SupplierName, item.TaxableValue, item.IGST, item.CGST, item.SGST, item.Cess,
			item.TotalTax, item.TotalInvoiceValue, item.ITCAvailability, item.ITCReason, item.FilingPeriod,
			item.GSTR1FilingDate, item.IRNStatus,
		)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

// SaveDocumentUploadTx saves document record
func (s *PostgresStore) SaveDocumentUploadTx(ctx context.Context, doc domain.DocumentUpload) error {
	var extractedJSON []byte
	if doc.ExtractedData != nil {
		extractedJSON, _ = json.Marshal(doc.ExtractedData)
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO document_uploads (id, tenant_id, branch_gstin, file_name, file_type, file_size_bytes, storage_path, sha256_hash, ocr_status, extracted_data, uploaded_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, doc.ID, doc.TenantID, doc.BranchGSTIN, doc.FileName, doc.FileType, doc.FileSizeBytes, doc.StoragePath, doc.SHA256Hash, doc.OCRStatus, extractedJSON, doc.UploadedBy)
	return err
}

// GetDocumentUploads lists documents for tenant
func (s *PostgresStore) GetDocumentUploads(ctx context.Context, tenantID string) ([]domain.DocumentUpload, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, tenant_id, branch_gstin, file_name, file_type, file_size_bytes, storage_path, sha256_hash, ocr_status, extracted_data, COALESCE(uploaded_by, ''), created_at
		FROM document_uploads WHERE tenant_id = $1 ORDER BY created_at DESC
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []domain.DocumentUpload
	for rows.Next() {
		var d domain.DocumentUpload
		var rawExtracted []byte
		if err := rows.Scan(&d.ID, &d.TenantID, &d.BranchGSTIN, &d.FileName, &d.FileType, &d.FileSizeBytes, &d.StoragePath, &d.SHA256Hash, &d.OCRStatus, &rawExtracted, &d.UploadedBy, &d.CreatedAt); err != nil {
			return nil, err
		}
		if len(rawExtracted) > 0 {
			var ext domain.ExtractedInvoiceData
			if json.Unmarshal(rawExtracted, &ext) == nil {
				d.ExtractedData = &ext
			}
		}
		docs = append(docs, d)
	}
	return docs, nil
}

// GetDocumentUploadByID retrieves single document
func (s *PostgresStore) GetDocumentUploadByID(ctx context.Context, tenantID, id string) (*domain.DocumentUpload, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, tenant_id, branch_gstin, file_name, file_type, file_size_bytes, storage_path, sha256_hash, ocr_status, extracted_data, COALESCE(uploaded_by, ''), created_at
		FROM document_uploads WHERE tenant_id = $1 AND id = $2
	`, tenantID, id)
	var d domain.DocumentUpload
	var rawExtracted []byte
	if err := row.Scan(&d.ID, &d.TenantID, &d.BranchGSTIN, &d.FileName, &d.FileType, &d.FileSizeBytes, &d.StoragePath, &d.SHA256Hash, &d.OCRStatus, &rawExtracted, &d.UploadedBy, &d.CreatedAt); err != nil {
		return nil, err
	}
	if len(rawExtracted) > 0 {
		var ext domain.ExtractedInvoiceData
		if json.Unmarshal(rawExtracted, &ext) == nil {
			d.ExtractedData = &ext
		}
	}
	return &d, nil
}

// UpdateDocumentOCRTx updates OCR payload and status
func (s *PostgresStore) UpdateDocumentOCRTx(ctx context.Context, tenantID, id, status string, extracted *domain.ExtractedInvoiceData) error {
	var rawJSON []byte
	if extracted != nil {
		rawJSON, _ = json.Marshal(extracted)
	}
	_, err := s.db.ExecContext(ctx, `
		UPDATE document_uploads SET ocr_status = $1, extracted_data = $2 WHERE tenant_id = $3 AND id = $4
	`, status, rawJSON, tenantID, id)
	return err
}

// SeedDemoData seeds mock records
func (s *PostgresStore) SeedDemoData(ctx context.Context, tenantID string) error {
	return nil
}


func derefString(s *string) string {
	if s != nil {
		return *s
	}
	return ""
}

func derefFloat(f *float64) float64 {
	if f != nil {
		return *f
	}
	return 0.0
}

func derefInt(i *int) int {
	if i != nil {
		return *i
	}
	return 0
}

func derefBool(b *bool) bool {
	if b != nil {
		return *b
	}
	return false
}

func formatDate(t *time.Time) string {
	if t != nil {
		return t.Format("2006-01-02")
	}
	return ""
}
