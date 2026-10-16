import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { api } from "../api/client";
import type { Project, ProjectStats, ExecutiveBriefing, ThemeItem } from "../api/types";
import { Plus, AlertTriangle, Download, Globe } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

export const ProjectDashboard: React.FC = () => {
  const { projectId } = useParams();
  const id = Number(projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Ingestion Modal State
  const [showIngest, setShowIngest] = useState(false);
  const [ingestMode, setIngestMode] = useState<"paste" | "csv" | "hn">("paste");
  const [pasteText, setPasteText] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [textColumn, setTextColumn] = useState("");
  const [hnQuery, setHnQuery] = useState("");
  const [hnLimit, setHnLimit] = useState(20);
  const [ingesting, setIngesting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projData, statsData, themesData] = await Promise.all([
        api.getProject(id),
        api.getProjectStats(id),
        api.getProjectThemes(id)
      ]);
      setProject(projData);
      setStats(statsData);
      setThemes(themesData);

      // Fetch briefing asynchronously if comments exist
      if (statsData.total_comments > 0) {
        api.getExecutiveBriefing(id).then(setBriefing).catch(console.error);
      }
    } catch (err) {
      console.error("Dashboard load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngesting(true);
    try {
      if (ingestMode === "paste") {
        const lines = pasteText
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 2);
        if (lines.length === 0) throw new Error("Please enter at least one comment");
        await api.ingestComments(
          id,
          lines.map((text) => ({ text, source: "paste" }))
        );
      } else if (ingestMode === "csv") {
        if (!csvFile) throw new Error("Please select a CSV file");
        const fd = new FormData();
        fd.append("file", csvFile);
        if (textColumn) fd.append("text_column", textColumn);
        await api.importCsv(id, fd);
      } else if (ingestMode === "hn") {
        if (!hnQuery.trim()) throw new Error("Please enter a Hacker News search query");
        const res = await api.pullHn(id, hnQuery.trim(), hnLimit);
        if (res.ingested_count === 0) {
          alert("No matching Hacker News comments found for your query.");
        }
      }

      setShowIngest(false);
      setPasteText("");
      setCsvFile(null);
      setHnQuery("");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to ingest feedback");
    } finally {
      setIngesting(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await api.downloadExportCsv(id, `${project?.name.toLowerCase().replace(/\s+/g, '_')}_export.csv`);
    } catch (err: any) {
      alert(err.message || "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };


  // Skeleton Loader (Surface-toned to prevent layout shifts)
  if (loading || !project || !stats) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-10 w-full animate-pulse">
        <div className="border-b-2 border-[var(--ink)] pb-6 space-y-3">
          <div className="h-4 bg-[var(--surface)] w-36"></div>
          <div className="h-10 bg-[var(--surface)] w-2/3 max-w-md"></div>
        </div>

        {/* Statement Figure Skeleton */}
        <div className="border-4 border-[var(--ink)] bg-[var(--surface)] p-8 h-48 space-y-4">
          <div className="h-3 bg-[var(--border)] w-28"></div>
          <div className="h-14 bg-[var(--border)] w-72"></div>
          <div className="h-4 bg-[var(--border)] w-96"></div>
        </div>

        {/* Chart Skeleton */}
        <div className="border-2 border-[var(--ink)] bg-[var(--surface)] p-6 h-64"></div>

        {/* Ledger Skeleton */}
        <div className="border-t-2 border-b-2 border-[var(--ink)] divide-y divide-[var(--border)] py-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between py-3">
              <div className="h-4 bg-[var(--surface)] w-44"></div>
              <div className="h-4 bg-[var(--surface)] w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const negPct = stats.sentiment_breakdown.negative_pct;
  const posPct = stats.sentiment_breakdown.positive_pct;
  const recentSpike = stats.daily_trends.find((d) => d.is_spike);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-12 w-full">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-2 border-[var(--ink)] pb-6">
        <div>
          <span className="text-xs font-bold text-[var(--muted)] block">
            Workspace Overview
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight mt-1">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-xs text-[var(--muted)] mt-1">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/app/p/${id}/inbox`}
            className="border-2 border-[var(--ink)] px-4 py-2 font-bold text-xs uppercase hover:bg-[var(--surface)] transition-colors"
          >
            Open Triage Inbox
          </Link>
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="border-2 border-[var(--ink)] px-4 py-2 font-bold text-xs uppercase hover:bg-[var(--surface)] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Download CSV export with sanitized cells"
          >
            <Download size={14} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <button
            onClick={() => {
              if (project.is_demo) {
                alert("Sample data, read-only. Create your own project to edit.");
                return;
              }
              setShowIngest(true);
            }}
            className="flex items-center gap-2 bg-[var(--ink)] text-[var(--bg)] px-5 py-2 font-bold text-xs uppercase hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] transition-colors cursor-pointer"
          >
            <Plus size={16} /> Ingest Feedback
          </button>
        </div>
      </div>

      {/* 2. Sample Project Read-Only Banner */}
      {project.is_demo && (
        <div className="bg-[var(--surface)] border-2 border-[var(--ink)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-[var(--ink)] text-[var(--bg)] text-xs font-bold px-2 py-0.5">
              Sample Project
            </span>
            <span className="text-sm font-semibold text-[var(--ink)]">
              Sample data, read-only. Create your own project to edit.
            </span>
          </div>
          <Link
            to="/app"
            className="bg-[var(--ink)] text-[var(--bg)] px-4 py-1.5 text-xs font-bold hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] transition-colors whitespace-nowrap"
          >
            Create Your Project
          </Link>
        </div>
      )}

      {/* 3. Big Statement Figure */}
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
            ? "No comments analyzed yet. Ingest comments to generate public sentiment readings."
            : negPct > 50
            ? `Customer sentiment is heavily skewed negative across ${stats.total_comments} analyzed inquiries.`
            : `Overall reception is healthy with ${posPct}% positive valence recorded.`}
        </p>

        {stats.total_comments > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)] font-mono text-xs">
            <div className="p-2.5 bg-[var(--bg)] border border-[var(--border)]">
              <span className="block font-sans text-[10px] font-bold uppercase text-[var(--field-green)]">Positive</span>
              <span className="text-base font-bold text-[var(--ink)]">{stats.sentiment_breakdown.positive_pct}%</span>
              <span className="text-[10px] text-[var(--muted)] ml-1">({stats.sentiment_breakdown.positive})</span>
            </div>
            <div className="p-2.5 bg-[var(--bg)] border border-[var(--border)]">
              <span className="block font-sans text-[10px] font-bold uppercase text-[var(--field-coral)]">Negative</span>
              <span className="text-base font-bold text-[var(--ink)]">{stats.sentiment_breakdown.negative_pct}%</span>
              <span className="text-[10px] text-[var(--muted)] ml-1">({stats.sentiment_breakdown.negative})</span>
            </div>
            <div className="p-2.5 bg-[var(--bg)] border border-[var(--border)]">
              <span className="block font-sans text-[10px] font-bold uppercase text-[var(--field-yellow)]">Neutral</span>
              <span className="text-base font-bold text-[var(--ink)]">{stats.sentiment_breakdown.neutral_pct}%</span>
              <span className="text-[10px] text-[var(--muted)] ml-1">({stats.sentiment_breakdown.neutral})</span>
            </div>
          </div>
        )}

        {recentSpike && (
          <div className="flex items-center gap-3 p-3 bg-[var(--field-coral)] text-white text-xs font-bold mt-4">
            <AlertTriangle size={16} className="shrink-0" />
            <span>
              {project.is_demo ? "[Sample Data] " : ""}Spike detected on {recentSpike.date}: {recentSpike.negative} negative comments ({((recentSpike.negative / recentSpike.total) * 100).toFixed(0)}% of daily volume).
              {project.is_demo ? " Simulated incident: payment gateway failure recovery." : ""}
            </span>
          </div>
        )}
      </div>

      {/* 4. Full-width Flat Area Chart of Daily Sentiment */}
      {stats.daily_trends.length > 0 && (
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
              <AreaChart data={stats.daily_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

      {/* 5. Decimal-Aligned Telemetry & Metrics Ledger */}
      <div className="space-y-4">
        <h2 className="text-xl font-black uppercase tracking-tight border-b-2 border-[var(--ink)] pb-2">
          Telemetry &amp; Metrics Ledger
        </h2>
        <div className="border-b-2 border-[var(--ink)] divide-y divide-[var(--border)] font-mono text-xs">
          <div className="flex justify-between items-baseline px-3 py-3">
            <span className="font-sans text-xs font-bold text-[var(--muted)]">Total Feedback Analyzed</span>
            <span className="text-lg font-bold tabular-nums text-[var(--ink)]">{stats.total_comments}</span>
          </div>
          <div className="flex justify-between items-baseline px-3 py-3 bg-[var(--surface)]">
            <span className="font-sans text-xs font-bold text-[var(--ink)]">Average Classification Confidence</span>
            <span className="text-lg font-bold tabular-nums text-[var(--ink)]">{(stats.average_confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-baseline px-3 py-3">
            <span className="font-sans text-xs font-bold text-[var(--muted)]">Inference Latency (p50 / p95)</span>
            <span className="text-lg font-bold tabular-nums text-[var(--ink)]">{stats.latency_p50_ms} ms / {stats.latency_p95_ms} ms</span>
          </div>
          <div className="flex justify-between items-baseline px-3 py-3 bg-[var(--surface)]">
            <span className="font-sans text-xs font-bold text-[var(--ink)]">High Priority Triage Queue</span>
            <span className="text-lg font-bold tabular-nums text-[var(--field-coral)]">{stats.priority_counts.high} comments</span>
          </div>
          <div className="flex justify-between items-baseline px-3 py-3">
            <span className="font-sans text-xs font-bold text-[var(--muted)]">Human Review Agreement Rate</span>
            <span className="text-lg font-bold tabular-nums text-[var(--ink)]">
              {(stats.agreement_rate * 100).toFixed(1)}%
              <span className="text-xs text-[var(--muted)] font-normal ml-2">({stats.reviewed_count} reviews)</span>
            </span>
          </div>
        </div>
      </div>

      {/* 6. Ranked Feedback Themes */}
      {themes.length > 0 && (
        <div className="border-2 border-[var(--ink)] bg-[var(--surface)] p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-baseline border-b border-[var(--border)] pb-3">
            <h2 className="text-xl font-black uppercase tracking-tight">Ranked Feedback Themes</h2>
            <span className="text-xs text-[var(--muted)] font-mono">{themes.length} clusters identified</span>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {themes.map((theme, idx) => (
              <div key={theme.id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-baseline gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[var(--muted)]">{String(idx + 1).padStart(2, "0")}.</span>
                    <h3 className="text-lg font-bold tracking-tight text-[var(--ink)]">{theme.label}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1 pl-6">
                    {theme.keywords.map((kw, i) => (
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

      {/* 7. Incident Synthesis Briefing (Reading Text) */}
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
                {briefing.top_issues.map((iss, i) => (
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
                {briefing.suggested_actions.map((act, i) => (
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

      {/* 8. Top Driving Keywords / Cloud */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border-2 border-[var(--ink)] bg-[var(--surface)] p-6 space-y-4">
          <h3 className="text-sm font-bold border-b border-[var(--border)] pb-2">Top Driving Keywords</h3>
          {stats.top_keywords.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No keyword frequency data available yet.</p>
          ) : (
            <div className="divide-y divide-[var(--border)] font-mono text-xs">
              {stats.top_keywords.map((kw, i) => (
                <div key={i} className="flex justify-between py-2">
                  <span className="font-bold">{kw.word}</span>
                  <span className="text-[var(--muted)] tabular-nums">{kw.count} occurrences</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-2 border-[var(--ink)] bg-[var(--surface)] p-6 space-y-4 flex flex-col justify-between">
          <h3 className="text-sm font-bold border-b border-[var(--border)] pb-2">Lexical Distribution</h3>
          {stats.wordcloud ? (
            <img src={stats.wordcloud} alt="Word Cloud" className="w-full object-contain max-h-56 border border-[var(--border)]" />
          ) : (
            <div className="h-48 border border-dashed border-[var(--border)] flex items-center justify-center text-xs text-[var(--muted)]">
              Word cloud generated when comments are ingested
            </div>
          )}
        </div>
      </div>

      {/* Ingestion Modal */}
      {showIngest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg)] border-2 border-[var(--ink)] p-6 sm:p-8 max-w-lg w-full space-y-6">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-4">
              <h3 className="text-2xl font-black uppercase tracking-tight">Ingest Feedback</h3>
              <div className="flex gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setIngestMode("paste")}
                  className={`px-3 py-1 cursor-pointer ${ingestMode === "paste" ? "bg-[var(--ink)] text-[var(--bg)]" : "bg-[var(--surface)]"}`}
                >
                  Paste Text
                </button>
                <button
                  type="button"
                  onClick={() => setIngestMode("csv")}
                  className={`px-3 py-1 cursor-pointer ${ingestMode === "csv" ? "bg-[var(--ink)] text-[var(--bg)]" : "bg-[var(--surface)]"}`}
                >
                  Upload CSV
                </button>
                <button
                  type="button"
                  onClick={() => setIngestMode("hn")}
                  className={`px-3 py-1 cursor-pointer flex items-center gap-1 ${ingestMode === "hn" ? "bg-[var(--ink)] text-[var(--bg)]" : "bg-[var(--surface)]"}`}
                >
                  <Globe size={12} /> Hacker News
                </button>
              </div>
            </div>

            <form onSubmit={handleIngest} className="space-y-4">
              {ingestMode === "paste" ? (
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Paste Comments (One comment per line)
                  </label>
                  <textarea
                    required
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    rows={6}
                    className="w-full bg-[var(--surface)] border border-[var(--ink)] p-3 text-xs font-mono focus:outline-none"
                    placeholder="App crashes whenever I open settings&#10;Fantastic customer support experience&#10;Shipping was slightly delayed"
                  />
                </div>
              ) : ingestMode === "csv" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1">
                      Select CSV File (Max 500 rows)
                    </label>
                    <input
                      type="file"
                      accept=".csv"
                      required
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">
                      Text Column Name (Optional — auto-detects 'text', 'comment')
                    </label>
                    <input
                      type="text"
                      value={textColumn}
                      onChange={(e) => setTextColumn(e.target.value)}
                      placeholder="e.g. feedback_text"
                      className="w-full bg-[var(--surface)] border border-[var(--ink)] p-2 text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1">
                      Hacker News Search Query
                    </label>
                    <input
                      type="text"
                      required
                      value={hnQuery}
                      onChange={(e) => setHnQuery(e.target.value)}
                      placeholder="e.g. Supabase, TweetSense, Stripe"
                      className="w-full bg-[var(--surface)] border border-[var(--ink)] p-2.5 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">
                      Max Comments to Pull (1 to 50)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={hnLimit}
                      onChange={(e) => setHnLimit(Math.min(50, Math.max(1, Number(e.target.value) || 20)))}
                      className="w-full bg-[var(--surface)] border border-[var(--ink)] p-2 text-xs"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--muted)] leading-relaxed border-l-2 border-[var(--ink)] pl-2">
                    Queries Algolia Hacker News search API server-side. HTML entities are stripped, timestamps preserved, and comments classified through the full sentiment & triage pipeline. Rate limit: 10 pulls/min.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowIngest(false)}
                  className="px-4 py-2 border border-[var(--ink)] font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ingesting}
                  className="bg-[var(--ink)] text-[var(--bg)] px-6 py-2 font-bold text-xs hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] cursor-pointer disabled:opacity-50"
                >
                  {ingesting ? (ingestMode === "hn" ? "Pulling from HN..." : "Analyzing & Ingesting...") : (ingestMode === "hn" ? "Pull & Ingest" : "Analyze & Ingest")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
