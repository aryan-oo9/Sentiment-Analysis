import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { api } from "../api/client";
import type { Project } from "../api/types";
import { Copy, Save } from "lucide-react";

export const Settings: React.FC = () => {
  const { projectId } = useParams();
  const id = Number(projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [neutralBand, setNeutralBand] = useState(0.10);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      api.getProject(id).then((p) => {
        setProject(p);
        setName(p.name);
        setDescription(p.description || "");
        setNeutralBand(p.neutral_band);
        setShareToken(p.share_token);
      }).catch(console.error);
    }
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateProject(id, {
        name,
        description,
        neutral_band: neutralBand
      });
      setProject(updated);
      setMessage("Project settings updated successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleShare = async () => {
    try {
      const res = await api.toggleShare(id, !shareToken);
      setShareToken(res.share_token);
    } catch (err: any) {
      alert(err.message || "Failed to toggle share link");
    }
  };

  const copyShareLink = () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/r/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!project) {
    return <div className="p-8 text-xs font-semibold text-[var(--muted)]">Loading settings...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-10 w-full">
      <div className="border-b-2 border-[var(--ink)] pb-6">
        <span className="text-xs font-bold text-[var(--muted)] block">
          Configuration
        </span>
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mt-1">
          Project Settings
        </h1>
      </div>

      {message && (
        <div className="p-4 bg-[var(--field-green)] text-[var(--ink)] font-bold text-xs">
          {message}
        </div>
      )}

      {/* General Settings Form */}
      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        <div>
          <label className="block text-xs font-bold mb-1">
            Project name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[var(--surface)] border border-[var(--ink)] p-2.5 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-[var(--surface)] border border-[var(--ink)] p-2.5 text-sm focus:outline-none"
          />
        </div>

        {/* The Neutral Band Knob */}
        <div className="border-2 border-[var(--ink)] bg-[var(--surface)] p-6 space-y-4">
          <div className="flex justify-between items-baseline">
            <div>
              <span className="text-xs font-bold block">
                Neutral polarity band
              </span>
              <span className="text-xs text-[var(--muted)]">
                TextBlob polarity scores within &plusmn;{neutralBand.toFixed(2)} trigger Neutral classification.
              </span>
            </div>
            <span className="font-mono text-xl font-bold">&plusmn;{neutralBand.toFixed(2)}</span>
          </div>

          <input
            type="range"
            min="0.00"
            max="0.30"
            step="0.01"
            value={neutralBand}
            onChange={(e) => setNeutralBand(parseFloat(e.target.value))}
            className="w-full accent-[var(--ink)]"
          />

          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
            *Exposing this knob is more honest than hiding it: the model was trained on binary data, so neutrality is a configurable business rule.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-[var(--ink)] text-[var(--bg)] px-6 py-2.5 font-bold text-xs hover:bg-[var(--field-green)] hover:text-[var(--accent-ink)] cursor-pointer"
        >
          <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Public Share Link Toggle */}
      <div className="border-t-2 border-[var(--ink)] pt-8 space-y-4 max-w-2xl">
        <h2 className="text-lg font-black uppercase tracking-tight">Public Executive Report</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          Enable a read-only public link to share aggregate sentiment, themes, and executive briefing with stakeholders without requiring login.
        </p>

        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={handleToggleShare}
            className={`px-4 py-2 font-bold text-xs border cursor-pointer ${
              shareToken
                ? "bg-[var(--field-coral)] text-white border-[var(--field-coral)]"
                : "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]"
            }`}
          >
            {shareToken ? "Revoke Public Link" : "Generate Public Link"}
          </button>

          {shareToken && (
            <button
              onClick={copyShareLink}
              className="flex items-center gap-1.5 px-4 py-2 border border-[var(--ink)] font-bold text-xs hover:bg-[var(--surface)] cursor-pointer"
            >
              <Copy size={14} />
              {copied ? "Copied!" : "Copy URL"}
            </button>
          )}
        </div>

        {shareToken && (
          <div className="font-mono text-xs text-[var(--muted)] bg-[var(--surface)] p-3 border border-[var(--border)] break-all">
            {window.location.origin}/r/{shareToken}
          </div>
        )}
      </div>
    </div>
  );
};
