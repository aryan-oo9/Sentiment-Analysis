import React from "react";
import { Link, Outlet } from "react-router";
import { useAuth } from "../../auth/AuthContext";

export const MarketingLayout: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)]">
      <header className="border-b border-[var(--border)] px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-black tracking-tight uppercase">
          TweetSense
        </Link>
        <nav className="flex items-center space-x-6 text-sm font-medium">
          <Link to="/" className="hover:text-[var(--accent)] transition-colors">
            Demo
          </Link>
          <Link to="/model" className="hover:text-[var(--accent)] transition-colors">
            Model Card
          </Link>
          {user ? (
            <Link
              to="/app"
              className="bg-[var(--ink)] text-[var(--bg)] px-4 py-2 font-semibold hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] transition-colors"
            >
              Workspace &rarr;
            </Link>
          ) : (
            <Link
              to="/login"
              className="bg-[var(--ink)] text-[var(--bg)] px-4 py-2 font-semibold hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] transition-colors"
            >
              Sign In
            </Link>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--border)] px-6 py-8 text-xs text-[var(--muted)] flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          &copy; 2026 TweetSense. Production AI Feedback Intelligence Platform.
        </div>
        <div className="flex gap-4">
          <Link to="/model" className="hover:underline">Methodology & Limits</Link>
          <span>&bull;</span>
          <span>Logistic Regression + TextBlob + Zero-Shot Triage</span>
        </div>
      </footer>
    </div>
  );
};
