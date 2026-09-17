const REASSESSMENT_INTERVAL_MS = 60 * 24 * 60 * 60 * 1000;

export type AvatarRenewalStatus = "current" | "new_measurements" | "reassessment_due";

export function avatarRenewalStatus(
  avatarMeasurementsAt: string,
  latestMeasurementsAt: string | null,
  now = Date.now(),
): AvatarRenewalStatus {
  const avatarTime = Date.parse(avatarMeasurementsAt);
  const latestTime = latestMeasurementsAt ? Date.parse(latestMeasurementsAt) : NaN;
  if (Number.isFinite(latestTime) && latestTime > avatarTime) return "new_measurements";
  const referenceTime = Number.isFinite(latestTime) ? latestTime : avatarTime;
  return Number.isFinite(referenceTime) && now - referenceTime >= REASSESSMENT_INTERVAL_MS
    ? "reassessment_due"
    : "current";
}
