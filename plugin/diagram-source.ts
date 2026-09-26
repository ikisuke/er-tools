import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { extractMermaid } from "../src/parse.ts";

export interface DiagramFile {
  name: string;
  file: string;
  source: string;
}

export interface DiagramBundle {
  groups: DiagramFile[];
  warnings: string[];
}

interface Manifest {
  groups: { name: string; file: string }[];
}

const DIAGRAM_EXT = /\.(mmd|mermaid|md|markdown)$/i;

/**
 * Loads diagrams from `location`, which is either a directory (one group per
 * `.mmd`/`.mermaid`/`.md` file, named after the file) or a JSON manifest
 * listing `{ name, file }` entries with paths relative to the manifest.
 */
export function loadDiagramBundle(location: string): DiagramBundle {
  const path = resolve(location);
  const stat = statSync(path);
  const entries = stat.isDirectory() ? entriesFromDirectory(path) : entriesFromManifest(path);

  const groups: DiagramFile[] = [];
  const warnings: string[] = [];
  const names = new Set<string>();
  for (const { name, file } of entries) {
    const source = extractMermaid(file, readFileSync(file, "utf8"));
    if (source === null) {
      warnings.push(`${basename(file)}: erDiagram が見つからないため読み飛ばしました`);
      continue;
    }
    if (names.has(name)) {
      warnings.push(`${basename(file)}: グループ名「${name}」が重複しているため読み飛ばしました`);
      continue;
    }
    names.add(name);
    groups.push({ name, file: basename(file), source });
  }
  return { groups, warnings };
}

function entriesFromDirectory(dir: string): { name: string; file: string }[] {
  return readdirSync(dir)
    .filter((f) => DIAGRAM_EXT.test(f))
    .sort((a, b) => a.localeCompare(b))
    .map((f) => ({ name: basename(f, extname(f)), file: resolve(dir, f) }));
}

function entriesFromManifest(manifestPath: string): { name: string; file: string }[] {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  if (!Array.isArray(manifest.groups)) {
    throw new Error(`${manifestPath}: "groups" 配列がありません`);
  }
  const base = dirname(manifestPath);
  return manifest.groups.map((g) => ({ name: g.name, file: resolve(base, g.file) }));
}
