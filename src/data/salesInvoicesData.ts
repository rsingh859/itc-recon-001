export interface SalesInvoiceItem {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerGstin: string;
  customerStateCode: string;
  invoiceType: 'B2B_VEHICLE' | 'B2B_PARTS' | 'B2B_SERVICE' | 'B2C_RETAIL';
  chassisVin?: string;
  vehicleModel?: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalAmount: number;
  irnStatus: 'GENERATED' | 'PENDING' | 'FAILED' | 'NOT_APPLICABLE';
  irnNumber?: string;
  ackNumber?: string;
  ackDate?: string;
  signedQrPayload?: string;
  ewbStatus: 'GENERATED' | 'NOT_REQUIRED' | 'PENDING' | 'EXPIRED';
  ewbNumber?: string;
  ewbValidUntil?: string;
  vehicleRegistration?: string;
  erpSyncStatus: 'SYNCED' | 'PENDING_PUSH';
  failureReason?: string;
}

export const SAMPLE_SALES_INVOICES: SalesInvoiceItem[] = [
  {
    id: 'SINV-001',
    invoiceNumber: 'INV/2026/0942',
    invoiceDate: '2026-08-21',
    customerName: 'Apex Logistics & Fleet Pvt Ltd',
    customerGstin: '27AABCA9871M1Z5',
    customerStateCode: '27',
    invoiceType: 'B2B_VEHICLE',
    chassisVin: 'MA3FBEB1S00984120',
    vehicleModel: 'Maruti Super Carry CNG (White)',
    taxableValue: 560000,
    igst: 0,
    cgst: 78400,
    sgst: 78400,
    cess: 0,
    totalAmount: 716800,
    irnStatus: 'GENERATED',
    irnNumber: '9f8b2c418e7d23a15b9c0e7f8a9123456789abcdef0123456789abcdef012345',
    ackNumber: '112609847162',
    ackDate: '2026-08-21 09:15:22',
    signedQrPayload: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23fff"/><path d="M10,10 h30 v30 h-30 z M60,10 h30 v30 h-30 z M10,60 h30 v30 h-30 z M20,20 h10 v10 h-10 z M70,20 h10 v10 h-10 z M20,70 h10 v10 h-10 z M50,50 h10 v20 h-10 z" fill="%23000"/></svg>',
    ewbStatus: 'GENERATED',
    ewbNumber: '241009871234',
    ewbValidUntil: '2026-08-22 23:59',
    vehicleRegistration: 'MH-04-AX-9912',
    erpSyncStatus: 'SYNCED',
  },
  {
    id: 'SINV-002',
    invoiceNumber: 'INV/2026/0943',
    invoiceDate: '2026-08-21',
    customerName: 'Shree Balaji Transporters',
    customerGstin: '24AABCS4412K1Z9',
    customerStateCode: '24',
    invoiceType: 'B2B_VEHICLE',
    chassisVin: 'MALCA51HLFM109842',
    vehicleModel: 'Hyundai Creta SX (O) Diesel 1.5',
    taxableValue: 1420000,
    igst: 397600,
    cgst: 0,
    sgst: 0,
    cess: 241400,
    totalAmount: 2059000,
    irnStatus: 'GENERATED',
    irnNumber: '4a7c1e92d8f34567b8a91234cdef567890123456789abcdef0123456789abcde',
    ackNumber: '112609847163',
    ackDate: '2026-08-21 09:45:10',
    signedQrPayload: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23fff"/><path d="M10,10 h30 v30 h-30 z M60,10 h30 v30 h-30 z M10,60 h30 v30 h-30 z M20,20 h10 v10 h-10 z M70,20 h10 v10 h-10 z M20,70 h10 v10 h-10 z M45,45 h25 v10 h-25 z" fill="%23000"/></svg>',
    ewbStatus: 'GENERATED',
    ewbNumber: '291009847162',
    ewbValidUntil: '2026-08-22 18:00',
    vehicleRegistration: 'MH-04-AB-1290',
    erpSyncStatus: 'SYNCED',
  },
  {
    id: 'SINV-003',
    invoiceNumber: 'INV/2026/0944',
    invoiceDate: '2026-08-21',
    customerName: 'Tata Autocomp Systems Hub',
    customerGstin: '27AABCT2390J1Z1',
    customerStateCode: '27',
    invoiceType: 'B2B_PARTS',
    taxableValue: 84500,
    igst: 0,
    cgst: 11830,
    sgst: 11830,
    cess: 0,
    totalAmount: 1081600,
    irnStatus: 'FAILED',
    failureReason: '2150: Error in Recipient State Code vs POS Pin Code (411018 mismatch)',
    ewbStatus: 'PENDING',
    erpSyncStatus: 'PENDING_PUSH',
  },
  {
    id: 'SINV-004',
    invoiceNumber: 'INV/2026/0945',
    invoiceDate: '2026-08-21',
    customerName: 'Reliance Corporate Mobility Fleet',
    customerGstin: '27AABCR4918P1ZW',
    customerStateCode: '27',
    invoiceType: 'B2B_SERVICE',
    taxableValue: 125000,
    igst: 0,
    cgst: 11250,
    sgst: 11250,
    cess: 0,
    totalAmount: 147500,
    irnStatus: 'PENDING',
    ewbStatus: 'NOT_REQUIRED',
    erpSyncStatus: 'PENDING_PUSH',
  },
  {
    id: 'SINV-005',
    invoiceNumber: 'INV/2026/0946',
    invoiceDate: '2026-08-21',
    customerName: 'Mahindra Logistics Fleet Yard',
    customerGstin: '27AABCM6612N1Z4',
    customerStateCode: '27',
    invoiceType: 'B2B_VEHICLE',
    chassisVin: 'MA3EWDE1S00441920',
    vehicleModel: 'Maruti Grand Vitara Alpha Hybrid',
    taxableValue: 1680000,
    igst: 0,
    cgst: 235200,
    sgst: 235200,
    cess: 252000,
    totalAmount: 2402400,
    irnStatus: 'PENDING',
    ewbStatus: 'PENDING',
    erpSyncStatus: 'PENDING_PUSH',
  },
  {
    id: 'SINV-006',
    invoiceNumber: 'INV/2026/0947',
    invoiceDate: '2026-08-20',
    customerName: 'QuickFix Multi-Brand Workshop',
    customerGstin: '27AABCQ1198L1ZK',
    customerStateCode: '27',
    invoiceType: 'B2B_PARTS',
    taxableValue: 42300,
    igst: 0,
    cgst: 5922,
    sgst: 5922,
    cess: 0,
    totalAmount: 54144,
    irnStatus: 'GENERATED',
    irnNumber: '1b8e4f719a0d34215c8b9e0f7a8123456789abcdef0123456789abcdef012345',
    ackNumber: '112609847164',
    ackDate: '2026-08-20 16:30:15',
    signedQrPayload: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23fff"/><path d="M10,10 h30 v30 h-30 z M60,10 h30 v30 h-30 z M10,60 h30 v30 h-30 z M20,20 h10 v10 h-10 z M70,20 h10 v10 h-10 z M20,70 h10 v10 h-10 z M35,35 h30 v15 h-30 z" fill="%23000"/></svg>',
    ewbStatus: 'GENERATED',
    ewbNumber: '291009847165',
    ewbValidUntil: '2026-08-21 23:59',
    vehicleRegistration: 'MH-12-PQ-4412',
    erpSyncStatus: 'SYNCED',
  }
];
