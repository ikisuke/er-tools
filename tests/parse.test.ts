import { describe, expect, it } from "vitest";
import { extractMermaid, parseAttribute, parseEnumValues, parseErDiagram } from "../src/parse";

describe("parseErDiagram", () => {
  it("separates entities with attribute blocks from relationship-only entities", () => {
    const parsed = parseErDiagram(`erDiagram
      CIRCLE {
        int id PK
        string name
      }
      MEMBER ||--o{ CIRCLE : leads
      CIRCLE ||--|{ ACTIVITY : "holds"
    `);
    expect([...parsed.defined]).toEqual(["CIRCLE"]);
    expect(parsed.referenced).toEqual(["MEMBER", "CIRCLE", "ACTIVITY"]);
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
      ROOM["部屋"] {
        int id PK
      }
      "ROOM KEY" }o--|| ROOM["部屋"] : opens
      "FRONT-DESK" ||--o{ "ROOM KEY" : lends
    `);
    expect([...parsed.defined]).toEqual(["ROOM"]);
    expect(parsed.referenced).toEqual(["ROOM KEY", "ROOM", "FRONT-DESK"]);
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

describe("attributes and enum values", () => {
  it("parses attribute rows with keys and comments", () => {
    expect(parseAttribute('int circle_id PK, FK "サークル"')).toEqual({
      type: "int",
      name: "circle_id",
      keys: ["PK", "FK"],
      comment: "サークル",
    });
    expect(parseAttribute("varchar(255) name")).toEqual({ type: "varchar(255)", name: "name", keys: [] });
    expect(parseAttribute("not an attribute row with many words")).toBeNull();
  });

  it("reads enum values from the comment", () => {
    expect(parseEnumValues("enum: mon, tue, wed")).toEqual(["mon", "tue", "wed"]);
    expect(parseEnumValues("活動曜日 enum: 土、日, 祝")).toEqual(["土", "日", "祝"]);
    expect(parseEnumValues("ENUM : a ,b,, c ")).toEqual(["a", "b", "c"]);
  });

  it("ignores comments without values after the marker", () => {
    expect(parseEnumValues("活動の曜日")).toBeNull();
    expect(parseEnumValues("enum:")).toBeNull();
    expect(parseEnumValues("enumeration of states")).toBeNull();
  });

  it("does not infer values from the type alone", () => {
    expect(parseAttribute("enum meeting_day")?.enumValues).toBeUndefined();
  });

  it("collects attributes per entity, including one-line blocks, in written order", () => {
    const parsed = parseErDiagram(`erDiagram
      CIRCLE {
        int id PK
        string meeting_day "enum: sat, sun"
      }
      TAG { string kind "enum: a, b" }
      EMPTY { }
      CIRCLE ||--o{ ACTIVITY : holds
    `);
    expect(parsed.attributes.get("CIRCLE")?.map((a) => [a.name, a.enumValues])).toEqual([
      ["id", undefined],
      ["meeting_day", ["sat", "sun"]],
    ]);
    expect(parsed.attributes.get("TAG")?.[0].enumValues).toEqual(["a", "b"]);
    expect(parsed.attributes.get("EMPTY")).toEqual([]);
    expect(parsed.attributes.has("ACTIVITY")).toBe(false);
  });
});
