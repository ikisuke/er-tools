import { describe, expect, it } from "vitest";
import { entityIdFromNodeId } from "../src/svg";

describe("entityIdFromNodeId", () => {
  it("recovers the identifier from mermaid's node id", () => {
    expect(entityIdFromNodeId("er-3-entity-ORDER_LINE-1", "er-3")).toBe("ORDER_LINE");
    expect(entityIdFromNodeId("er-3-entity-ORDER ITEM-0", "er-3")).toBe("ORDER ITEM");
    expect(entityIdFromNodeId("er-3-entity-SHOP-MASTER-12", "er-3")).toBe("SHOP-MASTER");
  });

  it("ignores nodes from other renders or other kinds", () => {
    expect(entityIdFromNodeId("er-2-entity-ORDER-0", "er-3")).toBeNull();
    expect(entityIdFromNodeId("er-3-edge-0", "er-3")).toBeNull();
  });
});
