import React from "react";
import { Link } from "react-router";

export const ModelCard: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] block">
          Model Governance & Transparency
        </span>
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mt-1">
          Model Card: TweetSense v2
        </h1>
        <p className="text-sm text-[var(--muted)] mt-2">
          Published 16 October 2026. A transparent audit of model capabilities, training origins, and real-world limits.
        </p>
      </div>

      {/* Verified Benchmarks */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase tracking-tight">Evaluated Metrics (Held-Out Split)</h2>
        <div className="border-t-2 border-b-2 border-[var(--ink)] divide-y divide-[var(--border)] font-mono text-xs">
          <div className="flex justify-between py-3">
            <span className="font-sans font-bold uppercase text-[var(--muted)]">Model Architecture</span>
            <span className="font-bold">Scikit-learn Logistic Regression (liblinear solver)</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="font-sans font-bold uppercase text-[var(--muted)]">Feature Representation</span>
            <span className="font-bold">TF-IDF Sparse Matrix (500,000 unigrams & bigrams)</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="font-sans font-bold uppercase text-[var(--muted)]">Training Set Size</span>
            <span className="font-bold">1,600,000 tweets (Sentiment140)</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="font-sans font-bold uppercase text-[var(--muted)]">Validation Test Accuracy</span>
            <span className="font-bold">79.82%</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="font-sans font-bold uppercase text-[var(--muted)]">Weighted F1 Score</span>
            <span className="font-bold">0.8040</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="font-sans font-bold uppercase text-[var(--muted)]">Operational Priority Engine</span>
            <span className="font-bold">External LLM API + Deterministic Keyword Fallback</span>
          </div>
        </div>
      </section>

      {/* Binary Classification Confusion Matrix */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase tracking-tight">Confusion Matrix (Sentiment140 Binary Split)</h2>
        <div className="max-w-md border-2 border-[var(--ink)] bg-[var(--surface)] p-6 space-y-4 font-mono text-xs">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 font-bold uppercase text-[10px] text-[var(--muted)]">Actual \ Pred</div>
            <div className="p-2 font-bold uppercase text-[10px]">Pred Negative</div>
            <div className="p-2 font-bold uppercase text-[10px]">Pred Positive</div>

            <div className="p-2 font-bold uppercase text-[10px] text-left">Act Negative</div>
            <div className="p-4 bg-[var(--field-coral)] text-white font-bold">
              126,820 <span className="block text-[9px] font-normal opacity-80">(True Neg)</span>
            </div>
            <div className="p-4 bg-[var(--bg)] border border-[var(--border)] font-bold">
              33,180 <span className="block text-[9px] font-normal text-[var(--muted)]">(False Pos)</span>
            </div>

            <div className="p-2 font-bold uppercase text-[10px] text-left">Act Positive</div>
            <div className="p-4 bg-[var(--bg)] border border-[var(--border)] font-bold">
              31,408 <span className="block text-[9px] font-normal text-[var(--muted)]">(False Neg)</span>
            </div>
            <div className="p-4 bg-[var(--field-green)] text-[var(--ink)] font-bold">
              128,592 <span className="block text-[9px] font-normal opacity-80">(True Pos)</span>
            </div>
          </div>
          <div className="text-[10px] text-[var(--muted)] text-center">
            Calculated on 320,000 held-out test tweets from Sentiment140 (20% validation split).
          </div>
        </div>
      </section>

      {/* What the System Cannot Do */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase tracking-tight">Known Failure Modes & Boundaries</h2>
        <div className="space-y-4 text-sm leading-relaxed text-[var(--muted)]">
          <div className="border-l-4 border-[var(--field-coral)] pl-4 py-1">
            <strong className="text-[var(--ink)] block">1. Neutrality is a heuristic, not an ML classification.</strong>
            Sentiment140 contains only binary positive and negative tweets. Neutral outputs are triggered when TextBlob sentiment polarity lands between -0.10 and +0.10. Users can inspect and override this knob in project settings.
          </div>

          <div className="border-l-4 border-[var(--field-coral)] pl-4 py-1">
            <strong className="text-[var(--ink)] block">2. Inability to parse sarcasm and inverted irony.</strong>
            A comment like "Oh fantastic, another app crash right during checkout!" contains positive features ("fantastic") which skew linear predictions despite clearly negative intent.
          </div>

          <div className="border-l-4 border-[var(--field-coral)] pl-4 py-1">
            <strong className="text-[var(--ink)] block">3. 2009 Training Data Distribution Shift.</strong>
            Trained on 2009 tweets, the vocabulary lacks modern emojis and contemporary internet slang (e.g., "cooked", "mid", "goat", "rizz"). Modern terms default to zero-weight out-of-vocabulary features.
          </div>
        </div>
      </section>

      <div className="pt-6">
        <Link
          to="/"
          className="bg-[var(--ink)] text-[var(--bg)] px-6 py-3 font-bold text-xs uppercase tracking-wider hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] transition-colors inline-block"
        >
          &larr; Back to Live Demo
        </Link>
      </div>
    </div>
  );
};
