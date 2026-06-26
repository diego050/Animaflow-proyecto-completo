import express from "express";
import fs from "fs";
import path from "path";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { transform } from "sucrase";
import vm from "node:vm";
import { getBrowser } from "./chrome-pool.mjs";

const app = express();
app.use(express.json({ limit: "50mb" }));

const PORT = process.env.PORT || 3001;
const STORAGE_DIR = "/app/storage/videos";

let serveUrl = null;

// Smoke-test: compila el código generado (sucrase) y verifica que exporte un componente,
// SIN renderizar. Atrapa errores de sintaxis/estructura que el validador regex no ve.
// Devuelve { ok: true } o { ok: false, error }.
app.post("/smoke-test", (req, res) => {
  const { code } = req.body || {};
  if (!code || typeof code !== "string") {
    return res.status(400).json({ ok: false, error: "code requerido" });
  }
  try {
    const { code: js } = transform(code, {
      transforms: ["typescript", "jsx", "imports"],
      jsxRuntime: "classic",
      production: true,
    });
    // Stubs de react/remotion (no se renderiza; solo se evalúa la estructura del módulo).
    const stub = new Proxy({}, { get: () => undefined });
    const moduleObj = { exports: {} };
    // SANDBOX: contexto V8 nuevo SIN process/require-real/Buffer/global + timeout.
    // Solo exponemos require(stub react/remotion), module, exports. Los built-ins
    // estándar (Object, Array, Math, JSON) vienen con el contexto.
    const sandbox = {
      require: (name) => {
        if (name === "react" || name === "remotion") return stub;
        throw new Error(`Import no permitido: ${name}`);
      },
      module: moduleObj,
      exports: moduleObj.exports,
    };
    vm.runInNewContext(js, sandbox, { timeout: 2000 });
    const exp = moduleObj.exports;
    const comp =
      exp.default || exp.Animation || Object.values(exp).find((v) => typeof v === "function");
    if (!comp) return res.json({ ok: false, error: "el código no exporta un componente" });
    return res.json({ ok: true });
  } catch (e) {
    return res.json({ ok: false, error: String((e && e.message) || e) });
  }
});

app.post("/render", async (req, res) => {
  try {
    const { jobId, scenes, aspectRatio } = req.body;

    // `inputProps` explícito (ej. animaciones code-gen con compositionId="CustomCode")
    // o el spec de escenas del pipeline normal.
    const hasInputProps = req.body.inputProps && typeof req.body.inputProps === "object";
    if (!jobId || (!scenes && !hasInputProps)) {
      return res.status(400).json({ error: "jobId and scenes (or inputProps) are required" });
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
    const inputProps = hasInputProps
      ? req.body.inputProps
      : { spec: { scenes, aspect_ratio: aspectRatio } };

    console.log(`Selecting composition for job ${jobId}...`);
    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps,
      browser,
      timeoutInMilliseconds: 30000,  // sandbox: mata componentes colgados al evaluar
    });

    // codec: "h264" (mp4, default) o "prores" (.mov, footage para After Effects).
    const codec = req.body.codec === "prores" ? "prores" : "h264";
    const ext = codec === "prores" ? "mov" : "mp4";
    const outName = req.body.outputName || jobId;
    const outputLocation = path.join(STORAGE_DIR, `${outName}.${ext}`);

    console.log(`Rendering media for job ${jobId} (codec=${codec})...`);
    await renderMedia({
      composition,
      serveUrl,
      codec,
      outputLocation,
      inputProps,
      browser,
      timeoutInMilliseconds: 30000,  // sandbox: timeout por frame (mata renders colgados)
      ...(codec === "prores" ? { proResProfile: "hq" } : {}),
    });

    console.log(`Render completed for job ${jobId}. Saved to ${outputLocation}`);
    return res.json({
      jobId,
      mp4: codec === "h264" ? outputLocation : null,
      file: outputLocation,
      codec,
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
