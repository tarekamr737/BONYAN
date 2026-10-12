/** Numeric selection stays independent of gestures and canonical weight storage. */
export function wheelValues(min: number, max: number, step: number, current: number): number[] {
  if (!Number.isFinite(min + max + step) || step <= 0 || max < min || (max - min) / step > 1000) throw new Error("Invalid wheel range");
  const values = Array.from({length: Math.floor((max - min) / step) + 1}, (_, index) => Math.round((min + index * step) * 10000) / 10000);
  if (Number.isFinite(current) && current >= min && current <= max && !values.includes(current)) values.push(current);
  return values.sort((a, b) => a - b);
}
export function wheelIndex(offset: number, rowHeight: number, count: number): number {
  if (!Number.isFinite(offset) || rowHeight <= 0 || count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(offset / rowHeight)));
}
export function parseSetValue(text: string, min: number, max: number, integer: boolean): number | null {
  const normalized = text.trim().replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776)).replace(/٫/g, ".");
  if (!/^\d+(\.\d{1,4})?$/.test(normalized)) return null;
  const value = Number(normalized);
  return value >= min && value <= max && (!integer || Number.isInteger(value)) ? value : null;
}
