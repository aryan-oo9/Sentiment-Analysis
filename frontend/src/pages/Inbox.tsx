import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { api } from "../api/client";
import type { CommentItem, Project } from "../api/types";
import { Search, Copy, X } from "lucide-react";

export const Inbox: React.FC = () => {
  const { projectId } = useParams();
  const id = Number(projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Slide-over Drawer State
  const [selectedComment, setSelectedComment] = useState<CommentItem | null>(null);
  const [draftTone, setDraftTone] = useState<"warm" | "brief" | "formal">("warm");
  const [activeDraft, setActiveDraft] = useState<any | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const data = await api.getComments(id, {
        page,
        limit: 25,
        sentiment: sentimentFilter,
        priority: priorityFilter,
        search: searchQuery
      });
      setComments(data.comments);
      setTotalItems(data.pagination.total_items);
      setTotalPages(data.pagination.total_pages);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchComments();
      api.getProject(id).then(setProject).catch(console.error);
    }
  }, [id, page, sentimentFilter, priorityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchComments();
  };

  const handleCorrection = async (commentId: number, newSent: string) => {
    if (project?.is_demo) {
      alert("Sample data, read-only. Create your own project to edit.");
      return;
    }
    try {
      await api.correctComment(commentId, newSent);
      // Optimistic state update
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, correction: { corrected_sentiment: newSent, created_at: new Date().toISOString() } }
            : c
        )
      );
      if (selectedComment && selectedComment.id === commentId) {
        setSelectedComment({
          ...selectedComment,
          correction: { corrected_sentiment: newSent, created_at: new Date().toISOString() }
        });
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit correction");
    }
  };

  const handleGenerateDraft = async () => {
    if (!selectedComment) return;
    if (project?.is_demo) {
      alert("Sample data, read-only. Create your own project to edit.");
      return;
    }
    setDrafting(true);
    try {
      const draft = await api.createReplyDraft(selectedComment.id, draftTone);
      setActiveDraft(draft);
    } catch (err: any) {
      alert(err.message || "Failed to generate reply draft");
    } finally {
      setDrafting(false);
    }
  };

  const handleApproveDraft = async () => {
    if (!activeDraft) return;
    if (project?.is_demo) {
      alert("Sample data, read-only. Create your own project to edit.");
      return;
    }
    try {
      const updated = await api.updateReplyDraft(activeDraft.id, {
        body: activeDraft.body,
        status: "approved"
      });
      setActiveDraft(updated);
    } catch (err: any) {
      alert(err.message || "Failed to approve draft");
    }
  };

  const handleCopyDraft = async () => {
    if (!activeDraft) return;
    navigator.clipboard.writeText(activeDraft.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    try {
      await api.updateReplyDraft(activeDraft.id, {
        body: activeDraft.body,
        status: "copied"
      });
    } catch (err) {
      console.error(err);
    }
  };

  const highlightDrivingWords = (text: string, topWords: any) => {
    if (!topWords) return text;
    const negWords = (topWords.negative || []).map((t: any) => t[0].toLowerCase());
    const posWords = (topWords.positive || []).map((t: any) => t[0].toLowerCase());

    const tokens = text.split(/(\s+)/);
    return tokens.map((token, i) => {
      const cleanToken = token.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (negWords.includes(cleanToken)) {
        return (
          <span key={i} className="bg-[var(--field-coral)]/20 text-[var(--field-coral)] font-bold px-0.5">
            {token}
          </span>
        );
      }
      if (posWords.includes(cleanToken)) {
        return (
          <span key={i} className="bg-[var(--field-green)]/20 text-[var(--field-green)] font-bold px-0.5">
            {token}
          </span>
        );
      }
      return token;
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 w-full">
      {/* Sample Project Read-Only Banner */}
      {project?.is_demo && (
        <div className="bg-[var(--surface)] border-2 border-[var(--ink)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-[var(--ink)] text-[var(--bg)] text-xs font-bold px-2.5 py-1">
              Sample Data
            </span>
            <span className="text-sm font-semibold">
              Sample data, read-only. Create your own project to edit.
            </span>
          </div>
          <Link
            to="/app"
            className="bg-[var(--ink)] text-[var(--bg)] px-3 py-1.5 text-xs font-bold hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] transition-colors whitespace-nowrap"
          >
            Create Your Project
          </Link>
        </div>
      )}

      {/* Title & Filter Bar */}
      <div className="space-y-4 border-b-2 border-[var(--ink)] pb-6">
        <div className="flex justify-between items-baseline">
          <div>
            <span className="text-xs font-bold text-[var(--muted)] block">
              Feedback Operations
            </span>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mt-1">
              Triage Inbox ({totalItems})
            </h1>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search feedback..."
                className="bg-[var(--surface)] border border-[var(--ink)] pl-8 pr-3 py-1.5 text-xs w-48 md:w-64 focus:outline-none"
              />
              <Search size={14} className="absolute left-2.5 top-2 text-[var(--muted)]" />
            </div>
            <button
              type="submit"
              className="bg-[var(--ink)] text-[var(--bg)] px-3 py-1.5 text-xs font-bold uppercase"
            >
              Filter
            </button>
          </form>
        </div>

        {/* Quiet Filter Controls */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1">
            <span className="text-[var(--muted)] uppercase">Sentiment:</span>
            {["all", "Positive", "Negative", "Neutral"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSentimentFilter(s);
                  setPage(1);
                }}
                className={`px-2 py-0.5 border ${
                  sentimentFilter === s
                    ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]"
                    : "border-[var(--border)] hover:border-[var(--ink)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[var(--muted)] uppercase">Priority:</span>
            {["all", "High Priority", "Medium Priority", "Low Priority"].map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPriorityFilter(p);
                  setPage(1);
                }}
                className={`px-2 py-0.5 border ${
                  priorityFilter === p
                    ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]"
                    : "border-[var(--border)] hover:border-[var(--ink)]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dense Comments Table */}
      {loading ? (
        <div className="py-16 text-center text-xs font-semibold text-[var(--muted)]">
          Loading feedback rows...
        </div>
      ) : comments.length === 0 ? (
        <div className="border border-dashed border-[var(--border)] p-12 text-center text-sm font-semibold text-[var(--muted)]">
          No feedback found matching the selected filters.
        </div>
      ) : (
        <div className="border-2 border-[var(--ink)] bg-[var(--surface)] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-[var(--ink)] bg-[var(--bg)] font-bold text-xs">
                <th className="p-3 w-32 text-center">Verdict</th>
                <th className="p-3">Comment Text</th>
                <th className="p-3 w-36">Triage Priority</th>
                <th className="p-3 w-28">Source</th>
                <th className="p-3 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {comments.map((comment) => {
                const effectiveSent = comment.correction?.corrected_sentiment || comment.analysis.sentiment;
                const isCorrected = Boolean(comment.correction);

                return (
                  <tr
                    key={comment.id}
                    onClick={() => {
                      setSelectedComment(comment);
                      setActiveDraft(null);
                    }}
                    className="hover:bg-[var(--bg)] cursor-pointer transition-colors"
                  >
                    {/* Sentiment Solid Field */}
                    <td className="p-3 align-top">
                      <div
                        className={`px-2.5 py-1 text-center font-bold uppercase text-[11px] ${
                          effectiveSent === "Positive"
                            ? "bg-[var(--field-green)] text-[var(--ink)]"
                            : effectiveSent === "Negative"
                            ? "bg-[var(--field-coral)] text-white"
                            : "bg-[var(--field-yellow)] text-[var(--ink)]"
                        }`}
                      >
                        {effectiveSent}
                      </div>
                      {isCorrected && (
                        <span className="block text-[9px] text-[var(--muted)] font-mono text-center mt-0.5">
                          (human reviewed)
                        </span>
                      )}
                    </td>

                    {/* Comment Body */}
                    <td className="p-3 align-top font-normal leading-relaxed text-sm">
                      {project?.is_demo && (
                        <span className="inline-block bg-[var(--ink)] text-[var(--bg)] font-bold text-[9px] px-1.5 py-0.5 mr-2 align-middle">
                          Sample Data
                        </span>
                      )}
                      {highlightDrivingWords(comment.text, comment.analysis.top_words)}
                    </td>

                    {/* Operational Priority */}
                    <td className="p-3 align-top">
                      <span
                        className={`inline-block px-2 py-0.5 font-bold uppercase text-[10px] ${
                          comment.analysis.priority === "High Priority"
                            ? "bg-[var(--ink)] text-[var(--bg)]"
                            : comment.analysis.priority === "Medium Priority"
                            ? "bg-[var(--surface)] border border-[var(--ink)] text-[var(--ink)]"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        {comment.analysis.priority}
                      </span>
                    </td>

                    {/* Source & Date */}
                    <td className="p-3 align-top font-mono text-[10px] text-[var(--muted)]">
                      <div>{comment.source}</div>
                      <div>{comment.created_at.split("T")[0]}</div>
                    </td>

                    {/* Inspect Button */}
                    <td className="p-3 align-top text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedComment(comment);
                          setActiveDraft(null);
                        }}
                        className="font-bold underline text-xs text-[var(--ink)] hover:text-[var(--accent)]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-xs font-semibold pt-4">
          <span className="text-[var(--muted)]">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-[var(--ink)] disabled:opacity-40 uppercase"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 border border-[var(--ink)] disabled:opacity-40 uppercase"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Comment Detail Slide-Over Drawer */}
      {selectedComment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-[var(--bg)] border-l-4 border-[var(--ink)] w-full max-w-xl h-full overflow-y-auto p-8 space-y-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-[var(--border)] pb-4">
                <div>
                  <span className="text-xs font-bold text-[var(--muted)]">
                    Inspection Drawer
                  </span>
                  <h2 className="text-xl font-black uppercase tracking-tight">Comment #{selectedComment.id}</h2>
                </div>
                <button
                  onClick={() => setSelectedComment(null)}
                  className="p-1 hover:bg-[var(--surface)] text-[var(--ink)] cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Original Text */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[var(--muted)]">Full Text</span>
                <p className="text-base font-semibold leading-relaxed bg-[var(--surface)] p-4 border border-[var(--border)]">
                  {highlightDrivingWords(selectedComment.text, selectedComment.analysis.top_words)}
                </p>
              </div>

              {/* Classification Ledger */}
              <div className="border-t border-b border-[var(--ink)] divide-y divide-[var(--border)] text-xs font-mono py-2">
                <div className="flex justify-between py-2">
                  <span className="font-sans font-bold text-[var(--muted)]">Model Sentiment:</span>
                  <span className="font-bold">{selectedComment.analysis.sentiment}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-sans font-bold text-[var(--muted)]">Confidence:</span>
                  <span className="font-bold">{(selectedComment.analysis.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-sans font-bold text-[var(--muted)]">TextBlob Polarity:</span>
                  <span className="font-bold">{selectedComment.analysis.polarity}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-sans font-bold text-[var(--muted)]">Operational Priority:</span>
                  <span className="font-bold">{selectedComment.analysis.priority} ({selectedComment.analysis.priority_source})</span>
                </div>
              </div>

              {/* Human-in-the-Loop Correction */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[var(--muted)]">
                  Human Label Correction
                </span>
                <div className="flex gap-2">
                  {["Positive", "Negative", "Neutral"].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleCorrection(selectedComment.id, s)}
                      className={`flex-1 py-1.5 text-xs font-bold uppercase border ${
                        (selectedComment.correction?.corrected_sentiment || selectedComment.analysis.sentiment) === s
                          ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]"
                          : "border-[var(--border)] hover:border-[var(--ink)]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Reply Drafting with Human Approval */}
              <div className="border-t-2 border-[var(--ink)] pt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[var(--ink)]">
                    Draft Support Reply
                  </span>
                  <div className="flex gap-1 text-[10px] font-bold">
                    {(["warm", "brief", "formal"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setDraftTone(t)}
                        className={`px-2 py-0.5 border cursor-pointer ${
                          draftTone === t ? "bg-[var(--ink)] text-[var(--bg)]" : "border-[var(--border)]"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {!activeDraft ? (
                  <button
                    onClick={handleGenerateDraft}
                    disabled={drafting}
                    className="w-full bg-[var(--surface)] border-2 border-[var(--ink)] py-2.5 font-bold text-xs hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors cursor-pointer"
                  >
                    {drafting ? "Generating Draft..." : `Generate ${draftTone} Draft Reply`}
                  </button>
                ) : (
                  <div className="space-y-3 bg-[var(--surface)] p-4 border border-[var(--ink)]">
                    <div className="flex justify-between items-center text-[10px] font-bold text-[var(--muted)]">
                      <span>Status: {activeDraft.status}</span>
                      <span>Tone: {activeDraft.tone}</span>
                    </div>

                    <textarea
                      value={activeDraft.body}
                      onChange={(e) => setActiveDraft({ ...activeDraft, body: e.target.value })}
                      rows={4}
                      className="w-full bg-[var(--bg)] border border-[var(--border)] p-2 text-xs font-sans leading-relaxed focus:outline-none"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={handleApproveDraft}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--ink)] text-[var(--bg)] py-2 text-xs font-bold hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] cursor-pointer"
                      >
                        Approve Draft
                      </button>
                      <button
                        onClick={handleCopyDraft}
                        className="flex-1 flex items-center justify-center gap-1.5 border border-[var(--ink)] py-2 text-xs font-bold hover:bg-[var(--bg)] cursor-pointer"
                      >
                        <Copy size={14} /> {copied ? "Copied!" : "Copy Reply"}
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--muted)] text-center">
                      Human approval required. Replies are never auto-sent.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setSelectedComment(null)}
                className="w-full border border-[var(--ink)] py-2 font-bold text-xs uppercase"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
