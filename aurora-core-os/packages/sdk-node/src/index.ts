/**
 * Aurora Core OS — TypeScript/Node SDK v2.0
 * Works in Node 18+ and modern browsers (uses fetch + WebSocket).
 * npm install @aurora/sdk
 */

export type Mode    = "energy_guardian" | "health_sentinel" | "habitat_optimizer";
export type Domain  = "ENERGY" | "BIOMETRIC" | "ENVIRONMENT";
export type Trend   = "improving" | "stable" | "degrading";
export type Severity = "info" | "warn" | "alert";

export interface AuroraOptions {
  baseUrl: string;
  apiKey:  string;
  /** Timeout in ms for each HTTP request (default: 10000) */
  timeout?: number;
}

export interface EventInput {
  domain:   Domain;
  kind:     string;
  value:    number;
  payload?: any;
}

export interface Signal {
  kind:            string;
  severity:        Severity;
  message:         string;
  recommendation?: string;
}

export interface ScoreBreakdown {
  energy: number; biometric: number; environment: number; mode: Mode;
}

export interface Insight {
  score:          number;
  breakdown:      ScoreBreakdown;
  signals:        Signal[];
  actions:        any[];
  trend:          Trend;
  predictedScore: number;
}

export interface HistoryOptions {
  domain?: Domain;
  kind?:   string;
  from?:   Date | string;
  to?:     Date | string;
  limit?:  number;
}

export interface WebhookInput {
  url:     string;
  events?: string[];
  label?:  string;
}

export class AuroraClient {
  private readonly opts: Required<AuroraOptions>;

  constructor(opts: AuroraOptions) {
    this.opts = { timeout: 10_000, ...opts };
  }

