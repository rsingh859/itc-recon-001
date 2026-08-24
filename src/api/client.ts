/**
 * AutoTax API Client
 * Bridges the React frontend with the Go Backend (port 8080),
 * Mock Integration Server (port 8081), or local fallback.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    correlationId: string;
    executionTimeUs: number;
    executionTimeMs: string;
    version: string;
  };
  error?: string;
}

export interface ServerTelemetry {
  isConnected: boolean;
  serverType: 'GO_NATIVE' | 'MOCK_SERVER' | 'OFFLINE_FALLBACK';
  latencyMs: number;
  engine: string;
  version?: string;
  uptimeSec?: number;
}

class ApiClient {
  private baseUrl: string;
  private activeTenantId: string = 'dms-01';
  private activeGstin: string = '07AABCA9876K1Z2';
  private authToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('autotax_jwt') : null;
  private currentTelemetry: ServerTelemetry = {
    isConnected: false,
    serverType: 'OFFLINE_FALLBACK',
    latencyMs: 0,
    engine: 'In-Memory Client Engine',
  };
  private telemetryListeners: Array<(telemetry: ServerTelemetry) => void> = [];

  constructor() {
    // In Vite dev, '/api' is proxied or directly addressed
    this.baseUrl = (import.meta as any).env?.VITE_API_URL || '/api/v1';
  }

  public setTenantContext(tenantId: string, gstin: string) {
    this.activeTenantId = tenantId;
    this.activeGstin = gstin;
  }

  public setAuthToken(token: string | null) {
    this.authToken = token;
    if (token) {
      localStorage.setItem('autotax_jwt', token);
    } else {
      localStorage.removeItem('autotax_jwt');
    }
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  public subscribeTelemetry(listener: (telemetry: ServerTelemetry) => void): () => void {
    this.telemetryListeners.push(listener);
    listener(this.currentTelemetry);
    return () => {
      this.telemetryListeners = this.telemetryListeners.filter((l) => l !== listener);
    };
  }

  private notifyTelemetry(telemetry: ServerTelemetry) {
    this.currentTelemetry = telemetry;
    this.telemetryListeners.forEach((l) => l(telemetry));
  }

  public getTelemetry(): ServerTelemetry {
    return this.currentTelemetry;
  }

  public async checkHealth(): Promise<ServerTelemetry> {
    const start = performance.now();
    try {
      const resp = await fetch('/healthz', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000),
      });

      const elapsed = Math.round(performance.now() - start);
      if (resp.ok) {
        const json: ApiResponse<any> = await resp.json();
        const serverEngine = resp.headers.get('X-Server-Engine') || '';
        const isGo = serverEngine.includes('Go') || (json.meta?.version || '').includes('go');
        
        const telemetry: ServerTelemetry = {
          isConnected: true,
          serverType: isGo ? 'GO_NATIVE' : 'MOCK_SERVER',
          latencyMs: elapsed,
          engine: isGo ? 'Native Go Goroutine Engine (Port 8080)' : 'Mock Server Simulator (Port 8081)',
          version: json.meta?.version || '1.0.0',
          uptimeSec: json.data?.uptimeSec,
        };
        this.notifyTelemetry(telemetry);
        return telemetry;
      }
    } catch {
      // Backend not reachable; fallback to client mode
    }

    const fallback: ServerTelemetry = {
      isConnected: false,
      serverType: 'OFFLINE_FALLBACK',
      latencyMs: 0,
      engine: 'In-Memory Client Engine',
    };
    this.notifyTelemetry(fallback);
    return fallback;
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const start = performance.now();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Tenant-ID': this.activeTenantId,
      'X-Active-GSTIN': this.activeGstin,
      'X-Correlation-ID': `web_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(10000),
      });

      const elapsed = Math.round(performance.now() - start);
      const serverEngine = response.headers.get('X-Server-Engine') || '';
      const isGo = serverEngine.includes('Go');

      if (response.ok) {
        this.notifyTelemetry({
          isConnected: true,
          serverType: isGo ? 'GO_NATIVE' : 'MOCK_SERVER',
          latencyMs: elapsed,
          engine: isGo ? 'Native Go Goroutine Engine (8080)' : 'Mock Integration Server (8081)',
        });

        return await response.json();
      } else {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err: any) {
      // If server request fails, record offline state
      this.notifyTelemetry({
        isConnected: false,
        serverType: 'OFFLINE_FALLBACK',
        latencyMs: 0,
        engine: 'In-Memory Fallback Engine',
      });
      throw err;
    }
  }

  public async uploadFormData<T = any>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const start = performance.now();

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-Tenant-ID': this.activeTenantId,
      'X-Active-GSTIN': this.activeGstin,
      'X-Correlation-ID': `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      ...(this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}),
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: AbortSignal.timeout(30000),
      });

      const elapsed = Math.round(performance.now() - start);
      if (response.ok) {
        return await response.json();
      } else {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Upload failed (HTTP ${response.status})`);
      }
    } catch (err: any) {
      throw err;
    }
  }


  public async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          qs.append(k, String(v));
        }
      });
      const qString = qs.toString();
      if (qString) {
        url += (url.includes('?') ? '&' : '?') + qString;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  public async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const apiClient = new ApiClient();
