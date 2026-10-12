// Only monotonic elapsed time advances a server timestamp; device wall-clock edits have no effect.
let sample: {serverMs: number; monotonicMs: number} | null = null;
export function recordServerTime(value: string | null, monotonicMs = performance.now()) {
  if (!value) return;
  const serverMs = Date.parse(value);
  if (Number.isFinite(serverMs)) sample = {serverMs, monotonicMs};
}
export function estimatedServerTime(monotonicMs = performance.now()): number | null {
  return sample ? sample.serverMs + Math.max(0, monotonicMs - sample.monotonicMs) : null;
}
