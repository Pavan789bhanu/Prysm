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

export type Analysis = {
  id: number;
  user_id: number;
  dataset_id: number;
  query: string;
  status: "pending" | "processing" | "completed" | "failed";
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
  created_at: string;
  completed_at?: string | null;
};

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
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
    // fetch rejects (TypeError) when the server is unreachable, DNS fails,
    // or CORS blocks the request before a response is returned. Surface a
    // specific, actionable message instead of a generic "Unable to sign in".
    throw new ApiError(
      `Can't reach the server at ${API_URL}. Make sure the backend is running and NEXT_PUBLIC_API_URL is correct.`,
      0,
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.message || "Request failed", response.status);
  }
  return data as T;
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),

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
    request<{ user: User; stats: UserStats }>("/api/auth/me", {}, token),

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

  listAnalyses: (token: string) =>
    request<{ analyses: Analysis[] }>("/api/analyses", {}, token),

  createAnalysis: (token: string, payload: { query: string; dataset_id: number }) =>
    request<{ analysis: Analysis; message: string }>(
      "/api/analyses",
      { method: "POST", body: JSON.stringify(payload) },
      token,
    ),

  getAnalysis: (token: string, id: number) =>
    request<{ analysis: Analysis }>(`/api/analyses/${id}`, {}, token),
};

export { ApiError };
