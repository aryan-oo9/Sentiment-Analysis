import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useParams, useNavigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { LayoutDashboard, Inbox, FolderKanban, Settings, LogOut, ArrowLeft, Search, Sparkles, Menu, X } from "lucide-react";
import { CommandPalette } from "./CommandPalette";
import { TourProvider, useTour } from "../tour/TourContext";
import { WalkthroughTour } from "../tour/WalkthroughTour";
import { api } from "../../api/client";

const AppShellContent: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { startTour } = useTour();

  // Auto-close mobile menu upon navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isProjectView = Boolean(projectId);

  const handleStartTour = async () => {
    setMobileMenuOpen(false);
    if (!isProjectView) {
      try {
        const projs = await api.getProjects();
        if (projs && projs.length > 0) {
          navigate(`/app/p/${projs[0].id}`);
          setTimeout(() => startTour(0), 450);
          return;
        }
      } catch (err) {
        console.error("Failed to fetch projects for tour:", err);
      }
    }
    startTour(0);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg)] text-[var(--ink)]">
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <WalkthroughTour />

      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <Link to="/app" className="text-lg font-black tracking-tight uppercase">
          TweetSense
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="p-2 border border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
            title="Command Menu (Ctrl+K)"
            aria-label="Open command palette"
          >
            <Search size={16} />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 border border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)] cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[var(--surface)] border-b-2 border-[var(--ink)] p-4 space-y-4 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <button
            type="button"
            onClick={handleStartTour}
            className="w-full flex items-center justify-between border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors cursor-pointer bg-[var(--bg)]"
          >
            <span className="flex items-center gap-2">
              <Sparkles size={13} className="text-[var(--field-green)]" /> Walkthrough Tour
            </span>
            <span className="text-[10px] font-mono px-1 py-0.5 bg-[var(--surface)] border border-[var(--border)]">
              5 steps
            </span>
          </button>

          {isProjectView && (
            <Link
              to="/app"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors py-1"
            >
              <ArrowLeft size={14} /> Back to Projects
            </Link>
          )}

          <nav className="space-y-1">
            {isProjectView ? (
              <>
                <Link
                  to={`/app/p/${projectId}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-colors ${
                    location.pathname === `/app/p/${projectId}`
                      ? "bg-[var(--ink)] text-[var(--bg)]"
                      : "hover:bg-[var(--bg)] text-[var(--ink)]"
                  }`}
                >
                  <LayoutDashboard size={16} /> Overview
                </Link>
                <Link
                  to={`/app/p/${projectId}/inbox`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-colors ${
                    location.pathname.includes("/inbox")
                      ? "bg-[var(--ink)] text-[var(--bg)]"
                      : "hover:bg-[var(--bg)] text-[var(--ink)]"
                  }`}
                >
                  <Inbox size={16} /> Triage Inbox
                </Link>
                <Link
                  to={`/app/p/${projectId}/settings`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-colors ${
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
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  location.pathname === "/app"
                    ? "bg-[var(--ink)] text-[var(--bg)]"
                    : "hover:bg-[var(--bg)] text-[var(--ink)]"
                }`}
              >
                <FolderKanban size={16} /> All Workspaces
              </Link>
            )}
          </nav>

          <div className="border-t border-[var(--border)] pt-3 flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--muted)] truncate max-w-[180px]">
              {user?.email}
            </span>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="flex items-center gap-1.5 font-bold text-[var(--field-coral)] hover:underline cursor-pointer"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:w-64 border-r border-[var(--border)] bg-[var(--surface)] flex-col justify-between p-6 shrink-0">
        <div>
          <div className="mb-8">
            <Link to="/app" className="text-xl font-black tracking-tight uppercase block">
              TweetSense
            </Link>
            <span className="text-xs text-[var(--muted)] block mt-0.5">
              Feedback intelligence
            </span>
          </div>

          <div className="space-y-2 mb-6">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="w-full flex items-center justify-between border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors cursor-pointer bg-[var(--bg)]"
              title="Press Ctrl+K or ⌘K to open command palette"
            >
              <span className="flex items-center gap-2">
                <Search size={13} /> Command Menu
              </span>
              <kbd className="border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--ink)]">
                Ctrl+K
              </kbd>
            </button>

            <button
              type="button"
              onClick={handleStartTour}
              className="w-full flex items-center justify-between border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--ink)] transition-colors cursor-pointer bg-[var(--bg)]"
              title="Take interactive feature walkthrough tour"
            >
              <span className="flex items-center gap-2">
                <Sparkles size={13} className="text-[var(--field-green)]" /> Walkthrough Tour
              </span>
              <span className="text-[10px] font-mono px-1 py-0.5 bg-[var(--surface)] border border-[var(--border)]">
                5 steps
              </span>
            </button>
          </div>

          {isProjectView && (
            <Link
              to="/app"
              className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] mb-6 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Projects
            </Link>
          )}

          <nav className="space-y-1" data-tour="tour-nav">
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
            className="flex items-center gap-2 text-xs font-semibold text-[var(--field-coral)] hover:underline cursor-pointer"
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

export const AppShell: React.FC = () => {
  return (
    <TourProvider>
      <AppShellContent />
    </TourProvider>
  );
};

