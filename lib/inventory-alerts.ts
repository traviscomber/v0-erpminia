export function hasConfiguredStockMinimum(value: unknown): boolean {
  const minimum = Number(value);
  return Number.isFinite(minimum) && minimum > 0;
}

export function isStockBelowMinimum(quantityValue: unknown, minimumValue: unknown): boolean {
  if (!hasConfiguredStockMinimum(minimumValue)) return false;

  const quantity = Number(quantityValue);
  const minimum = Number(minimumValue);
  return (Number.isFinite(quantity) ? quantity : 0) <= minimum;
}
