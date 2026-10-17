import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Project } from "../api/types";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { Plus, Trash2, ArrowUpRight } from "lucide-react";

export const Projects: React.FC = () => {
  useDocumentTitle("Workspaces Hub");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [neutralBand, setNeutralBand] = useState(0.10);
  const [creating, setCreating] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const { loginDemo } = useAuth();
  const navigate = useNavigate();

  const handleExploreSample = async () => {
    setDemoLoading(true);
    try {
      const data = await loginDemo();
      navigate(`/app/p/${data.demo_project_id || 1}`);
    } catch (err: any) {
      alert(err.message || "Failed to launch sample workspace");
    } finally {
      setDemoLoading(false);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await api.createProject({
        name: newName.trim(),
        description: newDesc.trim(),
        neutral_band: neutralBand
      });
      setShowModal(false);
      setNewName("");
      setNewDesc("");
      navigate(`/app/p/${created.id}`);
    } catch (err: any) {
      alert(err.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this workspace and all its comments?")) return;
    try {
      await api.deleteProject(id);
      setProjects(projects.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete project");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 space-y-8 md:space-y-10 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-2 border-[var(--ink)] pb-6">
        <div>
          <span className="text-xs font-bold text-[var(--muted)] block">
            Workspace Hub
          </span>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mt-1">
            Projects
          </h1>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[var(--ink)] text-[var(--bg)] px-5 py-2.5 font-bold text-xs hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] transition-colors cursor-pointer"
        >
          <Plus size={16} /> New Workspace
        </button>
      </div>

      {error && (
        <div className="p-4 bg-[var(--field-coral)] text-white text-xs font-semibold flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={fetchProjects}
            className="px-3 py-1 bg-white text-[var(--ink)] font-bold hover:bg-[var(--bg)] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[var(--surface)] border border-[var(--border)] p-4 flex flex-col justify-center space-y-2">
              <div className="h-4 bg-[var(--border)] w-48"></div>
              <div className="h-3 bg-[var(--border)] w-72"></div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="border-2 border-dashed border-[var(--border)] p-12 text-center space-y-4">
          <p className="text-sm font-semibold text-[var(--muted)]">
            No workspaces created yet. Start by creating a project or loading sample feedback.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setShowModal(true)}
              className="bg-[var(--ink)] text-[var(--bg)] px-6 py-2.5 font-bold text-xs hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] transition-colors cursor-pointer"
            >
              Create Your First Workspace
            </button>
            <button
              type="button"
              onClick={handleExploreSample}
              disabled={demoLoading}
              className="border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] px-6 py-2.5 font-bold text-xs uppercase hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors cursor-pointer disabled:opacity-50"
            >
              {demoLoading ? "Opening sample..." : "Explore Sample Workspace"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] pb-2 font-mono border-b border-[var(--border)]">
            <span className="uppercase tracking-wider">Available Workspaces ({projects.length})</span>
            <span className="uppercase tracking-wider">Activity & Telemetry</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/app/p/${project.id}`}
                className="group relative block border border-[var(--border)] bg-[var(--surface)] p-6 hover:border-[var(--ink)] transition-all duration-150 cursor-pointer shadow-xs hover:shadow-sm"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  {/* Left Column: Metadata, Title, Description */}
                  <div className="space-y-2.5 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] text-[var(--muted)] border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5">
                        WS-{String(project.id).padStart(2, "0")}
                      </span>
                      {project.is_demo ? (
                        <span className="px-2 py-0.5 bg-[var(--ink)] text-[var(--bg)] text-[10px] font-bold uppercase tracking-wider">
                          Sample Data
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-[var(--border)] bg-[var(--bg)] text-[10px] font-mono text-[var(--muted)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--field-green)]"></span>
                          Custom
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[var(--ink)] group-hover:text-[var(--field-green)] transition-colors leading-tight">
                      {project.name}
                    </h2>

                    {project.description && (
                      <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    )}
                  </div>

                  {/* Right Column: Volume, Sentiment, Action */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 self-start sm:self-end md:self-center shrink-0">
                    <div className="text-left sm:text-right font-mono">
                      <div className="text-sm font-bold text-[var(--ink)]">
                        {project.total_comments || 0}{" "}
                        <span className="text-xs font-normal text-[var(--muted)]">comments</span>
                      </div>
                      {typeof project.negative_percentage === "number" && (
                        <div className="inline-block mt-1 px-1.5 py-0.5 bg-[var(--field-coral)]/10 border border-[var(--field-coral)]/30 text-[11px] text-[var(--field-coral)] font-bold">
                          {project.negative_percentage}% negative
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!project.is_demo && (
                        <button
                          onClick={(e) => handleDelete(e, project.id)}
                          className="text-[var(--muted)] hover:text-[var(--field-coral)] transition-colors p-2 cursor-pointer"
                          title="Delete Project"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <div className="flex items-center gap-1.5 border border-[var(--ink)] px-3 py-2 bg-[var(--bg)] group-hover:bg-[var(--field-green)] group-hover:text-[var(--accent-ink)] transition-colors font-mono text-xs font-bold uppercase tracking-wider">
                        <span>Open</span>
                        <ArrowUpRight size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-[var(--bg)] border-2 border-[var(--ink)] p-5 sm:p-8 max-w-md w-full space-y-6">
            <h3 className="text-2xl font-black uppercase tracking-tight">Create Workspace</h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--ink)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--field-green)]"
                  placeholder="e.g. Q4 Release Feedback"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-[var(--surface)] border border-[var(--ink)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--field-green)]"
                  placeholder="e.g. Survey responses and customer service exports"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold">
                    Neutral Polarity Band (&plusmn;{neutralBand.toFixed(2)})
                  </label>
                  <span className="text-[10px] text-[var(--muted)]">Heuristic threshold</span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="0.30"
                  step="0.02"
                  value={neutralBand}
                  onChange={(e) => setNeutralBand(parseFloat(e.target.value))}
                  className="w-full accent-[var(--ink)] cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[var(--ink)] font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-[var(--ink)] text-[var(--bg)] px-6 py-2 font-bold text-xs hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] cursor-pointer"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
