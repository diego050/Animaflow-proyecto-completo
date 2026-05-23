import express from "express";
import fs from "fs";
import path from "path";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { getBrowser } from "./chrome-pool.mjs";

const app = express();
app.use(express.json({ limit: "50mb" }));

const PORT = process.env.PORT || 3001;
const STORAGE_DIR = "/app/storage/videos";

let serveUrl = null;

app.post("/render", async (req, res) => {
  try {
    const { jobId, scenes, aspectRatio } = req.body;
    
    if (!jobId || !scenes) {
      return res.status(400).json({ error: "jobId and scenes are required" });
    }

    if (!serveUrl) {
      return res.status(503).json({ error: "Server is still bundling the project" });
    }

    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    const browser = await getBrowser();
    
    // Fallback to "AnimaFlow-Main" if the composition ID isn't provided
    const compositionId = req.body.compositionId || "AnimaFlow-Main"; 
    const inputProps = { spec: { scenes, aspect_ratio: aspectRatio } };

    console.log(`Selecting composition for job ${jobId}...`);
    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps,
      browser,
    });

    const outputLocation = path.join(STORAGE_DIR, `${jobId}.mp4`);

    console.log(`Rendering media for job ${jobId}...`);
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation,
      inputProps,
      browser,
    });

    console.log(`Render completed for job ${jobId}. Saved to ${outputLocation}`);
    return res.json({
      jobId,
      mp4: outputLocation,
      durationInFrames: composition.durationInFrames,
    });

  } catch (error) {
    console.error("Render failed:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", bundled: !!serveUrl });
});

async function start() {
  try {
    console.log("Starting server. Bundling project...");
    // Assuming Docker mounts frontend at /app/frontend
    const projectPath = path.resolve("/app/frontend/src/remotion/Root.tsx");
    
    serveUrl = await bundle({
      entryPoint: projectPath,
      webpackOverride: (config) => config,
    });
    
    console.log(`Bundled successfully at ${serveUrl}`);

    app.listen(PORT, () => {
      console.log(`Render server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
