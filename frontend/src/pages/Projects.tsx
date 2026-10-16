import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../api/client";
import type { Project } from "../api/types";
import { Plus, Trash2, ArrowUpRight } from "lucide-react";

export const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [neutralBand, setNeutralBand] = useState(0.10);
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();

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
    <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 space-y-10 w-full">
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
          <button
            onClick={() => setShowModal(true)}
            className="bg-[var(--ink)] text-[var(--bg)] px-6 py-2.5 font-bold text-xs hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] transition-colors cursor-pointer"
          >
            Create Your First Workspace
          </button>
        </div>
      ) : (
        <div className="divide-y-2 divide-[var(--border)]">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/app/p/${project.id}`}
              className="group py-6 flex flex-col md:flex-row justify-between items-start md:items-baseline gap-4 hover:bg-[var(--surface)] transition-colors px-4 -mx-4"
            >
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight group-hover:text-[var(--field-green)] transition-colors">
                    {project.name}
                  </h2>
                  {project.is_demo && (
                    <span className="px-2 py-0.5 bg-[var(--ink)] text-[var(--bg)] text-[10px] font-bold">
                      Sample Data
                    </span>
                  )}
                  <ArrowUpRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {project.description && (
                  <p className="text-xs text-[var(--muted)] mt-1 max-w-xl line-clamp-1">
                    {project.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-6 text-sm font-mono self-end md:self-auto">
                <div className="text-right">
                  <span className="font-bold">{project.total_comments || 0}</span> comments
                  {typeof project.negative_percentage === "number" && (
                    <span className="text-xs text-[var(--field-coral)] font-bold ml-2">
                      ({project.negative_percentage}% negative)
                    </span>
                  )}
                </div>

                {!project.is_demo && (
                  <button
                    onClick={(e) => handleDelete(e, project.id)}
                    className="text-[var(--muted)] hover:text-[var(--field-coral)] transition-colors p-1"
                    title="Delete Project"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg)] border-2 border-[var(--ink)] p-8 max-w-md w-full space-y-6">
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
