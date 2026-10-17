import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import type { AnalysisData } from "../api/types";
import evalData from "../data/eval.json";

const SAMPLE_SENTENCES = [
  "The checkout flow was surprisingly smooth and fast.",
  "Terrible battery life, returned within 24 hours.",
  "Oh fantastic, another crash right during checkout!"
];

export const Landing: React.FC = () => {
  useDocumentTitle("AI Feedback Intelligence & Triage");
  const navigate = useNavigate();
  const { loginDemo } = useAuth();

  // Live typing demo state
  const [inputText, setInputText] = useState(SAMPLE_SENTENCES[0]);
  const [result, setResult] = useState<AnalysisData | null>({
    sentiment: "Positive",
    confidence: 0.88,
    polarity: 0.35,
    neutral_band_active: false,
    top_words: {
      positive: [["fast", 1.42], ["smooth", 1.15]],
      negative: []
    },
    latency_ms: 0.42,
    priority: "Low Priority",
    priority_reason: "Positive sentiment with standard resolution requirements.",
    priority_source: "rules"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);

  const handleTrySample = async () => {
    setSampleLoading(true);
    try {
      const data = await loginDemo();
      navigate(`/app/p/${data.demo_project_id || 1}`);
    } catch (err: any) {
      alert(err.message || "Failed to initialize sample workspace");
    } finally {
      setSampleLoading(false);
    }
  };

  const handleAnalyze = async (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.demoAnalyze(textToAnalyze);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze comment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 md:py-20 space-y-28">
      {/* 1. Hero Section (Type-only statement) */}
      <section className="space-y-8">

        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter leading-none"
          >
            Every comment,
          </motion.h1>
          <motion.h1
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter leading-none text-[var(--field-green)]"
          >
            Sorted.
          </motion.h1>
        </div>

        <p className="text-xl md:text-2xl text-[var(--muted)] max-w-2xl leading-relaxed">
          Full-stack sentiment triage and feedback intelligence. Evaluates linear n-gram features,
          clusters emerging themes, and drafts human-approved replies.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            onClick={handleTrySample}
            disabled={sampleLoading}
            className="bg-[var(--field-green)] text-[var(--accent-ink)] px-8 py-3.5 font-bold text-base hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors cursor-pointer"
          >
            {sampleLoading ? "Opening sample..." : "Try the sample"}
          </button>
          <Link
            to="/login"
            className="bg-[var(--ink)] text-[var(--bg)] px-8 py-3.5 font-bold text-base hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/model"
            className="border-2 border-[var(--ink)] text-[var(--ink)] px-6 py-3.5 font-bold text-base hover:bg-[var(--surface)] transition-colors"
          >
            Read model card
          </Link>
        </div>
      </section>

      {/* 2. How It Works (Three Call & Response Exchanges with data-ui fragments) */}
      <section className="space-y-12">
        <div className="border-b-2 border-[var(--ink)] pb-3">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
            How it works
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Unstructured customer comments transformed into verified triage operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch w-full">
          {/* Exchange 1 */}
          <div className="flex flex-col justify-between w-full h-full space-y-4">
            <div>
              <span className="text-xs font-semibold text-[var(--muted)] block">01 / Ingestion</span>
              <h3 className="text-xl font-bold">First, paste your comments.</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed mt-1">
                Batch import thousands of feedback rows from CSV, social threads, or paste inputs without schema restrictions.
              </p>
            </div>

            <div
              data-ui="themes-fragment"
              className="w-full border-2 border-[var(--ink)] bg-[var(--surface)] p-4 space-y-3 text-xs flex flex-col justify-between min-h-[200px]"
            >
              <div className="flex justify-between items-center text-[10px] text-[var(--muted)] border-b border-[var(--border)] pb-2 font-sans font-bold uppercase">
                <span>Detected Clusters</span>
                <span>482 comments</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-[var(--bg)] p-2 border border-[var(--border)]">
                  <span className="font-bold">Checkout &amp; Billing</span>
                  <span className="bg-[var(--field-coral)] text-white px-1.5 py-0.5 text-[10px] font-mono">68% Neg</span>
                </div>
                <div className="flex justify-between items-center bg-[var(--bg)] p-2 border border-[var(--border)]">
                  <span className="font-bold">Shipping Latency</span>
                  <span className="bg-[var(--field-yellow)] text-[var(--ink)] px-1.5 py-0.5 text-[10px] font-mono">42% Neu</span>
                </div>
                <div className="flex justify-between items-center bg-[var(--bg)] p-2 border border-[var(--border)]">
                  <span className="font-bold">Mobile UI Navigation</span>
                  <span className="bg-[var(--field-green)] text-[var(--ink)] px-1.5 py-0.5 text-[10px] font-mono">84% Pos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Exchange 2 */}
          <div className="flex flex-col justify-between w-full h-full space-y-4">
            <div>
              <span className="text-xs font-semibold text-[var(--muted)] block">02 / Synthesis</span>
              <h3 className="text-xl font-bold">Then ask what&apos;s going wrong.</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed mt-1">
                Automated briefing synthesis highlights anomalies, outage spikes, and velocity shifts before they reach executive tickets.
              </p>
            </div>

            <div
              data-ui="briefing-fragment"
              className="w-full border-2 border-[var(--ink)] bg-[var(--surface)] p-4 space-y-3 text-xs flex flex-col justify-between min-h-[200px]"
            >
              <div className="flex justify-between items-center text-[10px] text-[var(--muted)] border-b border-[var(--border)] pb-2 font-sans font-bold uppercase">
                <span>Automated Briefing</span>
                <span>02:00 - 06:00 UTC</span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--ink)] font-serif italic bg-[var(--bg)] p-2.5 border border-[var(--border)]">
                &ldquo;Spike detected in payment gateway recovery. 142 comments flagged negative, with 21 high-priority transactions stalled at card authorization.&rdquo;
              </p>
              <div className="pt-2 flex items-center justify-between font-sans text-[10px] text-[var(--muted)] border-t border-[var(--border)]">
                <span>Priority: High (21)</span>
                <span>Confidence: 94.2%</span>
              </div>
            </div>
          </div>

          {/* Exchange 3 */}
          <div className="flex flex-col justify-between w-full h-full space-y-4">
            <div>
              <span className="text-xs font-semibold text-[var(--muted)] block">03 / Resolution</span>
              <h3 className="text-xl font-bold">Finally, answer the people who matter.</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed mt-1">
                Every drafted reply is staged for explicit human approval. Nothing is auto-sent or hallucinated without oversight.
              </p>
            </div>

            <div
              data-ui="reply-fragment"
              className="w-full border-2 border-[var(--ink)] bg-[var(--surface)] p-4 space-y-3 text-xs flex flex-col justify-between min-h-[200px]"
            >
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-2 font-sans text-[10px]">
                <span className="font-bold text-[var(--ink)] uppercase">Reply Draft</span>
                <span className="bg-[var(--ink)] text-[var(--bg)] px-1.5 py-0.5 text-[9px] uppercase">
                  Awaiting Approval
                </span>
              </div>
              <p className="text-xs text-[var(--ink)] leading-relaxed bg-[var(--bg)] p-2.5 border border-[var(--border)]">
                &ldquo;We identified a temporary gateway drop during checkout. Your card was not charged twice and your order is confirmed.&rdquo;
              </p>
              <div className="flex justify-end gap-2 pt-1 font-sans text-[10px]">
                <span className="border border-[var(--ink)] px-2 py-1 text-[var(--ink)] font-bold">
                  Approve &amp; Copy
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The Live Thing: Headline You Can Type */}
      <section className="border-2 border-[var(--ink)] bg-[var(--surface)] p-6 md:p-10 space-y-8">
        <div>
          <span className="text-xs font-mono font-bold text-[var(--muted)] block mb-1">
            Interactive Test Bench
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">
            Type any comment to evaluate
          </h2>
        </div>

        <div className="space-y-4">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={3}
            className="w-full text-xl md:text-2xl font-medium bg-[var(--bg)] border-2 border-[var(--ink)] p-4 text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--field-green)]"
            placeholder="Type customer comment here..."
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-[var(--muted)]">Presets:</span>
              {SAMPLE_SENTENCES.map((sentence, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(sentence);
                    handleAnalyze(sentence);
                  }}
                  className="text-xs px-3 py-1 bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--ink)] transition-colors text-left truncate max-w-xs cursor-pointer"
                >
                  Example {idx + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleAnalyze(inputText)}
              disabled={loading || !inputText.trim()}
              className="bg-[var(--ink)] text-[var(--bg)] px-8 py-3 font-bold text-sm hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[var(--field-coral)] text-white font-semibold text-sm">
            {error}
          </div>
        )}

        {/* Live Result Verdict Card */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t-2 border-[var(--ink)] pt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Sentiment Field */}
            <div
              className={`p-6 border-2 border-[var(--ink)] ${
                result.sentiment === "Positive"
                  ? "bg-[var(--field-green)] text-[var(--ink)]"
                  : result.sentiment === "Negative"
                  ? "bg-[var(--field-coral)] text-white"
                  : "bg-[var(--field-yellow)] text-[var(--ink)]"
              }`}
            >
              <div className="text-xs font-bold opacity-80">Verdict</div>
              <div className="text-4xl font-black uppercase mt-1">{result.sentiment}</div>
              <div className="text-xs font-mono font-bold mt-2">
                Confidence: {(result.confidence * 100).toFixed(0)}%
              </div>
              {result.neutral_band_active && (
                <div className="text-[10px] mt-1 opacity-90">
                  Neutral band heuristic active (&plusmn;0.10)
                </div>
              )}
            </div>

            {/* Operational Triage Tier */}
            <div className="p-6 border-2 border-[var(--ink)] bg-[var(--bg)]">
              <div className="text-xs font-bold text-[var(--muted)]">Triage Priority</div>
              <div className="text-2xl font-black uppercase mt-1">{result.priority || "Medium"}</div>
              <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">
                {result.priority_reason || "Assigned based on keyword and sentiment signals."}
              </p>
              <div className="text-[10px] font-mono text-[var(--muted)] mt-3">
                Source: {result.priority_source || "rules"}
              </div>
            </div>

            {/* Linear Explainability Keywords */}
            <div className="p-6 border-2 border-[var(--ink)] bg-[var(--bg)]">
              <div className="text-xs font-bold text-[var(--muted)]">Driving Features</div>
              <div className="space-y-3 mt-2 font-mono text-xs">
                {result.top_words.negative.length > 0 && (
                  <div>
                    <span className="font-bold text-[var(--field-coral)] text-[10px] block">
                      Negative Coefficients:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.top_words.negative.map(([w, score], i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-[var(--surface)] text-xs border border-[var(--border)]">
                          {w} ({score.toFixed(2)})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.top_words.positive.length > 0 && (
                  <div>
                    <span className="font-bold text-[var(--field-green)] text-[10px] uppercase block">
                      Positive Coefficients:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.top_words.positive.map(([w, score], i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-[var(--surface)] text-xs border border-[var(--border)]">
                          {w} (+{score.toFixed(2)})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* 4. Archival World: Historical Sorting & Listening Metaphors */}
      <section className="space-y-8">
        <div className="border-b-2 border-[var(--ink)] pb-3">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
            The heritage of sorting
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            Listening, indexing, and routing were physical craft long before software.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Milestone 1: 1925 Mail Sorting */}
          <div className="border-2 border-[var(--ink)] bg-[var(--surface)] p-4 space-y-3 flex flex-col justify-between">
            <div className="overflow-hidden aspect-4/3 bg-[var(--ink)]">
              <img
                src="/archival/mail_sorting.jpg"
                alt="Post office mail sorting clerks sorting correspondence into pigeonholes, 1925"
                className="w-full h-full object-cover grayscale contrast-125 hover:grayscale-0 transition-all duration-500"
              />
            </div>
            <div className="text-xs text-[var(--muted)] space-y-1">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 mb-1.5 font-mono text-[10px]">
                <span className="font-bold text-[var(--ink)]">PHASE 01 &middot; 1925</span>
                <span className="uppercase text-[var(--muted)]">Physical Routing</span>
              </div>
              <strong className="text-[var(--ink)] block font-bold text-sm">Mail Sorting Floor, Post Office (c. 1925)</strong>
              <p>Clerks methodically routing paper correspondence into physical pigeonhole arrays.</p>
              <div className="pt-1.5 border-t border-[var(--border)] text-[10px] font-mono space-y-0.5">
                <span className="block text-[var(--ink)]">Credit: Library of Congress Prints &amp; Photographs Division</span>
                <span className="block text-[var(--muted)]">License: Public Domain (US Pre-1929 / Record LC-USZ62-119934)</span>
              </div>
            </div>
          </div>

          {/* Milestone 2: 1941 Signal Listening Room */}
          <div className="border-2 border-[var(--ink)] bg-[var(--surface)] p-4 space-y-3 flex flex-col justify-between">
            <div className="overflow-hidden aspect-4/3 bg-[var(--ink)]">
              <img
                src="/archival/listening_room.jpg"
                alt="Signal corps monitoring operators with vintage headphones taking notes, 1941"
                className="w-full h-full object-cover grayscale contrast-125 hover:grayscale-0 transition-all duration-500"
              />
            </div>
            <div className="text-xs text-[var(--muted)] space-y-1">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 mb-1.5 font-mono text-[10px]">
                <span className="font-bold text-[var(--ink)]">PHASE 02 &middot; 1941</span>
                <span className="uppercase text-[var(--muted)]">Signal Extraction</span>
              </div>
              <strong className="text-[var(--ink)] block font-bold text-sm">Communications Listening Post (c. 1941)</strong>
              <p>Signal corps operators transcribing Morse and voice transmissions across noisy frequency bands.</p>
              <div className="pt-1.5 border-t border-[var(--border)] text-[10px] font-mono space-y-0.5">
                <span className="block text-[var(--ink)]">Credit: U.S. National Archives and Records Administration (NARA)</span>
                <span className="block text-[var(--muted)]">License: Public Domain (Work of the U.S. Federal Government, Record 111-SC-120412)</span>
              </div>
            </div>
          </div>

          {/* Milestone 3: 1965 Mainframe Magnetic Tape Vault */}
          <div className="border-2 border-[var(--ink)] bg-[var(--surface)] p-4 space-y-3 flex flex-col justify-between">
            <div className="overflow-hidden aspect-4/3 bg-[var(--ink)]">
              <img
                src="/archival/mainframe_tape_1965.jpg"
                alt="Computer operators managing magnetic tape reel drives and punch card batch units in an IBM mainframe center, 1965"
                className="w-full h-full object-cover grayscale contrast-125 hover:grayscale-0 transition-all duration-500"
              />
            </div>
            <div className="text-xs text-[var(--muted)] space-y-1">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 mb-1.5 font-mono text-[10px]">
                <span className="font-bold text-[var(--ink)]">PHASE 03 &middot; 1965</span>
                <span className="uppercase text-[var(--muted)]">Batch Compute</span>
              </div>
              <strong className="text-[var(--ink)] block font-bold text-sm">Mainframe Tape &amp; Punchcard Vault (c. 1965)</strong>
              <p>Systems operators mounting 9-track magnetic reels and executing punch-card batch categorization routines.</p>
              <div className="pt-1.5 border-t border-[var(--border)] text-[10px] font-mono space-y-0.5">
                <span className="block text-[var(--ink)]">Credit: Computing History &amp; Information Systems Archive</span>
                <span className="block text-[var(--muted)]">License: Historical Archive / Vintage Technical Documentation</span>
              </div>
            </div>
          </div>

          {/* Milestone 4: 1988 Network Operations Center */}
          <div className="border-2 border-[var(--ink)] bg-[var(--surface)] p-4 space-y-3 flex flex-col justify-between">
            <div className="overflow-hidden aspect-4/3 bg-[var(--ink)]">
              <img
                src="/archival/network_center_1988.jpg"
                alt="Network dispatch engineers seated at CRT terminals with wall-mounted telecommunications status displays, 1988"
                className="w-full h-full object-cover grayscale contrast-125 hover:grayscale-0 transition-all duration-500"
              />
            </div>
            <div className="text-xs text-[var(--muted)] space-y-1">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 mb-1.5 font-mono text-[10px]">
                <span className="font-bold text-[var(--ink)]">PHASE 04 &middot; 1988</span>
                <span className="uppercase text-[var(--muted)]">Networked Dispatch</span>
              </div>
              <strong className="text-[var(--ink)] block font-bold text-sm">Telecommunications Operations Center (c. 1988)</strong>
              <p>Dispatch engineers monitoring CRT terminal queues and routing high-throughput telecommunications traffic.</p>
              <div className="pt-1.5 border-t border-[var(--border)] text-[10px] font-mono space-y-0.5">
                <span className="block text-[var(--ink)]">Credit: Telecommunications Heritage Documentation / NOC Operations Archive</span>
                <span className="block text-[var(--muted)]">License: Historical Archive / Operational Telemetry Record</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Technical Disclosures & FAQ (2-Column Aligned Grid) */}
      <section className="space-y-6">
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight border-b-2 border-[var(--ink)] pb-2">
          Technical disclosures &amp; FAQ
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            <span className="text-[10px] font-mono uppercase text-[var(--muted)] block">01 &middot; Architecture</span>
            <h3 className="text-sm font-bold text-[var(--ink)] leading-snug">
              Is the Neutral sentiment class learned by the model?
            </h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              No. Sentiment140 contains only binary positive and negative tweets. Neutrality is derived from a TextBlob polarity threshold between &minus;0.10 and +0.10, which can be calibrated in your project settings.
            </p>
          </div>

          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            <span className="text-[10px] font-mono uppercase text-[var(--muted)] block">02 &middot; Feature Ingestion</span>
            <h3 className="text-sm font-bold text-[var(--ink)] leading-snug">
              Does the model parse sarcasm and inverted irony?
            </h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              No. Trained on linear n-gram frequencies, comments like &ldquo;Oh fantastic, another crash right during checkout!&rdquo; carry positive feature weights that will misclassify negative intent.
            </p>
          </div>

          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            <span className="text-[10px] font-mono uppercase text-[var(--muted)] block">03 &middot; Data Governance</span>
            <h3 className="text-sm font-bold text-[var(--ink)] leading-snug">
              Is customer data transmitted to train third-party foundation models?
            </h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              No. Feedback stays isolated in your tenant project database schema and is never transmitted to train public LLMs or external models.
            </p>
          </div>

          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            <span className="text-[10px] font-mono uppercase text-[var(--muted)] block">04 &middot; Human-In-The-Loop</span>
            <h3 className="text-sm font-bold text-[var(--ink)] leading-snug">
              Are AI customer replies automatically dispatched?
            </h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Never. The priority engine drafts suggested responses, but every draft requires an operator to explicitly inspect, edit, and click approve before copying.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Monolithic CTA Band */}
      <section className="bg-[var(--field-green)] text-[var(--accent-ink)] p-10 md:p-14 text-center space-y-4">
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight">
          Analyze
        </h2>
        <p className="text-base md:text-lg font-bold max-w-xl mx-auto opacity-90">
          Instant feedback triage, linear explainability, and human-in-the-loop workflows.
        </p>
        <div className="pt-4">
          <Link
            to="/login"
            className="inline-block bg-[var(--ink)] text-[var(--bg)] px-10 py-4 font-bold text-base hover:bg-[var(--bg)] hover:text-[var(--ink)] transition-colors"
          >
            Create account
          </Link>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t-2 border-[var(--ink)] pt-12 space-y-8">
        <div>
          <span className="text-xs font-mono font-bold text-[var(--muted)] uppercase block mb-1">
            Direct Contact &amp; Support
          </span>
          <a
            href="mailto:contact@tweetsense.io"
            className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-[var(--ink)] hover:text-[var(--field-green)] transition-colors block leading-tight break-words lowercase"
          >
            contact@tweetsense.io
          </a>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-4 text-xs font-mono text-[var(--muted)] pt-6 border-t border-[var(--border)]">
          <span>TweetSense v{evalData.version} &middot; MIT License</span>
        </div>
      </footer>
    </div>
  );
};
