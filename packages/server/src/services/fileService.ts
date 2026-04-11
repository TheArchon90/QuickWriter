import { supabase } from "./supabaseClient.js";

export interface Document {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export interface DocumentSummary {
  id: string;
  title: string;
  updated_at: string;
}

export async function getRecentDocuments(limit = 20): Promise<DocumentSummary[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, updated_at")
    .eq("is_archived", false)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getDocument(id: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function saveDocument(id: string, title: string, content: string): Promise<Document> {
  const { data, error } = await supabase
    .from("documents")
    .upsert({ id, title, content, updated_at: new Date().toISOString() }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createDocument(title: string): Promise<Document> {
  const { data, error } = await supabase
    .from("documents")
    .insert({ title, content: "" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function archiveDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({ is_archived: true })
    .eq("id", id);
  if (error) throw error;
}

export async function searchDocuments(query: string): Promise<DocumentSummary[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, updated_at")
    .eq("is_archived", false)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}
