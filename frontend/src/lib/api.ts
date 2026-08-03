const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type User = {
  id: number;
  username: string;
  email: string;
  is_admin?: boolean;
  created_at: string;
};

export type UserStats = {
  datasets: number;
  analyses: number;
  completed_analyses: number;
};

export type Dataset = {
  id: number;
  user_id: number;
  filename: string;
  file_key: string;
  size_bytes: number;
  row_count: number;
  column_count: number;
  columns: string[];
  created_at: string;
};

export type DatasetPreview = {
  rows: number;
  columns: string[];
  sample: Record<string, unknown>[];
};

export type ChartResult = {
  title: string;
  html: string;
  format?: string;
};

export type ExecutionResult = {
  success?: boolean;
  stdout?: string;
  stderr?: string;
};

export type AnalysisInsights = {
  rows?: number;
  columns?: string[];
  dtypes?: Record<string, string>;
  null_counts?: Record<string, number>;
  numeric_summary?: Record<string, Record<string, number>>;
  figures?: string[];
};

export type AnalysisSummary = {
  headline?: string;
  narrative?: string;
  key_findings?: string[];
  demo_mode?: boolean;
  chart_count?: number;
  row_count?: number;
  column_count?: number;
};

export type Analysis = {
  id: number;
  user_id: number;
  dataset_id: number;
  query: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  plan?: string | null;
  plan_desc?: string | null;
  output?: string | null;
  agent_outputs?: Record<string, Record<string, string>>;
  error_message?: string | null;
  filename?: string;
  file_key?: string;
  row_count?: number;
  column_count?: number;
  dataset_preview?: DatasetPreview | null;
  charts?: ChartResult[];
  insights?: AnalysisInsights | null;
  execution?: ExecutionResult | null;
  summary?: AnalysisSummary | null;
  created_at: string;
  completed_at?: string | null;
};

class ApiError extends Error {
  status: number;
  analysis?: Analysis;

  constructor(message: string, status: number, analysis?: Analysis) {
    super(message);
    this.status = status;
    this.analysis = analysis;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const method = (options.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    const csrf = readCookie("csrf_access_token");
    if (csrf) headers.set("X-CSRF-TOKEN", csrf);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      `Can't reach the server at ${API_URL}. Make sure the backend is running and NEXT_PUBLIC_API_URL is correct.`,
      0,
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => ({}));
  if (response.status >= 400) {
    throw new ApiError(
      data.message || "Request failed",
      response.status,
      data.analysis,
    );
  }
  return data as T;
}

export const api = {
  health: () =>
    request<{ status: string; demo_mode?: boolean }>("/api/health"),

  register: (payload: { username: string; email: string; password: string }) =>
    request<{ access_token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload: { username: string; password: string }) =>
    request<{ access_token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  logout: () => request<{ message: string }>("/api/auth/logout", { method: "POST" }),

  me: () =>
    request<{ user: User; stats: UserStats; demo_mode?: boolean }>("/api/auth/me"),

  requestPasswordReset: (email: string) =>
    request<{ message: string; dev_reset_link?: string }>(
      "/api/auth/password-reset/request",
      { method: "POST", body: JSON.stringify({ email }) },
    ),

  confirmPasswordReset: (payload: { token: string; new_password: string }) =>
    request<{ message: string }>("/api/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listDatasets: () => request<{ datasets: Dataset[] }>("/api/datasets"),

  uploadDataset: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ dataset: Dataset; message: string }>("/api/datasets/upload", {
      method: "POST",
      body: formData,
    });
  },

  loadSampleDataset: () =>
    request<{
      dataset: Dataset;
      message: string;
      suggested_query: string;
    }>("/api/datasets/sample", { method: "POST" }),

  deleteDataset: (id: number) =>
    request<{ message: string }>(`/api/datasets/${id}`, { method: "DELETE" }),

  listAnalyses: () => request<{ analyses: Analysis[]; total?: number }>("/api/analyses"),

  createAnalysis: (payload: {
    query: string;
    dataset_id: number;
    async?: boolean;
  }) =>
    request<{ analysis: Analysis; message: string; async?: boolean }>("/api/analyses", {
      method: "POST",
      body: JSON.stringify({ async: true, ...payload }),
    }),

  getAnalysis: (id: number) =>
    request<{ analysis: Analysis }>(`/api/analyses/${id}`),

  deleteAnalysis: (id: number) =>
    request<{ message: string }>(`/api/analyses/${id}`, { method: "DELETE" }),

  cancelAnalysis: (id: number) =>
    request<{ message: string; analysis?: Analysis }>(`/api/analyses/${id}/cancel`, {
      method: "POST",
    }),

  changePassword: (payload: { current_password: string; new_password: string }) =>
    request<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  downloadReport: async (id: number) => {
    const headers = new Headers();
    const csrf = readCookie("csrf_access_token");
    if (csrf) headers.set("X-CSRF-TOKEN", csrf);
    const response = await fetch(`${API_URL}/api/analyses/${id}/report`, {
      credentials: "include",
      headers,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(data.message || "Report download failed", response.status);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `prysm-analysis-${id}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  },

  demoStatus: () =>
    request<{
      demo_mode: boolean;
      openai_configured: boolean;
      ready_for_stakeholders: boolean;
      issues?: string[];
      checks?: Record<string, boolean>;
      charts_enabled?: boolean;
    }>("/api/demo/status"),
};

export { ApiError };
