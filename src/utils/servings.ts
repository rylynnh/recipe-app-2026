/** Parse a positive serving amount written as a decimal or a simple fraction. */
export function parseServingAmount(value: string): number | null {
  const normalized = value.trim().replace(/\s+/g, '');
  if (!normalized) return null;

  const decimal = Number(normalized);
  if (Number.isFinite(decimal) && decimal > 0) return decimal;

  const fraction = normalized.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (!fraction) return null;
  const numerator = Number(fraction[1]);
  const denominator = Number(fraction[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || numerator <= 0 || denominator <= 0) return null;
  return numerator / denominator;
}

export function formatServingAmount(value: number): string {
  return Number(value.toFixed(6)).toString();
}
