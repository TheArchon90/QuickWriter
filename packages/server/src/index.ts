import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

import filesRouter from "./routes/files.js";
import settingsRouter from "./routes/settings.js";
import rewriteRouter from "./routes/rewrite.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(cors());
// Bump the JSON body limit — rewrite requests include the full document as
// context, which can be several MB for long prose.
app.use(express.json({ limit: "10mb" }));

app.use("/api/files", filesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/rewrite", rewriteRouter);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`QuickWriter server running at http://localhost:${PORT}`);
});
