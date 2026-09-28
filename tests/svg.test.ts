import { describe, expect, it } from "vitest";
import { entityIdFromNodeId } from "../src/svg";

describe("entityIdFromNodeId", () => {
  it("recovers the identifier from mermaid's node id", () => {
    expect(entityIdFromNodeId("er-3-entity-ROOM_KEY-1", "er-3")).toBe("ROOM_KEY");
    expect(entityIdFromNodeId("er-3-entity-ROOM KEY-0", "er-3")).toBe("ROOM KEY");
    expect(entityIdFromNodeId("er-3-entity-FRONT-DESK-12", "er-3")).toBe("FRONT-DESK");
  });

  it("ignores nodes from other renders or other kinds", () => {
    expect(entityIdFromNodeId("er-2-entity-CIRCLE-0", "er-3")).toBeNull();
    expect(entityIdFromNodeId("er-3-edge-0", "er-3")).toBeNull();
  });
});
