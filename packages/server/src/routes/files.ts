import { Router } from "express";
import fs from "fs/promises";
import {
  getRecentDocuments, getDocument, saveDocument,
  createDocument, archiveDocument, searchDocuments,
} from "../services/fileService.js";

const router = Router();

router.get("/recent", async (_req, res) => {
  try {
    const docs = await getRecentDocuments();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch recent documents" });
  }
});

router.get("/open/:id", async (req, res) => {
  try {
    const doc = await getDocument(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to open document" });
  }
});

router.post("/save", async (req, res) => {
  try {
    const { id, title, content } = req.body;
    if (!id || !title) return res.status(400).json({ error: "id and title are required" });
    const doc = await saveDocument(id, title, content ?? "");
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to save document" });
  }
});

router.post("/new", async (req, res) => {
  try {
    const { title } = req.body;
    const doc = await createDocument(title || "Untitled");
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to create document" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await archiveDocument(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to archive document" });
  }
});

router.post("/import", async (req, res) => {
  try {
    const { path: filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: "path is required" });
    const content = await fs.readFile(filePath, "utf-8");
    const title = filePath.split(/[\\/]/).pop() || "Imported";
    const doc = await saveDocument(crypto.randomUUID(), title, content);
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to import file" });
  }
});

router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q as string) || "";
    if (!q) return res.json([]);
    const docs = await searchDocuments(q);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
