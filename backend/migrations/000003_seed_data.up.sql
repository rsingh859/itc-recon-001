-- 000003_seed_data.up.sql
-- Seed baseline enterprise auto dealership groups, branches, and sample records

-- Tenants
INSERT INTO tenants (id, group_name, brand, authorized_dealer_for, headquarters, monthly_invoice_volume, dms_software, active_gstin)
VALUES 
('dms-01', 'Apex Motorcorp Automotive Group', 'Maruti Suzuki (Arena, Nexa & True Value)', 'Maruti Suzuki India Limited (MSIL)', 'Connaught Place, New Delhi', 4250, 'MARUTI_EDMS', '07AABCA9876K1Z2'),
('dms-02', 'Vertex Wheels & Mobility Pvt Ltd', 'Tata Motors Commercial & Passenger', 'Tata Motors Limited (TML)', 'Andheri East, Mumbai', 3100, 'TATA_MOTHER', '27AAACV1234F1Z8')
ON CONFLICT (id) DO NOTHING;

-- Branches
INSERT INTO branches (id, tenant_id, gstin, state, city, branch_type)
VALUES
('br-01', 'dms-01', '07AABCA9876K1Z2', 'Delhi (07)', 'South Delhi & Okhla Phase III', 'NEXA_SHOWROOM'),
('br-02', 'dms-01', '06AABCA9876K1ZY', 'Haryana (06)', 'Gurugram Sector 29 & Manesar', 'SHOWROOM_AND_WORKSHOP'),
('br-03', 'dms-01', '09AABCA9876K1ZX', 'Uttar Pradesh (09)', 'Noida Sector 63 & Greater Noida', 'BODYSHOP_HUB'),
('br-04', 'dms-02', '27AAACV1234F1Z8', 'Maharashtra (27)', 'Mumbai & Thane Central', 'SHOWROOM_AND_WORKSHOP'),
('br-05', 'dms-02', '24AAACV1234F1Z1', 'Gujarat (24)', 'Ahmedabad SG Highway', 'ARENA_SHOWROOM')
ON CONFLICT (tenant_id, gstin) DO NOTHING;

-- Purchase Register Items
INSERT INTO purchase_register_items (id, tenant_id, branch_gstin, internal_voucher_no, invoice_no, invoice_date, vendor_gstin, vendor_name, category, taxable_value, igst, cgst, sgst, cess, total_tax, total_invoice_value, payment_status, days_outstanding, is_eligible_itc, branch_name)
VALUES
('PR-101', 'dms-01', '07AABCA9876K1Z2', 'VCH/2026/07/0041', 'MSIL/DEL/2627/00892', '2026-07-04', '06AAACM1234H1Z1', 'Maruti Suzuki India Limited (OEM)', 'OEM_VEHICLE', 48500000, 13580000, 0, 0, 8245000, 21825000, 70325000, 'PAID', 22, true, 'Nexa Okhla Prime'),
('PR-102', 'dms-01', '07AABCA9876K1Z2', 'VCH/2026/07/0055', 'MSIL/SPR/26-27/4120', '2026-07-08', '06AAACM1234H1Z1', 'Maruti Suzuki India Limited (OEM Spares)', 'SPARE_PARTS', 3420000, 615600, 0, 0, 0, 615600, 4035600, 'PAID', 18, true, 'Nexa Okhla Prime'),
('PR-103', 'dms-01', '07AABCA9876K1Z2', 'VCH/2026/07/0082', 'CAST/NOI/2026/9112', '2026-07-11', '09AAACC4321J1Z3', 'Castrol India Limited (Engine Oils & Lubes)', 'LUBRICANTS', 890000, 160200, 0, 0, 0, 160200, 1050200, 'PAID', 15, true, 'Workshop Bodyshop Hub'),
('PR-104', 'dms-01', '07AABCA9876K1Z2', 'VCH/2026/07/0104', 'PPG/AS/2627/0441', '2026-07-14', '07AAACP9988E1Z4', 'PPG Asian Paints Pvt Ltd (Automotive Refinish)', 'BODYSHOP_PAINT', 1240000, 0, 111600, 111600, 0, 223200, 1463200, 'PAID', 12, true, 'Workshop Bodyshop Hub'),
('PR-105', 'dms-01', '07AABCA9876K1Z2', 'VCH/2026/07/0118', 'VND/GZB/2026/0091', '2026-07-16', '09AABCS8811K1Z9', 'Sharma Body Works & Denting Fabricators', 'SPARE_PARTS', 420000, 75600, 0, 0, 0, 75600, 495600, 'UNPAID', 10, true, 'Workshop Bodyshop Hub'),
('PR-106', 'dms-01', '07AABCA9876K1Z2', 'VCH/2026/01/0019', 'OLD/FAST/25-26/184', '2026-01-10', '07AABCF4433D1Z2', 'FastTrack Tools & Garage Equipment', 'WORKSHOP_TOOLS', 680000, 0, 61200, 61200, 0, 122400, 802400, 'UNPAID', 194, true, 'Nexa Okhla Prime'),
('PR-107', 'dms-01', '07AABCA9876K1Z2', 'VCH/2026/07/0142', 'CATER/OKH/26/004', '2026-07-19', '07AABCH5566G1Z7', 'Hotel Royal Caterers & Staff Canteen', 'STAFF_WELFARE', 150000, 0, 3750, 3750, 0, 7500, 157500, 'PAID', 6, false, 'Nexa Okhla Prime'),
('PR-108', 'dms-01', '07AABCA9876K1Z2', 'VCH/2026/07/0150', 'SCHEME/Q1/MSIL/09', '2026-07-20', '06AAACM1234H1Z1', 'Maruti Suzuki India Limited (OEM Scheme)', 'OEM_SCHEME_INCENTIVE', 1850000, 333000, 0, 0, 0, 333000, 2183000, 'PAID', 5, true, 'Nexa Okhla Prime')
ON CONFLICT (id) DO NOTHING;

