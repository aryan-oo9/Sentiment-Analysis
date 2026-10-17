import React from "react";
import { Link, Outlet } from "react-router";
import { useAuth } from "../../auth/AuthContext";

export const MarketingLayout: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)]">
      <header className="border-b border-[var(--border)] px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between">
        <Link to="/" className="text-lg sm:text-xl font-black tracking-tight uppercase">
          TweetSense
        </Link>
        <nav className="flex items-center space-x-3 sm:space-x-6 text-xs sm:text-sm font-medium">
          <Link to="/model" className="hover:text-[var(--accent)] transition-colors">
            Model Card
          </Link>
          {user ? (
            <Link
              to="/app"
              className="bg-[var(--ink)] text-[var(--bg)] px-3 sm:px-4 py-1.5 sm:py-2 font-semibold hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] transition-colors"
            >
              Workspace &rarr;
            </Link>
          ) : (
            <Link
              to="/login"
              className="bg-[var(--ink)] text-[var(--bg)] px-3 sm:px-4 py-1.5 sm:py-2 font-semibold hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] transition-colors"
            >
              Sign In
            </Link>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--border)] px-4 sm:px-6 py-6 md:py-8 text-xs text-[var(--muted)] flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
        <div>
          &copy; 2026 TweetSense. Production AI Feedback Intelligence Platform.
        </div>
        <div className="flex flex-wrap justify-center md:justify-end gap-3 sm:gap-4">
          <Link to="/model" className="hover:underline">Methodology & Limits</Link>
          <span>&bull;</span>
          <span>Logistic Regression + TextBlob + Zero-Shot Triage</span>
        </div>
      </footer>
    </div>
  );
};
