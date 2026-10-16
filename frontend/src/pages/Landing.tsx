import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { AnalysisData } from "../api/types";

const SAMPLES = [
  "The app update crashes on login every single time.",
  "Smooth checkout, fast delivery, and helpful customer support!",
  "Received the package today in standard condition."
];

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [inputText, setInputText] = useState(SAMPLES[0]);
  const [result, setResult] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleLoading, setSampleLoading] = useState(false);

  const handleTrySample = async () => {
    setSampleLoading(true);
    try {
      const data = await api.demoSession();
      api.setToken(data.token);
      login(data.token, data.user);
      navigate(`/app/p/${data.demo_project_id || 1}`);
    } catch (err: any) {
      alert(err.message || "Failed to initialize sample project");
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
    <div className="max-w-6xl mx-auto px-6 py-16 space-y-24">
      {/* Hero Section */}
      <section className="space-y-6">
        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-8xl font-black uppercase tracking-tighter"
          >
            Every comment,
          </motion.h1>
          <motion.h1
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-[var(--accent)]"
          >
            Sorted.
          </motion.h1>
        </div>

        <p className="text-xl md:text-2xl text-[var(--muted)] max-w-2xl font-normal leading-relaxed">
          Paste customer feedback. TweetSense classifies sentiment, explains the exact words that drove the verdict, and triages operational priority.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-4">
          <button
            onClick={handleTrySample}
            disabled={sampleLoading}
            className="bg-[var(--accent)] text-[var(--accent-ink)] px-6 py-3 font-bold text-base hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors cursor-pointer"
          >
            {sampleLoading ? "Opening Sample..." : "Try the sample →"}
          </button>
          <Link
            to="/login"
            className="bg-[var(--ink)] text-[var(--bg)] px-6 py-3 font-bold text-base hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] transition-colors"
          >
            Open Workspace &rarr;
          </Link>
          <Link
            to="/model"
            className="border-2 border-[var(--ink)] text-[var(--ink)] px-6 py-3 font-bold text-base hover:bg-[var(--surface)] transition-colors"
          >
            Read Model Card
          </Link>
        </div>
      </section>

      {/* The Live Thing: Headline Input */}
      <section className="border-4 border-[var(--ink)] bg-[var(--surface)] p-8 md:p-12 space-y-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] block mb-2">
            Interactive Live Demonstration
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">
            Type any sentence below:
          </h2>
        </div>

        <div className="space-y-4">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={3}
            className="w-full text-xl md:text-2xl font-semibold bg-[var(--bg)] border-2 border-[var(--ink)] p-4 text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="Type customer comment here..."
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[var(--muted)] uppercase">Presets:</span>
              {SAMPLES.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(sample);
                    handleAnalyze(sample);
                  }}
                  className="text-xs font-semibold px-3 py-1 bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--ink)] transition-colors text-left truncate max-w-xs"
                >
                  Example {idx + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleAnalyze(inputText)}
              disabled={loading || !inputText.trim()}
              className="bg-[var(--ink)] text-[var(--bg)] px-8 py-3 font-black text-sm uppercase tracking-wider hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] disabled:opacity-50 transition-colors"
            >
              {loading ? "Analyzing..." : "Analyze Now"}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[var(--field-coral)] text-white font-semibold text-sm">
            {error}
          </div>
        )}

        {/* Live Result Verdict */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
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
              <div className="text-xs font-bold uppercase tracking-wider opacity-80">Sentiment</div>
              <div className="text-4xl font-black uppercase mt-1">{result.sentiment}</div>
              <div className="text-xs font-semibold mt-2">
                Confidence: {(result.confidence * 100).toFixed(0)}%
              </div>
              {result.neutral_band_active && (
                <div className="text-[10px] mt-1 font-medium">
                  Neutral band heuristic active (-0.10 to +0.10)
                </div>
              )}
            </div>

            {/* Operational Priority */}
            <div className="p-6 border-2 border-[var(--ink)] bg-[var(--bg)]">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Triage Tier</div>
              <div className="text-2xl font-black uppercase mt-1">{result.priority}</div>
              <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">
                {result.priority_reason || "Assigned based on keyword and sentiment signals."}
              </p>
              <div className="text-[10px] font-mono text-[var(--muted)] mt-3 uppercase">
                Source: {result.priority_source}
              </div>
            </div>

            {/* Driving Words (Linear Explanation) */}
            <div className="p-6 border-2 border-[var(--ink)] bg-[var(--bg)]">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Driving Features</div>
              <div className="space-y-2 mt-2">
                {result.top_words.negative.length > 0 && (
                  <div className="text-xs">
                    <span className="font-bold text-[var(--field-coral)] uppercase block text-[10px]">Negative Weight:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.top_words.negative.map(([w, score], i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-[var(--surface)] text-xs font-medium border border-[var(--border)]">
                          {w} ({score.toFixed(2)})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.top_words.positive.length > 0 && (
                  <div className="text-xs mt-2">
                    <span className="font-bold text-[var(--field-green)] uppercase text-[10px] block">Positive Weight:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.top_words.positive.map(([w, score], i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-[var(--surface)] text-xs font-medium border border-[var(--border)]">
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

      {/* Decimal-Aligned Audit Ledger */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black uppercase tracking-tight">Verified Model Benchmarks</h2>
        <div className="border-t-2 border-b-2 border-[var(--ink)] py-6 divide-y divide-[var(--border)]">
          <div className="flex justify-between items-baseline py-3">
            <span className="text-sm font-semibold uppercase">Dataset Training Corpus</span>
            <span className="text-xl font-mono font-bold">1,600,000 tweets (Sentiment140)</span>
          </div>
          <div className="flex justify-between items-baseline py-3">
            <span className="text-sm font-semibold uppercase">Validation Test Accuracy</span>
            <span className="text-xl font-mono font-bold">79.82%</span>
          </div>
          <div className="flex justify-between items-baseline py-3">
            <span className="text-sm font-semibold uppercase">Weighted F1 Score</span>
            <span className="text-xl font-mono font-bold">0.8040</span>
          </div>
          <div className="flex justify-between items-baseline py-3">
            <span className="text-sm font-semibold uppercase">Feature Space</span>
            <span className="text-xl font-mono font-bold">500,000 unigrams & bigrams (TF-IDF)</span>
          </div>
        </div>
      </section>

      {/* Honest FAQ as Reading Text */}
      <section className="space-y-8">
        <h2 className="text-2xl font-black uppercase tracking-tight">Technical Disclosures & FAQ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm leading-relaxed">
          <div>
            <h3 className="font-bold text-base mb-1">Is the Neutral class learned?</h3>
            <p className="text-[var(--muted)]">
              No. Sentiment140 contains only binary positive and negative tweets. Neutrality is derived from a TextBlob polarity threshold between -0.10 and +0.10, which can be calibrated in your project settings.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">Does the model understand sarcasm or modern slang?</h3>
            <p className="text-[var(--muted)]">
              No. Trained on 2009 tweets, the linear model evaluates n-gram frequencies and will misclassify sarcasm or recent internet slang that reverses valence.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">Why Logistic Regression instead of fine-tuned BERT?</h3>
            <p className="text-[var(--muted)]">
              Logistic Regression provides millisecond CPU inference, zero multi-gigabyte GPU runtime overhead, and direct linear coefficient explainability for driving words.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-base mb-1">Are AI replies automatically dispatched?</h3>
            <p className="text-[var(--muted)]">
              Never. All drafted replies remain in draft status until an operator explicitly approves, edits, and copies the message.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Band */}
      <section className="bg-[var(--accent)] text-[var(--accent-ink)] p-12 text-center space-y-4">
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
          Ready to triage feedback?
        </h2>
        <p className="text-base font-semibold max-w-xl mx-auto">
          Create a workspace, paste your comments or upload CSVs, and examine driving words.
        </p>
        <div className="pt-2">
          <Link
            to="/login"
            className="inline-block bg-[var(--ink)] text-[var(--bg)] px-8 py-3 font-bold text-base hover:bg-white hover:text-black transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  );
};
