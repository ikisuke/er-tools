/**
 * Mermaid's ER renderer gives each entity node the id
 * `<renderId>-entity-<identifier>-<counter>`; this recovers `<identifier>`
 * so nodes are matched by the identifier written in the diagram, not by the
 * displayed label (which may be an alias).
 */
export function entityIdFromNodeId(nodeId: string, renderId: string): string | null {
  const prefix = `${renderId}-entity-`;
  if (!nodeId.startsWith(prefix)) return null;
  const m = /^(.+)-\d+$/s.exec(nodeId.slice(prefix.length));
  return m ? m[1] : null;
}
