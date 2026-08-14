"use client";

import { useCallback, useEffect, useState } from "react";

type Platform = "FACEBOOK" | "INSTAGRAM" | "WHATSAPP" | "TIKTOK" | "X" | "OTHER";

interface Post {
  id: string;
  title: string;
  content: string;
  platform: Platform;
  ai_generated: boolean;
  created_at: string;
}

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "X", label: "X (Twitter)" },
  { value: "OTHER", label: "Nyingine" },
];

export default function MarketingPage() {
  const [tab, setTab] = useState<"posts" | "ai" | "links">("posts");

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold text-zinc-900">Marketing Tools</h1>

      <div className="flex gap-2 border-b border-zinc-200">
        <button
          onClick={() => setTab("posts")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "posts"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500"
          }`}
        >
          Machapisho (Posts)
        </button>
        <button
          onClick={() => setTab("ai")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "ai"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500"
          }`}
        >
          AI Generator
        </button>
        <button
          onClick={() => setTab("links")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "links"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500"
          }`}
        >
          Social Media Links
        </button>
      </div>

      {tab === "posts" && <PostsTab />}
      {tab === "ai" && <AiTab />}
      {tab === "links" && <LinksTab />}
    </div>
  );
}

function PostsTab() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState<Platform>("OTHER");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPlatform, setEditPlatform] = useState<Platform>("OTHER");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/marketing/posts");
    const json = await res.json();
    setPosts(json.posts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/marketing/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, platform }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kuongeza post.");
        return;
      }
      setTitle("");
      setContent("");
      await load();
    } catch {
      setError("Hitilafu ya mtandao.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Futa post hii?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/marketing/posts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Imeshindwa kufuta.");
        return;
      }
      await load();
    } catch {
      setError("Hitilafu ya mtandao.");
    } finally {
      setBusyId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  const startEditing = (p: Post) => {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditContent(p.content);
    setEditPlatform(p.platform);
    setError(null);
  };

  const onSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError(null);
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/marketing/posts/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          platform: editPlatform,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kuhifadhi.");
        return;
      }
      setEditingId(null);
      await load();
    } catch {
      setError("Hitilafu ya mtandao.");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={onAdd}
        className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5"
      >
        <h2 className="text-sm font-semibold text-zinc-900">Andika Post Mpya</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Kichwa (mf. Promo ya Agosti)"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-2"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Andika maudhui ya post..."
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
        >
          {submitting ? "Inahifadhi..." : "Hifadhi Post"}
        </button>
      </form>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        {loading ? (
          <p className="text-sm text-zinc-500">Inapakia...</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna posts bado.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((p) =>
              editingId === p.id ? (
                <form
                  key={p.id}
                  onSubmit={onSaveEdit}
                  className="flex flex-col gap-2 rounded-lg border border-brand-blue bg-brand-blue-light/30 p-4"
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="rounded border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-2"
                    />
                    <select
                      value={editPlatform}
                      onChange={(e) => setEditPlatform(e.target.value as Platform)}
                      className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                    >
                      {PLATFORM_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
                    >
                      {savingEdit ? "Inahifadhi..." : "Hifadhi"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                    >
                      Ghairi
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  key={p.id}
                  className="rounded-lg border border-zinc-200 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-900">{p.title}</p>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        {PLATFORM_OPTIONS.find((o) => o.value === p.platform)?.label}
                      </span>
                      {p.ai_generated && (
                        <span className="rounded-full bg-brand-orange-light px-2 py-0.5 text-xs text-brand-orange">
                          AI
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => copyToClipboard(p.content)}
                        className="text-xs font-medium text-brand-blue underline"
                      >
                        Nakili
                      </button>
                      <button
                        onClick={() => startEditing(p)}
                        className="text-xs font-medium text-zinc-700 underline"
                      >
                        Hariri
                      </button>
                      <button
                        onClick={() => onDelete(p.id)}
                        disabled={busyId === p.id}
                        className="text-xs font-medium text-red-700 underline disabled:opacity-50"
                      >
                        Futa
                      </button>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-zinc-700">
                    {p.content}
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">
                    {p.created_at.slice(0, 10)}
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AiTab() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [platform, setPlatform] = useState<Platform>("FACEBOOK");
  const [tone, setTone] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const onGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotConfigured(false);
    setSaved(false);
    setGenerating(true);
    try {
      const res = await fetch("/api/marketing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, audience, platform, tone }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kutengeneza post.");
        setNotConfigured(Boolean(json.notConfigured));
        return;
      }
      setResult(json.content);
    } catch {
      setError("Hitilafu ya mtandao.");
    } finally {
      setGenerating(false);
    }
  };

  const onSaveAsDraft = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/marketing/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: topic || "AI Draft",
          content: result,
          platform,
          aiGenerated: true,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Imeshindwa kuhifadhi.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Hitilafu ya mtandao.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={onGenerate}
        className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5"
      >
        <h2 className="text-sm font-semibold text-zinc-900">
          Tengeneza Post kwa AI
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Mada (mf. Huduma mpya za wazee)"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-2"
          />
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Walengwa (hiari, mf. familia za Dar es Salaam)"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="Mtindo (hiari, mf. wa kirafiki)"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-2"
          />
        </div>
        {error && (
          <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            <p>{error}</p>
            {notConfigured && (
              <p className="mt-1 text-xs text-red-600">
                Weka <code className="rounded bg-red-100 px-1">ANTHROPIC_API_KEY</code>{" "}
                kwenye environment variables za mfumo (Vercel Project Settings →
                Environment Variables), kisha redeploy.
              </p>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={generating || !topic}
          className="self-start rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
        >
          {generating ? "Inatengeneza..." : "Tengeneza"}
        </button>
      </form>

      {result && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <h3 className="mb-2 text-sm font-semibold text-zinc-900">Matokeo</h3>
          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            rows={6}
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => navigator.clipboard?.writeText(result)}
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Nakili
            </button>
            <button
              onClick={onSaveAsDraft}
              disabled={saving}
              className="rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {saving ? "Inahifadhi..." : "Hifadhi kwenye Machapisho"}
            </button>
            {saved && (
              <span className="self-center text-sm text-green-700">
                Imehifadhiwa!
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LinksTab() {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/marketing/social-links")
      .then((r) => r.json())
      .then((json) => {
        setLinks(json.links ?? {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const onChange = (key: string, value: string) => {
    setLinks((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/marketing/social-links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(links),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kuhifadhi.");
        return;
      }
      setLinks(json.links);
      setMessage("Links zimehifadhiwa.");
    } catch {
      setError("Hitilafu ya mtandao.");
    } finally {
      setSaving(false);
    }
  };

  const FIELDS = [
    { key: "social_facebook_url", label: "Facebook Page URL" },
    { key: "social_instagram_url", label: "Instagram URL" },
    { key: "social_whatsapp_url", label: "WhatsApp Business URL" },
    { key: "social_website_url", label: "Website" },
  ];

  if (loading) {
    return <p className="text-sm text-zinc-500">Inapakia...</p>;
  }

  return (
    <form
      onSubmit={onSave}
      className="flex max-w-lg flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5"
    >
      <h2 className="text-sm font-semibold text-zinc-900">
        Social Media Links za Kampuni
      </h2>
      {FIELDS.map((f) => (
        <div key={f.key} className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">{f.label}</label>
          <div className="flex gap-2">
            <input
              value={links[f.key] ?? ""}
              onChange={(e) => onChange(f.key, e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            {links[f.key] && (
              <a
                href={links[f.key]}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Fungua
              </a>
            )}
          </div>
        </div>
      ))}
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-1 self-start rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
      >
        {saving ? "Inahifadhi..." : "Hifadhi Links"}
      </button>
    </form>
  );
}