-- GSTR-2B Items
INSERT INTO gstr2b_items (id, tenant_id, dealership_gstin, invoice_no, invoice_type, invoice_date, supplier_gstin, supplier_name, taxable_value, igst, cgst, sgst, cess, total_tax, total_invoice_value, itc_availability, filing_period, gstr1_filing_date, irn_status)
VALUES
('2B-501', 'dms-01', '07AABCA9876K1Z2', 'MSIL/DEL/2627/00892', 'B2B', '2026-07-04', '06AAACM1234H1Z1', 'Maruti Suzuki India Limited', 48500000, 13580000, 0, 0, 8245000, 21825000, 70325000, 'Y', 'July 2026', '2026-08-10', 'GENERATED'),
('2B-502', 'dms-01', '07AABCA9876K1Z2', 'MSIL-SPR-2627-4120', 'B2B', '2026-07-08', '06AAACM1234H1Z1', 'Maruti Suzuki India Limited', 3420000, 615600, 0, 0, 0, 615600, 4035600, 'Y', 'July 2026', '2026-08-11', 'GENERATED'),
('2B-503', 'dms-01', '07AABCA9876K1Z2', 'CAST/NOI/2026/9112', 'B2B', '2026-07-11', '09AAACC4321J1Z3', 'Castrol India Limited', 890000, 160200, 0, 0, 0, 160200, 1050200, 'Y', 'July 2026', '2026-08-09', 'GENERATED'),
('2B-504', 'dms-01', '07AABCA9876K1Z2', 'PPG/AS/2627/0441', 'B2B', '2026-07-14', '07AAACP9988E1Z4', 'PPG Asian Paints Pvt Ltd', 1240000, 0, 105000, 105000, 0, 210000, 1450000, 'Y', 'July 2026', '2026-08-11', 'GENERATED'),
('2B-505', 'dms-01', '07AABCA9876K1Z2', 'SCHEME/Q1/MSIL/09', 'CDNR', '2026-07-20', '06AAACM1234H1Z1', 'Maruti Suzuki India Limited', 1850000, 333000, 0, 0, 0, 333000, 2183000, 'Y', 'July 2026', '2026-08-11', 'GENERATED'),
('2B-506', 'dms-01', '07AABCA9876K1Z2', 'LUMAX/DL/26/9021', 'B2B', '2026-07-22', '07AAACL1234K1Z5', 'Lumax Auto Technologies Ltd (Headlamps)', 420000, 0, 37800, 37800, 0, 75600, 495600, 'Y', 'July 2026', '2026-08-11', 'GENERATED')
ON CONFLICT (id) DO NOTHING;

