import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { api } from "../api/client";
import { KeyRound, ArrowLeft, Mail, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";

export const Login: React.FC = () => {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  
  const title =
    mode === "register"
      ? "Create Account"
      : mode === "forgot"
      ? "Forgot Password"
      : "Sign In";
  useDocumentTitle(title);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot password specific state
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const { login, register, loginDemo } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);
  const navigate = useNavigate();

  const handleTryDemo = async () => {
    setDemoLoading(true);
    setError(null);
    try {
      const data = await loginDemo();
      navigate(`/app/p/${data.demo_project_id || 1}`);
    } catch (err: any) {
      setError(err.message || "Failed to initialize sample workspace");
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
        await register(email, password);
        navigate("/app");
      } else if (mode === "login") {
        await login(email, password);
        navigate("/app");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.forgotPassword(email);
      setForgotSubmitted(true);
      if (res && res.dev_reset_url) {
        setDevResetUrl(res.dev_reset_url);
      }
    } catch (err: any) {
      setError(err.message || "Failed to dispatch password reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-md bg-[var(--surface)] border-2 border-[var(--ink)] p-5 sm:p-8 space-y-6 shadow-[6px_6px_0px_var(--ink)]">
        {mode === "forgot" ? (
          <>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <KeyRound size={18} className="text-[var(--accent)]" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--muted)]">
                  Account Recovery
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[var(--ink)]">
                Reset Password
              </h1>
              <p className="text-xs text-[var(--muted)] mt-1 font-medium leading-relaxed">
                Enter your account email. If registered, a single-use 15-minute reset link will be generated.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-[var(--field-coral)] text-white text-xs font-semibold flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {forgotSubmitted ? (
              <div className="space-y-4">
                <div className="p-4 bg-[var(--field-green)]/15 border-2 border-[var(--field-green)] text-[var(--ink)] space-y-2">
                  <div className="flex items-center gap-2 text-[var(--field-green)] font-bold text-xs uppercase tracking-wide">
                    <CheckCircle2 size={16} />
                    <span>Instructions Dispatched</span>
                  </div>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    If an account with that email exists, password reset instructions have been dispatched. The reset link expires in 15 minutes.
                  </p>
                </div>

                {devResetUrl && (
                  <div className="p-3.5 bg-[var(--bg)] border border-[var(--ink)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase font-bold text-[var(--accent)]">
                        Local Dev Mode Link
                      </span>
                      <ExternalLink size={12} className="text-[var(--muted)]" />
                    </div>
                    <p className="text-[11px] text-[var(--muted)]">
                      Since no external mail relay is configured in dev, access your generated reset URL directly:
                    </p>
                    <Link
                      to={devResetUrl}
                      className="block text-xs font-mono font-bold text-[var(--ink)] underline break-all hover:text-[var(--field-green)]"
                    >
                      {devResetUrl}
                    </Link>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setForgotSubmitted(false);
                    setDevResetUrl(null);
                    setError(null);
                  }}
                  className="w-full bg-[var(--ink)] text-[var(--bg)] py-3 font-bold text-xs uppercase hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={14} /> Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      placeholder="operator@company.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[var(--ink)] text-[var(--bg)] py-3 font-bold text-xs uppercase hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Mail size={14} />
                  <span>{loading ? "Dispatching link..." : "Send Reset Link"}</span>
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
                    className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft size={13} /> Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-[var(--ink)]">
                {mode === "register" ? "Create Account" : "Welcome Back"}
              </h1>
              <p className="text-xs text-[var(--muted)] mt-1 font-medium">
                {mode === "register"
                  ? "Register to create workspaces and analyze customer comments"
                  : "Sign in to access your feedback triage workspaces"}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-[var(--field-coral)] text-white text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="operator@company.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold">
                    Password {mode === "register" && <span className="text-[var(--muted)] lowercase font-normal">(min 8 chars)</span>}
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError(null);
                      }}
                      className="text-xs text-[var(--muted)] hover:text-[var(--ink)] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--ink)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--ink)] text-[var(--bg)] py-3 font-bold text-sm uppercase hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading ? "Processing..." : mode === "register" ? "Register & Enter" : "Sign In"}
              </button>
            </form>

            <div className="border-t border-[var(--border)] pt-4 space-y-3 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "register" ? "login" : "register");
                  setError(null);
                }}
                className="text-xs font-semibold text-[var(--ink)] hover:underline cursor-pointer block w-full"
              >
                {mode === "register"
                  ? "Already have an account? Sign In"
                  : "Need an account? Create one"}
              </button>

              <div className="pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={handleTryDemo}
                  disabled={demoLoading}
                  className="w-full bg-[var(--bg)] border border-[var(--ink)] text-[var(--ink)] py-2.5 font-bold text-xs uppercase hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {demoLoading ? "Opening sample..." : "Try the sample demo"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
