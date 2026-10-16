export interface ApiResponse<T = any> {
  status: "success" | "error";
  message: string;
  data: T;
}

export interface User {
  id: number;
  email: string;
  created_at?: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  neutral_band: number;
  share_token: string | null;
  is_demo: boolean;
  created_at: string;
  total_comments?: number;
  negative_percentage?: number;
}

export interface TopWordItem {
  word: string;
  weight: number;
}

export interface AnalysisData {
  sentiment: "Positive" | "Negative" | "Neutral";
  confidence: number;
  polarity: number;
  priority: "High Priority" | "Medium Priority" | "Low Priority";
  priority_reason?: string;
  priority_source: "llm" | "rules";
  top_words: {
    negative: [string, number][];
    positive: [string, number][];
  };
  neutral_band_active?: boolean;
  latency_ms?: number;
}

export interface CommentItem {
  id: number;
  text: string;
  source: string;
  created_at: string;
  analysis: AnalysisData;
  correction?: {
    corrected_sentiment: string;
    created_at: string;
  } | null;
  ticket?: {
    status: "New" | "In progress" | "Resolved";
    note?: string | null;
  } | null;
}

export interface ProjectStats {
  total_comments: number;
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
    positive_pct: number;
    neutral_pct: number;
    negative_pct: number;
  };
  average_confidence: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  priority_counts: {
    high: number;
    medium: number;
    low: number;
  };
  reviewed_count: number;
  agreement_rate: number;
  daily_trends: {
    date: string;
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    is_spike: boolean;
  }[];
  top_keywords: {
    word: string;
    count: number;
  }[];
  wordcloud: string;
}

export interface ExecutiveBriefing {
  headline: string;
  top_issues: string[];
  suggested_actions: string[];
  sampled_comment_ids?: number[];
}

export interface ThemeItem {
  id: number;
  label: string;
  keywords: string[];
  size: number;
  representative_comments: string[];
}
