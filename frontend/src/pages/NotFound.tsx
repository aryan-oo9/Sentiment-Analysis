import React from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ArrowLeft, Home, FolderKanban } from "lucide-react";

export const NotFound: React.FC = () => {
  useDocumentTitle("404 Not Found");
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="max-w-xl w-full border-2 border-[var(--ink)] bg-[var(--surface)] p-6 sm:p-10 space-y-6 shadow-[6px_6px_0px_var(--ink)]">
        {/* Status Chip */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2">
            <span className="bg-[var(--field-coral)] text-white text-[11px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider">
              Error 404
            </span>
            <span className="text-xs font-mono text-[var(--muted)]">Route Unresolved</span>
          </div>
          <span className="font-mono text-xs text-[var(--muted)]">HTTP/1.1</span>
        </div>

        {/* Headline & Path */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[var(--ink)] leading-none">
            Page Not Found
          </h1>
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            The requested path does not exist, has been moved, or direct link modification access was restricted.
          </p>

          <div className="p-3 bg-[var(--bg)] border border-[var(--border)] font-mono text-xs text-[var(--ink)] break-all">
            <span className="text-[var(--muted)] select-none">REQUEST_URI: </span>
            <span className="font-bold">{location.pathname}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-[var(--border)] flex flex-wrap items-center gap-3">
          {user ? (
            <Link
              to="/app"
              className="bg-[var(--ink)] text-[var(--bg)] px-5 py-2.5 font-bold text-xs uppercase hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] transition-colors flex items-center gap-2"
            >
              <FolderKanban size={14} />
              <span>Back to Workspaces</span>
            </Link>
          ) : (
            <Link
              to="/"
              className="bg-[var(--ink)] text-[var(--bg)] px-5 py-2.5 font-bold text-xs uppercase hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] transition-colors flex items-center gap-2"
            >
              <Home size={14} />
              <span>Return Home</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => window.history.back()}
            className="border-2 border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] px-4 py-2 font-bold text-xs uppercase hover:bg-[var(--surface)] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
};
