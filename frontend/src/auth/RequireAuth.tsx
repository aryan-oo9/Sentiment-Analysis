import React from "react";
import { Navigate, Outlet } from "react-router";
import { useAuth } from "./AuthContext";

export const RequireAuth: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--ink)]">
        <div className="text-sm font-semibold tracking-wider uppercase">Loading session...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