-- Sales Invoices
INSERT INTO sales_invoices (id, tenant_id, invoice_number, invoice_date, customer_name, customer_gstin, customer_state_code, invoice_type, chassis_vin, vehicle_model, taxable_value, igst, cgst, sgst, cess, total_amount, irn_status, irn_number, ack_number, signed_qr_payload, ewb_status, ewb_number, vehicle_registration, erp_sync_status)
VALUES
('SINV-001', 'dms-01', 'INV/2026/0942', '2026-08-21', 'Apex Logistics & Fleet Pvt Ltd', '27AABCA9871M1Z5', '27', 'B2B_VEHICLE', 'MA3FBEB1S00984120', 'Maruti Super Carry CNG (White)', 560000, 0, 78400, 78400, 0, 716800, 'GENERATED', '9f8b2c418e7d23a15b9c0e7f8a9123456789abcdef0123456789abcdef012345', '112609847162', 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23fff"/></svg>', 'GENERATED', '241009871234', 'MH-04-AX-9912', 'SYNCED'),
('SINV-002', 'dms-01', 'INV/2026/0943', '2026-08-21', 'Shree Balaji Transporters', '24AABCS4412K1Z9', '24', 'B2B_VEHICLE', 'MALCA51HLFM109842', 'Hyundai Creta SX (O) Diesel 1.5', 1420000, 397600, 0, 0, 241400, 2059000, 'GENERATED', '4a7c1e92d8f34567b8a91234cdef567890123456789abcdef0123456789abcde', '112609847163', 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23fff"/></svg>', 'GENERATED', '291009847162', 'MH-04-AB-1290', 'SYNCED'),
('SINV-003', 'dms-01', 'INV/2026/0944', '2026-08-21', 'Tata Autocomp Systems Hub', '27AABCT2390J1Z1', '27', 'B2B_PARTS', NULL, NULL, 84500, 0, 11830, 11830, 0, 108160, 'FAILED', NULL, NULL, NULL, 'NOT_REQUIRED', NULL, NULL, 'PENDING_PUSH')
ON CONFLICT (id) DO NOTHING;

-- Compliance Alerts
INSERT INTO compliance_alerts (id, tenant_id, severity, category, title, description, impact_amount, affected_entity, suggested_action, auto_resolution_available, status)
VALUES
('ALT-101', 'dms-01', 'CRITICAL', 'RULE_37_180D', 'Rule 37 ITC Clawback Alert: 14 Invoices Approaching 180 Days', '₹4,18,200 in Input Tax Credit must be reversed with daily 18% interest under Section 50 if unpaid within 15 days.', 418200, 'Spare Parts & Lubricants Vendors (14 Unpaid Invoices)', 'Release payment voucher immediately or trigger partial credit reversal in GSTR-3B Table 4(B)(2).', true, 'OPEN'),
('ALT-102', 'dms-01', 'HIGH', 'IRN_FAILURE', 'IRN Schema Validation Failure: State Code POS Discrepancy', 'Invoice INV/2026/0944 blocked by IRP portal error 2150. Delivery vehicle gate pass held at showroom.', 108160, 'Tata Autocomp Systems Hub (Chassis VIN MALCA51)', 'Auto-correct buyer POS State Code in DMS & trigger instant retry to NIC portal.', true, 'OPEN'),
('ALT-103', 'dms-01', 'HIGH', 'OEM_CLAIM_SHORT', 'OEM Q1 Sales Incentive Short-Pass: ₹8,42,000 Discrepancy', 'Manufacturer credit note is ₹8,42,000 lower than dealer booking ledger for retail exchange bonus.', 842000, 'MSIL Q1 Exchange Scheme Circular No. 2026/094', 'Generate ASMT-10 commercial defense dossier and issue GST commercial dispute claim.', false, 'OPEN')
ON CONFLICT (id) DO NOTHING;

-- OEM Schemes
INSERT INTO oem_schemes (id, tenant_id, scheme_name, circular_no, quarter, claimed_amount, oem_passed_amount, gst_credit_loss, status)
VALUES
('SCH-01', 'dms-01', 'Q1 FY26 Retail Volume Growth Target Bonus', 'MSIL/MKT/2026/041', 'Q1-FY26', 2450000, 2450000, 0, 'RECONCILED'),
('SCH-02', 'dms-01', 'Grand Vitara & Invicto Institutional Demo Car Subsidy', 'MSIL/SCH/2026/089', 'Q1-FY26', 1820000, 1420000, 72000, 'SHORT_PASSED'),
('SCH-03', 'dms-01', 'Monsoon Bodyshop Paint & Spares Consignment Rebate', 'MSIL/SPR/2026/112', 'Q1-FY26', 940000, 0, 169200, 'PENDING_OEM_CREDIT')
ON CONFLICT (id) DO NOTHING;
