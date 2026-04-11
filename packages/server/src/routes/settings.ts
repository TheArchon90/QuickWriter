import { Router } from "express";
import { getSettings, saveSettings, getDefaults } from "../services/settingsService.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: "Failed to read settings" });
  }
});

router.put("/", async (req, res) => {
  try {
    const updated = await saveSettings(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to save settings" });
  }
});

router.get("/defaults", (_req, res) => {
  res.json(getDefaults());
});

export default router;
