import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--s1)", border: "1px solid var(--border)",
  borderRadius: "var(--r12)", padding: "12px 16px", color: "var(--white)",
  fontSize: ".9rem", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: ".75rem", fontWeight: 700, letterSpacing: ".08em",
  textTransform: "uppercase", color: "var(--tmuted)", marginBottom: 6,
};

const EMPTY_FORM = {
  slug: "", title: "", excerpt: "", content: "", coverImageUrl: "", tags: "", published: false,
};

export default function AdminBlog() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const [posts, setPosts] = useState<{ slug: string; title: string; published: boolean; publishedAt: Date | null; excerpt: string | null }[]>([]);
  const [editing, setEditing] = useState<typeof EMPTY_FORM | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const listQuery = trpc.blog.adminList.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const upsertMutation = trpc.blog.upsert.useMutation();
  const deleteMutation = trpc.blog.adminDelete.useMutation();
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const getPostQuery = trpc.blog.adminGet.useQuery(
    { slug: loadingSlug! },
    { enabled: !!loadingSlug, staleTime: 0 }
  );

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) {
      navigate("/");
    }
  }, [loading, isAuthenticated, user, navigate]);

  useEffect(() => {
    if (listQuery.data) setPosts(listQuery.data);
  }, [listQuery.data]);

  const handleNew = () => { setEditing({ ...EMPTY_FORM }); setIsNew(true); setPreview(false); };

  // When full post data loads, populate editor
  useEffect(() => {
    if (getPostQuery.data && loadingSlug) {
      const p = getPostQuery.data;
      setEditing({
        slug: p.slug, title: p.title ?? "", excerpt: p.excerpt ?? "",
        content: p.content ?? "", coverImageUrl: p.coverImageUrl ?? "",
        tags: p.tags ?? "", published: p.published,
      });
      setLoadingSlug(null);
      setIsNew(false);
      setPreview(false);
    }
  }, [getPostQuery.data, loadingSlug]);

  const handleEdit = (post: typeof posts[0]) => { setLoadingSlug(post.slug); };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete post "${slug}"? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync({ slug });
      toast.success("Post deleted.");
      listQuery.refetch();
    } catch { toast.error("Delete failed."); }
  };

  const handleCancel = () => { setEditing(null); setIsNew(false); setLoadingSlug(null); };

  const handleSave = async (publish: boolean) => {
    if (!editing) return;
    if (!editing.slug.trim() || !editing.title.trim() || !editing.content.trim()) {
      toast.error("Slug, title, and content are required.");
      return;
    }
    setSaving(true);
    try {
      await upsertMutation.mutateAsync({ ...editing, published: publish });
      toast.success(publish ? "Post published!" : "Draft saved.");
      setEditing(null);
      listQuery.refetch();
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const setField = (k: keyof typeof EMPTY_FORM, v: string | boolean) =>
    setEditing(prev => prev ? { ...prev, [k]: v } : prev);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, border: "3px solid rgba(124,58,237,0.3)", borderTopColor: "var(--purple)", borderRadius: "50%", animation: "spin .65s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--white)" }}>
      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, right: 0, left: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", background: "rgba(10,15,26,0.9)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <a href="/" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "var(--white)", display: "flex", alignItems: "center", gap: 8 }}>
          <span>⚡</span> QR Studio
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/dashboard" style={{ fontSize: ".85rem", color: "var(--tmuted)" }}>Dashboard</a>
          <a href="/blog" style={{ fontSize: ".85rem", color: "var(--tmuted)" }}>View Blog</a>
          <span style={{ background: "rgba(124,58,237,0.2)", border: "1px solid var(--bp)", borderRadius: "var(--rfull)", padding: "4px 12px", fontSize: ".75rem", fontWeight: 700, color: "var(--purpleL)" }}>Admin</span>
        </div>
      </nav>

      <div style={{ paddingTop: 80, maxWidth: 1100, margin: "0 auto", padding: "80px 24px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.8rem", marginBottom: 4 }}>Blog Editor</h1>
            <p style={{ color: "var(--tmuted)", fontSize: ".9rem" }}>Create and manage blog posts for SEO and content marketing.</p>
          </div>
          {!editing && (
            <button onClick={handleNew} style={{
              background: "var(--purple)", border: "none", borderRadius: "var(--r12)",
              padding: "12px 24px", color: "#fff", fontFamily: "'Syne', sans-serif",
              fontWeight: 700, fontSize: ".9rem", cursor: "pointer",
            }}>+ New Post</button>
          )}
        </div>

        {/* Editor */}
        {editing ? (
          <div style={{ background: "rgba(17,24,39,0.85)", border: "1px solid var(--border)", borderRadius: 20, padding: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.2rem" }}>
                {isNew ? "New Post" : `Editing: ${editing.title || editing.slug}`}
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setPreview(!preview)} style={{
                  background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "var(--r12)",
                  padding: "8px 16px", color: "var(--t2)", fontSize: ".82rem", cursor: "pointer",
                }}>{preview ? "✏️ Edit" : "👁 Preview"}</button>
                <button onClick={handleCancel} style={{
                  background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "var(--r12)",
                  padding: "8px 16px", color: "var(--tmuted)", fontSize: ".82rem", cursor: "pointer",
                }}>Cancel</button>
              </div>
            </div>

            {preview ? (
              <div style={{ background: "var(--s1)", borderRadius: 12, padding: 24, minHeight: 300 }}>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.6rem", marginBottom: 8 }}>{editing.title || "Untitled"}</h2>
                <p style={{ color: "var(--tmuted)", marginBottom: 16, fontSize: ".9rem" }}>{editing.excerpt}</p>
                <div style={{ color: "var(--t2)", lineHeight: 1.8, whiteSpace: "pre-wrap", fontSize: ".92rem" }}>{editing.content}</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Slug */}
                <div>
                  <label style={labelStyle}>URL Slug *</label>
                  <input value={editing.slug} onChange={e => setField("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
                    placeholder="my-blog-post-title" style={inputStyle} />
                </div>
                {/* Tags */}
                <div>
                  <label style={labelStyle}>Tags (comma-separated)</label>
                  <input value={editing.tags} onChange={e => setField("tags", e.target.value)}
                    placeholder="qr-codes, marketing, business" style={inputStyle} />
                </div>
                {/* Title */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Title *</label>
                  <input value={editing.title} onChange={e => setField("title", e.target.value)}
                    placeholder="How QR Codes Can Boost Your Marketing ROI" style={inputStyle} />
                </div>
                {/* Excerpt */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Excerpt / Meta Description</label>
                  <textarea value={editing.excerpt} onChange={e => setField("excerpt", e.target.value)}
                    placeholder="A short summary shown in search results and blog listings…" rows={2}
                    style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                {/* Cover image */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Cover Image URL (optional)</label>
                  <input value={editing.coverImageUrl} onChange={e => setField("coverImageUrl", e.target.value)}
                    placeholder="https://images.unsplash.com/…" style={inputStyle} />
                </div>
                {/* Content */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Content * (Markdown supported)</label>
                  <textarea value={editing.content} onChange={e => setField("content", e.target.value)}
                    placeholder={"# Heading\n\nWrite your article here. Markdown is supported.\n\n## Section\n\nParagraph text…"}
                    rows={18} style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: ".85rem", lineHeight: 1.6 }} />
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
              <button onClick={() => handleSave(false)} disabled={saving} style={{
                background: "var(--s2)", border: "1px solid var(--border)", borderRadius: "var(--r12)",
                padding: "12px 24px", color: "var(--t2)", fontWeight: 600, fontSize: ".9rem",
                cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
              }}>💾 Save Draft</button>
              <button onClick={() => handleSave(true)} disabled={saving} style={{
                background: "linear-gradient(135deg,#7C3AED,#5B21B6)", border: "none", borderRadius: "var(--r12)",
                padding: "12px 28px", color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 700,
                fontSize: ".9rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
              }}>{saving ? "Saving…" : "🚀 Publish"}</button>
            </div>
          </div>
        ) : (
          /* Post list */
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {listQuery.isLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--tmuted)" }}>Loading posts…</div>
            ) : posts.length === 0 ? (
              <div style={{ background: "rgba(17,24,39,0.85)", border: "1px solid var(--border)", borderRadius: 16, padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: 12 }}>📝</div>
                <p style={{ color: "var(--tmuted)", marginBottom: 16 }}>No blog posts yet. Create your first post to start building SEO content.</p>
                <button onClick={handleNew} style={{
                  background: "var(--purple)", border: "none", borderRadius: "var(--r12)",
                  padding: "12px 24px", color: "#fff", fontWeight: 700, cursor: "pointer",
                }}>Create First Post</button>
              </div>
            ) : posts.map(post => (
              <div key={post.slug} style={{
                background: "rgba(17,24,39,0.85)", border: "1px solid var(--border)", borderRadius: 14,
                padding: "18px 24px", display: "flex", alignItems: "center", gap: 16,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: ".7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "var(--rfull)",
                      background: post.published ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                      color: post.published ? "var(--green)" : "var(--amber)",
                      border: `1px solid ${post.published ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
                    }}>{post.published ? "Published" : "Draft"}</span>
                    <span style={{ fontFamily: "monospace", fontSize: ".75rem", color: "var(--tmuted)" }}>/{post.slug}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--white)", marginBottom: 2 }}>{post.title}</div>
                  {post.excerpt && <div style={{ fontSize: ".82rem", color: "var(--tmuted)" }}>{post.excerpt.slice(0, 100)}{post.excerpt.length > 100 ? "…" : ""}</div>}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {post.published && (
                    <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" style={{
                      background: "var(--s2)", border: "1px solid var(--border)", borderRadius: 8,
                      padding: "8px 14px", color: "var(--t2)", fontSize: ".8rem", textDecoration: "none",
                    }}>View →</a>
                  )}
                   <button onClick={() => handleEdit(post)} disabled={loadingSlug === post.slug} style={{
                    background: "var(--pdim)", border: "1px solid var(--bp)", borderRadius: 8,
                    padding: "8px 14px", color: "var(--purpleL)", fontSize: ".8rem", cursor: "pointer",
                    opacity: loadingSlug === post.slug ? 0.5 : 1,
                  }}>{loadingSlug === post.slug ? "Loading…" : "Edit"}</button>
                  <button onClick={() => handleDelete(post.slug)} style={{
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8,
                    padding: "8px 14px", color: "#f87171", fontSize: ".8rem", cursor: "pointer",
                  }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
