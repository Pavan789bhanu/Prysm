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

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      `Can't reach the server at ${API_URL}. Make sure the backend is running and NEXT_PUBLIC_API_URL is correct.`,
      0,
    );
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

  me: (token: string) =>
    request<{ user: User; stats: UserStats; demo_mode?: boolean }>(
      "/api/auth/me",
      {},
      token,
    ),

  listDatasets: (token: string) =>
    request<{ datasets: Dataset[] }>("/api/datasets", {}, token),

  uploadDataset: (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ dataset: Dataset; message: string }>(
      "/api/datasets/upload",
      { method: "POST", body: formData },
      token,
    );
  },

  loadSampleDataset: (token: string) =>
    request<{
      dataset: Dataset;
      message: string;
      suggested_query: string;
    }>("/api/datasets/sample", { method: "POST" }, token),

  deleteDataset: (token: string, id: number) =>
    request<{ message: string }>(
      `/api/datasets/${id}`,
      { method: "DELETE" },
      token,
    ),

  listAnalyses: (token: string) =>
    request<{ analyses: Analysis[] }>("/api/analyses", {}, token),

  createAnalysis: (
    token: string,
    payload: { query: string; dataset_id: number; async?: boolean },
  ) =>
    request<{ analysis: Analysis; message: string; async?: boolean }>(
      "/api/analyses",
      {
        method: "POST",
        body: JSON.stringify({ async: true, ...payload }),
      },
      token,
    ),

  getAnalysis: (token: string, id: number) =>
    request<{ analysis: Analysis }>(`/api/analyses/${id}`, {}, token),

  deleteAnalysis: (token: string, id: number) =>
    request<{ message: string }>(
      `/api/analyses/${id}`,
      { method: "DELETE" },
      token,
    ),

  cancelAnalysis: (token: string, id: number) =>
    request<{ message: string; analysis?: Analysis }>(
      `/api/analyses/${id}/cancel`,
      { method: "POST" },
      token,
    ),

  changePassword: (
    token: string,
    payload: { current_password: string; new_password: string },
  ) =>
    request<{ message: string }>(
      "/api/auth/change-password",
      { method: "POST", body: JSON.stringify(payload) },
      token,
    ),

  downloadReport: async (token: string, id: number) => {
    const response = await fetch(`${API_URL}/api/analyses/${id}/report`, {
      headers: { Authorization: `Bearer ${token}` },
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
