import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { api } from "../api/client";

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
        Loading shared report...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-6 text-center space-y-4">
        <h1 className="text-3xl font-black uppercase tracking-tight">Report Unavailable</h1>
        <p className="text-sm text-[var(--muted)]">{error || "The requested link is inactive."}</p>
        <Link to="/" className="inline-block mt-4 text-xs font-bold underline">
          Go to TweetSense Homepage
        </Link>
      </div>
    );
  }

  const s = report.sentiment_breakdown;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
      <div className="border-b-2 border-[var(--ink)] pb-6">
        <span className="text-xs font-bold text-[var(--muted)] block">
          Public Executive Report
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight mt-1">
          {report.project_name}
        </h1>
        {report.project_description && (
          <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
            {report.project_description}
          </p>
        )}
      </div>

      <div className="border-2 border-[var(--ink)] bg-[var(--surface)] p-6 md:p-8 space-y-6">
        <span className="text-xs font-bold text-[var(--muted)] block">
          Sentiment summary ({report.total_comments} comments analyzed)
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-5 bg-[var(--field-green)] text-[var(--ink)] border border-[var(--ink)]">
            <div className="text-xs font-bold uppercase">Positive Share</div>
            <div className="text-3xl sm:text-4xl font-black mt-1">{s.positive_pct}%</div>
            <div className="text-xs font-mono mt-2">{s.positive} comments</div>
          </div>

          <div className="p-5 bg-[var(--field-coral)] text-white border border-[var(--ink)]">
            <div className="text-xs font-bold uppercase">Negative Share</div>
            <div className="text-3xl sm:text-4xl font-black mt-1">{s.negative_pct}%</div>
            <div className="text-xs font-mono mt-2">{s.negative} comments</div>
          </div>

          <div className="p-5 bg-[var(--field-yellow)] text-[var(--ink)] border border-[var(--ink)]">
            <div className="text-xs font-bold uppercase">Neutral Share</div>
            <div className="text-3xl sm:text-4xl font-black mt-1">{s.neutral_pct}%</div>
            <div className="text-xs font-mono mt-2">{s.neutral} comments</div>
          </div>
        </div>
      </div>

      <div className="text-xs text-[var(--muted)] border-t border-[var(--border)] pt-6 flex justify-between">
        <span>Generated with TweetSense Feedback Intelligence</span>
        <Link to="/" className="hover:underline font-bold text-[var(--ink)]">
          Create Your Own Report &rarr;
        </Link>
      </div>
    </div>
  );
};
