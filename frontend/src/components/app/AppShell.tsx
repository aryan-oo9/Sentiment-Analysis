import React from "react";
import { Link, Outlet, useLocation, useParams, useNavigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { LayoutDashboard, Inbox, FolderKanban, Settings, LogOut, ArrowLeft } from "lucide-react";

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { projectId } = useParams();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isProjectView = Boolean(projectId);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg)] text-[var(--ink)]">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between p-4 md:p-6 shrink-0">
        <div>
          <div className="mb-6 md:mb-8">
            <Link to="/app" className="text-xl font-black tracking-tight uppercase block">
              TweetSense
            </Link>
            <span className="text-xs text-[var(--muted)] block mt-0.5">
              Feedback intelligence
            </span>
          </div>

          {isProjectView && (
            <Link
              to="/app"
              className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] mb-6 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Projects
            </Link>
          )}

          <nav className="space-y-1">
            {isProjectView ? (
              <>
                <Link
                  to={`/app/p/${projectId}`}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold transition-colors ${
                    location.pathname === `/app/p/${projectId}`
                      ? "bg-[var(--ink)] text-[var(--bg)]"
                      : "hover:bg-[var(--bg)] text-[var(--ink)]"
                  }`}
                >
                  <LayoutDashboard size={16} /> Overview
                </Link>
                <Link
                  to={`/app/p/${projectId}/inbox`}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold transition-colors ${
                    location.pathname.includes("/inbox")
                      ? "bg-[var(--ink)] text-[var(--bg)]"
                      : "hover:bg-[var(--bg)] text-[var(--ink)]"
                  }`}
                >
                  <Inbox size={16} /> Triage Inbox
                </Link>
                <Link
                  to={`/app/p/${projectId}/settings`}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold transition-colors ${
                    location.pathname.includes("/settings")
                      ? "bg-[var(--ink)] text-[var(--bg)]"
                      : "hover:bg-[var(--bg)] text-[var(--ink)]"
                  }`}
                >
                  <Settings size={16} /> Project Settings
                </Link>
              </>
            ) : (
              <Link
                to="/app"
                className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold transition-colors ${
                  location.pathname === "/app"
                    ? "bg-[var(--ink)] text-[var(--bg)]"
                    : "hover:bg-[var(--bg)] text-[var(--ink)]"
                }`}
              >
                <FolderKanban size={16} /> All Workspaces
              </Link>
            )}
          </nav>
        </div>

        <div className="border-t border-[var(--border)] pt-4">
          <div className="text-xs font-medium text-[var(--muted)] truncate mb-2">
            {user?.email}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-semibold text-[var(--field-coral)] hover:underline"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
