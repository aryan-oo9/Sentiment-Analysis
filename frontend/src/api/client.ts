import type { ApiResponse } from "./types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem("tweetsense_token");
  }

  public setToken(token: string | null) {
    if (token) {
      localStorage.setItem("tweetsense_token", token);
    } else {
      localStorage.removeItem("tweetsense_token");
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      ...(options.headers || {}),
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      (headers as Record<string, string>)["Content-Type"] = "application/json";
    }

    const url = `${BASE_URL}${endpoint}`;
    const res = await fetch(url, { ...options, headers });
    
    let json: ApiResponse<T>;
    try {
      json = await res.json();
    } catch {
      throw new Error(`Failed to parse response from ${endpoint} (HTTP ${res.status})`);
    }

    if (!res.ok || json.status === "error") {
      if (res.status === 401) {
        this.setToken(null);
        window.dispatchEvent(new CustomEvent("tweetsense:unauthorized"));
      }
      throw new Error(json.message || `Request failed with status ${res.status}`);
    }

    return json.data;
  }

  // Auth
  async register(body: { email: string; password: string }) {
    return this.request<{ token: string; user: any }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async login(body: { email: string; password: string }) {
    return this.request<{ token: string; user: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async getMe() {
    return this.request<{ user: any }>("/api/auth/me", { method: "GET" });
  }

  // Projects
  async getProjects() {
    return this.request<any[]>("/api/projects", { method: "GET" });
  }

  async createProject(body: { name: string; description?: string; neutral_band?: number }) {
    return this.request<any>("/api/projects", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async getProject(id: number) {
    return this.request<any>(`/api/projects/${id}`, { method: "GET" });
  }

  async updateProject(id: number, body: { name?: string; description?: string; neutral_band?: number }) {
    return this.request<any>(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async deleteProject(id: number) {
    return this.request<any>(`/api/projects/${id}`, { method: "DELETE" });
  }

  async toggleShare(id: number, enabled: boolean) {
    return this.request<{ share_token: string | null; share_url: string | null }>(
      `/api/projects/${id}/share`,
      {
        method: "POST",
        body: JSON.stringify({ enabled }),
      }
    );
  }

  // Comments & Ingestion
  async ingestComments(projectId: number, comments: { text: string; source?: string }[]) {
    return this.request<{ ingested_count: number; comments: any[] }>(
      `/api/projects/${projectId}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ comments }),
      }
    );
  }

  async importCsv(projectId: number, formData: FormData) {
    return this.request<{ total_processed: number; skipped_rows: number }>(
      `/api/projects/${projectId}/import`,
      {
        method: "POST",
        body: formData,
      }
    );
  }

  async getComments(
    projectId: number,
    params: { page?: number; limit?: number; sentiment?: string; priority?: string; source?: string; search?: string }
  ) {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.sentiment) qs.set("sentiment", params.sentiment);
    if (params.priority) qs.set("priority", params.priority);
    if (params.source) qs.set("source", params.source);
    if (params.search) qs.set("search", params.search);

    return this.request<{ comments: any[]; pagination: any }>(
      `/api/projects/${projectId}/comments?${qs.toString()}`,
      { method: "GET" }
    );
  }

  async correctComment(commentId: number, correctedSentiment: string) {
    return this.request<any>(`/api/comments/${commentId}/correct`, {
      method: "POST",
      body: JSON.stringify({ corrected_sentiment: correctedSentiment }),
    });
  }

  async updateTicket(commentId: number, body: { status: string; note?: string | null }) {
    return this.request<any>(`/api/comments/${commentId}/ticket`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  // Insights
  async getProjectStats(projectId: number) {
    return this.request<any>(`/api/projects/${projectId}/stats`, { method: "GET" });
  }

  async getProjectThemes(projectId: number) {
    return this.request<any[]>(`/api/projects/${projectId}/themes`, { method: "GET" });
  }

  async getExecutiveBriefing(projectId: number) {
    return this.request<any>(`/api/projects/${projectId}/briefing`, { method: "POST" });
  }

  // Reply Drafts
  async createReplyDraft(commentId: number, tone: string = "warm") {
    return this.request<any>(`/api/comments/${commentId}/reply-draft`, {
      method: "POST",
      body: JSON.stringify({ tone }),
    });
  }

  async updateReplyDraft(draftId: number, body: { body: string; status: string }) {
    return this.request<any>(`/api/reply-drafts/${draftId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  // Public Demo
  async demoAnalyze(text: string) {
    return this.request<any>("/api/demo/analyze", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  }

  async getSharedReport(token: string) {
    return this.request<any>(`/api/share/${token}`, { method: "GET" });
  }
}

export const api = new ApiClient();
