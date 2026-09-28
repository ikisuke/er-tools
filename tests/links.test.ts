import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildDefinitionIndex, loadGroups, resolveLinks } from "../src/links";
import { loadDiagramBundle } from "../plugin/diagram-source";

const groups = loadGroups([
  {
    name: "members",
    source: `erDiagram
      MEMBER { int id PK }
      CONTACT { int id PK }
      MEMBER ||--o{ CIRCLE : leads
      MEMBER ||--o{ CONTACT : has`,
  },
  {
    name: "circles",
    source: `erDiagram
      CIRCLE { int id PK }
      MEMBER ||--o{ CIRCLE : leads
      CONTACT |o--o{ CIRCLE : "reached via"
      CIRCLE ||--o| LOCKER : "stores gear in"
      circle ||--o| CIRCLE : "case differs"`,
  },
  {
    name: "rooms",
    source: `erDiagram
      CONTACT { int id PK }
      CIRCLE ||--o{ SLOT : books`,
  },
]);
const index = buildDefinitionIndex(groups);
const byName = (name: string) => groups.find((g) => g.name === name)!;

describe("resolveLinks", () => {
  it("links a relationship-only entity to the single group that defines it", () => {
    const links = resolveLinks(byName("circles"), index);
    expect(links.get("MEMBER")).toEqual({ kind: "single", group: "members" });
  });

  it("offers every defining group when the definition is ambiguous", () => {
    const links = resolveLinks(byName("circles"), index);
    expect(links.get("CONTACT")).toEqual({ kind: "ambiguous", groups: ["members", "rooms"] });
  });

  it("does not link entities defined nowhere", () => {
    const links = resolveLinks(byName("circles"), index);
    expect(links.has("LOCKER")).toBe(false);
    expect(links.has("SLOT")).toBe(false);
  });

  it("matches identifiers exactly (case-sensitive)", () => {
    expect(resolveLinks(byName("circles"), index).has("circle")).toBe(false);
  });

  it("does not link entities that the diagram defines itself", () => {
    const links = resolveLinks(byName("members"), index);
    expect(links.has("CONTACT")).toBe(false);
    expect(links.has("MEMBER")).toBe(false);
    expect(links.get("CIRCLE")).toEqual({ kind: "single", group: "circles" });
  });
});

describe("example diagrams", () => {
  const bundle = loadDiagramBundle("examples/diagrams");
  const loaded = loadGroups(bundle.groups);
  const exampleIndex = buildDefinitionIndex(loaded);
  const links = (name: string) => resolveLinks(loaded.find((g) => g.name === name)!, exampleIndex);

  it("loads every example group, including Markdown", () => {
    expect(bundle.groups.map((g) => g.name)).toEqual(["circles", "members", "rooms"]);
    expect(bundle.warnings).toEqual([]);
  });

  it("contains a single, an ambiguous and a missing case", () => {
    expect(links("circles").get("ROOM")).toEqual({ kind: "single", group: "rooms" });
    expect(links("circles").get("CONTACT")).toEqual({ kind: "ambiguous", groups: ["members", "rooms"] });
    expect(links("circles").has("LOCKER")).toBe(false);
  });

  it("links back between groups", () => {
    expect(links("members").get("CIRCLE")).toEqual({ kind: "single", group: "circles" });
    expect(links("rooms").get("ACTIVITY")).toEqual({ kind: "single", group: "circles" });
  });

  it("loads the same groups through a manifest", () => {
    const manifest = JSON.parse(readFileSync("examples/manifest.json", "utf8")) as { groups: { name: string }[] };
    const viaManifest = loadDiagramBundle("examples/manifest.json");
    expect(viaManifest.groups.map((g) => g.name)).toEqual(manifest.groups.map((g) => g.name));
    expect(viaManifest.warnings).toEqual([]);
  });
});

describe("example enum columns", () => {
  it("carries enum values in attribute comments", () => {
    const loaded = loadGroups(loadDiagramBundle("examples/diagrams").groups);
    const column = (group: string, entity: string, name: string) =>
      loaded.find((g) => g.name === group)!.parsed.attributes.get(entity)!.find((a) => a.name === name)!;
    expect(column("circles", "CIRCLE", "meeting_day").enumValues).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
    expect(column("members", "MEMBERSHIP", "role").enumValues).toEqual(["leader", "member", "guest"]);
  });
});
