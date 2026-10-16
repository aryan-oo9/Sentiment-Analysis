import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { api } from "../api/client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export const SharedReport: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      api.getSharedReport(token)
        .then(setReport)
        .catch((err) => setError(err.message || "Report not found or has been revoked."))
        .finally(() => setLoading(false));
    }
  }, [token]);

  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-semibold text-[var(--muted)]">
        Loading shared executive report...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-xl mx-auto py-24 px-6 text-center space-y-4">
        <span className="text-xs font-bold text-[var(--field-coral)] block">Error 404</span>
        <h1 className="text-3xl font-black uppercase tracking-tight">Report Unavailable</h1>
        <p className="text-sm text-[var(--muted)] leading-relaxed">
          {error || "The requested public report is inactive or has been revoked by the workspace owner."}
        </p>
        <div className="pt-4">
          <Link
            to="/"
            className="inline-block bg-[var(--ink)] text-[var(--bg)] px-6 py-2.5 font-bold text-xs hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] transition-colors"
          >
            Go to TweetSense Homepage &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const stats = report.stats || {};
  const breakdown = stats.sentiment_breakdown || {
    positive: 0, neutral: 0, negative: 0,
    positive_pct: 0, neutral_pct: 0, negative_pct: 0
  };
  const negPct = breakdown.negative_pct || 0;
  const posPct = breakdown.positive_pct || 0;
  const dailyTrends = stats.daily_trends || [];
  const themes = report.themes || [];
  const briefing = report.briefing || null;

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-8 py-10 space-y-10 w-full">
      {/* 1. Header Bar */}
      <div className="border-b-2 border-[var(--ink)] pb-6 space-y-2">
        <div className="flex items-center gap-2">
          <span className="bg-[var(--ink)] text-[var(--bg)] text-[10px] font-bold px-2 py-0.5 uppercase">
            Public Executive View
          </span>
          <span className="text-xs text-[var(--muted)] font-sans font-medium">
            Generated {new Date(report.created_at).toLocaleDateString()}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight mt-1">
          {report.project_name}
        </h1>
        {report.project_description && (
          <p className="text-sm text-[var(--muted)] leading-relaxed max-w-2xl">
            {report.project_description}
          </p>
        )}
      </div>

      {/* 2. Dominant Signal Statement Figure */}
      <div className="border-2 border-[var(--ink)] bg-[var(--surface)] p-6 md:p-8 space-y-4">
        <span className="text-xs font-bold text-[var(--muted)] block">
          Dominant Public Signal
        </span>
        <div
          className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none ${
            negPct > posPct ? "text-[var(--field-coral)]" : "text-[var(--field-green)]"
          }`}
        >
          {stats.total_comments === 0
            ? "No Feedback"
            : negPct > posPct
            ? `${negPct}% Negative`
            : `${posPct}% Positive`}
        </div>
        <p className="text-sm sm:text-base text-[var(--ink)] max-w-2xl leading-relaxed">
          {stats.total_comments === 0
            ? "No feedback analyzed in this workspace."
            : negPct > 50
            ? `Customer sentiment is heavily skewed negative across ${stats.total_comments} analyzed inquiries.`
            : `Overall reception is healthy with ${posPct}% positive valence recorded.`}
        </p>

        {/* 3-Class Sentiment Breakdown Strip */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)] font-mono text-xs">
          <div className="p-2.5 bg-[var(--bg)] border border-[var(--border)]">
            <span className="block font-sans text-[10px] font-bold uppercase text-[var(--field-green)]">Positive</span>
            <span className="text-base font-bold text-[var(--ink)]">{breakdown.positive_pct}%</span>
            <span className="text-[10px] text-[var(--muted)] ml-1">({breakdown.positive})</span>
          </div>
          <div className="p-2.5 bg-[var(--bg)] border border-[var(--border)]">
            <span className="block font-sans text-[10px] font-bold uppercase text-[var(--field-coral)]">Negative</span>
            <span className="text-base font-bold text-[var(--ink)]">{breakdown.negative_pct}%</span>
            <span className="text-[10px] text-[var(--muted)] ml-1">({breakdown.negative})</span>
          </div>
          <div className="p-2.5 bg-[var(--bg)] border border-[var(--border)]">
            <span className="block font-sans text-[10px] font-bold uppercase text-[var(--field-yellow)]">Neutral</span>
            <span className="text-base font-bold text-[var(--ink)]">{breakdown.neutral_pct}%</span>
            <span className="text-[10px] text-[var(--muted)] ml-1">({breakdown.neutral})</span>
          </div>
        </div>
      </div>

      {/* 3. Sentiment Trajectory Area Chart */}
      {dailyTrends.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-baseline border-b border-[var(--border)] pb-2">
            <h2 className="text-xl font-black uppercase tracking-tight">Sentiment Trajectory</h2>
            <div className="flex gap-4 text-xs font-bold">
              <span className="text-[var(--field-green)]">&bull; Positive</span>
              <span className="text-[var(--field-coral)]">&bull; Negative</span>
              <span className="text-[var(--field-yellow)]">&bull; Neutral</span>
            </div>
          </div>

          <div className="h-64 border-2 border-[var(--ink)] bg-[var(--bg)] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#5f5b52" fontSize={11} tickLine={false} />
                <YAxis stroke="#5f5b52" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "none",
                    borderRadius: 0,
                    color: "#e6e0d2",
                    fontSize: 12
                  }}
                />
                <Area type="monotone" dataKey="negative" stackId="1" stroke="#ed4b44" fill="#ed4b44" fillOpacity={1} />
                <Area type="monotone" dataKey="neutral" stackId="1" stroke="#f2c21a" fill="#f2c21a" fillOpacity={1} />
                <Area type="monotone" dataKey="positive" stackId="1" stroke="#18bc42" fill="#18bc42" fillOpacity={1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. Ranked Themes List (Comment text hidden by default) */}
      {themes.length > 0 && (
        <div className="border-2 border-[var(--ink)] bg-[var(--surface)] p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-baseline border-b border-[var(--border)] pb-3">
            <h2 className="text-xl font-black uppercase tracking-tight">Ranked Feedback Themes</h2>
            <span className="text-xs text-[var(--muted)] font-mono">{themes.length} clusters identified</span>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {themes.map((theme: any, idx: number) => (
              <div key={theme.id || idx} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-baseline gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[var(--muted)]">{String(idx + 1).padStart(2, "0")}.</span>
                    <h3 className="text-lg font-bold tracking-tight text-[var(--ink)]">{theme.label}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1 pl-6">
                    {(theme.keywords || []).map((kw: string, i: number) => (
                      <span key={i} className="text-[11px] font-mono bg-[var(--bg)] px-1.5 py-0.5 border border-[var(--border)]">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-xs font-mono font-bold text-[var(--muted)] self-end md:self-auto tabular-nums">
                  {theme.size} comments
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Incident Synthesis Briefing */}
      {briefing && (
        <div className="border-2 border-[var(--ink)] bg-[var(--surface)] p-6 md:p-8 space-y-6">
          <div className="text-xs font-bold text-[var(--muted)] border-b border-[var(--border)] pb-2">
            Incident Synthesis Briefing
          </div>
          <h3 className="text-2xl font-black tracking-tight leading-snug text-[var(--ink)]">
            &ldquo;{briefing.headline}&rdquo;
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm pt-2">
            <div className="space-y-2">
              <span className="text-xs font-bold text-[var(--muted)] block">
                Primary Friction Areas
              </span>
              <ul className="space-y-2 text-xs sm:text-sm">
                {(briefing.top_issues || []).map((iss: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-bold text-[var(--field-coral)]">&bull;</span>
                    <span>{iss}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-[var(--muted)] block">
                Recommended Interventions
              </span>
              <ul className="space-y-2 text-xs sm:text-sm">
                {(briefing.suggested_actions || []).map((act: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-bold text-[var(--field-green)]">&bull;</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="text-xs text-[var(--muted)] border-t border-[var(--border)] pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <span>Raw feedback comments and administrative controls are protected and hidden from public views.</span>
        <Link to="/" className="hover:underline font-bold text-[var(--ink)]">
          Create Your Own Workspace &rarr;
        </Link>
      </div>
    </div>
  );
};
