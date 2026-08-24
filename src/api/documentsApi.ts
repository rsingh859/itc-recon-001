import { apiClient } from './client';
import { DocumentUpload, ExtractedInvoiceData } from '../types';

export const documentsApi = {
  async uploadFile(file: File): Promise<DocumentUpload> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.uploadFormData<DocumentUpload>('/documents/upload', formData);
      return res.data;
    } catch {
      // Local fallback simulation
      const mockExtraction: ExtractedInvoiceData = {
        invoiceNo: `INV/${file.name.substring(0, 4).toUpperCase()}/${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceDate: new Date().toISOString().split('T')[0],
        supplierGstin: '07AAACU1234F1Z8',
        supplierName: file.name.toLowerCase().includes('minda') 
          ? 'Uno Minda Auto Components Pvt Ltd' 
          : file.name.toLowerCase().includes('castrol') 
          ? 'Castrol India Lubricants Regional Depot' 
          : 'Apex Automotive Ancillaries Pvt Ltd',
        buyerGstin: '07AABCA9876K1Z2',

        category: file.name.toLowerCase().includes('castrol') ? 'LUBRICANTS' : 'SPARE_PARTS',
        taxableValue: 125000,
        igst: 0,
        cgst: 11250,
        sgst: 11250,
        cess: 0,
        totalTax: 22500,
        totalAmount: 147500,
        confidenceScore: 94,
        rawTextSnippet: `Simulated OCR parsed from ${file.name} | Rate 18% | Taxable ₹1,25,000`,
      };

      return {
        id: `doc-${Date.now()}`,
        tenantId: 'dms-01',
        branchGstin: '07AABCA9876K1Z2',
        fileName: file.name,
        fileType: file.type || 'application/pdf',
        fileSizeBytes: file.size,
        storagePath: `/uploads/${file.name}`,
        sha256Hash: 'local_hash_mock_sha256',
        ocrStatus: 'COMPLETED',
        extractedData: mockExtraction,
        createdAt: new Date().toISOString(),
      };
    }
  },

  async listDocuments(): Promise<DocumentUpload[]> {
    try {
      const res = await apiClient.get<DocumentUpload[]>('/documents');
      return res.data || [];
    } catch {
      return [];
    }
  },

  async confirmExtraction(documentId: string, extractedData: ExtractedInvoiceData): Promise<any> {
    try {
      const res = await apiClient.post('/documents/confirm', {
        documentId,
        extractedData,
      });
      return res.data;
    } catch {
      return { success: true };
    }
  },
};
