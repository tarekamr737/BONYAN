import {describe, expect, it} from "vitest";
import {recoverableMeasurements} from "../src/features/inbody/reviewState";
import type {InBodyMeasurement} from "../src/features/inbody/types";

describe("manual recovery after failed OCR", () => {
  it("starts unknown, supplies explicit units and requires deliberate entry", () => {
    const rows = recoverableMeasurements([], true);
    expect(rows).toHaveLength(9);
    expect(rows.every(row => row.value === null && !row.metadata.user_edited)).toBe(true);
    expect(rows.find(row => row.key === "height")?.unit).toBe("cm");
    expect(rows.find(row => row.key === "total_body_water")?.unit).toBe("l");
  });
  it("does not offer fabricated rows during loading or pending processing", () => {
    expect(recoverableMeasurements([], false)).toEqual([]);
  });
  it("keeps extracted values and units, assigning defaults only to unknown fields", () => {
    const rows: InBodyMeasurement[] = [{key: "weight", value: 160, unit: "lb", metadata: {flags: [], user_edited: false}}, {key: "height", value: null, unit: null, metadata: {flags: [], user_edited: false}}];
    const recovered = recoverableMeasurements(rows, true);
    expect(recovered[0]).toEqual(rows[0]);
    expect(recovered[1]?.unit).toBe("cm");
    expect(rows[1]?.unit).toBeNull();
  });
});
