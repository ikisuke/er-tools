import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildDefinitionIndex, loadGroups, resolveLinks } from "../src/links";
import { loadDiagramBundle } from "../plugin/diagram-source";

const groups = loadGroups([
  {
    name: "customers",
    source: `erDiagram
      CUSTOMER { int id PK }
      ADDRESS { int id PK }
      CUSTOMER ||--o{ ORDER : places
      CUSTOMER ||--o{ ADDRESS : has`,
  },
  {
    name: "orders",
    source: `erDiagram
      ORDER { int id PK }
      CUSTOMER ||--o{ ORDER : places
      ADDRESS |o--o{ ORDER : "ships to"
      ORDER ||--o| PAYMENT : "paid by"
      order ||--o| ORDER : "case differs"`,
  },
  {
    name: "shipping",
    source: `erDiagram
      ADDRESS { int id PK }
      ORDER ||--o{ SHIPMENT : fulfils`,
  },
]);
const index = buildDefinitionIndex(groups);
const byName = (name: string) => groups.find((g) => g.name === name)!;

describe("resolveLinks", () => {
  it("links a relationship-only entity to the single group that defines it", () => {
    const links = resolveLinks(byName("orders"), index);
    expect(links.get("CUSTOMER")).toEqual({ kind: "single", group: "customers" });
  });

  it("offers every defining group when the definition is ambiguous", () => {
    const links = resolveLinks(byName("orders"), index);
    expect(links.get("ADDRESS")).toEqual({ kind: "ambiguous", groups: ["customers", "shipping"] });
  });

  it("does not link entities defined nowhere", () => {
    const links = resolveLinks(byName("orders"), index);
    expect(links.has("PAYMENT")).toBe(false);
    expect(links.has("SHIPMENT")).toBe(false);
  });

  it("matches identifiers exactly (case-sensitive)", () => {
    expect(resolveLinks(byName("orders"), index).has("order")).toBe(false);
  });

  it("does not link entities that the diagram defines itself", () => {
    const links = resolveLinks(byName("customers"), index);
    expect(links.has("ADDRESS")).toBe(false);
    expect(links.has("CUSTOMER")).toBe(false);
    expect(links.get("ORDER")).toEqual({ kind: "single", group: "orders" });
  });
});

describe("example diagrams", () => {
  const bundle = loadDiagramBundle("examples/diagrams");
  const loaded = loadGroups(bundle.groups);
  const exampleIndex = buildDefinitionIndex(loaded);
  const links = (name: string) => resolveLinks(loaded.find((g) => g.name === name)!, exampleIndex);

  it("loads every example group, including Markdown", () => {
    expect(bundle.groups.map((g) => g.name)).toEqual(["catalog", "customers", "orders", "shipping"]);
    expect(bundle.warnings).toEqual([]);
  });

  it("contains a single, an ambiguous and a missing case", () => {
    expect(links("orders").get("PRODUCT")).toEqual({ kind: "single", group: "catalog" });
    expect(links("orders").get("ADDRESS")).toEqual({ kind: "ambiguous", groups: ["customers", "shipping"] });
    expect(links("orders").has("PAYMENT")).toBe(false);
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
    expect(column("orders", "ORDER", "status").enumValues).toEqual(["pending", "paid", "shipped", "cancelled"]);
    expect(column("shipping", "SHIPMENT", "carrier").enumValues).toEqual(["yamato", "sagawa", "japan_post"]);
  });
});
