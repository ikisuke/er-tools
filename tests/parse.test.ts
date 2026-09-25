import { describe, expect, it } from "vitest";
import { extractMermaid, parseErDiagram } from "../src/parse";

describe("parseErDiagram", () => {
  it("separates entities with attribute blocks from relationship-only entities", () => {
    const parsed = parseErDiagram(`erDiagram
      ORDER {
        int id PK
        string status
      }
      CUSTOMER ||--o{ ORDER : places
      ORDER ||--|{ ORDER_LINE : "contains"
    `);
    expect([...parsed.defined]).toEqual(["ORDER"]);
    expect(parsed.referenced).toEqual(["CUSTOMER", "ORDER", "ORDER_LINE"]);
  });

  it("keeps relationship labels verbatim", () => {
    const parsed = parseErDiagram(`erDiagram
      A ||--o{ B : "fk_b_a (a_id → id)"
      A }|..|{ C : uses
      A |o--o| D : "  spaced  "
    `);
    expect(parsed.relationships).toEqual([
      { from: "A", to: "B", label: "fk_b_a (a_id → id)" },
      { from: "A", to: "C", label: "uses" },
      { from: "A", to: "D", label: "  spaced  " },
    ]);
  });

  it("uses the node identifier, not the alias, and unquotes quoted identifiers", () => {
    const parsed = parseErDiagram(`erDiagram
      PRODUCT["商品"] {
        int id PK
      }
      "ORDER ITEM" }o--|| PRODUCT["商品"] : refers
      "SHOP-MASTER" ||--o{ "ORDER ITEM" : sells
    `);
    expect([...parsed.defined]).toEqual(["PRODUCT"]);
    expect(parsed.referenced).toEqual(["ORDER ITEM", "PRODUCT", "SHOP-MASTER"]);
  });

  it("supports word-form cardinalities", () => {
    const parsed = parseErDiagram(`erDiagram
      A one or more to zero or one B : "word"
      C only one optionally to many(0) D : x
    `);
    expect(parsed.relationships.map((r) => [r.from, r.to, r.label])).toEqual([
      ["A", "B", "word"],
      ["C", "D", "x"],
    ]);
  });

  it("does not treat attribute rows as relationships and ignores comments and frontmatter", () => {
    const parsed = parseErDiagram(`---
title: sample
---
erDiagram
      %% X ||--o{ Y : commented out
      A {
        string ref "X ||--o{ Y : not a relationship"
      }
      EMPTY { }
      A ||--o{ B : ok %% trailing comment
    `);
    expect([...parsed.defined]).toEqual(["A", "EMPTY"]);
    expect(parsed.referenced).toEqual(["A", "B"]);
    expect(parsed.relationships[0].label).toBe("ok");
  });

  it("treats an entity mentioned without a block as not defined", () => {
    const parsed = parseErDiagram(`erDiagram
      LONELY
      A ||--o{ LONELY : x
    `);
    expect(parsed.defined.has("LONELY")).toBe(false);
  });
});

describe("extractMermaid", () => {
  it("returns .mmd content as-is when it contains an erDiagram", () => {
    expect(extractMermaid("a.mmd", "erDiagram\n A ||--o{ B : x")).toBe("erDiagram\n A ||--o{ B : x");
    expect(extractMermaid("a.mmd", "flowchart LR\n A --> B")).toBeNull();
  });

  it("returns the first mermaid fence containing an erDiagram from Markdown", () => {
    const md = [
      "# Title",
      "```mermaid",
      "flowchart LR",
      "  A --> B",
      "```",
      "```mermaid",
      "erDiagram",
      "  A ||--o{ B : x",
      "```",
    ].join("\n");
    expect(extractMermaid("doc.md", md)).toBe("erDiagram\n  A ||--o{ B : x\n");
    expect(extractMermaid("doc.md", "no diagram")).toBeNull();
  });
});
