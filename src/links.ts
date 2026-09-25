import { parseErDiagram, type ParsedDiagram } from "./parse";

export interface DiagramGroup {
  name: string;
  source: string;
}

export interface LoadedGroup extends DiagramGroup {
  parsed: ParsedDiagram;
}

export type LinkTarget =
  | { kind: "single"; group: string }
  | { kind: "ambiguous"; groups: string[] };

export type DefinitionIndex = Map<string, string[]>;

export function loadGroups(groups: DiagramGroup[]): LoadedGroup[] {
  return groups.map((g) => ({ ...g, parsed: parseErDiagram(g.source) }));
}

/** Maps each entity identifier to the groups that define it with an attribute block. */
export function buildDefinitionIndex(groups: LoadedGroup[]): DefinitionIndex {
  const index: DefinitionIndex = new Map();
  for (const g of groups) {
    for (const id of g.parsed.defined) {
      const list = index.get(id) ?? [];
      list.push(g.name);
      index.set(id, list);
    }
  }
  return index;
}

/**
 * Entities of `group` that appear only in relationships (no attribute block
 * in this diagram), mapped to where they are defined. Entities defined
 * nowhere else are omitted, so they are not rendered as links.
 */
export function resolveLinks(group: LoadedGroup, index: DefinitionIndex): Map<string, LinkTarget> {
  const links = new Map<string, LinkTarget>();
  for (const id of group.parsed.referenced) {
    if (group.parsed.defined.has(id)) continue;
    const owners = index.get(id) ?? [];
    if (owners.length === 1) links.set(id, { kind: "single", group: owners[0] });
    else if (owners.length > 1) links.set(id, { kind: "ambiguous", groups: owners });
  }
  return links;
}
