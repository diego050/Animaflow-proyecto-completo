import express from "express";
import fs from "fs";
import path from "path";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia } from "@remotion/renderer";
import { transform } from "sucrase";
import vm from "node:vm";
import * as esbuild from "esbuild";
import { getBrowser } from "./chrome-pool.mjs";

const app = express();
app.use(express.json({ limit: "50mb" }));

const PORT = process.env.PORT || 3001;
const STORAGE_DIR = "/app/storage/videos";

let serveUrl = null;
let samplerJs = null; // bundle del sampler AE (React + shim), construido al inicio

// ── Export AE editable (Etapa 2: muestreo por frame). BETA. ──
// Empaqueta el sampler (frontend/src/remotion/aeSamplerEntry.tsx) con esbuild → un JS para la
// página de muestreo.
async function buildAeSampler() {
  try {
    const result = await esbuild.build({
      entryPoints: ["/app/frontend/src/remotion/aeSamplerEntry.tsx"],
      bundle: true,
      format: "iife",
      platform: "browser",
      target: "es2020",
      jsx: "transform",
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
      absWorkingDir: "/app/frontend",
      write: false,
      minify: true,
      logLevel: "warning",
    });
    samplerJs = result.outputFiles[0].text;
    console.log(`AE sampler bundled (${samplerJs.length} bytes).`);
  } catch (e) {
    console.error("AE sampler bundle FAILED:", e.message);
  }
}

function rgbToHex(rgb) {
  if (!rgb) return "#808080";
  if (rgb.startsWith("#")) return rgb;
  const m = rgb.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return "#808080";
  const h = (n) => Math.max(0, Math.min(255, Math.round(parseFloat(n)))).toString(16).padStart(2, "0");
  return `#${h(m[0])}${h(m[1])}${h(m[2])}`;
}

// Arma el aeScene (contrato de jsx_builder.py) desde las mediciones por frame.
function assembleScene(frames, meta) {
  const ids = new Set();
  frames.forEach((fr) => Object.keys(fr).forEach((id) => ids.add(id)));
  const elements = [];
  for (const id of ids) {
    const position = [], scale = [], rotation = [], opacity = [];
    let first = null;
    let best = null; // frame donde el elemento es más grande (tamaño real, evita escala≈0)
    frames.forEach((fr, f) => {
      const m = fr[id];
      if (!m) return;
      position.push([f, [m.x, m.y]]);
      scale.push([f, m.scale * 100]);
      rotation.push([f, m.rotation]);
      opacity.push([f, m.opacity]);
      if (!first) first = m;
      if (!best || m.w > best.w) best = m;
    });
    if (!first) continue;
    // Tamaño BASE (CSS, sin transform) = rect del frame más grande / su escala. Nunca 0.
    const bScale = (best && best.scale) || 1;
    const baseW = Math.max(1, Math.round((best ? best.w : 1) / bScale));
    const baseH = Math.max(1, Math.round((best ? best.h : 1) / bScale));
    let appearance;
    if (first.type === "text") {
      appearance = { kind: "text", text: first.text || "", color: rgbToHex(first.color), fontSize: Math.max(1, parseFloat(first.fontSize) || 80) };
    } else if (first.type === "svg") {
      appearance = { kind: "footage", file: `${id}.mov`, w: baseW, h: baseH, color: "#808080" };
    } else {
      appearance = {
        kind: "shape",
        shape: first.shape || ((first.borderRadius || "").includes("50%") ? "ellipse" : "rect"),
        color: rgbToHex(first.color),
        w: baseW,
        h: baseH,
      };
    }
    elements.push({ id, name: id, appearance, tracks: { position, scale, rotation, opacity } });
  }
  return { ...meta, elements };
}

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

// Página de muestreo (carga el bundle del sampler + un #root del tamaño del lienzo).
app.get("/ae-sampler.html", (req, res) => {
  if (!samplerJs) return res.status(503).send("AE sampler not ready");
  res
    .type("html")
    .send(
      `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#000">` +
        `<div id="root"></div><script>${samplerJs}</script></body></html>`,
    );
});

// Muestreo por-frame (Etapa 2). Recibe código TSX YA ETIQUETADO (data-ae-id) + dims + frames.
// Devuelve el aeScene (contrato de jsx_builder). BETA: depende del navegador.
app.post("/ae-sample", async (req, res) => {
  try {
    const { code, width = 1080, height = 1920, fps = 30, durationInFrames } = req.body || {};
    if (!code || !durationInFrames) {
      return res.status(400).json({ error: "code y durationInFrames requeridos" });
    }
    if (!samplerJs) return res.status(503).json({ error: "AE sampler aún empaquetando" });

    // Cap de seguridad para no saturar el servidor (2 CPU / 8 GB).
    const frameCount = Math.min(Number(durationInFrames), 900);

    const { code: js } = transform(code, {
      transforms: ["typescript", "jsx", "imports"],
      jsxRuntime: "classic",
      production: true,
    });

    const browser = await getBrowser();
    const page = await browser.newPage({
      context: undefined,
      logLevel: "error",
      indent: false,
      pageIndex: 0,
      onBrowserLog: null,
      onLog: () => {},
    });
    try {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.goto({ url: `http://localhost:${PORT}/ae-sampler.html`, timeout: 30000, options: {} });
      await page.evaluate((jsCode, dims) => window.__ae.mount(jsCode, dims), js, {
        width, height, fps, durationInFrames: frameCount,
      });

      const frames = [];
      for (let f = 0; f < frameCount; f++) {
        await page.evaluate((ff) => window.__ae.setFrame(ff), f);
        frames.push(await page.evaluate(() => window.__ae.measure()));
      }

      const scene = assembleScene(frames, { fps, width, height, durationInFrames: frameCount });
      console.log(`AE sample OK: ${scene.elements.length} elementos, ${frameCount} frames.`);
      return res.json(scene);
    } finally {
      try { await page.close(); } catch { /* noop */ }
    }
  } catch (error) {
    console.error("AE sample failed:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", bundled: !!serveUrl, aeSampler: !!samplerJs });
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

    await buildAeSampler(); // empaqueta el sampler AE (beta) al inicio

    app.listen(PORT, () => {
      console.log(`Render server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
