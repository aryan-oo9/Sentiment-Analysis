import React from "react";
import { Link } from "react-router";
import evalData from "../data/eval.json";

export const ModelCard: React.FC = () => {
  const evaluatedDate = new Date(evalData.evaluated_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  });

  const { metrics, latency } = evalData;

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] block">
          Model Governance & Empirical Audit
        </span>
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mt-1">
          Model Card: TweetSense v{evalData.version}
        </h1>
        <p className="text-sm text-[var(--muted)] mt-2">
          Empirical evaluation run on <strong>{evaluatedDate}</strong> from Git commit{" "}
          <code className="bg-[var(--surface)] px-1.5 py-0.5 border border-[var(--border)] text-[var(--ink)] font-mono">
            {evalData.git_commit}
          </code>{" "}
          with deterministic seed{" "}
          <code className="bg-[var(--surface)] px-1.5 py-0.5 border border-[var(--border)] text-[var(--ink)] font-mono">
            {evalData.evaluation_seed}
          </code>
          .
        </p>
      </div>

      {/* Verified Empirical Benchmarks */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between border-b-2 border-[var(--ink)] pb-2">
          <h2 className="text-xl font-black uppercase tracking-tight">Evaluated Metrics (Held-Out Split)</h2>
          <span className="text-xs font-mono text-[var(--muted)]">
            N = {evalData.sample_size.toLocaleString()} held-out rows
          </span>
        </div>

        <div className="border-b-2 border-[var(--ink)] divide-y divide-[var(--border)] font-mono text-xs">
          <div className="flex justify-between px-3 py-3">
            <span className="font-sans font-bold uppercase text-[var(--muted)]">Model Architecture</span>
            <span className="font-bold">{evalData.model_architecture}</span>
          </div>
          <div className="flex justify-between px-3 py-3">
            <span className="font-sans font-bold uppercase text-[var(--muted)]">Feature Representation</span>
            <span className="font-bold">{evalData.feature_representation}</span>
          </div>
          <div className="flex justify-between px-3 py-3">
            <span className="font-sans font-bold uppercase text-[var(--muted)]">Training Set Size</span>
            <span className="font-bold">{evalData.training_dataset}</span>
          </div>
          <div className="flex justify-between px-3 py-3 bg-[var(--surface)]">
            <span className="font-sans font-bold uppercase text-[var(--ink)]">Validation Accuracy</span>
            <span className="font-bold text-[var(--ink)] text-sm">{metrics.accuracy_pct}%</span>
          </div>
          <div className="flex justify-between px-3 py-3 bg-[var(--surface)]">
            <span className="font-sans font-bold uppercase text-[var(--ink)]">Weighted F1 Score</span>
            <span className="font-bold text-[var(--ink)] text-sm">{metrics.weighted_f1.toFixed(4)}</span>
          </div>
          <div className="flex justify-between px-3 py-3">
            <span className="font-sans font-bold uppercase text-[var(--muted)]">Negative Class (0)</span>
            <span>
              Prec: {metrics.per_class.negative.precision.toFixed(4)} | Rec:{" "}
              {metrics.per_class.negative.recall.toFixed(4)} | F1: {metrics.per_class.negative.f1.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between px-3 py-3">
            <span className="font-sans font-bold uppercase text-[var(--muted)]">Positive Class (4)</span>
            <span>
              Prec: {metrics.per_class.positive.precision.toFixed(4)} | Rec:{" "}
              {metrics.per_class.positive.recall.toFixed(4)} | F1: {metrics.per_class.positive.f1.toFixed(4)}
            </span>
          </div>
        </div>
      </section>

      {/* Latency Ledger */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between border-b-2 border-[var(--ink)] pb-2">
          <h2 className="text-xl font-black uppercase tracking-tight">Measured Operational Latency</h2>
          <span className="text-xs font-mono text-[var(--muted)]">
            Tested on {latency.sampled_requests} warm calls
          </span>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Live API round-trip measured against deployed Render service (
          <code className="text-[11px] font-mono">{latency.endpoint}</code>
          ). Pure inference measured locally on single CPU core.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="border border-[var(--border)] bg-[var(--surface)] p-4 font-mono">
            <span className="text-[10px] font-sans font-bold uppercase text-[var(--muted)] block">Live API p50</span>
            <span className="text-2xl font-black text-[var(--ink)] block mt-1">{latency.p50_ms}</span>
            <span className="text-[10px] text-[var(--muted)]">milliseconds</span>
          </div>
          <div className="border border-[var(--border)] bg-[var(--surface)] p-4 font-mono">
            <span className="text-[10px] font-sans font-bold uppercase text-[var(--muted)] block">Live API p95</span>
            <span className="text-2xl font-black text-[var(--ink)] block mt-1">{latency.p95_ms}</span>
            <span className="text-[10px] text-[var(--muted)]">milliseconds</span>
          </div>
          <div className="border border-[var(--border)] bg-[var(--surface)] p-4 font-mono">
            <span className="text-[10px] font-sans font-bold uppercase text-[var(--muted)] block">Local Inference p50</span>
            <span className="text-2xl font-black text-[var(--field-green)] block mt-1">{latency.inference_p50_ms}</span>
            <span className="text-[10px] text-[var(--muted)]">sub-millisecond</span>
          </div>
          <div className="border border-[var(--border)] bg-[var(--surface)] p-4 font-mono">
            <span className="text-[10px] font-sans font-bold uppercase text-[var(--muted)] block">Local Inference p95</span>
            <span className="text-2xl font-black text-[var(--field-green)] block mt-1">{latency.inference_p95_ms}</span>
            <span className="text-[10px] text-[var(--muted)]">sub-millisecond</span>
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
              {metrics.confusion_matrix.true_negative.toLocaleString()}
              <span className="block text-[9px] font-normal opacity-80">(True Neg)</span>
            </div>
            <div className="p-4 bg-[var(--bg)] border border-[var(--border)] font-bold">
              {metrics.confusion_matrix.false_positive.toLocaleString()}
              <span className="block text-[9px] font-normal text-[var(--muted)]">(False Pos)</span>
            </div>

            <div className="p-2 font-bold uppercase text-[10px] text-left">Act Positive</div>
            <div className="p-4 bg-[var(--bg)] border border-[var(--border)] font-bold">
              {metrics.confusion_matrix.false_negative.toLocaleString()}
              <span className="block text-[9px] font-normal text-[var(--muted)]">(False Neg)</span>
            </div>
            <div className="p-4 bg-[var(--field-green)] text-[var(--ink)] font-bold">
              {metrics.confusion_matrix.true_positive.toLocaleString()}
              <span className="block text-[9px] font-normal opacity-80">(True Pos)</span>
            </div>
          </div>
          <div className="text-[10px] text-[var(--muted)] text-center">
            Evaluated on {evalData.sample_size.toLocaleString()} held-out tweets from Sentiment140 (Seed: {evalData.evaluation_seed}).
          </div>
        </div>
      </section>

      {/* Honest Boundary & Failure Modes */}
      <section className="space-y-4">
        <h2 className="text-xl font-black uppercase tracking-tight">Known Failure Modes & Boundaries</h2>
        <div className="space-y-4 text-sm leading-relaxed text-[var(--muted)]">
          {evalData.known_limitations.map((limit, idx) => (
            <div key={limit.id} className="border-l-4 border-[var(--field-coral)] pl-4 py-1">
              <strong className="text-[var(--ink)] block">
                {idx + 1}. {limit.title}
              </strong>
              {limit.detail}
            </div>
          ))}

          <div className="border-l-4 border-[var(--ink)] pl-4 py-1">
            <strong className="text-[var(--ink)] block">
              4. Neutral Sentiment Policy ({evalData.neutral_handling.method})
            </strong>
            {evalData.neutral_handling.note}
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
