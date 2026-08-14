export function formatCurrency(value: number) {
  const sign = value < 0 ? '- ' : '';
  return `${sign}$ ${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}
