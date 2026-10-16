import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Command } from "cmdk";
import {
  Search,
  LayoutDashboard,
  Inbox,
  FolderKanban,
  Settings,
  FileSpreadsheet,
  Moon,
  Sun,
  Filter,
  Plus,
  Globe,
  Award,
  Home
} from "lucide-react";
import { api } from "../../api/client";

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open: controlledOpen,
  onOpenChange: setControlledOpen
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = setControlledOpen || setInternalOpen;

  const navigate = useNavigate();
  const { projectId } = useParams();
  const currentProjectId = projectId ? Number(projectId) : 1; // Default fallback to sample project

  const [isNight, setIsNight] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.getAttribute("data-theme") === "night";
    }
    return false;
  });

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Sync initial theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("tweetsense_theme");
    if (saved === "night") {
      document.documentElement.setAttribute("data-theme", "night");
      setIsNight(true);
    }
  }, []);

  const runAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  const toggleTheme = () => {
    const next = isNight ? "day" : "night";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("tweetsense_theme", next);
    setIsNight(!isNight);
  };

  const handleExportCsv = async () => {
    try {
      await api.downloadExportCsv(currentProjectId);
    } catch (err: any) {
      alert(err.message || "CSV export failed");
    }
  };

  return (
    <Command.Dialog
      open={isOpen}
      onOpenChange={setIsOpen}
      label="Command Palette"
      overlayClassName="fixed inset-0 bg-black/70 z-50 transition-opacity"
      contentClassName="fixed top-20 left-1/2 -translate-x-1/2 max-w-xl w-[92vw] sm:w-full z-50 bg-[var(--bg)] border-2 border-[var(--ink)] text-[var(--ink)] rounded-none shadow-2xl outline-none overflow-hidden"
    >
      <div className="flex items-center border-b-2 border-[var(--ink)] px-4 bg-[var(--surface)]">
        <Search size={16} className="text-[var(--muted)] mr-3 shrink-0" />
        <Command.Input
          placeholder="Type a command or jump to page... (ESC to close)"
          className="w-full bg-transparent py-3.5 text-xs text-[var(--ink)] placeholder:text-[var(--muted)] outline-none"
        />
        <kbd className="hidden sm:inline-block border border-[var(--ink)] px-1.5 py-0.5 text-xs font-semibold text-[var(--ink)]">
          ESC
        </kbd>
      </div>

      <Command.List className="max-h-84 overflow-y-auto p-2 divide-y divide-[var(--border)]">
        <Command.Empty className="py-8 text-center text-xs text-[var(--muted)] font-medium">
          No matching commands found.
        </Command.Empty>

        {/* 1. Navigation Group */}
        <Command.Group
          heading="Navigation"
          className="text-xs font-semibold text-[var(--muted)] px-3 py-2"
        >
          <Command.Item
            onSelect={() => runAction(() => navigate("/app"))}
            className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold cursor-pointer text-[var(--ink)] hover:bg-[var(--surface)] data-[selected=true]:bg-[var(--ink)] data-[selected=true]:text-[var(--bg)] aria-selected:bg-[var(--ink)] aria-selected:text-[var(--bg)] transition-colors rounded-none"
          >
            <div className="flex items-center gap-2.5">
              <FolderKanban size={14} />
              <span>All Workspaces</span>
            </div>
            <span className="text-[10px] font-medium opacity-60">/app</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runAction(() => navigate(`/app/p/${currentProjectId}`))}
            className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold cursor-pointer text-[var(--ink)] hover:bg-[var(--surface)] data-[selected=true]:bg-[var(--ink)] data-[selected=true]:text-[var(--bg)] aria-selected:bg-[var(--ink)] aria-selected:text-[var(--bg)] transition-colors rounded-none"
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard size={14} />
              <span>Workspace Dashboard</span>
            </div>
            <span className="text-[10px] font-sans opacity-60">/app/p/{currentProjectId}</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runAction(() => navigate(`/app/p/${currentProjectId}/inbox`))}
            className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold cursor-pointer text-[var(--ink)] hover:bg-[var(--surface)] data-[selected=true]:bg-[var(--ink)] data-[selected=true]:text-[var(--bg)] aria-selected:bg-[var(--ink)] aria-selected:text-[var(--bg)] transition-colors rounded-none"
          >
            <div className="flex items-center gap-2.5">
              <Inbox size={14} />
              <span>Triage Inbox</span>
            </div>
            <span className="text-[10px] font-sans opacity-60">/inbox</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runAction(() => navigate(`/app/p/${currentProjectId}/settings`))}
            className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold cursor-pointer text-[var(--ink)] hover:bg-[var(--surface)] data-[selected=true]:bg-[var(--ink)] data-[selected=true]:text-[var(--bg)] aria-selected:bg-[var(--ink)] aria-selected:text-[var(--bg)] transition-colors rounded-none"
          >
            <div className="flex items-center gap-2.5">
              <Settings size={14} />
              <span>Project Settings & Share Token</span>
            </div>
            <span className="text-[10px] font-sans opacity-60">/settings</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runAction(() => navigate("/model-card"))}
            className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold cursor-pointer text-[var(--ink)] hover:bg-[var(--surface)] data-[selected=true]:bg-[var(--ink)] data-[selected=true]:text-[var(--bg)] aria-selected:bg-[var(--ink)] aria-selected:text-[var(--bg)] transition-colors rounded-none"
          >
            <div className="flex items-center gap-2.5">
              <Award size={14} />
              <span>Model Card & Methodology</span>
            </div>
            <span className="text-[10px] font-sans opacity-60">/model-card</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runAction(() => navigate("/"))}
            className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold cursor-pointer text-[var(--ink)] hover:bg-[var(--surface)] data-[selected=true]:bg-[var(--ink)] data-[selected=true]:text-[var(--bg)] aria-selected:bg-[var(--ink)] aria-selected:text-[var(--bg)] transition-colors rounded-none"
          >
            <div className="flex items-center gap-2.5">
              <Home size={14} />
              <span>Home / Landing Page</span>
            </div>
            <span className="text-[10px] font-sans opacity-60">/</span>
          </Command.Item>
        </Command.Group>

        {/* 2. Actions & Ingestion Group */}
        <Command.Group
          heading="Data Actions"
          className="text-xs font-semibold text-[var(--muted)] px-3 py-2"
        >
          <Command.Item
            onSelect={() => runAction(() => navigate(`/app/p/${currentProjectId}`)) }
            className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold cursor-pointer text-[var(--ink)] hover:bg-[var(--surface)] data-[selected=true]:bg-[var(--ink)] data-[selected=true]:text-[var(--bg)] aria-selected:bg-[var(--ink)] aria-selected:text-[var(--bg)] transition-colors rounded-none"
          >
            <div className="flex items-center gap-2.5">
              <Plus size={14} />
              <span>Ingest Feedback (Paste Text / CSV)</span>
            </div>
            <span className="text-[10px] font-sans opacity-60">Ingest</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runAction(() => navigate(`/app/p/${currentProjectId}`)) }
            className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold cursor-pointer text-[var(--ink)] hover:bg-[var(--surface)] data-[selected=true]:bg-[var(--ink)] data-[selected=true]:text-[var(--bg)] aria-selected:bg-[var(--ink)] aria-selected:text-[var(--bg)] transition-colors rounded-none"
          >
            <div className="flex items-center gap-2.5">
              <Globe size={14} />
              <span>Pull from Hacker News</span>
            </div>
            <span className="text-[10px] font-sans opacity-60">Algolia HN</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runAction(handleExportCsv)}
            className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold cursor-pointer text-[var(--ink)] hover:bg-[var(--surface)] data-[selected=true]:bg-[var(--ink)] data-[selected=true]:text-[var(--bg)] aria-selected:bg-[var(--ink)] aria-selected:text-[var(--bg)] transition-colors rounded-none"
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet size={14} />
              <span>Export Workspace Comments (CSV)</span>
            </div>
            <span className="text-[10px] font-sans opacity-60">Sanitized CSV</span>
          </Command.Item>
        </Command.Group>

        {/* 3. Triage Filters Group */}
        <Command.Group
          heading="Triage Inbox Filters"
          className="text-xs font-semibold text-[var(--muted)] px-3 py-2"
        >
          <Command.Item
            onSelect={() => runAction(() => navigate(`/app/p/${currentProjectId}/inbox?sentiment=Negative`))}
            className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold cursor-pointer text-[var(--ink)] hover:bg-[var(--surface)] data-[selected=true]:bg-[var(--ink)] data-[selected=true]:text-[var(--bg)] aria-selected:bg-[var(--ink)] aria-selected:text-[var(--bg)] transition-colors rounded-none"
          >
            <div className="flex items-center gap-2.5 text-[var(--field-coral)]">
              <Filter size={14} />
              <span>Filter: Negative Sentiment Only</span>
            </div>
            <span className="text-[10px] font-sans text-[var(--field-coral)]">Negative</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runAction(() => navigate(`/app/p/${currentProjectId}/inbox?priority=High+Priority`))}
            className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold cursor-pointer text-[var(--ink)] hover:bg-[var(--surface)] data-[selected=true]:bg-[var(--ink)] data-[selected=true]:text-[var(--bg)] aria-selected:bg-[var(--ink)] aria-selected:text-[var(--bg)] transition-colors rounded-none"
          >
            <div className="flex items-center gap-2.5 text-[var(--field-yellow)]">
              <Filter size={14} />
              <span>Filter: High Priority Only</span>
            </div>
            <span className="text-[10px] font-sans text-[var(--field-yellow)]">High Priority</span>
          </Command.Item>

          <Command.Item
            onSelect={() => runAction(() => navigate(`/app/p/${currentProjectId}/inbox`))}
            className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold cursor-pointer text-[var(--ink)] hover:bg-[var(--surface)] data-[selected=true]:bg-[var(--ink)] data-[selected=true]:text-[var(--bg)] aria-selected:bg-[var(--ink)] aria-selected:text-[var(--bg)] transition-colors rounded-none"
          >
            <div className="flex items-center gap-2.5">
              <Filter size={14} />
              <span>Filter: Clear All Filters</span>
            </div>
            <span className="text-[10px] font-sans opacity-60">Reset</span>
          </Command.Item>
        </Command.Group>

        {/* 4. Theme & System Preferences */}
        <Command.Group
          heading="Appearance"
          className="text-xs font-semibold text-[var(--muted)] px-3 py-2"
        >
          <Command.Item
            onSelect={() => runAction(toggleTheme)}
            className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold cursor-pointer text-[var(--ink)] hover:bg-[var(--surface)] data-[selected=true]:bg-[var(--ink)] data-[selected=true]:text-[var(--bg)] aria-selected:bg-[var(--ink)] aria-selected:text-[var(--bg)] transition-colors rounded-none"
          >
            <div className="flex items-center gap-2.5">
              {isNight ? <Sun size={14} /> : <Moon size={14} />}
              <span>Toggle Night Theme ({isNight ? "Switch to Day" : "Switch to Night"})</span>
            </div>
            <span className="text-[10px] font-sans opacity-60">{isNight ? "Night Active" : "Day Active"}</span>
          </Command.Item>
        </Command.Group>
      </Command.List>

      <div className="border-t-2 border-[var(--ink)] px-4 py-2 bg-[var(--surface)] flex justify-between items-center text-[11px] font-mono text-[var(--muted)]">
        <span>Use ↑ ↓ to navigate, ↵ to select</span>
        <span className="font-bold text-[var(--ink)]">⌘K / Ctrl+K</span>
      </div>
    </Command.Dialog>
  );
};
