import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { loadDiagramBundle } from "./plugin/diagram-source.ts";

const DIAGRAMS_URL = "diagrams.json";

function diagramsPlugin(location: string): Plugin {
  return {
    name: "er-viewer-diagrams",
    configureServer(server) {
      // Read on every request so regenerated diagrams show up on reload.
      server.middlewares.use(`/${DIAGRAMS_URL}`, (_req, res) => {
        try {
          const body = JSON.stringify(loadDiagramBundle(location));
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.end(body);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(`図の読み込みに失敗しました (${location}): ${(err as Error).message}`);
        }
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: DIAGRAMS_URL,
        source: JSON.stringify(loadDiagramBundle(location)),
      });
    },
  };
}

export default defineConfig({
  base: "./",
  build: {
    chunkSizeWarningLimit: 4000,
  },
  plugins: [diagramsPlugin(process.env.ER_DIAGRAMS ?? "examples/diagrams")],
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
