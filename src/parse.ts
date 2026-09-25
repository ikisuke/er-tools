export interface Relationship {
  from: string;
  to: string;
  label: string;
}

export interface ParsedDiagram {
  /** Entities written with an attribute block (`NAME { ... }`) in this diagram. */
  defined: Set<string>;
  /** Every entity identifier that appears in a relationship, in order of first appearance. */
  referenced: string[];
  relationships: Relationship[];
}

const IDENT = String.raw`(?:"[^"]*"|[\p{L}\p{N}_*][\p{L}\p{N}_\-*.]*)`;
const ALIAS = String.raw`(?:\s*\[\s*(?:"[^"]*"|[^\]]*)\s*\])?`;
const CARD_LEFT = String.raw`(?:\|o|\|\||\}o|\}\||o\||o\{|\|\{)`;
const CARD_RIGHT = String.raw`(?:o\||\|\||o\{|\|\{|\|o|\}o|\}\|)`;
const WORD_CARD = String.raw`(?:only one|zero or one|one or zero|one or more|one or many|zero or more|zero or many|many\(0\)|many\(1\)|0\+|1\+|1)`;

const SYMBOL_REL = new RegExp(
  String.raw`^(${IDENT})${ALIAS}\s*${CARD_LEFT}(?:--|\.\.)${CARD_RIGHT}\s*(${IDENT})${ALIAS}\s*:\s*(.*)$`,
  "u",
);
const WORD_REL = new RegExp(
  String.raw`^(${IDENT})${ALIAS}\s+${WORD_CARD}\s+(?:optionally\s+)?to\s+${WORD_CARD}\s+(${IDENT})${ALIAS}\s*:\s*(.*)$`,
  "u",
);
const BLOCK_OPEN = new RegExp(String.raw`^(${IDENT})${ALIAS}\s*\{(.*)$`, "u");

/** Mermaid lets identifiers be quoted; the identifier used for matching is the text inside the quotes. */
export function normalizeIdentifier(raw: string): string {
  const t = raw.trim();
  return t.length >= 2 && t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
}

function stripLabel(raw: string): string {
  const t = raw.trim();
  return t.length >= 2 && t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
}

export function parseErDiagram(source: string): ParsedDiagram {
  const defined = new Set<string>();
  const referenced: string[] = [];
  const seen = new Set<string>();
  const relationships: Relationship[] = [];

  const lines = stripFrontmatter(source).split(/\r?\n/);
  let inBlock = false;

  const reference = (id: string) => {
    if (!seen.has(id)) {
      seen.add(id);
      referenced.push(id);
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/%%.*$/, "").trim();
    if (!line) continue;

    if (inBlock) {
      if (line.startsWith("}")) inBlock = false;
      continue;
    }

    const block = BLOCK_OPEN.exec(line);
    if (block) {
      defined.add(normalizeIdentifier(block[1]));
      inBlock = !block[2].trimEnd().endsWith("}");
      continue;
    }

    const rel = SYMBOL_REL.exec(line) ?? WORD_REL.exec(line);
    if (rel) {
      const from = normalizeIdentifier(rel[1]);
      const to = normalizeIdentifier(rel[2]);
      reference(from);
      reference(to);
      relationships.push({ from, to, label: stripLabel(rel[3]) });
    }
  }

  return { defined, referenced, relationships };
}

function stripFrontmatter(source: string): string {
  const m = /^\s*---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(source);
  return m ? source.slice(m[0].length) : source;
}

/**
 * Returns the Mermaid source of a diagram file. `.md` files may embed the
 * diagram in a ```mermaid fence; the first fence containing `erDiagram` is used.
 */
export function extractMermaid(fileName: string, content: string): string | null {
  if (!/\.(md|markdown)$/i.test(fileName)) {
    return /\berDiagram\b/.test(content) ? content : null;
  }
  const fence = /^(```|~~~)\s*mermaid\s*\r?\n([\s\S]*?)^\1\s*$/gm;
  for (const m of content.matchAll(fence)) {
    if (/\berDiagram\b/.test(m[2])) return m[2];
  }
  return null;
}
