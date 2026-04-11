const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  files: {
    recent: () => request<{ id: string; title: string; updated_at: string }[]>("/files/recent"),
    open: (id: string) => request<{
      id: string; title: string; content: string;
      created_at: string; updated_at: string;
    }>(`/files/open/${id}`),
    save: (id: string, title: string, content: string) =>
      request("/files/save", {
        method: "POST",
        body: JSON.stringify({ id, title, content }),
      }),
    create: (title: string) =>
      request<{ id: string; title: string; content: string }>(
        "/files/new",
        { method: "POST", body: JSON.stringify({ title }) }
      ),
    remove: (id: string) =>
      request(`/files/${id}`, { method: "DELETE" }),
    rename: (id: string, title: string) =>
      request<{ id: string; title: string; updated_at: string }>(
        `/files/${id}/rename`,
        { method: "POST", body: JSON.stringify({ title }) }
      ),
    search: (q: string) =>
      request<{ id: string; title: string; updated_at: string }[]>(
        `/files/search?q=${encodeURIComponent(q)}`
      ),
  },
  rewrite: (document: string, selection: string, action: "expand" | "concise") =>
    request<{ text: string }>("/rewrite", {
      method: "POST",
      body: JSON.stringify({ document, selection, action }),
    }),
  insert: (
    document: string,
    position: number,
    mode: "dice" | "custom",
    prompt?: string,
  ) =>
    request<{ text: string }>("/insert", {
      method: "POST",
      body: JSON.stringify({ document, position, mode, prompt }),
    }),
  settings: {
    get: () => request<{
      shortcuts: Record<string, Record<string, string>>;
      theme: { theme: string; accentColor: string; fontFamily: string; fontSize: number };
      preferences: {
        editorMode: string; autoPunctuation: boolean;
        autoCapitalization: boolean; sidebarVisible: boolean;
        lastDocumentId: string | null;
      };
    }>("/settings"),
    save: (data: Record<string, unknown>) =>
      request<{
        shortcuts: Record<string, Record<string, string>>;
        theme: { theme: string; accentColor: string; fontFamily: string; fontSize: number };
        preferences: {
          editorMode: string; autoPunctuation: boolean;
          autoCapitalization: boolean; sidebarVisible: boolean;
          lastDocumentId: string | null;
        };
      }>("/settings", { method: "PUT", body: JSON.stringify(data) }),
    defaults: () => request("/settings/defaults"),
  },
};
