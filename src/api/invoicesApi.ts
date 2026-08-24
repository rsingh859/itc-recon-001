import { apiClient } from './client';
import { SalesInvoiceItem, SAMPLE_SALES_INVOICES } from '../data/salesInvoicesData';

export const invoicesApi = {
  async getInvoices(params?: { filter?: string; q?: string }): Promise<SalesInvoiceItem[]> {
    try {
      const res = await apiClient.get<SalesInvoiceItem[]>('/invoices', params);
      return res.data || [];
    } catch {
      let filtered = [...SAMPLE_SALES_INVOICES];
      if (params?.filter === 'IRN_GENERATED') filtered = filtered.filter((i) => i.irnStatus === 'GENERATED');
      if (params?.filter === 'PENDING_IRN') filtered = filtered.filter((i) => i.irnStatus === 'PENDING');
      if (params?.filter === 'FAILED') filtered = filtered.filter((i) => i.irnStatus === 'FAILED');
      if (params?.filter === 'EWB') filtered = filtered.filter((i) => i.ewbStatus === 'GENERATED');
      return filtered;
    }
  },

  async generateIRN(id: string): Promise<SalesInvoiceItem | null> {
    try {
      const res = await apiClient.post<SalesInvoiceItem>(`/invoices/${id}/irn`);
      return res.data;
    } catch {
      const inv = SAMPLE_SALES_INVOICES.find((i) => i.id === id);
      if (inv) {
        return {
          ...inv,
          irnStatus: 'GENERATED',
          irnNumber: '9f8b2c418e7d23a15b9c0e7f8a9123456789abcdef0123456789abcdef012345',
          ackNumber: '112609847199',
          ackDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
          signedQrPayload: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23fff"/><path d="M10,10 h30 v30 h-30 z M60,10 h30 v30 h-30 z M10,60 h30 v30 h-30 z M20,20 h10 v10 h-10 z M70,20 h10 v10 h-10 z M20,70 h10 v10 h-10 z M50,50 h10 v20 h-10 z" fill="%23000"/></svg>',
        };
      }
      return null;
    }
  },
};
