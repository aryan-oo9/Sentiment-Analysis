import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { api } from "../api/client";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { CheckCircle2, AlertCircle, ArrowLeft, KeyRound, Lock } from "lucide-react";

export const ResetPassword: React.FC = () => {
  useDocumentTitle("Reset Password");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("No password reset token was provided in the URL.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters in length.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({
        token,
        new_password: password,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The link may have expired or was already used.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-md w-full border-2 border-[var(--ink)] bg-[var(--surface)] p-6 sm:p-8 space-y-6 shadow-[6px_6px_0px_var(--ink)]">
          <div className="flex items-center gap-2 text-[var(--field-coral)]">
            <AlertCircle size={20} />
            <span className="font-mono text-xs font-bold uppercase tracking-wider">Invalid Request</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--ink)]">
              Missing Reset Token
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
              No reset verification token was detected in your link. Please use the reset link dispatched to your email or request a new one.
            </p>
          </div>

          <div className="pt-2 border-t border-[var(--border)] flex flex-wrap gap-3">
            <Link
              to="/login"
              className="bg-[var(--ink)] text-[var(--bg)] px-5 py-2.5 font-bold text-xs uppercase hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="max-w-md w-full border-2 border-[var(--ink)] bg-[var(--surface)] p-6 sm:p-8 space-y-6 shadow-[6px_6px_0px_var(--ink)]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <KeyRound size={18} className="text-[var(--field-green)]" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--muted)]">
              Account Security
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[var(--ink)]">
            Set New Password
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1 font-medium">
            Enter a strong password of at least 8 characters for your TweetSense account.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-[var(--field-coral)] text-white text-xs font-semibold flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-6 py-2">
            <div className="p-4 bg-[var(--field-green)]/15 border-2 border-[var(--field-green)] text-[var(--ink)] space-y-2">
              <div className="flex items-center gap-2 text-[var(--field-green)] font-bold text-sm">
                <CheckCircle2 size={18} />
                <span>Password Updated Successfully</span>
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Your credentials have been securely updated. The reset token has now been invalidated.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full bg-[var(--ink)] text-[var(--bg)] py-3 font-bold text-xs uppercase hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] transition-colors cursor-pointer"
            >
              Sign In with New Password &rarr;
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1">
                New Password <span className="text-[var(--muted)] font-normal">(min 8 characters)</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--field-green)] font-mono"
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--field-green)] font-mono"
                placeholder="••••••••••••"
                autoComplete="new-password"
              />
            </div>

            {/* Live Password Indicator */}
            <div className="text-[11px] font-mono space-y-1 text-[var(--muted)] pt-1">
              <div className={`flex items-center gap-1.5 ${password.length >= 8 ? "text-[var(--field-green)] font-bold" : ""}`}>
                <span>{password.length >= 8 ? "✓" : "○"}</span>
                <span>Minimum 8 characters ({password.length}/8)</span>
              </div>
              {confirmPassword.length > 0 && (
                <div className={`flex items-center gap-1.5 ${password === confirmPassword ? "text-[var(--field-green)] font-bold" : "text-[var(--field-coral)]"}`}>
                  <span>{password === confirmPassword ? "✓" : "✕"}</span>
                  <span>{password === confirmPassword ? "Passwords match" : "Passwords do not match"}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--ink)] text-[var(--bg)] py-3 font-bold text-xs uppercase hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Lock size={14} />
              <span>{loading ? "Updating Password..." : "Update Password"}</span>
            </button>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
              >
                &larr; Cancel and return to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
