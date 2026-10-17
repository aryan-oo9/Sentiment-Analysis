export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
  badge?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "tour-nav",
    targetSelector: '[data-tour="tour-nav"]',
    title: "Workspace Command & Navigation",
    description:
      "Switch effortlessly between your Executive Overview, the Human-in-the-Loop Triage Inbox, and Project Settings. Press Ctrl+K anytime to summon the command palette.",
    placement: "right",
    badge: "01 / NAVIGATION",
  },
  {
    id: "tour-signal",
    targetSelector: '[data-tour="tour-signal"]',
    title: "Dominant Public Signal",
    description:
      "Synthesized from real-time BERT inference. Displays net sentiment polarity, category splits (positive, negative, neutral), and automated anomaly spike warnings.",
    placement: "bottom",
    badge: "02 / SIGNAL ANALYSIS",
  },
  {
    id: "tour-telemetry",
    targetSelector: '[data-tour="tour-telemetry"]',
    title: "Telemetry & Performance Ledger",
    description:
      "Audit live inference speed (p50/p95 latency in milliseconds), classification confidence averages, and human agreement rates against automated model predictions.",
    placement: "top",
    badge: "03 / MODEL METRICS",
  },
  {
    id: "tour-lexical",
    targetSelector: '[data-tour="tour-lexical"]',
    title: "Lexical Distribution & N-Grams",
    description:
      "Explore dynamic word frequencies and semantic keyword clusters that highlight the primary friction drivers and trending topics in customer feedback.",
    placement: "top",
    badge: "04 / TOPIC CLUSTERS",
  },
  {
    id: "tour-actions",
    targetSelector: '[data-tour="tour-actions"]',
    title: "Data Ingestion & Triage Actions",
    description:
      "Ingest new comments via plain text pasting, structured CSV files, or live Hacker News searches. Export sanitized audit CSVs or jump directly into the Triage Inbox to review.",
    placement: "bottom",
    badge: "05 / DATA & ACTIONS",
  },
];
