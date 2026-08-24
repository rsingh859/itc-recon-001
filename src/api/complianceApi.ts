import { apiClient } from './client';
import { ComplianceExceptionAlert, ComplianceWorkflowStep } from '../types';
import { SAMPLE_COMPLIANCE_ALERTS, SAMPLE_COMPLIANCE_WORKFLOW_STEPS } from '../data/complianceOsData';

export const complianceApi = {
  async getAlerts(): Promise<ComplianceExceptionAlert[]> {
    try {
      const res = await apiClient.get<ComplianceExceptionAlert[]>('/compliance/alerts');
      return res.data || SAMPLE_COMPLIANCE_ALERTS;
    } catch {
      return SAMPLE_COMPLIANCE_ALERTS;
    }
  },

  async resolveAlert(id: string): Promise<boolean> {
    try {
      await apiClient.post(`/compliance/alerts/${id}/resolve`, { id });
      return true;
    } catch {
      return true;
    }
  },

  async getWorkflow(): Promise<ComplianceWorkflowStep[]> {
    try {
      const res = await apiClient.get<ComplianceWorkflowStep[]>('/compliance/workflow');
      return res.data || SAMPLE_COMPLIANCE_WORKFLOW_STEPS;
    } catch {
      return SAMPLE_COMPLIANCE_WORKFLOW_STEPS;
    }
  },
};
