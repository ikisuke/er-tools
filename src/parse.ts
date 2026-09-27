export interface Relationship {
  from: string;
  to: string;
  label: string;
}

export interface Attribute {
  type: string;
  name: string;
  keys: string[];
  comment?: string;
  /** Values listed after `enum:` in the comment; absent when the comment has none. */
  enumValues?: string[];
}

export interface ParsedDiagram {
  /** Entities written with an attribute block (`NAME { ... }`) in this diagram. */
  defined: Set<string>;
  /** Every entity identifier that appears in a relationship, in order of first appearance. */
  referenced: string[];
  relationships: Relationship[];
  /** Attribute rows of each defined entity, in the order they are written. */
  attributes: Map<string, Attribute[]>;
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
const KEY = String.raw`(?:PK|FK|UK)`;
const ATTRIBUTE = new RegExp(
  String.raw`^(\S+)\s+(\S+?)(?:\s+(${KEY}(?:\s*,\s*${KEY})*))?(?:\s+"([^"]*)")?$`,
  "u",
);
const ENUM_MARKER = /\benum\s*:/i;

/** Parses one attribute row (`type name [PK, FK] ["comment"]`) of an entity block. */
export function parseAttribute(line: string): Attribute | null {
  const m = ATTRIBUTE.exec(line.trim());
  if (!m) return null;
  const attribute: Attribute = {
    type: m[1],
    name: m[2],
    keys: m[3] ? m[3].split(",").map((k) => k.trim()) : [],
  };
  if (m[4] !== undefined) {
    attribute.comment = m[4];
    const values = parseEnumValues(m[4]);
    if (values) attribute.enumValues = values;
  }
  return attribute;
}

/**
 * Reads enum values written in an attribute comment as `enum: a, b, c`.
 * Text before `enum:` is a free description; values are separated by `,` or `、`.
 */
export function parseEnumValues(comment: string): string[] | null {
  const marker = ENUM_MARKER.exec(comment);
  if (!marker) return null;
  const values = comment
    .slice(marker.index + marker[0].length)
    .split(/[,、]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  return values.length > 0 ? values : null;
}

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
  const attributes = new Map<string, Attribute[]>();

  const lines = stripFrontmatter(source).split(/\r?\n/);
  let current: Attribute[] | null = null;

  const addAttribute = (text: string) => {
    const attribute = parseAttribute(text);
    if (attribute && current) current.push(attribute);
  };

  const reference = (id: string) => {
    if (!seen.has(id)) {
      seen.add(id);
      referenced.push(id);
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/%%.*$/, "").trim();
    if (!line) continue;

    if (current) {
      if (line.startsWith("}")) current = null;
      else addAttribute(line);
      continue;
    }

    const block = BLOCK_OPEN.exec(line);
    if (block) {
      const id = normalizeIdentifier(block[1]);
      defined.add(id);
      current = attributes.get(id) ?? [];
      attributes.set(id, current);
      const rest = block[2].trim();
      if (rest.endsWith("}")) {
        const inline = rest.slice(0, -1).trim();
        if (inline) addAttribute(inline);
        current = null;
      } else if (rest) {
        addAttribute(rest);
      }
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

  return { defined, referenced, relationships, attributes };
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
