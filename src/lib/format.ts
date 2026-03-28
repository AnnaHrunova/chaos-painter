export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}

export function formatFixed(value: number, digits = 3): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '0';
}

export function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatSigned(value: number, digits = 3): string {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatFixed(value, digits)}`;
}

