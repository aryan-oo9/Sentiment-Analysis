import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";

export const Login: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate("/app");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-[var(--surface)] border-2 border-[var(--ink)] p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            {isRegister ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1 font-medium">
            {isRegister
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
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
              Email Address
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
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
              Password {isRegister && <span className="text-[var(--muted)] lowercase font-normal">(min 8 chars)</span>}
            </label>
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
            className="w-full bg-[var(--ink)] text-[var(--bg)] py-3 font-bold text-sm uppercase tracking-wider hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] disabled:opacity-50 transition-colors"
          >
            {loading ? "Processing..." : isRegister ? "Register & Enter" : "Sign In"}
          </button>
        </form>

        <div className="border-t border-[var(--border)] pt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs font-semibold text-[var(--ink)] hover:underline"
          >
            {isRegister
              ? "Already have an account? Sign In"
              : "Need an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};