  // ── HTTP plumbing ──────────────────────────────────────────────────────────

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.opts.timeout);
    try {
      const res = await fetch(`${this.opts.baseUrl}${path}`, {
        ...init,
        signal: ctrl.signal,
        headers: {
          "content-type":  "application/json",
          "authorization": `Bearer ${this.opts.apiKey}`,
          ...(init.headers || {}),
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new AuroraError(res.status, body);
      }
      return res.json() as Promise<T>;
    } finally {
      clearTimeout(timer);
    }
  }

  private qs(params: Record<string, any>): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) p.set(k, v instanceof Date ? v.toISOString() : String(v));
    }
    const s = p.toString();
    return s ? "?" + s : "";
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  /** Send one or many sensor readings */
  sendEvent(ev: EventInput | EventInput[]) {
    return this.request<{ accepted: number; results: Array<{ score: number; trend: Trend }> }>(
      "/v1/events", { method: "POST", body: JSON.stringify(ev) }
    );
  }

  // ── State ──────────────────────────────────────────────────────────────────

  getState() {
    return this.request<{ installationId: string; state: any }>("/v1/state");
  }

  // ── Insights ───────────────────────────────────────────────────────────────

  getInsights() {
    return this.request<{ current: Insight; history: any[] }>("/v1/insights");
  }

  // ── History ────────────────────────────────────────────────────────────────

  /** Query raw event time-series */
  getHistory(opts: HistoryOptions = {}) {
    return this.request<{ events: any[]; count: number }>(
      "/v1/history" + this.qs({ domain: opts.domain, kind: opts.kind, from: opts.from, to: opts.to, limit: opts.limit })
    );
  }

  /** Query score history */
  getScoreHistory(opts: { from?: Date | string; to?: Date | string; limit?: number } = {}) {
    return this.request<{ scores: any[]; count: number }>(
      "/v1/history/scores" + this.qs(opts)
    );
  }

  // ── Devices ────────────────────────────────────────────────────────────────

  getDevices() {
    return this.request<{ devices: any[] }>("/v1/devices");
  }

  command(deviceId: string, command: string, args?: any, reason?: string) {
    return this.request<{ action: any }>(
      `/v1/devices/${deviceId}/command`,
      { method: "POST", body: JSON.stringify({ command, args, reason }) }
    );
  }

  // ── Modes ──────────────────────────────────────────────────────────────────

  getModes() {
    return this.request<{ active: Mode; available: any[] }>("/v1/config/modes");
  }

  setMode(mode: Mode) {
    return this.request<{ mode: Mode }>("/v1/config/mode", { method: "POST", body: JSON.stringify({ mode }) });
  }

  // ── Chat (AI) ──────────────────────────────────────────────────────────────

  /** Natural language query — requires ANTHROPIC_API_KEY on the server */
  chat(message: string) {
    return this.request<{ reply: string; score: number; signals: Signal[]; action: any | null }>(
      "/v1/chat", { method: "POST", body: JSON.stringify({ message }) }
    );
  }

  // ── Webhooks ───────────────────────────────────────────────────────────────

  getWebhooks() {
    return this.request<{ webhooks: any[] }>("/v1/webhooks");
  }

  createWebhook(input: WebhookInput) {
    return this.request<{ webhook: any }>("/v1/webhooks", { method: "POST", body: JSON.stringify(input) });
  }

  deleteWebhook(id: string) {
    return this.request<{ deleted: boolean }>(`/v1/webhooks/${id}`, { method: "DELETE" });
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  getActions(opts: { status?: "PENDING" | "SENT" | "ACKED" | "FAILED"; limit?: number } = {}) {
    return this.request<{ actions: any[] }>("/v1/actions" + this.qs(opts));
  }

  ackAction(id: string, status: "ACKED" | "FAILED") {
    return this.request<{ action: any }>(`/v1/actions/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
  }

  // ── Simulation ────────────────────────────────────────────────────────────

  simulate(scenario: "healthy" | "stress" | "peak_solar" = "healthy") {
    return this.request<{ scenario: string; injected: number; score: number | null }>(
      "/v1/simulate", { method: "POST", body: JSON.stringify({ scenario }) }
    );
  }

  // ── Export ────────────────────────────────────────────────────────────────

  export() {
    return this.request<any>("/v1/export");
  }

  // ── Audit ─────────────────────────────────────────────────────────────────

  getAuditLog(limit = 50) {
    return this.request<{ logs: any[] }>(`/v1/audit?limit=${limit}`);
  }

  // ── Health ────────────────────────────────────────────────────────────────

  health() {
    return this.request<{ ok: boolean; ts: number; checks: Record<string, string>; version: string }>("/health");
  }

  // ── Real-time ─────────────────────────────────────────────────────────────

  /**
   * Subscribe to real-time events over WebSocket.
   * Returns an unsubscribe function.
   *
   * @example
   * const off = aurora.subscribe(msg => {
   *   if (msg.type === "score")  console.log("Score:", msg.score, msg.trend);
   *   if (msg.type === "action") console.log("Action:", msg.action.command);
   * });
   * // later:
   * off();
   */
  subscribe(
    cb: (msg: any) => void,
    opts: { reconnect?: boolean; maxRetries?: number } = {}
  ): () => void {
    const { reconnect = true, maxRetries = 10 } = opts;
    const wsUrl  = this.opts.baseUrl.replace(/^http/, "ws") + `/v1/stream?api_key=${this.opts.apiKey}`;
    let ws: any;
    let retries  = 0;
    let stopped  = false;

    const connect = () => {
      ws = new (globalThis as any).WebSocket(wsUrl);
      ws.onmessage = (ev: any) => { try { cb(JSON.parse(ev.data)); } catch {} };
      ws.onclose   = () => {
        if (stopped || !reconnect || retries >= maxRetries) return;
        const delay = Math.min(1_000 * 2 ** retries, 30_000);
        retries++;
        setTimeout(connect, delay);
      };
      ws.onerror   = () => {};
    };

    connect();
    return () => { stopped = true; ws?.close(); };
  }
}

export class AuroraError extends Error {
  constructor(public readonly status: number, body: string) {
    super(`Aurora API ${status}: ${body}`);
    this.name = "AuroraError";
  }
}

export default AuroraClient;
