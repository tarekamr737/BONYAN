import type { InBodyMeasurement, InBodyMetricKey, InBodyScan } from "./types";

const manualUnits: Record<InBodyMetricKey, string | null> = {height: "cm", weight: "kg", skeletal_muscle_mass: "kg", body_fat_mass: "kg", body_fat_percentage: "%", bmi: null, total_body_water: "l", visceral_fat_level: "level", inbody_score: "score"};

/** Failed OCR has no inferred measurements. Manual review starts entirely unknown. */
export function recoverableMeasurements(measurements: InBodyMeasurement[], recoverEmpty: boolean): InBodyMeasurement[] {
  const source = measurements.length || !recoverEmpty ? measurements : (Object.keys(manualUnits) as InBodyMetricKey[]).map(key => ({key, value: null, unit: manualUnits[key], metadata: {flags: [], user_edited: false}}));
  return source.map(item => item.value === null && item.unit === null ? {...item, unit: manualUnits[item.key]} : item);
}

export type InBodyReviewState = "failed" | "confirmed" | "review" | "pending";

export function getInBodyReviewState(scan: InBodyScan | undefined): InBodyReviewState {
  if (scan?.status === "failed") return "failed";
  if (scan?.status === "confirmed") return "confirmed";
  if (scan?.result) return "review";
  return "pending";
}
